// 상담 챗봇 — Claude API. 예약 정보는 클라이언트가 보낸 값이 아니라 서버가 Firestore 에서 직접 읽습니다.
import Anthropic from '@anthropic-ai/sdk';
import { bookingContextText, localBotReply, staticSystemPrompt } from '../../shared/chatFaq';
import type { Booking } from '../../shared/types';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from './app';

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const MODEL = 'claude-opus-5-5';
const MAX_TURNS = 12; // 모델에 보내는 최근 대화 수
const MAX_HISTORY = 40; // 요청당 허용 대화 수
const MAX_CHARS = 1000; // 메시지당 최대 글자 수

// 정적 프롬프트는 배포 단위로 고정 → 프롬프트 캐시 대상 (매 요청 동일한 바이트)
const STATIC_SYSTEM = staticSystemPrompt();

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/** 최근 대화만, user 로 시작하고 역할이 번갈아 오도록 정리 */
function toMessages(history: Turn[]): Anthropic.Beta.BetaMessageParam[] {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const t of history.slice(-MAX_TURNS)) {
    const content = t.content.trim().slice(0, MAX_CHARS);
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.content = `${last.content as string}\n${content}`;
    else out.push({ role: t.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

async function bookingContext(bookingId: unknown): Promise<{ text: string; booking?: Booking }> {
  if (typeof bookingId !== 'string' || bookingId.length < 8 || bookingId.length > 64) return { text: '(예약 정보 없음 — 일반 상담)' };
  const snap = await db.doc(`bookings/${bookingId}`).get();
  if (!snap.exists) return { text: '(예약 정보 없음 — 일반 상담)' };
  const booking = { ...(snap.data() as Booking), id: snap.id };
  return { text: bookingContextText(booking), booking };
}

export const chat = onCall<{ bookingId?: string; history?: Turn[] }>({ secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: '256MiB' }, async (req) => {
  const history = req.data?.history;
  if (!Array.isArray(history) || history.length === 0 || history.length > MAX_HISTORY) throw new HttpsError('invalid-argument', '대화 내용이 올바르지 않아요.');
  const clean: Turn[] = history
    .filter((t): t is Turn => !!t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_CHARS) }));
  const messages = toMessages(clean);
  if (!messages.length || messages[messages.length - 1].role !== 'user') throw new HttpsError('invalid-argument', '질문을 입력해 주세요.');

  const ctx = await bookingContext(req.data?.bookingId);
  const lastUser = clean.filter((t) => t.role === 'user').pop()?.content ?? '';
  const fallback = () => ({ text: localBotReply(lastUser, { booking: ctx.booking }).text, source: 'faq' as const });

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // 정책상 거절 시 서버에서 권장 모델로 자동 재시도 (server-side fallback, "default" 모드)
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // 짧은 상담 답변에는 낮은 effort 로 충분합니다 (Opus 5.5 는 thinking 이 항상 켜져 있고 effort 로 깊이를 조절)
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: STATIC_SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `[고객 예약 정보]\n${ctx.text}` },
      ],
      messages,
    });
    if (res.stop_reason === 'refusal') {
      logger.warn('chat refusal', { category: res.stop_details?.category });
      return fallback();
    }
    const text = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!text) return fallback();
    logger.info('chat ok', { model: res.model, cacheRead: res.usage.cache_read_input_tokens, input: res.usage.input_tokens, output: res.usage.output_tokens });
    return { text, source: 'claude' as const };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) logger.warn('chat rate limited');
    else if (err instanceof Anthropic.AuthenticationError) logger.error('chat: invalid ANTHROPIC_API_KEY');
    else if (err instanceof Anthropic.APIError) logger.error('chat api error', { status: err.status, message: err.message });
    else logger.error('chat failed', err);
    return fallback();
  }
});
