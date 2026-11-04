import { formatDate, formatDateTime, won } from '@shared/dates';
import { eventConfig, headlinePlain } from '@shared/eventTypes';
import * as ops from '@shared/ops';
import { calcQuote, paidAmount } from '@shared/quote';
import type { Booking, Payment } from '@shared/types';
import { hallName, VENUE } from '@shared/venue';
import { forwardRef, useRef, useState } from 'react';
import { Logo } from '../brand/Logo';
import { elementToPdf } from '../lib/pdf';
import { Icon } from './Icon';
import { useToast } from './ui';

/** 결제 영수증 — 견적서와 같은 문서 양식으로 화면 밖에서 그려 PDF 로 저장합니다. */
export const ReceiptDocument = forwardRef<HTMLDivElement, { booking: Booking; payment: Payment }>(function ReceiptDocument({ booking: b, payment: p }, ref) {
  const cfg = eventConfig(b.eventType);
  const total = b.quote ? calcQuote(b.quote).total : undefined;
  const label = p.kind === 'deposit' ? `예약금${b.quote ? ` (${b.quote.depositRate}%)` : ''}` : '잔금';
  return (
    <div ref={ref} className="quote-doc quote-doc--pdf">
      <div className="quote-doc__head" data-pdf-keep>
        <div>
          <div className="overline">RECEIPT · {p.receiptNo}</div>
          <h2 className="quote-doc__title">영수증</h2>
          <p className="caption">발행일 {formatDate(p.paidAt.slice(0, 10), { weekday: false })}</p>
        </div>
        <Logo layout="horizontal" variant="ink" height={34} showTagline={false} />
      </div>

      <dl className="quote-doc__info" data-pdf-keep>
        <div>
          <dt>고객</dt>
          <dd>{b.customer.name} 님</dd>
        </div>
        <div>
          <dt>행사</dt>
          <dd>
            {cfg.label} — {headlinePlain(b.eventType, b.honorees).replace(/까지$/, '')}
          </dd>
        </div>
        <div>
          <dt>일시</dt>
          <dd>
            {formatDate(b.date)} {b.time}
          </dd>
        </div>
        <div>
          <dt>장소</dt>
          <dd>{b.eventType === 'catering' ? b.location || '출장' : `${VENUE.name} ${hallName(b.hallId)}`}</dd>
        </div>
      </dl>

      <table className="quote-doc__table">
        <thead>
          <tr>
            <th>결제 항목</th>
            <th className="num">결제 수단</th>
            <th className="num">결제 일시</th>
            <th className="num">금액</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{label}</td>
            <td className="num">{ops.methodLabel(p.method)}</td>
            <td className="num">{formatDateTime(p.paidAt)}</td>
            <td className="num">{p.amount.toLocaleString('ko-KR')}</td>
          </tr>
        </tbody>
      </table>

      <div className="quote-doc__totals" data-pdf-keep>
        <div className="quote-doc__row quote-doc__row--total">
          <span>받은 금액</span>
          <span className="price">{won(p.amount)}</span>
        </div>
        {total !== undefined && (
          <div className="quote-doc__split">
            <div>
              <span className="label">총 견적 금액</span>
              <span className="price">{won(total)}</span>
            </div>
            <div>
              <span className="label">{total - paidAmount(b) > 0 ? '남은 잔금 · 행사 당일 현장 결제' : '결제 상태'}</span>
              <span className="price">{total - paidAmount(b) > 0 ? won(total - paidAmount(b)) : '전액 결제 완료'}</span>
            </div>
          </div>
        )}
      </div>

      {p.memo && (
        <div className="quote-doc__memo" data-pdf-keep>
          <span className="label">메모</span>
          <p>{p.memo}</p>
        </div>
      )}
      <p className="quote-doc__foot" data-pdf-keep>
        위 금액을 정히 영수합니다. 세금계산서와 현금영수증은 요청하시면 발행해 드려요. · {VENUE.name} · 대표 {VENUE.ceo} · 사업자등록번호 {VENUE.bizNo} · {VENUE.address} · {VENUE.phone}
      </p>
    </div>
  );
});

export function ReceiptPdfButton({ booking: b, payment: p, label = '영수증 PDF', className = 'btn btn--secondary' }: { booking: Booking; payment: Payment; label?: string; className?: string }) {
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      await elementToPdf(ref.current, `${VENUE.name}_영수증_${p.kind === 'deposit' ? '예약금' : '잔금'}_${p.receiptNo}.pdf`);
    } catch {
      toast('영수증을 만들지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button className={className} onClick={run} disabled={busy}>
        {busy ? <span className="spinner spinner--dark" /> : <Icon name="download" size={18} />} {label}
      </button>
      <div className="pdf-stage" aria-hidden="true">
        <ReceiptDocument ref={ref} booking={b} payment={p} />
      </div>
    </>
  );
}
