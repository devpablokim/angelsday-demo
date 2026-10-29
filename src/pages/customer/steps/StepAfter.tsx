import { addDays, diffDays, formatDate, formatDateShort, formatDateTime, todayKST, won } from '@shared/dates';
import { EVENT_TYPES } from '@shared/eventTypes';
import * as ops from '@shared/ops';
import { calcQuote, paidAmount } from '@shared/quote';
import { balancePaid } from '@shared/steps';
import type { Booking, Photo } from '@shared/types';
import { hallName, VENUE } from '@shared/venue';
import { useState } from 'react';
import { openChat } from '../../../components/ChatBot';
import { Icon } from '../../../components/Icon';
import { Img, Sheet, TaskStatusChip, useToast } from '../../../components/ui';
import { useStore } from '../../../data/hooks';
import { ENV } from '../../../data/store';
import { QuotePdfButton } from './StepQuote';

function dueLabel(due: string, today: string) {
  const n = diffDays(today, due);
  if (n === 0) return '오늘까지';
  if (n > 0) return `D-${n}`;
  return `${-n}일 지남`;
}

/** STEP 3 — 결제 완료 */
export function StepPaid({ booking: b, isCurrent }: { booking: Booking; isCurrent: boolean }) {
  const store = useStore();
  const toast = useToast();
  const deposit = b.payments.find((p) => p.kind === 'deposit');
  const t = b.quote ? calcQuote(b.quote) : undefined;
  const [busy, setBusy] = useState(false);
  if (!deposit) return null;
  async function start() {
    setBusy(true);
    await store.saveBooking(ops.startPrep(b));
    setBusy(false);
    toast('준비 사항을 확인할 수 있어요');
  }
  return (
    <div className="stack gap-16">
      <div className="receipt">
        <div className="receipt__head">
          <span className="overline">RECEIPT</span>
          <span className="badge badge--gold">예약 확정</span>
        </div>
        <span className="receipt__amount numeral">{won(deposit.amount)}</span>
        <dl className="receipt__rows">
          <div>
            <dt>결제 항목</dt>
            <dd>예약금 ({b.quote?.depositRate ?? 20}%)</dd>
          </div>
          <div>
            <dt>결제 수단</dt>
            <dd>{ops.methodLabel(deposit.method)}</dd>
          </div>
          <div>
            <dt>결제 일시</dt>
            <dd>{formatDateTime(deposit.paidAt)}</dd>
          </div>
          <div>
            <dt>영수증 번호</dt>
            <dd>{deposit.receiptNo}</dd>
          </div>
          {t && (
            <div>
              <dt>남은 잔금</dt>
              <dd>{won(t.total - paidAmount(b))} · 행사 당일 결제</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="card card--soft">
        <div className="title-sm">이제 이렇게 진행돼요</div>
        <ul className="next-list mt-12">
          <li>
            <Icon name="user" size={18} />
            <span>
              담당 <b>{b.manager?.name ?? '플래너 배정 중'}</b>가 행사까지 함께해요.
            </span>
          </li>
          <li>
            <Icon name="calendar" size={18} />
            <span>STEP 4에서 엔젤스데이의 준비 현황과 고객님 체크리스트를 확인해요.</span>
          </li>
          <li>
            <Icon name="mail" size={18} />
            <span>D-60 · D-30 · D-14 · D-7 · D-1에 준비 안내 메일을 보내드려요.</span>
          </li>
        </ul>
      </div>
      <div className="row wrap gap-8">
        {isCurrent && (
          <button className="btn btn--primary btn--lg grow" onClick={start} disabled={busy}>
            준비 사항 확인 시작하기 <Icon name="arrowRight" size={18} />
          </button>
        )}
        <QuotePdfButton booking={b} label="확정 견적서" />
      </div>
    </div>
  );
}

/** STEP 4 — 준비 사항 확인 */
export function StepPrep({ booking: b }: { booking: Booking }) {
  const store = useStore();
  const toast = useToast();
  const today = todayKST();
  const tasks = b.prepTasks.filter((t) => t.visibleToCustomer);
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const doneChecks = b.checklist.filter((c) => c.done).length;
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(addDays(b.date, -7));

  async function toggle(id: string, done: boolean) {
    await store.saveBooking(ops.toggleChecklist(b, id, done));
  }
  async function add() {
    if (!title.trim()) return;
    await store.saveBooking(ops.addChecklist(b, title.trim(), due, 'customer'));
    setTitle('');
    setAddOpen(false);
    toast('체크리스트에 추가했어요');
  }

  return (
    <div className="stack gap-16">
      <div className="prep-summary">
        <div className="prep-summary__item">
          <span className="label">엔젤스데이 준비</span>
          <span className="numeral prep-summary__num">
            {doneTasks}
            <small>/{tasks.length}</small>
          </span>
          <div className="progress">
            <div className="progress__bar" style={{ width: `${tasks.length ? (doneTasks / tasks.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="prep-summary__item">
          <span className="label">고객님 체크리스트</span>
          <span className="numeral prep-summary__num">
            {doneChecks}
            <small>/{b.checklist.length}</small>
          </span>
          <div className="progress">
            <div className="progress__bar" style={{ width: `${b.checklist.length ? (doneChecks / b.checklist.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <section className="card">
        <div className="card__head">
          <div>
            <span className="overline">ANGELSDAY</span>
            <h3 className="title-md mt-8">엔젤스데이가 준비하고 있어요</h3>
          </div>
        </div>
        <ul className="list">
          {tasks.map((t) => (
            <li key={t.id} className="list-item">
              <div className="list-item__body">
                <div className={`list-item__title ${t.status === 'done' ? '' : ''}`}>{t.title}</div>
                <div className="list-item__meta">
                  {t.owner} · {formatDateShort(t.dueDate)}
                  {t.status !== 'done' && ` · ${dueLabel(t.dueDate, today)}`}
                </div>
                {t.note && <p className="task-note">{t.note}</p>}
              </div>
              <TaskStatusChip status={t.status} />
            </li>
          ))}
          {!tasks.length && <li className="caption">담당 플래너가 준비 일정을 만들고 있어요.</li>}
        </ul>
      </section>

      <section className="card">
        <div className="card__head">
          <div>
            <span className="overline">MY CHECKLIST</span>
            <h3 className="title-md mt-8">고객님이 챙겨주세요</h3>
          </div>
          <button className="btn btn--secondary btn--sm" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={16} /> 추가
          </button>
        </div>
        <ul className="list">
          {b.checklist.map((c) => {
            const overdue = !c.done && c.dueDate < today;
            return (
              <li key={c.id} className="list-item">
                <label className="check grow">
                  <input type="checkbox" checked={c.done} onChange={(e) => toggle(c.id, e.target.checked)} />
                  <span className="list-item__body">
                    <span className={`list-item__title ${c.done ? 'list-item__title--done' : ''}`}>{c.title}</span>
                    {c.description && <span className="list-item__meta">{c.description}</span>}
                    <span className={`list-item__meta ${overdue ? 'text-error' : ''}`}>
                      {formatDateShort(c.dueDate)}까지 · {c.done ? `완료 ${c.doneAt ? formatDateTime(c.doneAt) : ''}` : dueLabel(c.dueDate, today)}
                      {c.addedBy === 'customer' && ' · 직접 추가'}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="체크리스트 추가">
        <div className="stack gap-16">
          <label className="field">
            <span className="field__label">할 일</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 부모님 한복 대여 예약" />
          </label>
          <label className="field">
            <span className="field__label">언제까지</span>
            <input className="input" type="date" value={due} max={b.date} onChange={(e) => setDue(e.target.value)} />
          </label>
          <button className="btn btn--primary btn--lg btn--block" onClick={add} disabled={!title.trim()}>
            추가하기
          </button>
        </div>
      </Sheet>
    </div>
  );
}

/** STEP 5 — 행복한 행사일 */
export function StepEventDay({ booking: b }: { booking: Booking }) {
  const cfg = EVENT_TYPES[b.eventType];
  const today = todayKST();
  const isToday = b.date === today;
  const t = b.quote ? calcQuote(b.quote) : undefined;
  const remaining = t ? t.total - paidAmount(b) : 0;
  const done = balancePaid(b);
  return (
    <div className="stack gap-16">
      {isToday && (
        <div className="eventday-hero">
          <span className="overline">TODAY</span>
          <p className="display-md">{cfg.dayGreeting}</p>
          <p className="body-sm">엔젤스데이가 모든 준비를 마치고 기다리고 있어요.</p>
        </div>
      )}
      <section className="card">
        <h3 className="title-md">당일 타임테이블</h3>
        <ol className="schedule mt-12">
          {b.daySchedule.map((s, i) => (
            <li key={i}>
              <span className="schedule__time numeral">{s.time}</span>
              <span className="body-sm text-ink">{s.title}</span>
            </li>
          ))}
          {!b.daySchedule.length && <li className="caption">타임테이블을 준비하고 있어요.</li>}
        </ol>
      </section>
      <div className="card-grid card-grid--2">
        <section className="card">
          <h3 className="title-md">{b.eventType === 'catering' ? '행사 장소' : '오시는 길'}</h3>
          {b.eventType === 'catering' ? (
            <p className="body-sm mt-8">
              {b.location}
              <br />
              <span className="caption">케이터링팀이 세팅 시간 전에 도착해 준비해요.</span>
            </p>
          ) : (
            <>
              <p className="body-sm mt-8 text-ink">
                {VENUE.address}
                <br />
                <span className="caption">
                  {VENUE.addressShort} · {hallName(b.hallId)}
                </span>
              </p>
              <p className="caption mt-8">주차 · {VENUE.parking}</p>
              <div className="row gap-8 mt-12 wrap">
                <a className="btn btn--secondary btn--sm" href={VENUE.mapUrl} target="_blank" rel="noreferrer">
                  <Icon name="map" size={16} /> 네이버 지도
                </a>
                <a className="btn btn--secondary btn--sm" href={VENUE.kakaoMapUrl} target="_blank" rel="noreferrer">
                  카카오맵
                </a>
              </div>
            </>
          )}
        </section>
        <section className="card">
          <h3 className="title-md">담당 매니저</h3>
          <p className="body-sm mt-8 text-ink">{b.manager?.name ?? '엔젤스데이 현장 매니저'}</p>
          <a className="btn btn--primary btn--sm mt-12" href={`tel:${b.manager?.phone ?? VENUE.phone}`}>
            <Icon name="phone" size={16} /> {b.manager?.phone ?? VENUE.phone}
          </a>
        </section>
      </div>
      <section className={`card ${done ? 'card--soft' : 'card--gold'}`}>
        <div className="row between wrap gap-8">
          <div>
            <h3 className="title-md">잔금 안내</h3>
            <p className="body-sm mt-8">{done ? '잔금 결제가 완료되었어요. 감사합니다!' : '잔금은 행사 당일 현장에서 카드 또는 계좌이체로 결제해 주세요. 결제가 확인되면 행사 사진이 공개돼요.'}</p>
          </div>
          <span className="price numeral" style={{ fontSize: 28 }}>
            {done ? '결제 완료' : won(remaining)}
          </span>
        </div>
      </section>
    </div>
  );
}

/** STEP 6 — 행사 사진 확인 */
export function StepPhotos({ booking: b, unlocked }: { booking: Booking; unlocked: boolean }) {
  const store = useStore();
  const toast = useToast();
  const [view, setView] = useState<Photo | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const reviewed = b.timeline.some((t) => t.type === 'review');

  if (!unlocked) {
    return (
      <div className="locked">
        <div className="row gap-12">
          <Icon name="lock" />
          <div>
            <div className="title-sm">잔금 결제 후 사진이 공개돼요</div>
            <p className="body-sm text-muted mt-8">행사 당일 잔금 결제가 완료되면 보정한 사진과 원본 앨범 링크를 이곳에 올려드려요. 보통 행사 후 2~3주가 걸려요.</p>
          </div>
        </div>
      </div>
    );
  }

  async function submitReview() {
    await store.saveBooking(ops.log(b, 'customer', 'review', `후기 ${'★'.repeat(rating)} — ${review.trim()}`));
    setReviewOpen(false);
    toast('소중한 후기 감사합니다!');
  }

  return (
    <div className="stack gap-16">
      <div className="photo-grid">
        {b.photos.map((p) => (
          <button key={p.id} className="photo-grid__item" onClick={() => setView(p)}>
            <Img src={p.url} alt={p.caption ?? '행사 사진'} ratio="1 / 1" />
            {p.caption && <span className="photo-grid__caption">{p.caption}</span>}
          </button>
        ))}
      </div>
      <div className="row wrap gap-8">
        {b.photoAlbumUrl && (
          <a className="btn btn--primary btn--lg grow" href={b.photoAlbumUrl} target="_blank" rel="noreferrer">
            <Icon name="download" size={18} /> 원본 앨범 내려받기
          </a>
        )}
        {!reviewed ? (
          <button className="btn btn--secondary btn--lg" onClick={() => setReviewOpen(true)}>
            <Icon name="heart" size={18} /> 후기 남기기
          </button>
        ) : (
          <span className="badge badge--gold">후기를 남겨주셨어요 · 감사합니다</span>
        )}
      </div>
      <Sheet open={!!view} onClose={() => setView(null)} title={view?.caption ?? '행사 사진'} wide>
        {view && <Img src={view.url} alt={view.caption ?? '행사 사진'} ratio="4 / 3" />}
      </Sheet>
      <Sheet open={reviewOpen} onClose={() => setReviewOpen(false)} title="엔젤스데이와의 하루는 어떠셨나요?">
        <div className="row gap-4" role="radiogroup" aria-label="별점">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={`star ${n <= rating ? 'is-on' : ''}`} onClick={() => setRating(n)} aria-label={`${n}점`} role="radio" aria-checked={n === rating}>
              ★
            </button>
          ))}
        </div>
        <textarea className="textarea mt-16" value={review} onChange={(e) => setReview(e.target.value)} placeholder="좋았던 점, 아쉬웠던 점을 자유롭게 남겨 주세요." />
        <button className="btn btn--primary btn--block btn--lg mt-16" onClick={submitReview} disabled={!review.trim()}>
          후기 보내기
        </button>
        <p className="caption mt-12">
          블로그·카카오톡 후기도 환영해요.{' '}
          <a className="link" href={ENV.kakaoUrl} target="_blank" rel="noreferrer">
            카카오톡 채널
          </a>
        </p>
      </Sheet>
      <button className="btn btn--ghost" onClick={() => openChat('사진 원본은 언제까지 받을 수 있나요?')}>
        <Icon name="chat" size={16} /> 사진 관련 문의
      </button>
      <p className="caption">
        행사일 {formatDate(b.date)} · 사진 공개 {b.photosReleasedAt ? formatDateTime(b.photosReleasedAt) : ''}
      </p>
    </div>
  );
}
