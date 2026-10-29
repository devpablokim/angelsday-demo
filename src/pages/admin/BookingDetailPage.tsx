import { ddayLabel, formatDate } from '@shared/dates';
import { headlinePlain } from '@shared/eventTypes';
import { computeStep, STEPS } from '@shared/steps';
import type { Booking } from '@shared/types';
import { hallName } from '@shared/venue';
import { Link, useParams, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { JourneyStepper } from '../../components/Journey';
import { copyText, Empty, EventBadge, PageLoading, useToast } from '../../components/ui';
import { useBooking, useToday } from '../../data/hooks';
import { customerUrl } from '../../data/store';
import { ChecklistTab } from './detail/ChecklistTab';
import { EmailsTab } from './detail/EmailsTab';
import { OverviewTab } from './detail/OverviewTab';
import { PaymentsTab } from './detail/PaymentsTab';
import { PhotosTab } from './detail/PhotosTab';
import { PrepTab } from './detail/PrepTab';
import { QuoteTab } from './detail/QuoteTab';
import { RequirementsTab } from './detail/RequirementsTab';
import { TimelineTab } from './detail/TimelineTab';

const TABS = [
  { id: 'overview', label: '개요' },
  { id: 'requirements', label: '필요사항' },
  { id: 'quote', label: '견적' },
  { id: 'payments', label: '결제' },
  { id: 'prep', label: '준비 리스트' },
  { id: 'checklist', label: '고객 체크리스트' },
  { id: 'photos', label: '사진' },
  { id: 'timeline', label: '기록' },
  { id: 'emails', label: '메일' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function tabCount(b: Booking, id: TabId): number | undefined {
  switch (id) {
    case 'quote':
      return b.adjustRequests.filter((r) => r.status === 'open').length || undefined;
    case 'prep':
      return b.prepTasks.filter((t) => t.status !== 'done').length || undefined;
    case 'checklist':
      return b.checklist.filter((c) => !c.done).length || undefined;
    case 'photos':
      return b.photos.length || undefined;
    default:
      return undefined;
  }
}

export function BookingDetailPage() {
  const { id } = useParams();
  const booking = useBooking(id);
  const today = useToday();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as TabId;

  if (booking === undefined) return <PageLoading />;
  if (!booking)
    return (
      <div className="admin-page">
        <Empty>
          예약을 찾을 수 없어요.
          <div className="mt-16">
            <Link to="/admin/bookings" className="btn btn--secondary btn--sm">
              고객 목록으로
            </Link>
          </div>
        </Empty>
      </div>
    );

  const b = booking;
  const step = computeStep(b, today);
  const url = customerUrl(b.id);

  return (
    <div className="admin-page">
      <Link to="/admin/bookings" className="adm-back">
        <Icon name="arrowLeft" size={16} /> 고객 목록
      </Link>

      <header className="detail-head">
        <div className="detail-head__main">
          <div className="row gap-8 wrap">
            <EventBadge type={b.eventType} />
            {b.cancelledAt ? <span className="badge badge--error">취소된 예약</span> : <span className="step-chip">STEP {step} · {STEPS[step - 1].title}</span>}
            {b.source !== 'web' && <span className="badge badge--outline">{{ phone: '전화 문의', kakao: '카카오톡 문의', walkin: '방문 문의', web: '' }[b.source]}</span>}
          </div>
          <h1 className="detail-head__title">{headlinePlain(b.eventType, b.honorees).replace(/까지$/, '')}</h1>
          <p className="detail-head__meta">
            <span className="numeral detail-head__dday">{ddayLabel(b.date, today)}</span>
            <span>
              {formatDate(b.date)} {b.time}
            </span>
            <span>{b.eventType === 'catering' ? b.location || '출장' : hallName(b.hallId)}</span>
            <span>{b.guests}명</span>
          </p>
          <p className="detail-head__contact">
            {b.accessCode && (
              <span className="badge badge--ink detail-head__code" title="예약 비밀번호">
                <Icon name="lock" size={12} /> {b.accessCode}
              </span>
            )}
            <span className="text-ink">{b.customer.name}</span>
            <a href={`tel:${b.customer.phone}`} className="link-plain">
              <Icon name="phone" size={14} /> {b.customer.phone}
            </a>
            {b.customer.email && (
              <a href={`mailto:${b.customer.email}`} className="link-plain">
                <Icon name="mail" size={14} /> {b.customer.email}
              </a>
            )}
          </p>
        </div>
        <div className="detail-head__actions">
          <a className="btn btn--primary btn--sm" href={url} target="_blank" rel="noreferrer">
            <Icon name="external" size={16} /> 고객 페이지 열기
          </a>
          <button
            className="btn btn--secondary btn--sm"
            onClick={async () => {
              const ok = await copyText(url);
              toast(ok ? '고객 관리 링크를 복사했어요.' : '복사에 실패했어요.', ok ? 'default' : 'error');
            }}
          >
            <Icon name="copy" size={16} /> 링크 복사
          </button>
        </div>
      </header>

      {!b.cancelledAt && (
        <div className="detail-stepper card">
          <JourneyStepper current={step} compactLabels />
        </div>
      )}

      <div className="tabs detail-tabs" role="tablist">
        {TABS.map((t) => {
          const n = tabCount(b, t.id);
          return (
            <button
              key={t.id}
              className="tab"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                const p = new URLSearchParams(params);
                p.set('tab', t.id);
                setParams(p, { replace: true });
              }}
            >
              {t.label}
              {n ? <span className="count">{n}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="detail-body">
        {tab === 'overview' && <OverviewTab booking={b} />}
        {tab === 'requirements' && <RequirementsTab booking={b} />}
        {tab === 'quote' && <QuoteTab booking={b} />}
        {tab === 'payments' && <PaymentsTab booking={b} />}
        {tab === 'prep' && <PrepTab booking={b} />}
        {tab === 'checklist' && <ChecklistTab booking={b} />}
        {tab === 'photos' && <PhotosTab booking={b} />}
        {tab === 'timeline' && <TimelineTab booking={b} />}
        {tab === 'emails' && <EmailsTab booking={b} />}
      </div>
    </div>
  );
}
