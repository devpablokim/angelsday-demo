import { formatDateTime, won } from '@shared/dates';
import * as ops from '@shared/ops';
import { calcQuote, paidAmount } from '@shared/quote';
import { depositPaid } from '@shared/steps';
import type { Booking, Payment, PaymentMethod } from '@shared/types';
import { useState } from 'react';
import { Empty } from '../../../components/ui';
import { digitsOnly, useSaveBooking } from '../adminUtils';

export function PaymentsTab({ booking: b }: { booking: Booking }) {
  const save = useSaveBooking();
  const totals = b.quote ? calcQuote(b.quote) : undefined;
  const paid = paidAmount(b);
  const remaining = totals ? Math.max(0, totals.total - paid) : 0;
  const defaultKind: Payment['kind'] = depositPaid(b) ? 'balance' : 'deposit';
  const [kind, setKind] = useState<Payment['kind']>(defaultKind);
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [amount, setAmount] = useState<number>(defaultKind === 'deposit' ? totals?.deposit ?? 0 : remaining);
  const [memo, setMemo] = useState('');

  function pickKind(k: Payment['kind']) {
    setKind(k);
    setAmount(k === 'deposit' ? totals?.deposit ?? 0 : remaining);
  }

  async function onAdd() {
    if (amount <= 0) return;
    if (await save(ops.addPayment(b, kind, amount, method, 'admin', memo || undefined), `${kind === 'deposit' ? '예약금' : '잔금'} ${won(amount)} 결제를 등록했어요.`)) setMemo('');
  }

  return (
    <div className="detail-grid">
      <section className="card">
        <div className="title-md">결제 현황</div>
        <div className="adm-pay-summary mt-16">
          <div>
            <span className="label">견적 총액</span>
            <span className="price numeral">{totals ? won(totals.total) : '—'}</span>
          </div>
          <div>
            <span className="label">결제 완료</span>
            <span className="price numeral">{won(paid)}</span>
          </div>
          <div className={remaining > 0 ? 'is-due' : ''}>
            <span className="label">남은 금액</span>
            <span className="price numeral">{totals ? won(remaining) : '—'}</span>
          </div>
        </div>
        {totals && (
          <div className="progress mt-16" aria-label={`결제 진행률 ${Math.round((paid / Math.max(1, totals.total)) * 100)}%`}>
            <div className="progress__bar" style={{ width: `${Math.min(100, (paid / Math.max(1, totals.total)) * 100)}%` }} />
          </div>
        )}
        <div className="mt-24">
          {b.payments.length === 0 ? (
            <Empty>아직 결제 내역이 없어요.</Empty>
          ) : (
            <ul className="list">
              {[...b.payments].reverse().map((p) => (
                <li key={p.id} className="list-item">
                  <span className={`badge ${p.kind === 'deposit' ? 'badge--gold' : 'badge--ink'}`}>{p.kind === 'deposit' ? '예약금' : '잔금'}</span>
                  <div className="list-item__body">
                    <div className="list-item__title price">{won(p.amount)}</div>
                    <div className="list-item__meta">
                      {ops.methodLabel(p.method)} · {formatDateTime(p.paidAt)} · 영수증 {p.receiptNo}
                      {p.memo ? ` · ${p.memo}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card">
        <div className="title-md">결제 수동 등록</div>
        <p className="caption">계좌이체 입금 확인, 현장 카드 결제 등을 기록해요. 예약금이 등록되면 예약이 확정되고 준비 리스트가 생성돼요.</p>
        <div className="stack gap-16 mt-16">
          <div className="row gap-8">
            {(['deposit', 'balance'] as const).map((k) => (
              <button key={k} className="chip chip--sm" aria-pressed={kind === k} onClick={() => pickKind(k)}>
                {k === 'deposit' ? '예약금' : '잔금'}
              </button>
            ))}
          </div>
          <div className="row wrap gap-8">
            {(['transfer', 'card', 'onsite', 'kakaopay'] as PaymentMethod[]).map((m) => (
              <button key={m} className="chip chip--sm chip--gold-active" aria-pressed={method === m} onClick={() => setMethod(m)}>
                {ops.methodLabel(m)}
              </button>
            ))}
          </div>
          <label className="field">
            <span className="field__label">금액 (원)</span>
            <input className="input" inputMode="numeric" value={amount.toLocaleString('ko-KR')} onChange={(e) => setAmount(digitsOnly(e.target.value))} />
          </label>
          <label className="field">
            <span className="field__label">메모</span>
            <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예) 신랑 측 계좌 입금 확인" />
          </label>
          <button className="btn btn--primary" disabled={amount <= 0} onClick={() => void onAdd()}>
            결제 등록
          </button>
        </div>
      </section>
    </div>
  );
}
