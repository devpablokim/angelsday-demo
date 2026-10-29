import { addDays, ddayLabel, formatDate, kstDateTime, todayKST } from './dates';
import { eventConfig, headlinePlain } from './eventTypes';
import { calcQuote, paidAmount } from './quote';
import { computeStep, depositPaid } from './steps';
import type { Booking, ISODateTime } from './types';
import { hallName, VENUE } from './venue';

/**
 * 자동 메일 규칙.
 * - event: 특정 행동(문의 접수, 견적 발송, 결제 …) 직후 1회
 * - relative: 기준일(행사일·문의일·견적 발송일) ± N일 오전 10시(KST) 발송
 * Cloud Functions 의 매일 스케줄러와 관리자 화면(발송 예정 미리보기)이 같은 규칙을 사용합니다.
 */
export type EmailEvent = 'created' | 'quote_sent' | 'adjust_replied' | 'deposit_paid' | 'photos_released';
export type Anchor = 'eventDate' | 'createdAt' | 'quoteSentAt' | 'photosReleasedAt';
export type Condition = 'always' | 'step1' | 'step2_quote_sent' | 'paid' | 'paid_not_done' | 'photos';

export interface EmailRule {
  id: string;
  name: string;
  trigger: { type: 'event'; event: EmailEvent } | { type: 'relative'; anchor: Anchor; offsetDays: number; hour: number };
  condition: Condition;
  defaultEnabled: boolean;
}

export const EMAIL_RULES: EmailRule[] = [
  { id: 'welcome', name: '문의 접수 · 고객 관리 링크 안내', trigger: { type: 'event', event: 'created' }, condition: 'always', defaultEnabled: true },
  { id: 'req_reminder', name: '필요사항 작성 리마인드 (문의 +2일)', trigger: { type: 'relative', anchor: 'createdAt', offsetDays: 2, hour: 10 }, condition: 'step1', defaultEnabled: true },
  { id: 'quote_ready', name: '견적서 도착 알림', trigger: { type: 'event', event: 'quote_sent' }, condition: 'always', defaultEnabled: true },
  { id: 'quote_followup', name: '견적 확인 후속 안내 (발송 +3일)', trigger: { type: 'relative', anchor: 'quoteSentAt', offsetDays: 3, hour: 10 }, condition: 'step2_quote_sent', defaultEnabled: true },
  { id: 'adjust_reply', name: '조정 요청 답변 알림', trigger: { type: 'event', event: 'adjust_replied' }, condition: 'always', defaultEnabled: true },
  { id: 'deposit_paid', name: '예약 확정 · 예약금 영수증', trigger: { type: 'event', event: 'deposit_paid' }, condition: 'always', defaultEnabled: true },
  { id: 'd60', name: 'D-60 준비 일정 안내', trigger: { type: 'relative', anchor: 'eventDate', offsetDays: -60, hour: 10 }, condition: 'paid_not_done', defaultEnabled: true },
  { id: 'd30', name: 'D-30 세부 연출 · 메뉴 확정 안내', trigger: { type: 'relative', anchor: 'eventDate', offsetDays: -30, hour: 10 }, condition: 'paid_not_done', defaultEnabled: true },
  { id: 'd14', name: 'D-14 영상 · 음악 · 자료 전달 요청', trigger: { type: 'relative', anchor: 'eventDate', offsetDays: -14, hour: 10 }, condition: 'paid_not_done', defaultEnabled: true },
  { id: 'd7', name: 'D-7 최종 인원 확정 요청', trigger: { type: 'relative', anchor: 'eventDate', offsetDays: -7, hour: 10 }, condition: 'paid_not_done', defaultEnabled: true },
  { id: 'd1', name: 'D-1 내일 행사 안내 (오시는 길 · 타임테이블)', trigger: { type: 'relative', anchor: 'eventDate', offsetDays: -1, hour: 10 }, condition: 'paid_not_done', defaultEnabled: true },
  { id: 'thanks', name: 'D+1 감사 인사 · 잔금 · 사진 안내', trigger: { type: 'relative', anchor: 'eventDate', offsetDays: 1, hour: 10 }, condition: 'paid', defaultEnabled: true },
  { id: 'photos', name: '행사 사진 공개 알림', trigger: { type: 'event', event: 'photos_released' }, condition: 'always', defaultEnabled: true },
  { id: 'review', name: '후기 요청 (사진 공개 +5일)', trigger: { type: 'relative', anchor: 'photosReleasedAt', offsetDays: 5, hour: 11 }, condition: 'photos', defaultEnabled: true },
];

