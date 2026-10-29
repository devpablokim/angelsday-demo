import { ddayLabel, formatDate } from '@shared/dates';
import { honoreeLabel } from '@shared/eventTypes';
import { computeStep, nextAction, STEPS } from '@shared/steps';
import type { Booking, StepNo } from '@shared/types';
import { Icon } from '../../components/Icon';
import { copyText, Empty, EventBadge, PageLoading, useToast } from '../../components/ui';
import { useBookings, useToday } from '../../data/hooks';
import { customerUrl } from '../../data/store';

/** 단계별 고객 화면 미리보기 — 고객이 지금 보는 페이지를 바로 열고, 예약 비밀번호를 확인합니다. */
export function PreviewPage() {
  const bookings = useBookings();
  const today = useToday();
  const toast = useToast();
  if (!bookings) return <PageLoading />;

  const active = bookings.filter((b) => !b.cancelledAt);
  const byStep = new Map<StepNo, Booking[]>();
  for (const b of active) {
    const s = computeStep(b, today);
    if (!byStep.has(s)) byStep.set(s, []);
    byStep.get(s)!.push(b);
  }

  const copy = async (text: string, label: string) => toast((await copyText(text)) ? `${label}를 복사했어요` : '복사하지 못했어요');

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="overline">CUSTOMER VIEW</div>
          <h1 className="display-md">고객 화면 보기</h1>
          <p className="caption">고객이 지금 보고 있는 페이지를 단계별로 확인해요. 고객은 ‘내 행사 조회’에 예약 비밀번호를 입력하거나 메일로 받은 링크로 들어와요.</p>
        </div>
      </div>

      {!active.length && <Empty>아직 예약이 없어요.</Empty>}

      <div className="preview-steps">
        {STEPS.map((s) => {
          const list = (byStep.get(s.no) ?? []).sort((a, z) => a.date.localeCompare(z.date));
          return (
            <section key={s.no} className="card preview-step">
              <header className="preview-step__head">
                <span className="preview-step__no numeral">{s.no}</span>
                <div className="grow">
                  <h2 className="title-md">{s.title}</h2>
                  <p className="caption">{s.customerAction}</p>
                </div>
                <span className="badge badge--outline">{list.length}명</span>
              </header>
              {list.length === 0 ? (
                <p className="caption preview-step__empty">이 단계의 고객이 없어요.</p>
              ) : (
                <ul className="preview-list">
                  {list.map((b) => (
                    <li key={b.id} className="preview-item">
                      <div className="preview-item__main">
                        <div className="row gap-8 wrap">
                          <EventBadge type={b.eventType} short />
                          <span className="caption">
                            {formatDate(b.date)} {b.time} · {ddayLabel(b.date, today)}
                          </span>
                        </div>
                        <div className="title-sm mt-4">{honoreeLabel(b.eventType, b.honorees)}</div>
                        <div className="caption">고객 화면: {nextAction(b, today).title}</div>
                      </div>
                      <div className="preview-item__code">
                        <span className="label">예약 비밀번호</span>
                        {b.accessCode ? (
                          <button className="preview-code" onClick={() => copy(b.accessCode!, '예약 비밀번호')} title="복사">
                            {b.accessCode} <Icon name="copy" size={14} />
                          </button>
                        ) : (
                          <span className="caption">—</span>
                        )}
                      </div>
                      <div className="preview-item__actions">
                        <a className="btn btn--primary btn--sm" href={customerUrl(b.id)} target="_blank" rel="noreferrer">
                          <Icon name="external" size={15} /> 고객 화면 열기
                        </a>
                        <button className="btn btn--secondary btn--sm" onClick={() => copy(customerUrl(b.id), '고객 링크')}>
                          링크 복사
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
