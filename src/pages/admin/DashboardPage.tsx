import { addDays, ddayLabel, formatDate, formatDateShort, won, wonShort } from '@shared/dates';
import { dueEmails } from '@shared/emailRules';
import { eventConfig, honoreeLabel } from '@shared/eventTypes';
import { calcQuote, expectedRevenue, paidAmount } from '@shared/quote';
import { computeStep, depositPaid, STEPS } from '@shared/steps';
import type { Booking } from '@shared/types';
import { hallName } from '@shared/venue';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon, type IconName } from '../../components/Icon';
import { EventBadge, PageLoading } from '../../components/ui';
import { useBookings, useCatalog, useEmailRules, useToday } from '../../data/hooks';
import { isThisMonth } from './adminUtils';

function Kpi({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className={`kpi ${accent ? 'kpi--accent' : ''}`}>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value numeral">{value}</span>
      {sub && <span className="kpi__sub">{sub}</span>}
    </div>
  );
}

function TodoGroup({ icon, title, items, empty, render }: { icon: IconName; title: string; items: Booking[]; empty: string; render: (b: Booking) => ReactNode }) {
  return (
    <section className="todo">
      <header className="todo__head">
        <span className="todo__icon">
          <Icon name={icon} size={16} />
        </span>
        <span className="title-sm grow">{title}</span>
        <span className={`todo__count ${items.length ? 'is-on' : ''}`}>{items.length}</span>
      </header>
      {items.length === 0 ? (
        <p className="caption todo__empty">{empty}</p>
      ) : (
        <ul className="todo__list">
          {items.slice(0, 5).map((b) => (
            <li key={b.id}>
              <Link to={`/admin/bookings/${b.id}`} className="todo__item">
                <EventBadge type={b.eventType} short />
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="todo__name">{honoreeLabel(b.eventType, b.honorees)}</span>
                  <span className="caption">{render(b)}</span>
                </span>
              </Link>
            </li>
          ))}
          {items.length > 5 && <li className="caption todo__more">외 {items.length - 5}건</li>}
        </ul>
      )}
    </section>
  );
}

