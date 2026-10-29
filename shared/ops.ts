// 예약(Booking)을 바꾸는 순수 함수 모음. 모든 변경은 타임라인에 기록됩니다.
import { formatDate, todayKST } from './dates';
import { defaultRequirements, eventConfig, honoreesFromForm } from './eventTypes';
import { accessCode, bookingToken, receiptNo, uid } from './ids';
import { generatePrep } from './prepTemplates';
import { calcQuote } from './quote';
import type {
  Actor,
  AdjustRequest,
  Booking,
  ChecklistItem,
  EventType,
  HallId,
  Payment,
  PaymentMethod,
  PrepTask,
  Quote,
  Requirements,
  TaskStatus,
} from './types';
import { hallName } from './venue';

let clock: () => Date = () => new Date();
const nowIso = () => clock().toISOString();

/** 데모 데이터 생성용: 지정한 시각으로 동작을 실행합니다. */
export function at<T>(when: Date, fn: () => T): T {
  const prev = clock;
  clock = () => when;
  try {
    return fn();
  } finally {
    clock = prev;
  }
}

export function log(b: Booking, actor: Actor, type: string, message: string, internal = false): Booking {
  return { ...b, updatedAt: nowIso(), timeline: [...b.timeline, { id: uid('tl'), at: nowIso(), actor, type, message, internal }] };
}

export interface InquiryInput {
  eventType: EventType;
  date: string;
  time: string;
  hallId?: HallId;
  guests: number;
  customer: { name: string; phone: string; email: string };
  honoreeValues: Requirements;
  memo?: string;
  source?: Booking['source'];
}

export function createBooking(input: InquiryInput): Booking {
  const cfg = eventConfig(input.eventType);
  const honorees = honoreesFromForm(input.eventType, input.honoreeValues);
  const requirements: Requirements = { ...defaultRequirements(input.eventType), guestsAdult: input.guests };
  if (input.hallId) requirements.hallId = input.hallId;
  const location = input.eventType === 'catering' ? String(input.honoreeValues.location ?? '') : undefined;
  if (location) requirements.location = location;
  const t = nowIso();
  const b: Booking = {
    id: bookingToken(),
    accessCode: accessCode(),
    eventType: input.eventType,
    date: input.date,
    time: input.time,
    hallId: cfg.usesHall ? input.hallId : undefined,
    location,
    guests: input.guests,
    customer: input.customer,
    honorees,
    inquiryMemo: input.memo,
    source: input.source ?? 'web',
    requirements,
    adjustRequests: [],
    payments: [],
    prepTasks: [],
    checklist: [],
    daySchedule: [],
    photos: [],
    timeline: [],
    emails: [],
    createdAt: t,
    updatedAt: t,
  };
  const where = cfg.usesHall ? hallName(input.hallId) : location || '출장';
  return log(b, 'customer', 'created', `${cfg.label} 문의 접수 — ${formatDate(input.date)} ${input.time} · ${where} · ${input.guests}명`);
}

export function saveRequirements(b: Booking, req: Requirements): Booking {
  return { ...b, requirements: req, updatedAt: nowIso() };
}

export function submitRequirements(b: Booking, req: Requirements, actor: Actor = 'customer'): Booking {
  const adults = Number(req.guestsAdult ?? b.guests) || b.guests;
  const kids = Number(req.guestsKids ?? 0) || 0;
  const hallId = (req.hallId as HallId | undefined) ?? b.hallId;
  const resubmit = !!b.requirementsSubmittedAt;
  const next: Booking = {
    ...b,
    requirements: req,
    guests: adults + kids,
    hallId: b.eventType === 'catering' ? undefined : hallId,
    location: b.eventType === 'catering' ? String(req.location ?? b.location ?? '') : b.location,
    requirementsSubmittedAt: nowIso(),
  };
  return log(next, actor, 'requirements', resubmit ? '필요사항을 수정해 다시 제출했어요' : `필요사항 제출 완료 (총 ${adults + kids}명)`);
}

export function reopenRequirements(b: Booking): Booking {
  return log({ ...b, requirementsSubmittedAt: undefined }, 'customer', 'requirements', '필요사항 수정을 시작했어요');
}

export function saveQuoteDraft(b: Booking, q: Quote): Booking {
  return { ...b, quote: { ...q, status: b.quote?.status === 'sent' && q.status === 'sent' ? 'sent' : q.status, updatedAt: nowIso() }, updatedAt: nowIso() };
}

export function sendQuote(b: Booking, q: Quote): Booking {
  const t = calcQuote(q);
  const quote: Quote = { ...q, status: 'sent', sentAt: nowIso(), updatedAt: nowIso() };
  const adjustRequests = b.adjustRequests.map((r): AdjustRequest => (r.status === 'open' ? { ...r, status: 'resolved', reply: r.reply ?? `견적서 v${q.version}에 반영했어요.`, repliedAt: r.repliedAt ?? nowIso() } : r));
  return log({ ...b, quote, adjustRequests }, 'admin', 'quote', `견적서 v${q.version} 발송 — 총 ${t.total.toLocaleString('ko-KR')}원${q.discountRate ? ` (할인 ${q.discountRate}%)` : ''}`);
}

