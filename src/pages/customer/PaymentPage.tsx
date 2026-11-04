import { formatDate, formatDateTime, won } from '@shared/dates';
import { EVENT_TYPES, headlinePlain } from '@shared/eventTypes';
import * as ops from '@shared/ops';
import { calcQuote } from '@shared/quote';
import { hallName, VENUE } from '@shared/venue';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Logo } from '../../brand/Logo';
import { Icon } from '../../components/Icon';
import { PageLoading, useToast } from '../../components/ui';
import { useBooking, useStore } from '../../data/hooks';

/**
 * 예약금 입금 — 무통장입금으로 통일합니다.
 * 고객이 입금 후 ‘입금했어요’를 누르면, 관리자가 입금 내역을 확인해 예약을 확정합니다.
 * (카드·간편결제 PG 연동은 업체의 가맹 신청·심사가 끝난 뒤 별도로 붙입니다)
 */
export function PaymentPage() {
  const { id } = useParams();
  const b = useBooking(id);
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [depositor, setDepositor] = useState('');
  const [agree, setAgree] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (b === undefined) return <PageLoading />;
  if (!b || !b.quote || b.quote.status === 'draft') {
    return (
      <section className="section container container--narrow">
        <p className="body-md">입금할 견적서가 없어요.</p>
        <Link to={id ? `/my/${id}` : '/'} className="btn btn--secondary mt-16">
          돌아가기
        </Link>
      </section>
    );
  }
  const t = calcQuote(b.quote);
  const deposit = b.payments.find((p) => p.kind === 'deposit');
  const notice = b.transferNotice;
  const cfg = EVENT_TYPES[b.eventType];
  const name = depositor || b.customer.name;
  const account = `${VENUE.bank.name} ${VENUE.bank.account}`;

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(VENUE.bank.account.replace(/-/g, ''));
      toast('계좌번호를 복사했어요');
    } catch {
      toast(account);
    }
  }

  async function notify() {
    if (!agree) {
      toast('취소·환불 규정에 동의해 주세요.', 'error');
      return;
    }
    setBusy(true);
    try {
      await store.saveBooking(ops.notifyTransfer(b!, name, t.deposit));
      toast('입금 알림을 보냈어요. 확인되면 예약이 확정돼요.');
      navigate(`/my/${b!.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '입금 알림을 보내지 못했어요. 다시 시도해 주세요.', 'error');
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
          DEPOSIT
        </span>
        <h1 className="display-lg mt-8">예약금 입금</h1>
        <p className="body-sm text-muted mt-8">예약금은 무통장입금으로 받고 있어요. 입금이 확인되면 날짜와 홀이 확정되고 영수증을 보내드려요.</p>

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
              <dt>잔금 · 행사 당일 행사장에서 결제</dt>
              <dd>{won(t.balance)}</dd>
            </div>
            <div className="pay-summary__due">
              <dt>입금할 예약금 ({b.quote.depositRate}%)</dt>
              <dd className="numeral">{won(t.deposit)}</dd>
            </div>
          </dl>
        </div>

        {deposit ? (
          <div className="callout mt-24">
            <span className="callout__icon">✓</span>
            <div>
              <div className="title-sm">입금이 확인되어 예약이 확정되었어요</div>
              <Link to={`/my/${b.id}`} className="link">
                영수증 받으러 가기
              </Link>
            </div>
          </div>
        ) : notice ? (
          <div className="callout mt-24">
            <span className="callout__icon">
              <Icon name="clock" size={16} />
            </span>
            <div>
              <div className="title-sm">입금을 확인하고 있어요</div>
              <p className="body-sm text-muted">
                {formatDateTime(notice.at)} · 입금자명 {notice.depositor} · {won(notice.amount)}
                <br />
                확인되면 예약 확정 안내와 영수증을 메일로 보내드려요.
              </p>
              {store.mode === 'demo' && (
                <Link to={`/admin/bookings/${b.id}`} className="link">
                  데모: 관리자 화면에서 입금 확인하기
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <section className="card mt-24 bank-card">
              <span className="label">입금 계좌</span>
              <div className="bank-card__row mt-8">
                <Icon name="bank" size={22} />
                <div className="grow">
                  <div className="title-md">{account}</div>
                  <div className="caption">예금주 {VENUE.bank.holder}</div>
                </div>
                <button className="btn btn--secondary btn--sm" onClick={() => void copyAccount()}>
                  <Icon name="copy" size={16} /> 복사
                </button>
              </div>
              <label className="field mt-16">
                <span className="field__label">입금자명</span>
                <input className="input" value={depositor} onChange={(e) => setDepositor(e.target.value)} placeholder={b.customer.name} />
                <span className="caption">입금자명이 예약자와 다르면 꼭 적어 주세요. 확인이 빨라져요.</span>
              </label>
            </section>

            <div className="card card--soft mt-16">
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
                <span>위 취소·환불 규정과 견적 내용을 확인했고, 예약금을 입금합니다.</span>
              </label>
            </div>

            <button className="btn btn--primary btn--lg btn--block mt-24" onClick={() => void notify()} disabled={busy}>
              {busy ? <span className="spinner" /> : <Icon name="check" size={18} />} {won(t.deposit)} 입금했어요
            </button>
            <p className="caption mt-12">카드·간편결제는 준비 중이에요. 입금 확인은 보통 영업시간 안에 1시간 이내로 끝나요.</p>
          </>
        )}
      </div>
    </section>
  );
}