export interface EmailContent {
  subject: string;
  preheader: string;
  title: string;
  paragraphs: string[];
  facts?: { label: string; value: string }[];
  cta?: { label: string; url: string };
}

export function bookingUrl(baseUrl: string, b: Booking): string {
  return `${baseUrl.replace(/\/$/, '')}/my/${b.id}`;
}

function money(n: number) {
  return `${n.toLocaleString('ko-KR')}원`;
}

export function renderEmail(ruleId: string, b: Booking, baseUrl: string, today = todayKST()): EmailContent {
  const cfg = eventConfig(b.eventType);
  const head = headlinePlain(b.eventType, b.honorees);
  const url = bookingUrl(baseUrl, b);
  const name = b.customer.name;
  const when = `${formatDate(b.date)} ${b.time}`;
  const where = b.eventType === 'catering' ? b.location ?? '출장 장소' : `${VENUE.name} ${hallName(b.hallId)}`;
  const totals = b.quote ? calcQuote(b.quote) : undefined;
  const facts = [
    { label: '행사', value: cfg.label },
    { label: '일시', value: when },
    { label: '장소', value: where },
  ];
  const cta = { label: '내 행사 페이지 열기', url };
  const dday = ddayLabel(b.date, today);
  switch (ruleId) {
    case 'welcome':
      return {
        subject: `[엔젤스데이] ${cfg.label} 문의가 접수되었어요`,
        preheader: '고객님만의 행사 관리 페이지가 열렸어요.',
        title: `${head}`,
        paragraphs: [
          `${name}님, 엔젤스데이에 문의해 주셔서 감사합니다.`,
          '아래 버튼을 누르면 고객님만의 행사 관리 페이지로 이동해요. 이 페이지에서 필요사항 작성부터 견적 확인, 결제, 준비, 행사 사진까지 모든 과정을 확인하실 수 있어요.',
          '먼저 STEP 1 필요사항을 작성해 주시면 맞춤 견적서를 보내드릴게요.',
        ],
        facts: b.accessCode ? [...facts, { label: '예약 비밀번호', value: b.accessCode }] : facts,
        cta,
      };
    case 'req_reminder':
      return {
        subject: '[엔젤스데이] 필요사항 작성을 도와드릴까요?',
        preheader: '몇 가지만 알려주시면 맞춤 견적을 보내드려요.',
        title: '필요사항을 기다리고 있어요',
        paragraphs: [`${name}님, ${cfg.label} 준비는 잘 되어가시나요?`, '홀·인원·꽃장식·식사 등 원하시는 내용을 알려주시면 영업일 1일 이내에 견적서를 보내드려요. 작성이 어렵다면 페이지의 상담 챗봇에게 물어보세요.'],
        facts,
        cta: { label: '필요사항 작성하기', url },
      };
    case 'quote_ready':
      return {
        subject: `[엔젤스데이] ${cfg.label} 맞춤 견적서가 도착했어요`,
        preheader: totals ? `총 ${money(totals.total)} · 예약금 ${money(totals.deposit)}` : '견적서를 확인해 주세요.',
        title: '맞춤 견적서가 도착했어요',
        paragraphs: [
          `${name}님이 작성해 주신 필요사항을 바탕으로 견적서를 준비했어요.`,
          '이대로 진행하시려면 예약금을 결제해 주시고, 바꾸고 싶은 부분이 있다면 페이지에서 조정 요청을 남겨 주세요.',
        ],
        facts: totals
          ? [...facts, { label: '견적 금액', value: money(totals.total) }, { label: '예약금', value: money(totals.deposit) }, { label: '유효기간', value: formatDate(b.quote!.validUntil) }]
          : facts,
        cta: { label: '견적서 확인하기', url },
      };
    case 'quote_followup':
      return {
        subject: '[엔젤스데이] 견적서는 확인해 보셨나요?',
        preheader: '궁금한 점은 언제든 물어보세요.',
        title: '견적 관련 궁금한 점이 있으신가요?',
        paragraphs: [`${name}님, 보내드린 견적서는 확인해 보셨나요?`, '원하시는 날짜와 홀은 예약금 결제 시점에 확정돼요. 조정이 필요하시면 페이지에서 조정 요청을, 빠른 상담은 챗봇이나 전화로 연락 주세요.'],
        facts,
        cta: { label: '견적서 다시 보기', url },
      };
    case 'adjust_reply':
      return {
        subject: '[엔젤스데이] 조정 요청에 답변드렸어요',
        preheader: '담당 플래너의 답변을 확인해 주세요.',
        title: '조정 요청 답변이 등록되었어요',
        paragraphs: [`${name}님이 남겨주신 요청을 검토하고 답변을 남겼어요.`, '변경된 견적서가 있다면 페이지에서 바로 확인하실 수 있어요.'],
        facts,
        cta,
      };
    case 'deposit_paid':
      return {
        subject: `[엔젤스데이] 예약이 확정되었어요 · ${formatDate(b.date)}`,
        preheader: `예약금 ${money(paidAmount(b, 'deposit'))} 결제 완료`,
        title: '예약이 확정되었어요',
        paragraphs: [`${name}님, 예약금 결제가 완료되어 ${formatDate(b.date)} ${b.time} 일정이 확정되었어요.`, '이제 페이지에서 엔젤스데이의 준비 현황과 고객님 체크리스트를 확인하실 수 있어요.'],
        facts: [...facts, { label: '결제 금액', value: money(paidAmount(b, 'deposit')) }, ...(totals ? [{ label: '잔금 (행사 당일)', value: money(totals.total - paidAmount(b)) }] : [])],
        cta: { label: '준비 사항 확인하기', url },
      };
    case 'd60':
    case 'd30':
    case 'd14':
    case 'd7': {
      const open = b.checklist.filter((c) => !c.done);
      const map: Record<string, string> = {
        d60: '본격적인 준비를 시작할 시기예요. 체크리스트에서 이번 달에 챙길 일을 확인해 주세요.',
        d30: '세부 연출과 메뉴를 확정할 시기예요. 원하시는 식순이나 연출이 있다면 알려주세요.',
        d14: '식전 영상, BGM, 현수막 문구 등 자료를 전달해 주실 시기예요.',
        d7: '최종 참석 인원을 확정해 주세요. 보증 인원 기준으로 식자재가 준비돼요.',
      };
      return {
        subject: `[엔젤스데이] ${dday} · ${cfg.ddayNoun} 준비 안내`,
        preheader: map[ruleId],
        title: `${head} ${dday}`,
        paragraphs: [`${name}님, ${map[ruleId]}`, open.length ? `아직 완료하지 않은 체크리스트가 ${open.length}개 있어요: ${open.slice(0, 3).map((c) => c.title).join(', ')}${open.length > 3 ? ' 외' : ''}.` : '체크리스트를 모두 완료하셨어요. 멋진 준비예요!'],
        facts,
        cta: { label: '체크리스트 확인하기', url },
      };
    }
    case 'd1':
      return {
        subject: `[엔젤스데이] 내일은 ${cfg.ddayNoun} 날이에요`,
        preheader: '오시는 길과 당일 타임테이블을 확인해 주세요.',
        title: `내일, ${head.replace(/까지$/, '')}`,
        paragraphs: [
          `${name}님, 드디어 내일이에요. 엔젤스데이가 모든 준비를 마치고 기다리고 있을게요.`,
          b.eventType === 'catering' ? '케이터링팀이 세팅 시간에 맞춰 도착할 예정이에요.' : `주소: ${VENUE.address}\n주차: ${VENUE.parking}`,
        ],
        facts: [...facts, ...(b.daySchedule.slice(0, 4).map((s) => ({ label: s.time, value: s.title })))],
        cta: { label: '당일 안내 보기', url },
      };
    case 'thanks':
      return {
        subject: '[엔젤스데이] 함께해 주셔서 감사합니다',
        preheader: '잔금 결제가 완료되면 행사 사진을 보내드려요.',
        title: '소중한 날을 함께해 주셔서 감사합니다',
        paragraphs: [`${name}님, 어제의 행사는 즐거우셨나요?`, '잔금 결제가 확인되면 보정한 행사 사진을 페이지에서 보실 수 있어요.'],
        facts,
        cta,
      };
    case 'photos':
      return {
        subject: '[엔젤스데이] 행사 사진이 도착했어요',
        preheader: '소중한 순간을 다시 만나보세요.',
        title: '행사 사진이 도착했어요',
        paragraphs: [`${name}님, 기다리시던 행사 사진을 올려드렸어요.`, '페이지에서 사진을 보고 원본 앨범을 내려받으실 수 있어요.'],
        facts,
        cta: { label: '사진 보러 가기', url },
      };
    case 'review':
      return {
        subject: '[엔젤스데이] 후기를 들려주세요',
        preheader: '고객님의 이야기가 다음 고객님께 큰 도움이 돼요.',
        title: '엔젤스데이와의 하루는 어떠셨나요?',
        paragraphs: [`${name}님, 사진은 마음에 드셨나요?`, '짧은 후기를 남겨주시면 다음 행사에서 사용할 수 있는 감사 쿠폰을 보내드려요.'],
        facts,
        cta,
      };
    default:
      return { subject: '[엔젤스데이] 안내', preheader: '', title: head, paragraphs: [], facts, cta };
  }
}

