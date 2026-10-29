import { formatDate, formatDateTime } from '@shared/dates';
import { EVENT_TYPES } from '@shared/eventTypes';
import * as ops from '@shared/ops';
import { balancePaid, computeStep, nextAction, STEPS } from '@shared/steps';
import type { Booking, StepNo } from '@shared/types';
import { hallName, VENUE } from '@shared/venue';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ChatBot, openChat } from '../../components/ChatBot';
import { Icon } from '../../components/Icon';
import { DdayHero, JourneyStepper } from '../../components/Journey';
import { copyText, PageLoading, useToast } from '../../components/ui';
import { useBooking, useStore, useToday } from '../../data/hooks';
import { customerUrl, ENV } from '../../data/store';
import { StepEventDay, StepPaid, StepPhotos, StepPrep } from './steps/StepAfter';
import { StepQuote } from './steps/StepQuote';
import { RequirementsSummary, StepRequirementsForm } from './steps/StepRequirements';

export function MyEventPage() {
  const { id } = useParams();
  const b = useBooking(id);
  const today = useToday();
  const [viewing, setViewing] = useState<StepNo | undefined>();
  const step = b ? computeStep(b, today) : 1;

  // 단계가 바뀌면 현재 단계를 보여줍니다
  useEffect(() => setViewing(undefined), [step]);

  if (b === undefined) return <PageLoading />;
  if (!b) return <MissingBooking />;

  const view = viewing ?? step;
  const na = nextAction(b, today);

  return (
    <div className="my-page">
      <DdayHero booking={b} today={today} step={step} />
      <div className="container my-page__body">
        <div className="card stepper-card">
          <JourneyStepper current={step} viewing={view} onSelect={(s) => setViewing(s)} />
        </div>

        {b.cancelledAt ? (
          <div className="callout callout--neutral">
            <span className="callout__icon">!</span>
            <div>
              <div className="title-sm">취소된 예약이에요</div>
              <p className="body-sm">궁금한 점은 {VENUE.phone}로 연락 주세요.</p>
            </div>
          </div>
        ) : (
          view === step && (
            <div className={`callout ${na.who === 'customer' ? 'callout--ink' : ''}`}>
              <span className="callout__icon">{na.who === 'customer' ? '→' : '◆'}</span>
              <div>
                <div className="title-sm">{na.title}</div>
                <p className="body-sm">{na.desc}</p>
              </div>
            </div>
          )
        )}

        <div className="my-grid">
          <div className="my-grid__main">
            <StepPanel booking={b} view={view} current={step} onJump={setViewing} />
          </div>
          <aside className="my-grid__aside">
            <BookingInfo booking={b} />
            <Records booking={b} />
            <Emails booking={b} />
            <HelpCard />
          </aside>
        </div>
      </div>
      <ChatBot booking={b} raised />
    </div>
  );
}

