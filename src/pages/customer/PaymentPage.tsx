import { formatDate, won } from '@shared/dates';
import { EVENT_TYPES, headlinePlain } from '@shared/eventTypes';
import { calcQuote } from '@shared/quote';
import type { PaymentMethod } from '@shared/types';
import { hallName } from '@shared/venue';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Logo } from '../../brand/Logo';
import { Icon, type IconName } from '../../components/Icon';
import { PageLoading, useToast } from '../../components/ui';
import { useBooking, useStore } from '../../data/hooks';

const METHODS: { id: PaymentMethod; label: string; desc: string; icon: IconName }[] = [
  { id: 'card', label: '신용 · 체크카드', desc: '모든 카드 · 할부 가능', icon: 'card' },
  { id: 'transfer', label: '계좌이체', desc: '실시간 계좌이체', icon: 'bank' },
  { id: 'kakaopay', label: '카카오페이', desc: '간편결제', icon: 'chat' },
];

export function PaymentPage() {
  const { id } = useParams();
  const b = useBooking(id);
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [agree, setAgree] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (b === undefined) return <PageLoading />;
  if (!b || !b.quote || b.quote.status === 'draft') {
    return (
      <section className="section container container--narrow">
        <p className="body-md">결제할 견적서가 없어요.</p>
        <Link to={id ? `/my/${id}` : '/'} className="btn btn--secondary mt-16">
          돌아가기
        </Link>
      </section>
    );
  }
  const t = calcQuote(b.quote);
  const already = b.payments.some((p) => p.kind === 'deposit');
  const cfg = EVENT_TYPES[b.eventType];

  async function pay() {
    if (!agree) {
      toast('환불 규정에 동의해 주세요.', 'error');
      return;
    }
    setBusy(true);
    try {
      await store.payDeposit(b!.id, method);
      toast('결제가 완료되었어요. 예약이 확정되었습니다!');
      navigate(`/my/${b!.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '결제에 실패했어요. 다시 시도해 주세요.', 'error');
      setBusy(false);
    }
  }

  return (
    <section className="section pay-page">
      <div className="container container--narrow">
        <Link to={`/my/${b.id}`} className="back-link">
          <Icon name="arrowLeft" size={16} /> 내 행사 페이지
        </Link>
        <span className="overline mt-24" style={{ display: 'block' }}>
          PAYMENT
        </span>
        <h1 className="display-lg mt-8">예약금 결제</h1>
        {store.mode === 'demo' && <p className="badge badge--warning mt-12">데모 결제 — 실제 결제는 이뤄지지 않아요</p>}

        <div className="pay-summary mt-24">
          <div className="pay-summary__head">
            <Logo layout="monogram" height={36} />
            <div>
              <div className="title-sm">{headlinePlain(b.eventType, b.honorees).replace(/까지$/, '')}</div>
              <div className="caption">
                {cfg.label} · {formatDate(b.date)} {b.time} · {b.eventType === 'catering' ? b.location : hallName(b.hallId)}
              </div>
            </div>
          </div>
          <dl className="pay-summary__rows">
            <div>
              <dt>총 견적 금액</dt>
              <dd>{won(t.total)}</dd>
            </div>
            {t.discountAmount > 0 && (
              <div>
                <dt>적용된 할인</dt>
                <dd className="text-gold">−{won(t.discountAmount)}</dd>
              </div>
            )}
            <div>
              <dt>잔금 (행사 당일)</dt>
              <dd>{won(t.balance)}</dd>
            </div>
            <div className="pay-summary__due">
              <dt>지금 결제할 예약금 ({b.quote.depositRate}%)</dt>
              <dd className="numeral">{won(t.deposit)}</dd>
            </div>
          </dl>
        </div>

        {already ? (
          <div className="callout mt-24">
            <span className="callout__icon">✓</span>
            <div>
              <div className="title-sm">이미 예약금 결제가 완료되었어요</div>
              <Link to={`/my/${b.id}`} className="link">
                내 행사 페이지로 돌아가기
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h2 className="title-md mt-32">결제 수단</h2>
            <div className="option-grid option-grid--3 mt-12" role="radiogroup" aria-label="결제 수단">
              {METHODS.map((m) => (
                <button key={m.id} type="button" className="option-card pay-method" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)}>
                  <span className="option-card__check" />
                  <Icon name={m.icon} size={22} />
                  <span className="option-card__title">{m.label}</span>
                  <span className="option-card__desc">{m.desc}</span>
                </button>
              ))}
            </div>

            <div className="card card--soft mt-24">
              <button className="row between pay-policy__toggle" onClick={() => setPolicyOpen((v) => !v)} aria-expanded={policyOpen}>
                <span className="title-sm">취소 · 환불 규정</span>
                <Icon name="chevronDown" size={18} style={{ transform: policyOpen ? 'rotate(180deg)' : undefined }} />
              </button>
              {policyOpen && (
                <ul className="policy-list mt-12">
                  <li>행사 90일 전까지 취소: 예약금 전액 환불</li>
                  <li>행사 89~30일 전 취소: 예약금의 50% 환불</li>
                  <li>행사 29일 이내 취소: 환불 불가</li>
                  <li>날짜 변경은 행사 30일 전까지 1회 무료 (가능한 날짜 기준)</li>
                  <li>최종 인원은 행사 7일 전까지 확정해 주세요</li>
                </ul>
              )}
              <label className="check mt-16">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>위 취소·환불 규정과 견적 내용을 확인했으며 예약금 결제에 동의합니다.</span>
              </label>
            </div>

            <button className="btn btn--primary btn--lg btn--block mt-24" onClick={pay} disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner" /> 결제 승인 중…
                </>
              ) : (
                `${won(t.deposit)} 결제하기`
              )}
            </button>
            <p className="caption mt-12">결제 즉시 날짜와 홀이 확정되고, 영수증과 예약 확정 메일을 보내드려요.</p>
          </>
        )}
      </div>
    </section>
  );
}
