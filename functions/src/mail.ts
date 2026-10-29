// 메일 발송 — "Trigger Email from Firestore" 확장 프로그램 형식으로 `mail` 컬렉션에 문서를 씁니다.
// 확장 프로그램이 SMTP 로 실제 발송합니다. (README > 메일 발송 설정)
import { dueEmails, EMAIL_RULES, emailHtml, enabledMap, renderEmail, withEmailLog, type EmailContent, type PlannedEmail } from '../../shared/emailRules';
import { log } from '../../shared/ops';
import type { Booking, EmailLog } from '../../shared/types';
import { logger } from 'firebase-functions';
import { baseUrl, db } from './app';

export async function loadEnabledRules(): Promise<Record<string, boolean>> {
  const snap = await db.doc('settings/emailRules').get();
  return enabledMap(snap.exists ? (snap.get('enabled') as Record<string, boolean> | undefined) : undefined);
}

export function emailText(c: EmailContent): string {
  const facts = (c.facts ?? []).map((f) => `${f.label}: ${f.value}`).join('\n');
  return [c.title, '', ...c.paragraphs, '', facts, '', c.cta ? `${c.cta.label}: ${c.cta.url}` : ''].join('\n').trim();
}

function mailDoc(b: Booking, ruleId: string, c: EmailContent) {
  return {
    to: b.customer.email,
    message: { subject: c.subject, html: emailHtml(c), text: emailText(c) },
    // 관리자 추적용 메타데이터 (확장 프로그램은 무시)
    meta: { bookingId: b.id, ruleId, createdAt: new Date().toISOString() },
  };
}

/** 발송 중복 방지 마커 — bookings 문서의 emails 배열이 덮어써져도 같은 메일을 두 번 보내지 않습니다. */
const markerRef = (bookingId: string, ruleId: string) => db.doc(`emailSent/${bookingId}__${ruleId}`);

/**
 * 한 예약에 대해 지금 보내야 할 메일을 트랜잭션으로 발송 · 기록합니다.
 * @returns 실제로 발송(큐잉)한 메일 수
 */
export async function sendDueForBooking(bookingId: string, enabled: Record<string, boolean>, onlyEvents: boolean): Promise<number> {
  const ref = db.doc(`bookings/${bookingId}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 0;
    const b = { ...(snap.data() as Booking), id: snap.id };
    if (!b.customer?.email) return 0;
    const due = dueEmails(b, enabled, new Date(), onlyEvents);
    if (!due.length) return 0;

    const markers = await Promise.all(due.map((p) => tx.get(markerRef(b.id, p.rule.id))));
    let next = b;
    let sent = 0;
    due.forEach((p: PlannedEmail, i) => {
      const marker = markers[i];
      if (marker.exists) {
        // 이미 보낸 메일 — 기록만 복구
        const prev = marker.get('log') as EmailLog | undefined;
        if (prev && !next.emails.some((e) => e.ruleId === prev.ruleId && e.status === 'sent')) next = { ...next, emails: [...next.emails, prev] };
        return;
      }
      const content = renderEmail(p.rule.id, next, baseUrl());
      next = withEmailLog(next, p, content.subject);
      const logEntry = next.emails[next.emails.length - 1];
      tx.create(db.collection('mail').doc(), mailDoc(next, p.rule.id, content));
      tx.create(markerRef(b.id, p.rule.id), { log: logEntry, bookingId: b.id, ruleId: p.rule.id });
      sent++;
    });
    if (next.emails.length !== b.emails.length) tx.update(ref, { emails: next.emails });
    return sent;
  });
}

/** 관리자 수동 발송 — 중복 방지 마커와 관계없이 즉시 보냅니다. */
export async function sendRuleNow(bookingId: string, ruleId: string): Promise<void> {
  const ref = db.doc(`bookings/${bookingId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('예약을 찾을 수 없습니다.');
    const b = { ...(snap.data() as Booking), id: snap.id };
    const rule = EMAIL_RULES.find((r) => r.id === ruleId);
    if (!rule) throw new Error(`알 수 없는 메일 규칙: ${ruleId}`);
    const content = renderEmail(ruleId, b, baseUrl());
    let next = withEmailLog(b, { rule, status: 'due', scheduledFor: new Date().toISOString() }, content.subject);
    next = log(next, 'admin', 'email', `메일 수동 발송: ${content.subject}`, true);
    tx.create(db.collection('mail').doc(), mailDoc(next, ruleId, content));
    tx.set(markerRef(b.id, ruleId), { log: next.emails[next.emails.length - 1], bookingId: b.id, ruleId });
    tx.update(ref, { emails: next.emails, timeline: next.timeline, updatedAt: next.updatedAt });
  });
  logger.info('manual email queued', { bookingId, ruleId });
}