function conditionHolds(c: Condition, b: Booking, today: string): boolean {
  const step = computeStep(b, today);
  switch (c) {
    case 'always':
      return true;
    case 'step1':
      return step === 1;
    case 'step2_quote_sent':
      return step === 2 && b.quote?.status === 'sent' && !b.adjustRequests.some((r) => r.status === 'open');
    case 'paid':
      return depositPaid(b);
    case 'paid_not_done':
      return depositPaid(b) && step < 5;
    case 'photos':
      return !!b.photosReleasedAt;
  }
}

function anchorDate(a: Anchor, b: Booking): string | undefined {
  switch (a) {
    case 'eventDate':
      return b.date;
    case 'createdAt':
      return b.createdAt.slice(0, 10);
    case 'quoteSentAt':
      return b.quote?.sentAt?.slice(0, 10);
    case 'photosReleasedAt':
      return b.photosReleasedAt?.slice(0, 10);
  }
}

export type PlanStatus = 'sent' | 'due' | 'scheduled' | 'waiting' | 'skipped' | 'disabled';

export interface PlannedEmail {
  rule: EmailRule;
  scheduledFor?: ISODateTime;
  status: PlanStatus;
  reason?: string;
  sentAt?: ISODateTime;
}

/**
 * 한 고객에 대한 메일 발송 계획.
 * due = 지금 발송해야 함 (스케줄러가 보냄), scheduled = 예정, waiting = 기준 이벤트 대기
 */