function StepPanel({ booking: b, view, current, onJump }: { booking: Booking; view: StepNo; current: StepNo; onJump: (s: StepNo) => void }) {
  const store = useStore();
  const toast = useToast();
  const def = STEPS[view - 1];
  const state = view < current ? 'done' : view === current ? 'current' : 'todo';

  async function reopen() {
    if (b.quote?.status === 'sent' || b.quote?.status === 'accepted') {
      toast('견적서가 발송된 후에는 STEP 2의 ‘조정 요청’으로 변경을 요청해 주세요.', 'error');
      onJump(2);
      return;
    }
    await store.saveBooking(ops.reopenRequirements(b));
  }

  let content: ReactNode;
  if (state === 'todo') {
    content = (
      <div className="locked">
        <div className="row gap-12">
          <Icon name="lock" />
          <div>
            <div className="title-sm">STEP {current}을 마치면 열려요</div>
            <p className="body-sm text-muted mt-8">{def.about}</p>
            <ul className="next-list mt-12">
              <li>
                <Icon name="user" size={18} /> <span>고객님: {def.customerAction}</span>
              </li>
              <li>
                <Icon name="sparkle" size={18} /> <span>엔젤스데이: {def.angelsAction}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  } else {
    switch (view) {
      case 1:
        content = b.requirementsSubmittedAt ? <RequirementsSummary booking={b} onEdit={current === 2 && !b.quote?.sentAt ? reopen : undefined} /> : <StepRequirementsForm booking={b} />;
        break;
      case 2:
        content = <StepQuote booking={b} onEditRequirements={reopen} />;
        break;
      case 3:
        content = <StepPaid booking={b} isCurrent={current === 3} />;
        break;
      case 4:
        content = <StepPrep booking={b} />;
        break;
      case 5:
        content = <StepEventDay booking={b} />;
        break;
      case 6:
        content = <StepPhotos booking={b} unlocked={!!b.photosReleasedAt && balancePaid(b)} />;
        break;
    }
  }

  return (
    <section className="step-panel" aria-labelledby="step-title">
      <header className="step-panel__head">
        <div>
          <span className="overline">STEP {String(view).padStart(2, '0')}</span>
          <h2 id="step-title" className="display-md mt-8">
            {def.title}
          </h2>
        </div>
        <span className={`badge ${state === 'done' ? 'badge--ink' : state === 'current' ? 'badge--gold' : 'badge--outline'}`}>{state === 'done' ? '완료' : state === 'current' ? '진행 중' : '예정'}</span>
      </header>
      {state === 'done' && <p className="body-sm text-muted step-panel__about">{def.about}</p>}
      <div className="step-panel__content">{content}</div>
      <div className="step-panel__nav">
        {view > 1 && (
          <button className="btn btn--ghost btn--sm" onClick={() => onJump((view - 1) as StepNo)}>
            <Icon name="chevronLeft" size={16} /> STEP {view - 1}
          </button>
        )}
        <span className="grow" />
        {view < 6 && (
          <button className="btn btn--ghost btn--sm" onClick={() => onJump((view + 1) as StepNo)}>
            STEP {view + 1} <Icon name="chevronRight" size={16} />
          </button>
        )}
      </div>
    </section>
  );
}

function BookingInfo({ booking: b }: { booking: Booking }) {
  const toast = useToast();
  const cfg = EVENT_TYPES[b.eventType];
  return (
    <section className="card">
      <h3 className="title-sm">예약 정보</h3>
      <dl className="kv mt-12">
        <dt>행사</dt>
        <dd>{cfg.label}</dd>
        <dt>일시</dt>
        <dd>
          {formatDate(b.date)} {b.time}
        </dd>
        <dt>장소</dt>
        <dd>{b.eventType === 'catering' ? b.location || '출장' : hallName(b.hallId)}</dd>
        <dt>인원</dt>
        <dd>{b.guests}명</dd>
        <dt>예약자</dt>
        <dd>{b.customer.name}</dd>
        <dt>담당 플래너</dt>
        <dd>{b.manager?.name ?? '배정 중'}</dd>
        {b.accessCode && (
          <>
            <dt>예약 비밀번호</dt>
            <dd className="code-text">{b.accessCode}</dd>
          </>
        )}
      </dl>
      <button className="btn btn--secondary btn--sm btn--block mt-16" onClick={async () => toast((await copyText(customerUrl(b.id))) ? '내 행사 페이지 링크를 복사했어요' : '복사하지 못했어요')}>
        <Icon name="copy" size={16} /> 이 페이지 링크 복사
      </button>
    </section>
  );
}

function Records({ booking: b }: { booking: Booking }) {
  const [all, setAll] = useState(false);
  const list = b.timeline.filter((t) => !t.internal).slice().reverse();
  const shown = all ? list : list.slice(0, 6);
  return (
    <section className="card">
      <h3 className="title-sm">행사 기록</h3>
      <p className="caption mt-4">문의부터 지금까지의 모든 과정이 기록돼요.</p>
      <div className="timeline mt-16">
        {shown.map((t) => (
          <div key={t.id} className={`timeline__item timeline__item--${t.actor}`}>
            <div className="timeline__time">
              {formatDateTime(t.at)} · {t.actor === 'customer' ? '고객님' : t.actor === 'admin' ? '엔젤스데이' : '시스템'}
            </div>
            <div className="timeline__msg">{t.message}</div>
          </div>
        ))}
      </div>
      {list.length > 6 && (
        <button className="btn btn--ghost btn--sm" onClick={() => setAll((v) => !v)}>
          {all ? '접기' : `전체 ${list.length}개 보기`}
        </button>
      )}
    </section>
  );
}

function Emails({ booking: b }: { booking: Booking }) {
  const list = b.emails.filter((e) => e.status === 'sent').slice().reverse();
  if (!list.length) return null;
  return (
    <section className="card">
      <h3 className="title-sm">받은 안내 메일</h3>
      <ul className="list mt-8">
        {list.slice(0, 5).map((e) => (
          <li key={e.id} className="list-item">
            <Icon name="mail" size={18} className="text-gold" />
            <div className="list-item__body">
              <div className="body-sm text-ink">{e.subject.replace('[엔젤스데이] ', '')}</div>
              <div className="list-item__meta">{formatDateTime(e.sentAt)}</div>
            </div>
          </li>
        ))}
      </ul>
      <p className="caption">{b.customer.email}</p>
    </section>
  );
}

function HelpCard() {
  return (
    <section className="card card--ink help-card">
      <h3 className="title-sm">도움이 필요하세요?</h3>
      <p className="body-sm mt-8">진행 과정이나 견적이 궁금하면 컨시어지에게 물어보세요. 담당 플래너 연결도 가능해요.</p>
      <div className="stack gap-8 mt-16">
        <button className="btn btn--gold btn--block" onClick={() => openChat()}>
          <Icon name="chat" size={18} /> 챗봇 상담
        </button>
        <div className="row gap-8">
          <a className="btn btn--on-ink grow" href={`tel:${VENUE.phone}`}>
            <Icon name="phone" size={16} /> 전화
          </a>
          <a className="btn btn--on-ink grow" href={ENV.kakaoUrl} target="_blank" rel="noreferrer">
            카카오톡
          </a>
        </div>
      </div>
    </section>
  );
}

function MissingBooking() {
  return (
    <section className="section">
      <div className="container container--narrow done__card">
        <span className="overline">NOT FOUND</span>
        <h1 className="display-md mt-8">행사 페이지를 찾을 수 없어요</h1>
        <p className="body-md text-muted mt-12">링크가 정확한지 확인해 주세요. 링크를 잃어버리셨다면 {VENUE.phone}로 연락 주시면 다시 보내드릴게요.</p>
        <div className="row gap-8 mt-24 wrap">
          <Link to="/my" className="btn btn--primary">
            내 행사 찾기
          </Link>
          <Link to="/" className="btn btn--secondary">
            홈으로
          </Link>
        </div>
      </div>
    </section>
  );
}
