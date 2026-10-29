import { dayAvailability, publicEntryId } from '@shared/calendar';
import { wonShort } from '@shared/dates';
import { allFields, displayValue, EVENT_TYPES, isFieldVisible, missingRequired } from '@shared/eventTypes';
import * as ops from '@shared/ops';
import { buildQuoteLines, lineAmount } from '@shared/quote';
import type { Booking, FieldValue, HallId, Requirements } from '@shared/types';
import { HALLS, ROOM_HALLS } from '@shared/venue';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FieldInput } from '../../../components/FieldInput';
import { Icon } from '../../../components/Icon';
import { useToast } from '../../../components/ui';
import { useCalendar, useCatalog, useStore } from '../../../data/hooks';

/** STEP 1 — 필요사항 작성 (자동 저장 · 제출) */
export function StepRequirementsForm({ booking: b }: { booking: Booking }) {
  const store = useStore();
  const toast = useToast();
  const catalog = useCatalog();
  const entries = useCalendar();
  const cfg = EVENT_TYPES[b.eventType];
  const [values, setValues] = useState<Requirements>(b.requirements);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(b);
  latest.current = b;

  useEffect(() => () => clearTimeout(timer.current), []);

  const valuesRef = useRef(values);
  const set = (key: string, v: FieldValue) => {
    const next = { ...valuesRef.current, [key]: v };
    valuesRef.current = next;
    setValues(next);
    clearTimeout(timer.current);
    setSaved('saving');
    timer.current = setTimeout(async () => {
      await store.saveBooking(ops.saveRequirements(latest.current, next));
      setSaved('saved');
    }, 700);
  };

  const missing = missingRequired(b.eventType, values);
  const requiredTotal = allFields(b.eventType).filter((f) => f.required && isFieldVisible(f, values)).length;
  const guests = (Number(values.guestsAdult) || 0) + (Number(values.guestsKids) || 0);

  const hallOptions = useMemo(() => {
    const others = entries.filter((e) => e.id !== publicEntryId(b.id));
    const av = dayAvailability(b.date, others, [...ROOM_HALLS, 'whole']);
    return HALLS.map((h) => ({ id: h.id, available: !av.some((s) => s.hallId === h.id && s.time === b.time && s.taken) || h.id === b.hallId }));
  }, [entries, b.id, b.date, b.time, b.hallId]);

  const estimate = useMemo(() => {
    const lines = buildQuoteLines({ ...b, requirements: values, hallId: (values.hallId as HallId) ?? b.hallId }, catalog);
    return lines.reduce((s, l) => s + lineAmount(l), 0);
  }, [b, values, catalog]);

  async function submit() {
    setTried(true);
    if (missing.length) {
      toast(`필수 항목 ${missing.length}개를 선택해 주세요: ${missing.map((m) => m.label).join(', ')}`, 'error');
      document.getElementById(`req-${missing[0].key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    clearTimeout(timer.current);
    await store.saveBooking(ops.submitRequirements(latest.current, values));
    setBusy(false);
    toast('필요사항을 제출했어요. 맞춤 견적서를 준비할게요!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="req-form">
      <nav className="req-nav chip-row" aria-label="작성 항목">
        {cfg.sections.map((s) => (
          <a key={s.id} href={`#sec-${s.id}`} className="chip chip--sm" onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
            {s.title}
          </a>
        ))}
      </nav>
      {cfg.sections.map((s, i) => (
        <section key={s.id} id={`sec-${s.id}`} className="req-section">
          <h3 className="req-section__title">
            <span className="numeral">{String(i + 1).padStart(2, '0')}</span> {s.title}
          </h3>
          {s.desc && <p className="caption">{s.desc}</p>}
          <div className="req-section__fields">
            {s.fields
              .filter((f) => isFieldVisible(f, values))
              .map((f) => (
                <div key={f.key} id={`req-${f.key}`} className={tried && missing.some((m) => m.key === f.key) ? 'is-missing' : undefined}>
                  <FieldInput field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} catalog={catalog} hallOptions={f.kind === 'hall' ? hallOptions : undefined} guests={guests} />
                </div>
              ))}
          </div>
        </section>
      ))}

      <div className="req-submit">
        <div className="req-submit__info">
          <span className="caption">
            필수 {requiredTotal - missing.length}/{requiredTotal} · {saved === 'saving' ? '저장 중…' : saved === 'saved' ? '자동 저장됨' : '입력하면 자동 저장돼요'}
          </span>
          <span className="title-sm">
            예상 금액 약 <span className="text-gold">{wonShort(estimate)}</span>
          </span>
          <span className="caption">할인 전 금액이에요. 최종 견적은 플래너가 확인 후 보내드려요.</span>
        </div>
        <button className="btn btn--primary btn--lg" onClick={submit} disabled={busy}>
          {busy ? <span className="spinner" /> : '필요사항 제출하기'}
        </button>
      </div>
    </div>
  );
}

/** 제출한 필요사항 요약 (읽기 전용) */
export function RequirementsSummary({ booking: b, onEdit }: { booking: Booking; onEdit?: () => void }) {
  const cfg = EVENT_TYPES[b.eventType];
  return (
    <div className="req-summary">
      {cfg.sections.map((s) => {
        const rows = s.fields.filter((f) => isFieldVisible(f, b.requirements) && b.requirements[f.key] !== undefined && b.requirements[f.key] !== '');
        if (!rows.length) return null;
        return (
          <div key={s.id} className="req-summary__group">
            <div className="label">{s.title}</div>
            <dl className="kv mt-8">
              {rows.map((f) => (
                <div key={f.key} style={{ display: 'contents' }}>
                  <dt>{f.label}</dt>
                  <dd>{f.kind === 'hall' ? HALLS.find((h) => h.id === b.requirements[f.key])?.name : displayValue(f, b.requirements[f.key])}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
      {onEdit && (
        <button className="btn btn--secondary btn--sm" onClick={onEdit}>
          <Icon name="edit" size={16} /> 필요사항 수정하기
        </button>
      )}
    </div>
  );
}
