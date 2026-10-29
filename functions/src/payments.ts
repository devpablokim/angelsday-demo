// 예약금 결제 — 기본은 MOCK(데모) 결제입니다. 실제 PG 연동은 confirmWithProvider() 한 곳만 구현하면 됩니다.
import * as ops from '../../shared/ops';
import { calcQuote } from '../../shared/quote';
import type { Booking, PaymentMethod } from '../../shared/types';
import { defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from './app';

/** 'mock' | 'toss' — 실제 PG 연동 후 'toss' 로 바꾸세요. */
const PAYMENT_PROVIDER = defineString('PAYMENT_PROVIDER', { default: 'mock', description: '결제 제공자 (mock | toss)' });

const METHODS: PaymentMethod[] = ['card', 'transfer', 'kakaopay'];

interface ConfirmInput {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  /** 실제 PG 결제창에서 받은 승인 키 (토스페이먼츠 paymentKey 등) */
  paymentKey?: string;
}

/**
 * PG 승인 확인. ⚠️ 실제 돈이 오가는 단계이므로 반드시 서버에서 금액을 다시 검증합니다.
 *
 * TODO(PG 연동) — 토스페이먼츠 예시:
 *   1) const TOSS_SECRET_KEY = defineSecret('TOSS_SECRET_KEY');  // firebase functions:secrets:set TOSS_SECRET_KEY
 *      그리고 payDeposit 옵션에 { secrets: [TOSS_SECRET_KEY] } 추가
 *   2) 웹의 결제 페이지(src/pages/customer/PaymentPage.tsx)에서 토스 결제위젯으로 결제 후 paymentKey 를 이 함수로 전달
 *   3) 아래처럼 승인 API 호출:
 *      const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
 *        method: 'POST',
 *        headers: { Authorization: 'Basic ' + Buffer.from(TOSS_SECRET_KEY.value() + ':').toString('base64'), 'Content-Type': 'application/json' },
 *        body: JSON.stringify({ paymentKey: input.paymentKey, orderId: input.bookingId, amount: input.amount }),
 *      });
 *      if (!res.ok) return { approved: false, message: (await res.json()).message };
 *      return { approved: true, providerRef: (await res.json()).paymentKey };
 */
async function confirmWithProvider(input: ConfirmInput): Promise<{ approved: boolean; providerRef?: string; message?: string }> {
  const provider = PAYMENT_PROVIDER.value() || 'mock';
  if (provider === 'mock') return { approved: true, providerRef: `MOCK-${Date.now()}` };
  // 실제 PG 가 연결되지 않았는데 mock 이 아닌 값이면 결제를 막습니다.
  logger.error('payment provider not implemented', { provider, bookingId: input.bookingId });
  return { approved: false, message: '결제 시스템 준비 중이에요. 담당 플래너에게 문의해 주세요.' };
}

export const payDeposit = onCall<{ bookingId?: string; method?: string; paymentKey?: string }>(async (req) => {
  const { bookingId, method, paymentKey } = req.data ?? {};
  if (typeof bookingId !== 'string' || bookingId.length < 8 || bookingId.length > 64) throw new HttpsError('invalid-argument', '예약 정보가 올바르지 않아요.');
  if (!METHODS.includes(method as PaymentMethod)) throw new HttpsError('invalid-argument', '결제 수단을 선택해 주세요.');

  const ref = db.doc(`bookings/${bookingId}`);
  // 금액은 클라이언트가 아닌 서버에 저장된 견적서로 계산합니다.
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', '예약을 찾을 수 없어요.');
  const pre = { ...(snap.data() as Booking), id: snap.id };
  if (!pre.quote || pre.quote.status !== 'sent') throw new HttpsError('failed-precondition', '결제할 수 있는 견적서가 없어요.');
  if (pre.payments.some((p) => p.kind === 'deposit')) return { ok: true, already: true };
  const amount = calcQuote(pre.quote).deposit;

  const result = await confirmWithProvider({ bookingId, amount, method: method as PaymentMethod, paymentKey });
  if (!result.approved) throw new HttpsError('aborted', result.message ?? '결제가 승인되지 않았어요.');

  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const b = { ...(s.data() as Booking), id: s.id };
    if (b.payments.some((p) => p.kind === 'deposit')) return;
    if (!b.quote || calcQuote(b.quote).deposit !== amount) throw new HttpsError('aborted', '견적이 변경되었어요. 새로고침 후 다시 시도해 주세요.');
    const next = ops.addPayment(b, 'deposit', amount, method as PaymentMethod, 'customer', result.providerRef);
    tx.set(ref, next);
  });
  logger.info('deposit paid', { amount, provider: PAYMENT_PROVIDER.value() || 'mock' });
  return { ok: true };
});