export function planEmails(b: Booking, enabled: Record<string, boolean>, now: Date = new Date()): PlannedEmail[] {
  const today = todayKST(now);
  const nowIso = now.toISOString();
  const paidAt = b.payments.find((p) => p.kind === 'deposit')?.paidAt;
  return EMAIL_RULES.map((rule): PlannedEmail => {
    const sent = b.emails.find((e) => e.ruleId === rule.id && e.status === 'sent');
    if (sent) return { rule, status: 'sent', sentAt: sent.sentAt, scheduledFor: sent.scheduledFor };
    if (enabled[rule.id] === false) return { rule, status: 'disabled' };
    if (b.cancelledAt) return { rule, status: 'skipped', reason: '취소된 예약' };
    if (rule.trigger.type === 'event') {
      // 이벤트 메일은 행동 직후 앱/함수가 즉시 보냅니다. 조건이 이미 충족됐는데 기록이 없으면 due.
      const happened: Record<EmailEvent, boolean> = {
        created: true,
        quote_sent: !!b.quote?.sentAt,
        adjust_replied: b.adjustRequests.some((r) => !!r.reply),
        deposit_paid: !!paidAt,
        photos_released: !!b.photosReleasedAt,
      };
      return happened[rule.trigger.event] ? { rule, status: 'due', scheduledFor: nowIso } : { rule, status: 'waiting', reason: '해당 단계 도달 시 즉시 발송' };
    }
    const base = anchorDate(rule.trigger.anchor, b);
    if (!base) return { rule, status: 'waiting', reason: '기준일 미정' };
    const day = addDays(base, rule.trigger.offsetDays);
    const at = kstDateTime(day, rule.trigger.hour);
    // 예약금 결제 전에 지나간 D-N 안내는 보내지 않습니다 (늦게 예약한 고객).
    if (rule.trigger.anchor === 'eventDate' && rule.trigger.offsetDays < 0 && paidAt && at < paidAt) return { rule, status: 'skipped', scheduledFor: at, reason: '예약 이전 시점' };
    if (at > nowIso) {
      if (rule.condition === 'paid_not_done' && !depositPaid(b)) return { rule, status: 'waiting', scheduledFor: at, reason: '예약 확정 시 발송' };
      return { rule, status: 'scheduled', scheduledFor: at };
    }
    if (!conditionHolds(rule.condition, b, today)) return { rule, status: 'skipped', scheduledFor: at, reason: '발송 조건 불충족' };
    // 너무 오래 지난 메일(7일 초과)은 놓친 것으로 보고 건너뜁니다.
    if (now.getTime() - new Date(at).getTime() > 7 * 86400000) return { rule, status: 'skipped', scheduledFor: at, reason: '발송 시점 경과' };
    return { rule, status: 'due', scheduledFor: at };
  });
}

