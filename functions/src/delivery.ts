// 메일 실제 발송 — `mail` 컬렉션에 새 문서가 생기면 지메일 SMTP 로 보냅니다.
// 문서 형식과 delivery 필드는 "Trigger Email from Firestore" 확장 프로그램과 같습니다.
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import nodemailer from 'nodemailer';
import { VENUE } from '../../shared/venue';
import { db } from './app';

/** "보내는주소@gmail.com 앱비밀번호16자리" (공백으로 구분) — README 6-6 의 gcloud 명령으로 등록. 예전 JSON 형식도 읽습니다. */
const GMAIL_SMTP = defineSecret('GMAIL_SMTP');

/**
 * 비밀 값을 읽습니다. 형식이 틀려도 오류 메시지에 비밀 값이 한 글자도 남지 않게 합니다
 * (오류는 mail 문서의 delivery.error 와 함수 로그에 기록되기 때문 — JSON.parse 오류는 원문 일부를 담습니다).
 */
export function parseGmailSecret(raw: string): { user: string; pass: string } {
  const s = raw.trim();
  let user = '';
  let pass = '';
  if (s.startsWith('{')) {
    try {
      const o = JSON.parse(s) as { user?: unknown; pass?: unknown };
      user = String(o.user ?? '');
      pass = String(o.pass ?? '');
    } catch {
      // 따옴표가 하나 빠진 정도의 손입력 실수는 그대로 읽습니다 (예: "pass":abcd…")
      user = /"?user"?\s*:\s*"?([^",}\s]+)/.exec(s)?.[1] ?? '';
      pass = /"?pass"?\s*:\s*"?([^"}]*)/.exec(s)?.[1] ?? '';
      if (!user || !pass) throw new Error('GMAIL_SMTP 값을 읽지 못했어요. "보내는주소 앱비밀번호" 형식으로 다시 등록해 주세요.');
    }
  } else {
    const [first = '', ...rest] = s.split(/\s+/);
    user = first;
    pass = rest.join('');
  }
  user = user.trim();
  pass = pass.replace(/\s/g, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) throw new Error('GMAIL_SMTP 값의 보내는 주소가 올바르지 않아요.');
  if (pass.length !== 16) throw new Error(`GMAIL_SMTP 값의 앱 비밀번호가 16자리가 아니에요 (${pass.length}자리).`);
  return { user, pass };
}

interface MailDoc {
  to?: string | string[];
  message?: { subject?: string; html?: string; text?: string };
  meta?: { bookingId?: string; ruleId?: string };
}

/** 예시용 도메인(RFC 2606 · 6761)은 보내지 않습니다 — 데모 시드 데이터가 실제로 발송되지 않도록 */
export function isReservedAddress(to: string): boolean {
  const domain = to.split('@').pop()?.toLowerCase() ?? '';
  return /(^|\.)example\.(com|net|org)$/.test(domain) || /\.(test|example|invalid|localhost)$/.test(domain);
}

let cached: { transporter: nodemailer.Transporter; from: string } | undefined;
function gmail() {
  if (!cached) {
    const { user, pass } = parseGmailSecret(GMAIL_SMTP.value());
    cached = {
      transporter: nodemailer.createTransport({ service: 'gmail', auth: { user, pass } }),
      from: `"${VENUE.name}" <${user}>`,
    };
  }
  return cached;
}

export const deliverMail = onDocumentCreated({ document: 'mail/{mailId}', secrets: [GMAIL_SMTP] }, async (event) => {
  const ref = event.data?.ref;
  if (!ref) return;

  // 같은 이벤트가 두 번 전달돼도 한 번만 보내도록 먼저 PROCESSING 으로 잠급니다.
  const mail = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get('delivery.state')) return null;
    tx.update(ref, { delivery: { state: 'PROCESSING', attempts: 1, startTime: FieldValue.serverTimestamp() } });
    return snap.data() as MailDoc;
  });
  if (!mail) return;

  const ctx = { mailId: event.params.mailId, bookingId: mail.meta?.bookingId, ruleId: mail.meta?.ruleId };
  const to = ([] as string[]).concat(mail.to ?? []).filter((a) => a && !isReservedAddress(a));
  if (!to.length) {
    await ref.update({ 'delivery.state': 'SKIPPED', 'delivery.endTime': FieldValue.serverTimestamp(), 'delivery.error': '받는 주소가 없거나 예시 도메인이에요' });
    logger.info('mail skipped', ctx);
    return;
  }

  try {
    const { transporter, from } = gmail();
    const info = await transporter.sendMail({ from, to, subject: mail.message?.subject, html: mail.message?.html, text: mail.message?.text });
    await ref.update({
      'delivery.state': 'SUCCESS',
      'delivery.endTime': FieldValue.serverTimestamp(),
      'delivery.info': { messageId: info.messageId, accepted: info.accepted.map(String), rejected: info.rejected.map(String), response: info.response },
    });
    logger.info('mail sent', ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ref.update({ 'delivery.state': 'ERROR', 'delivery.endTime': FieldValue.serverTimestamp(), 'delivery.error': message });
    logger.error('mail failed', { ...ctx, message });
  }
});
