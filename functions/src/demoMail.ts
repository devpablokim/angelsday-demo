// 루넬 데모 메일 — hobbytan-venue.web.app/demo 에서 방문자가 문의·견적·입금 같은 단계를 지나면
// 방문자가 문의서에 적은 본인 주소로 '루넬 파티하우스' 이름의 실제 안내 메일을 보냅니다.
//
// 데모는 Firebase 없이 브라우저에서만 돌기 때문에, demoMailRequests 에 { ruleId, booking } 요청 한 건(JSON 문자열)만 남깁니다
// (보안 규칙: 쓰기만, 읽기·수정 불가). 이 함수가 요청을 읽어 지우고, 메일 내용은 공용 템플릿(shared/emailRules)으로
// 직접 만든 뒤 루넬 치환표를 적용합니다. 아무 내용이나 보내는 통로가 되지 않도록: 받는 사람은 예약의 고객 주소 하나,
// 내용은 정해진 템플릿만, 하루 전체·주소별 발송 한도.
import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { EMAIL_RULES, emailHtml, renderEmail } from '../../shared/emailRules';
import type { Booking } from '../../shared/types';
import brand from '../../src/brand/lunelle/brand.json';
import { db } from './app';
import { isReservedAddress } from './delivery';

const BASE_URL = 'https://hobbytan-venue.web.app/demo';
const FROM_NAME = '루넬 파티하우스';
const REPLY_TO = 'pablo@hobbytan.com';
const LIMIT_PER_DAY = 200; // 지메일 개인 계정 하루 한도(약 500통) 안에서 엔젤스데이 몫을 남깁니다
const LIMIT_PER_ADDRESS = 20;
const NOTE = '이 메일은 하비탄AI 예약 관리 데모(루넬)에서 보낸 예시 메일이에요. 데모 기록은 문의하신 브라우저에만 저장돼요.';

const REPLACEMENTS = brand.replacements as [string, string][];
const rebrand = (t: string) => REPLACEMENTS.reduce((s, [a, b]) => s.split(a).join(b), t);

export const demoMail = onDocumentCreated({ document: 'demoMailRequests/{id}', maxInstances: 3, memory: '256MiB', timeoutSeconds: 30 }, async (event) => {
  const ref = event.data?.ref;
  if (!ref) return;
  const raw = event.data?.get('payload');
  await ref.delete().catch(() => undefined); // 요청은 한 번만 쓰고 지웁니다
  const reject = (why: string) => logger.warn('demo mail rejected', { why, id: event.params.id });

  let ruleId: unknown;
  let booking: Booking | undefined;
  try {
    ({ ruleId, booking } = JSON.parse(String(raw ?? '')) as { ruleId?: unknown; booking?: Booking });
  } catch {
    return reject('payload');
  }
  const rule = EMAIL_RULES.find((r) => r.id === ruleId);
  const to = String(booking?.customer?.email ?? '').trim().toLowerCase();
  if (!rule || !booking || typeof booking.id !== 'string' || booking.id.length > 80 || booking.id.startsWith('demo-')) return reject('rule/booking');
  if (to.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || isReservedAddress(to)) return reject('address');

  let subject: string;
  let html: string;
  let text: string;
  try {
    const c = renderEmail(rule.id, booking, BASE_URL);
    subject = rebrand(c.subject);
    html = rebrand(emailHtml(c)).replace(
      '</td></tr></table></body></html>',
      `<p style="font-size:11px;color:#b5aea3;line-height:1.6;margin:12px 0 0">${NOTE}</p></td></tr></table></body></html>`,
    );
    text = rebrand([c.title, ...c.paragraphs, ...(c.facts ?? []).map((f) => `${f.label}: ${f.value}`), c.cta ? `${c.cta.label}: ${c.cta.url}` : ''].filter(Boolean).join('\n\n')) + `\n\n${NOTE}`;
  } catch {
    return reject('render');
  }

  // 하루 한도 (한국 날짜 기준) — 주소는 해시로만 셉니다
  const day = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const key = createHash('sha256').update(to).digest('hex').slice(0, 16);
  const quota = db.collection('demoMailQuota').doc(day);
  const allowed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(quota);
    const total = (snap.get('total') as number | undefined) ?? 0;
    const mine = (snap.get(`per.${key}`) as number | undefined) ?? 0;
    if (total >= LIMIT_PER_DAY || mine >= LIMIT_PER_ADDRESS) return false;
    tx.set(quota, { total: total + 1, per: { [key]: mine + 1 }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
  if (!allowed) return reject('daily limit');

  await db.collection('mail').add({
    to,
    fromName: FROM_NAME,
    replyTo: REPLY_TO,
    message: { subject, html, text },
    meta: { bookingId: booking.id, ruleId: rule.id, demo: 'lunelle' },
    createdAt: FieldValue.serverTimestamp(),
  });
  logger.info('demo mail queued', { ruleId: rule.id, bookingId: booking.id });
});
