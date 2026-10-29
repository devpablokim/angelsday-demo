import { formatDate, won } from '@shared/dates';
import { eventConfig, headlinePlain } from '@shared/eventTypes';
import { calcQuote, groupLines, lineAmount } from '@shared/quote';
import type { Booking, Quote } from '@shared/types';
import { hallName, VENUE } from '@shared/venue';
import { forwardRef } from 'react';
import { Logo } from '../brand/Logo';

/** 견적서 — 화면 표시와 PDF 생성(html2canvas)에 같은 마크업을 사용합니다. */
export const QuoteDocument = forwardRef<HTMLDivElement, { booking: Booking; quote: Quote; forPdf?: boolean }>(function QuoteDocument({ booking: b, quote: q, forPdf }, ref) {
  const t = calcQuote(q);
  const cfg = eventConfig(b.eventType);
  return (
    <div ref={ref} className={`quote-doc ${forPdf ? 'quote-doc--pdf' : ''}`}>
      <div className="quote-doc__head" data-pdf-keep>
        <div>
          <div className="overline">ESTIMATE · v{q.version}</div>
          <h2 className="quote-doc__title">견적서</h2>
          <p className="caption">
            발행일 {formatDate((q.sentAt ?? q.updatedAt).slice(0, 10), { weekday: false })} · 유효기간 {formatDate(q.validUntil, { weekday: false })}까지
          </p>
        </div>
        <Logo layout="horizontal" variant="ink" height={34} showTagline={false} />
      </div>

      <dl className="quote-doc__info" data-pdf-keep>
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
        <div>
          <dt>고객</dt>
          <dd>
            {b.customer.name} 님 · {b.guests}명
          </dd>
        </div>
      </dl>

      <table className="quote-doc__table">
        <thead>
          <tr>
            <th>항목</th>
            <th className="num">단가</th>
            <th className="num">수량</th>
            <th className="num">금액</th>
          </tr>
        </thead>
        {groupLines(q.lines).map((g) => (
          <tbody key={g.category}>
            <tr className="quote-doc__cat" data-pdf-keep-next>
              <td colSpan={4}>{g.category}</td>
            </tr>
            {g.lines.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.label}
                  {l.note && <div className="caption">{l.note}</div>}
                </td>
                <td className="num">{l.unitPrice.toLocaleString('ko-KR')}</td>
                <td className="num">
                  {l.qty}
                  {l.unit}
                </td>
                <td className="num">{lineAmount(l).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      <div className="quote-doc__totals" data-pdf-keep>
        <div className="quote-doc__row">
          <span>소계</span>
          <span className="price">{won(t.subtotal)}</span>
        </div>
        {t.discountAmount > 0 && (
          <div className="quote-doc__row quote-doc__row--discount">
            <span>
              할인 {q.discountRate > 0 && <b>{q.discountRate}%</b>} {q.discountLabel && <span className="caption">({q.discountLabel})</span>}
              {q.extraDiscount > 0 && <span className="caption"> · 추가 할인 {won(q.extraDiscount)}</span>}
            </span>
            <span className="price">−{won(t.discountAmount)}</span>
          </div>
        )}
        <div className="quote-doc__row quote-doc__row--total">
          <span>총 견적 금액</span>
          <span className="price">{won(t.total)}</span>
        </div>
        <div className="quote-doc__split">
          <div>
            <span className="label">예약금 ({q.depositRate}%) · 지금 결제</span>
            <span className="price">{won(t.deposit)}</span>
          </div>
          <div>
            <span className="label">잔금 · 행사 당일 현장 결제</span>
            <span className="price">{won(t.balance)}</span>
          </div>
        </div>
      </div>

      {q.memo && (
        <div className="quote-doc__memo" data-pdf-keep>
          <span className="label">플래너 메모</span>
          <p>{q.memo}</p>
        </div>
      )}
      <p className="quote-doc__foot" data-pdf-keep>
        VAT 포함 금액입니다. 최종 인원은 행사 7일 전까지 확정해 주세요. · {VENUE.name} · {VENUE.address} · {VENUE.phone} · 사업자등록번호 {VENUE.bizNo}
      </p>
    </div>
  );
});
