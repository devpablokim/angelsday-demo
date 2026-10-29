import { formatDate, formatDateTime, todayKST, won, wonShort } from '@shared/dates';
import * as ops from '@shared/ops';
import { calcQuote, expectedRevenue } from '@shared/quote';
import type { Booking } from '@shared/types';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../../brand/Logo';
import { openChat } from '../../../components/ChatBot';
import { Icon } from '../../../components/Icon';
import { QuoteDocument } from '../../../components/QuoteDocument';
import { Sheet, useToast } from '../../../components/ui';
import { useCatalog, useStore } from '../../../data/hooks';
import { elementToPdf } from '../../../lib/pdf';

const ADJUST_CHIPS = ['인원을 바꾸고 싶어요', '메뉴 코스를 바꾸고 싶어요', '꽃장식을 바꾸고 싶어요', '추가 할인이 가능한지 궁금해요', '항목을 빼고 싶어요'];

export function QuotePdfButton({ booking: b, label = '견적서 PDF' }: { booking: Booking; label?: string }) {
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  if (!b.quote) return null;
  const run = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      await elementToPdf(ref.current, `엔젤스데이_견적서_${b.customer.name}_v${b.quote!.version}.pdf`);
    } catch {
      toast('PDF를 만들지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button className="btn btn--secondary" onClick={run} disabled={busy}>
        {busy ? <span className="spinner spinner--dark" /> : <Icon name="download" size={18} />} {label}
      </button>
      <div className="pdf-stage" aria-hidden="true">
        <QuoteDocument ref={ref} booking={b} quote={b.quote} forPdf />
      </div>
    </>
  );
}