/** 브랜드 HTML 메일 — 화이트 · 골드 · 블랙 */
export function emailHtml(c: EmailContent): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  const facts = (c.facts ?? [])
    .map((f) => `<tr><td style="padding:6px 0;color:#7d766b;font-size:13px;width:96px;vertical-align:top">${esc(f.label)}</td><td style="padding:6px 0;color:#141210;font-size:14px;font-weight:600">${esc(f.value)}</td></tr>`)
    .join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(c.subject)}</title></head>
<body style="margin:0;background:#faf8f3;font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#4a453e">
<span style="display:none;max-height:0;overflow:hidden">${esc(c.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f3;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #ece6da;border-radius:12px">
<tr><td style="padding:28px 32px 0;text-align:left"><div style="font-family:Georgia,serif;letter-spacing:4px;font-size:15px;color:#141210">ANGELSDAY</div><div style="height:2px;width:40px;background:#b8924a;margin-top:12px"></div></td></tr>
<tr><td style="padding:24px 32px 8px"><h1 style="margin:0;font-family:'Noto Serif KR',Georgia,serif;font-weight:400;font-size:24px;line-height:1.4;color:#141210">${esc(c.title)}</h1></td></tr>
<tr><td style="padding:8px 32px">${c.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7">${esc(p)}</p>`).join('')}</td></tr>
${facts ? `<tr><td style="padding:4px 32px 8px"><table role="presentation" width="100%" style="border-top:1px solid #ece6da;border-bottom:1px solid #ece6da;padding:10px 0">${facts}</table></td></tr>` : ''}
${c.cta ? `<tr><td style="padding:20px 32px 32px"><a href="${c.cta.url}" style="display:inline-block;background:#141210;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:15px 26px;border-radius:8px">${esc(c.cta.label)} <span style="color:#d9bf85">→</span></a></td></tr>` : ''}
</table>
<p style="font-size:12px;color:#a9a297;line-height:1.7;margin:20px 0 0">${VENUE.name} · ${VENUE.address}<br>${VENUE.phone} · ${VENUE.email}</p>
</td></tr></table></body></html>`;
}

export function enabledMap(state?: Record<string, boolean>): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const r of EMAIL_RULES) m[r.id] = state?.[r.id] ?? r.defaultEnabled;
  return m;
}

/** 지금 보내야 할 메일. onlyEvents=true 면 행동 직후 보내는 이벤트 메일만 */
export function dueEmails(b: Booking, enabled: Record<string, boolean>, now: Date = new Date(), onlyEvents = false): PlannedEmail[] {
  return planEmails(b, enabled, now).filter((p) => p.status === 'due' && (!onlyEvents || p.rule.trigger.type === 'event'));
}

export function withEmailLog(b: Booking, p: PlannedEmail, subject: string, status: 'sent' | 'failed' = 'sent', now: Date = new Date()): Booking {
  const log = {
    id: `em_${p.rule.id}_${now.getTime().toString(36)}`,
    ruleId: p.rule.id,
    subject,
    to: b.customer.email,
    scheduledFor: p.scheduledFor ?? now.toISOString(),
    sentAt: now.toISOString(),
    status,
  };
  return { ...b, emails: [...b.emails, log] };
}

/** 데모 데이터용: 과거 시점에 이미 발송되었을 메일을 기록으로 채웁니다. */
export function backfillEmails(b: Booking, baseUrl: string, now: Date = new Date()): Booking {
  const enabled = enabledMap();
  const eventTime: Record<EmailEvent, string | undefined> = {
    created: b.createdAt,
    quote_sent: b.quote?.sentAt,
    adjust_replied: b.adjustRequests.find((r) => r.repliedAt)?.repliedAt,
    deposit_paid: b.payments.find((p) => p.kind === 'deposit')?.paidAt,
    photos_released: b.photosReleasedAt,
  };
  let out = b;
  for (const p of planEmails(b, enabled, now)) {
    const isEvent = p.rule.trigger.type === 'event';
    const passed = p.status === 'due' || (p.status === 'skipped' && p.reason === '발송 시점 경과');
    if (!passed) continue;
    const at = isEvent ? eventTime[(p.rule.trigger as { event: EmailEvent }).event] : p.scheduledFor;
    if (!at) continue;
    out = withEmailLog(out, { ...p, scheduledFor: at }, renderEmail(p.rule.id, b, baseUrl).subject, 'sent', new Date(at));
  }
  return out;
}
