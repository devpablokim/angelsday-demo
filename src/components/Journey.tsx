import { ddayLabel, formatDate } from '@shared/dates';
import { eventConfig, headline } from '@shared/eventTypes';
import { STEPS } from '@shared/steps';
import type { Booking, StepNo } from '@shared/types';
import { Fragment } from 'react';
import { Logo } from '../brand/Logo';
import { hallName } from '@shared/venue';

export function JourneyStepper({ current, viewing, onSelect, compactLabels }: { current: StepNo; viewing?: StepNo; onSelect?: (s: StepNo) => void; compactLabels?: boolean }) {
  const pct = ((current - 1) / 5) * (100 - 100 / 6);
  return (
    <nav className="stepper" aria-label="행사 진행 단계">
      <div className="stepper__progress" style={{ width: `${pct}%` }} />
      {STEPS.map((s) => {
        const state = s.no < current ? 'done' : s.no === current ? 'current' : 'todo';
        return (
          <button
            key={s.no}
            type="button"
            className={`stepper__item stepper__item--${state} ${viewing === s.no ? 'stepper__item--viewing' : ''}`}
            onClick={() => onSelect?.(s.no)}
            aria-current={state === 'current' ? 'step' : undefined}
            aria-label={`STEP ${s.no} ${s.title}${state === 'done' ? ' 완료' : state === 'current' ? ' 진행 중' : ''}`}
          >
            <span className="stepper__dot">{state === 'done' ? '✓' : s.no}</span>
            {compactLabels ? (
              <span className="stepper__label">{s.short}</span>
            ) : (
              <span className="stepper__label">
                <span className="hide-desktop">{s.short}</span>
                <span className="hide-mobile">{s.title}</span>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/** “[[이몽룡]]님과 [[성춘향]]님의\n행복한 웨딩까지” → 이름 강조 */
export function Headline({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {line.split(/(\[\[.*?\]\])/).map((part, j) =>
            part.startsWith('[[') ? <em key={j}>{part.slice(2, -2)}</em> : <Fragment key={j}>{part}</Fragment>,
          )}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}

export function DdayHero({ booking: b, today, step }: { booking: Booking; today: string; step: StepNo }) {
  const cfg = eventConfig(b.eventType);
  const dday = ddayLabel(b.date, today);
  const past = dday.startsWith('D+');
  return (
    <header className="dday-hero">
      <Logo layout="monogram" className="dday-hero__mono" height={300} />
      <div className="container dday-hero__inner">
        <div className="row gap-8 wrap">
          <span className="overline">{cfg.labelEn}</span>
          <span className={`badge badge--event-${b.eventType}`}>{cfg.label}</span>
        </div>
        <h1 className="dday-hero__headline">
          <Headline text={past ? headline(b.eventType, b.honorees).replace(/까지$/, '') : headline(b.eventType, b.honorees)} />
        </h1>
        <div className="dday-hero__count" aria-label={`행사까지 ${dday}`}>
          {dday}
        </div>
        <div className="dday-hero__meta">
          <span>{formatDate(b.date)}</span>
          <span>{b.time}</span>
          <span>{b.eventType === 'catering' ? b.location || '출장 케이터링' : hallName(b.hallId)}</span>
          <span>{b.guests}명</span>
        </div>
        <div className="dday-hero__step">
          <span className="overline">CURRENT STEP</span>
          <span className="title-sm">
            STEP {step} · {STEPS[step - 1].title}
          </span>
        </div>
      </div>
    </header>
  );
}