/** STEP 2 — 견적 확인 및 결제 */
export function StepQuote({ booking: b, onEditRequirements }: { booking: Booking; onEditRequirements: () => void }) {
  const store = useStore();
  const toast = useToast();
  const catalog = useCatalog();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const sent = b.quote && (b.quote.status === 'sent' || b.quote.status === 'accepted');
  const openAdjust = b.adjustRequests.filter((r) => r.status === 'open');

  async function sendAdjust() {
    if (!msg.trim()) return;
    await store.saveBooking(ops.requestAdjust(b, msg.trim()));
    setMsg('');
    setAdjustOpen(false);
    toast('조정 요청을 보냈어요. 담당 플래너가 확인 후 답변드릴게요.');
  }

  if (!sent) {
    const est = expectedRevenue(b, catalog);
    return (
      <div className="stack gap-16">
        <div className="waiting-card">
          <Logo layout="monogram" height={56} className="waiting-card__mono" />
          <div>
            <h3 className="display-sm">맞춤 견적서를 준비하고 있어요</h3>
            <p className="body-sm text-muted mt-8">담당 플래너가 작성하신 필요사항을 확인하고 있어요. 영업일 1일 이내에 견적서를 보내드리고, 도착하면 메일로 알려드릴게요.</p>
            <p className="body-sm mt-12">
              선택하신 구성 기준 예상 금액 <b className="text-gold">약 {wonShort(est.amount)}</b> <span className="caption">(할인 전)</span>
            </p>
          </div>
        </div>
        {openAdjust.length > 0 && <AdjustHistory booking={b} />}
        <div className="row wrap gap-8">
          <button className="btn btn--secondary" onClick={onEditRequirements}>
            <Icon name="edit" size={16} /> 필요사항 수정하기
          </button>
          <button className="btn btn--ghost" onClick={() => openChat('견적은 언제 받을 수 있나요?')}>
            <Icon name="chat" size={16} /> 상담하기
          </button>
        </div>
      </div>
    );
  }

  const q = b.quote!;
  const t = calcQuote(q);
  const paid = b.payments.some((p) => p.kind === 'deposit');
  const today = todayKST();
  const expired = q.validUntil < today;

  return (
    <div className="stack gap-16">
      {openAdjust.length > 0 && (
        <div className="callout">
          <span className="callout__icon">!</span>
          <div>
            <div className="title-sm">조정 요청을 검토하고 있어요</div>
            <p className="body-sm">새 견적서가 준비되면 이 페이지와 메일로 알려드릴게요.</p>
          </div>
        </div>
      )}
      <div className="quote-summary">
        <div>
          <span className="label">총 견적 금액{q.discountRate > 0 ? ` · ${q.discountRate}% 할인 적용` : ''}</span>
          <span className="quote-summary__total numeral">{won(t.total)}</span>
          {t.discountAmount > 0 && <span className="caption">정가 {won(t.subtotal)} → {won(t.discountAmount)} 할인</span>}
        </div>
        <div className="quote-summary__split">
          <span>
            <span className="label">예약금 {q.depositRate}%</span>
            <b className="price">{won(t.deposit)}</b>
          </span>
          <span>
            <span className="label">잔금 (행사 당일)</span>
            <b className="price">{won(t.balance)}</b>
          </span>
        </div>
      </div>

      <QuoteDocument booking={b} quote={q} />

      {!paid && (
        <div className="quote-actions">
          <p className="caption">
            견적 유효기간 {formatDate(q.validUntil)}까지{expired ? ' · 유효기간이 지났어요. 결제 전 금액을 다시 확인해 드릴게요.' : ''} · 예약금 결제 시 날짜와 홀이 확정돼요.
          </p>
          <div className="quote-actions__buttons">
            <button className="btn btn--secondary btn--lg" onClick={() => setAdjustOpen(true)}>
              조정 요청
            </button>
            <Link to={`/my/${b.id}/pay`} className="btn btn--primary btn--lg grow" aria-disabled={openAdjust.length > 0}>
              <span className="hide-mobile">이대로 진행 · </span>예약금 {won(t.deposit)} 결제
            </Link>
          </div>
        </div>
      )}
      <div className="row wrap gap-8">
        <QuotePdfButton booking={b} label={paid ? '확정 견적서 PDF' : '견적서 PDF 다운로드'} />
      </div>

      {b.adjustRequests.length > 0 && <AdjustHistory booking={b} />}

      <Sheet open={adjustOpen} onClose={() => setAdjustOpen(false)} title="견적 조정 요청">
        <p className="body-sm text-muted">바꾸고 싶은 내용을 알려주세요. 담당 플래너가 확인 후 조정된 견적서를 보내드려요.</p>
        <div className="row wrap gap-8 mt-16">
          {ADJUST_CHIPS.map((c) => (
            <button key={c} className="chip chip--sm" onClick={() => setMsg((m) => (m ? `${m}\n${c}` : c))}>
              {c}
            </button>
          ))}
        </div>
        <textarea className="textarea mt-16" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="예) 하객이 120명으로 늘었어요. 꽃장식은 프리미엄으로 바꾸고 싶어요." />
        <button className="btn btn--primary btn--block btn--lg mt-16" onClick={sendAdjust} disabled={!msg.trim()}>
          조정 요청 보내기
        </button>
      </Sheet>
    </div>
  );
}

function AdjustHistory({ booking: b }: { booking: Booking }) {
  return (
    <div className="card card--soft">
      <div className="title-sm">조정 요청 내역</div>
      <ul className="list mt-8">
        {b.adjustRequests
          .slice()
          .reverse()
          .map((r) => (
            <li key={r.id} className="list-item">
              <div className="list-item__body">
                <div className="row gap-8 wrap">
                  <span className={`badge ${r.status === 'open' ? 'badge--gold' : 'badge--success'}`}>{r.status === 'open' ? '검토 중' : '답변 완료'}</span>
                  <span className="caption">{formatDateTime(r.at)}</span>
                </div>
                <p className="body-sm text-ink mt-8" style={{ whiteSpace: 'pre-wrap' }}>
                  {r.message}
                </p>
                {r.reply && (
                  <div className="reply">
                    <span className="label">엔젤스데이 답변</span>
                    <p className="body-sm">{r.reply}</p>
                  </div>
                )}
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
