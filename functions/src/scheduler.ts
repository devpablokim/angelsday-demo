// 매일 오전 10시(KST) — D-60 · D-30 · D-14 · D-7 · D-1 · D+1 · 리마인드 메일을 자동 발송
import { addDays, todayKST } from '../../shared/dates';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { db, TIME_ZONE } from './app';
import { loadEnabledRules, sendDueForBooking, sendRuleNow } from './mail';

/** 스케줄러 본체 — 관리자 화면의 “지금 발송 실행” 버튼도 같은 함수를 씁니다. */
export async function runSchedulerOnce(): Promise<number> {
  const enabled = await loadEnabledRules();
  const from = addDays(todayKST(), -30);
  const snap = await db.collection('bookings').where('date', '>=', from).get();
  let total = 0;
  for (const doc of snap.docs) {
    if (doc.get('cancelledAt')) continue;
    try {
      total += await sendDueForBooking(doc.id, enabled, false);
    } catch (err) {
      logger.error('scheduler: booking failed', { err });
    }
  }
  logger.info('scheduler finished', { bookings: snap.size, sent: total });
  return total;
}

export const scheduledEmails = onSchedule({ schedule: '0 10 * * *', timeZone: TIME_ZONE }, async () => {
  await runSchedulerOnce();
});

function requireAdmin(req: CallableRequest<unknown>) {
  if (req.auth?.token.admin !== true) throw new HttpsError('permission-denied', '관리자만 사용할 수 있어요.');
}

export const runEmailScheduler = onCall(async (req) => {
  requireAdmin(req);
  return { sent: await runSchedulerOnce() };
});

export const sendEmailNow = onCall<{ bookingId?: string; ruleId?: string }>(async (req) => {
  requireAdmin(req);
  const { bookingId, ruleId } = req.data ?? {};
  if (typeof bookingId !== 'string' || typeof ruleId !== 'string') throw new HttpsError('invalid-argument', 'bookingId, ruleId 가 필요해요.');
  try {
    await sendRuleNow(bookingId, ruleId);
  } catch (err) {
    throw new HttpsError('failed-precondition', err instanceof Error ? err.message : '발송 실패');
  }
  return { ok: true };
});