export function DashboardPage() {
  const bookings = useBookings();
  const catalog = useCatalog();
  const enabled = useEmailRules();
  const today = useToday();

  const data = useMemo(() => {
    if (!bookings) return null;
    const active = bookings.filter((b) => !b.cancelledAt);
    const withStep = active.map((b) => ({ b, step: computeStep(b, today), rev: expectedRevenue(b, catalog) }));
    const open = withStep.filter((x) => x.step <= 5);
    const expected = open.reduce((s, x) => s + x.rev.amount, 0);
    const fromQuote = open.filter((x) => x.rev.source === 'quote').length;
    const confirmed = active.filter((b) => depositPaid(b) && b.quote).reduce((s, b) => s + calcQuote(b.quote!).total, 0);
    const collected = active.reduce((s, b) => s + paidAmount(b), 0);
    const monthEvents = active.filter((b) => isThisMonth(b.date, today));
    const pipeline = STEPS.map((st) => {
      const list = withStep.filter((x) => x.step === st.no);
      return { step: st, count: list.length, revenue: list.reduce((s, x) => s + x.rev.amount, 0) };
    });
    const maxRev = Math.max(1, ...pipeline.map((p) => p.revenue));
    const week = addDays(today, 7);
    const quoteWaiting = withStep.filter((x) => x.step === 2 && (!x.b.quote || x.b.quote.status === 'draft')).map((x) => x.b);
    const adjustOpen = active.filter((b) => b.adjustRequests.some((r) => r.status === 'open'));
    const soon = active.filter((b) => b.date >= today && b.date <= week).sort((a, z) => a.date.localeCompare(z.date));
    const photosWaiting = active.filter((b) => b.date < today && depositPaid(b) && !b.photosReleasedAt);
    const emailDue = active.map((b) => ({ b, n: dueEmails(b, enabled).length })).filter((x) => x.n > 0);
    const upcoming = active.filter((b) => b.date >= today).sort((a, z) => a.date.localeCompare(z.date) || a.time.localeCompare(z.time));
    return { active, inProgress: withStep.filter((x) => x.step < 6).length, expected, fromQuote, openCount: open.length, confirmed, collected, monthEvents, pipeline, maxRev, quoteWaiting, adjustOpen, soon, photosWaiting, emailDue, upcoming };
  }, [bookings, catalog, enabled, today]);

  if (!data) return <PageLoading />;

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="overline">DASHBOARD</div>
          <h1 className="display-md">오늘의 엔젤스데이</h1>
          <p className="caption">{formatDate(today)} 기준 · 전체 {data.active.length}건의 행사를 관리 중이에요</p>
        </div>
        <Link to="/admin/bookings" className="btn btn--primary btn--sm">
          <Icon name="users" size={16} /> 고객 관리
        </Link>
      </div>

      <div className="kpi-grid">
        <Kpi label="예상 매출 (파이프라인)" value={wonShort(data.expected)} sub={`견적 ${data.fromQuote}건 · 추정 ${data.openCount - data.fromQuote}건`} accent />
        <Kpi label="확정 매출" value={wonShort(data.confirmed)} sub="예약금 결제 완료 건의 견적 총액" />
        <Kpi label="수금액" value={wonShort(data.collected)} sub={data.confirmed ? `확정 매출 대비 ${Math.round((data.collected / Math.max(1, data.confirmed)) * 100)}%` : '—'} />
        <Kpi label="진행 중 고객" value={`${data.inProgress}`} sub="STEP 1~5" />
        <Kpi label="이번 달 행사" value={`${data.monthEvents.length}`} sub={`${Number(today.slice(5, 7))}월`} />
      </div>

      <div className="admin-grid">
        <section className="card">
          <div className="card__head">
            <div>
              <div className="title-md">단계별 파이프라인</div>
              <p className="caption">고객 수와 예상 매출 (견적서가 없으면 필요사항·문의 기준 추정)</p>
            </div>
          </div>
          <ol className="pipeline">
            {data.pipeline.map((p) => (
              <li key={p.step.no} className="pipeline__row">
                <span className="pipeline__step">
                  <span className="pipeline__no">{p.step.no}</span>
                  <span className="pipeline__title">{p.step.title}</span>
                </span>
                <span className="pipeline__track" aria-hidden="true">
                  <span className="pipeline__bar" style={{ width: `${(p.revenue / data.maxRev) * 100}%` }} />
                </span>
                <span className="pipeline__count">{p.count}명</span>
                <span className="pipeline__rev">{wonShort(p.revenue)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="card">
          <div className="card__head">
            <div className="title-md">오늘 할 일</div>
          </div>
          <div className="todo-grid">
            <TodoGroup icon="receipt" title="견적 작성 대기" items={data.quoteWaiting} empty="대기 중인 견적이 없어요." render={(b) => `${formatDateShort(b.date)}`} />
            <TodoGroup icon="chat" title="조정 요청 미답변" items={data.adjustOpen} empty="모든 요청에 답변했어요." render={(b) => `“${b.adjustRequests.find((r) => r.status === 'open')?.message ?? ''}”`} />
            <TodoGroup icon="calendar" title="7일 이내 행사" items={data.soon} empty="일주일 안에 예정된 행사가 없어요." render={(b) => `${ddayLabel(b.date, today)} · ${b.time}`} />
            <TodoGroup icon="camera" title="사진 업로드 · 공개 대기" items={data.photosWaiting} empty="공개 대기 중인 사진이 없어요." render={(b) => formatDateShort(b.date)} />
          </div>
          <Link to="/admin/emails" className={`email-due ${data.emailDue.length ? 'is-on' : ''}`}>
            <Icon name="mail" size={18} />
            <span className="grow">
              지금 발송 대상 메일 <b>{data.emailDue.reduce((s, x) => s + x.n, 0)}통</b>
              <span className="caption"> · 고객 {data.emailDue.length}명</span>
            </span>
            <Icon name="chevronRight" size={16} />
          </Link>
        </section>
      </div>

      <section className="card mt-24">
        <div className="card__head">
          <div className="title-md">다가오는 행사</div>
          <Link to="/admin/calendar" className="link body-sm">
            캘린더 보기
          </Link>
        </div>
        {data.upcoming.length === 0 ? (
          <p className="caption">예정된 행사가 없어요.</p>
        ) : (
          <ul className="adm-upcoming">
            {data.upcoming.slice(0, 8).map((b) => {
              const step = computeStep(b, today);
              return (
                <li key={b.id}>
                  <Link to={`/admin/bookings/${b.id}`} className="adm-upcoming__item">
                    <span className="adm-upcoming__date">
                      <span className="numeral">{ddayLabel(b.date, today)}</span>
                      <span className="caption">{formatDateShort(b.date)}</span>
                    </span>
                    <span className="grow stack">
                      <span className="row gap-8 wrap">
                        <EventBadge type={b.eventType} short />
                        <span className="title-sm">{honoreeLabel(b.eventType, b.honorees)}</span>
                      </span>
                      <span className="caption">
                        {b.time} · {b.eventType === 'catering' ? b.location || '출장' : hallName(b.hallId)} · {b.guests}명 · {eventConfig(b.eventType).label}
                      </span>
                    </span>
                    <span className="step-chip">STEP {step}</span>
                    <span className="price hide-mobile">{won(expectedRevenue(b, catalog).amount)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