export function requestAdjust(b: Booking, message: string): Booking {
  const r: AdjustRequest = { id: uid('ar'), at: nowIso(), message, status: 'open' };
  return log({ ...b, adjustRequests: [...b.adjustRequests, r] }, 'customer', 'adjust', `견적 조정 요청: ${message}`);
}

export function replyAdjust(b: Booking, id: string, reply: string, resolve = true): Booking {
  const adjustRequests = b.adjustRequests.map((r): AdjustRequest => (r.id === id ? { ...r, reply, repliedAt: nowIso(), status: resolve ? 'resolved' : r.status } : r));
  return log({ ...b, adjustRequests }, 'admin', 'adjust', `조정 요청 답변: ${reply}`);
}

export function addPayment(b: Booking, kind: Payment['kind'], amount: number, method: PaymentMethod, actor: Actor = 'customer', memo?: string): Booking {
  const p: Payment = { id: uid('pay'), kind, amount, method, paidAt: nowIso(), receiptNo: receiptNo(), memo };
  let next: Booking = { ...b, payments: [...b.payments, p] };
  if (kind === 'deposit') {
    if (next.quote) next.quote = { ...next.quote, status: 'accepted', acceptedAt: nowIso() };
    if (!next.prepTasks.length) next = { ...next, ...generatePrep(next, todayKST(clock())) };
  }
  const label = kind === 'deposit' ? '예약금' : '잔금';
  return log(next, actor, 'payment', `${label} ${amount.toLocaleString('ko-KR')}원 결제 완료 (${methodLabel(method)})${kind === 'deposit' ? ' — 예약 확정' : ''}`);
}

export function methodLabel(m: PaymentMethod): string {
  return { card: '신용·체크카드', transfer: '계좌이체', kakaopay: '카카오페이', onsite: '현장 결제' }[m];
}

export function startPrep(b: Booking, actor: Actor = 'customer'): Booking {
  if (b.prepStartedAt) return b;
  const base = b.prepTasks.length ? b : { ...b, ...generatePrep(b, todayKST(clock())) };
  return log({ ...base, prepStartedAt: nowIso() }, actor, 'prep', '준비 사항 확인을 시작했어요');
}

export function setTaskStatus(b: Booking, id: string, status: TaskStatus, note?: string): Booking {
  const task = b.prepTasks.find((t) => t.id === id);
  if (!task) return b;
  const prepTasks = b.prepTasks.map((t): PrepTask => (t.id === id ? { ...t, status, note: note ?? t.note, updatedAt: nowIso() } : t));
  const label = { todo: '준비 예정', doing: '진행 중', done: '완료' }[status];
  return log({ ...b, prepTasks }, 'admin', 'prep', `[준비] ${task.title} → ${label}${note ? ` · ${note}` : ''}`, !task.visibleToCustomer);
}

export function upsertTask(b: Booking, t: PrepTask): Booking {
  const exists = b.prepTasks.some((x) => x.id === t.id);
  const prepTasks = exists ? b.prepTasks.map((x) => (x.id === t.id ? { ...t, updatedAt: nowIso() } : x)) : [...b.prepTasks, { ...t, updatedAt: nowIso() }];
  prepTasks.sort((a, z) => a.dueDate.localeCompare(z.dueDate));
  return exists ? { ...b, prepTasks, updatedAt: nowIso() } : log({ ...b, prepTasks }, 'admin', 'prep', `[준비] 항목 추가: ${t.title}`, !t.visibleToCustomer);
}

export function removeTask(b: Booking, id: string): Booking {
  return { ...b, prepTasks: b.prepTasks.filter((t) => t.id !== id), updatedAt: nowIso() };
}

export function toggleChecklist(b: Booking, id: string, done: boolean, actor: Actor = 'customer'): Booking {
  const item = b.checklist.find((c) => c.id === id);
  if (!item) return b;
  const checklist = b.checklist.map((c): ChecklistItem => (c.id === id ? { ...c, done, doneAt: done ? nowIso() : undefined } : c));
  return log({ ...b, checklist }, actor, 'checklist', `[체크리스트] ${item.title} ${done ? '완료' : '완료 취소'}`);
}

export function addChecklist(b: Booking, title: string, dueDate: string, actor: Actor, description?: string): Booking {
  const item: ChecklistItem = { id: uid('ck'), title, description, dueDate, done: false, addedBy: actor === 'customer' ? 'customer' : 'admin' };
  const checklist = [...b.checklist, item].sort((a, z) => a.dueDate.localeCompare(z.dueDate));
  return log({ ...b, checklist }, actor, 'checklist', `[체크리스트] 항목 추가: ${title}`);
}

export function removeChecklist(b: Booking, id: string): Booking {
  return { ...b, checklist: b.checklist.filter((c) => c.id !== id), updatedAt: nowIso() };
}

export function addNote(b: Booking, message: string, internal: boolean): Booking {
  return log(b, 'admin', 'note', message, internal);
}

export function releasePhotos(b: Booking, release: boolean): Booking {
  return log({ ...b, photosReleasedAt: release ? nowIso() : undefined }, 'admin', 'photos', release ? `행사 사진 ${b.photos.length}장 공개` : '행사 사진 비공개 전환');
}

export function cancelBooking(b: Booking, reason: string): Booking {
  return log({ ...b, cancelledAt: nowIso() }, 'admin', 'cancel', `예약 취소 — ${reason}`);
}

export function isPast(b: Booking, today = todayKST()): boolean {
  return b.date < today;
}
