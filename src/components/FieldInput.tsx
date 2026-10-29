import { itemByKey } from '@shared/catalog';
import { wonShort } from '@shared/dates';
import type { FieldDef } from '@shared/eventTypes';
import type { Catalog, FieldValue, HallId } from '@shared/types';
import { HALLS } from '@shared/venue';
import { Counter, Switch } from './ui';

interface Props {
  field: FieldDef;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  catalog?: Catalog;
  error?: boolean;
  disabled?: boolean;
  /** hall 필드: 선택 가능한 홀과 가용 여부 */
  hallOptions?: { id: HallId; available: boolean }[];
  guests?: number;
}

function priceHint(catalog: Catalog | undefined, key?: string): string | undefined {
  if (!catalog || !key) return undefined;
  const item = itemByKey(catalog, key);
  if (!item) return undefined;
  if (item.price === 0) return '기본 포함';
  return item.peoplePerUnit === 1 ? `1인 ${item.price.toLocaleString('ko-KR')}원` : `+${wonShort(item.price)}`;
}

export function FieldInput({ field: f, value, onChange, catalog, error, disabled, hallOptions, guests }: Props) {
  const id = `f-${f.key}`;
  const label = (
    <span className="field__label">
      {f.label}
      {f.required && <span className="req">*</span>}
    </span>
  );

  if (f.kind === 'toggle') {
    const hint = priceHint(catalog, f.catalogKey);
    return (
      <div className="field field--toggle">
        <Switch
          checked={value === true}
          onChange={(v) => !disabled && onChange(v)}
          label={
            <span className="stack">
              <span className="title-sm" style={{ fontWeight: 500 }}>
                {f.label}
              </span>
              {(f.hint || hint) && (
                <span className="caption">
                  {f.hint}
                  {f.hint && hint ? ' · ' : ''}
                  {hint && <span className="text-gold">{hint}</span>}
                </span>
              )}
            </span>
          }
        />
      </div>
    );
  }

  if (f.kind === 'counter') {
    return (
      <div className="field">
        {label}
        <div className="row gap-12 wrap">
          <Counter value={Number(value ?? 0)} onChange={(n) => !disabled && onChange(n)} min={f.min ?? 0} max={f.max ?? 999} label={f.label} />
          {f.suffix && <span className="body-sm text-muted">{f.suffix}</span>}
          {f.catalogKey && <span className="caption text-gold">{priceHint(catalog, f.catalogKey)}</span>}
        </div>
        {f.hint && <span className="field__hint">{f.hint}</span>}
      </div>
    );
  }

  if (f.kind === 'hall') {
    const opts = hallOptions ?? HALLS.map((h) => ({ id: h.id, available: true }));
    return (
      <div className="field">
        {label}
        <div className="option-grid option-grid--2" role="radiogroup" aria-label={f.label}>
          {opts.map(({ id: hid, available }) => {
            const h = HALLS.find((x) => x.id === hid)!;
            const fits = guests === undefined || (guests <= h.seats && (hid !== 'whole' || guests >= 150));
            return (
              <button
                type="button"
                key={hid}
                className="option-card"
                role="radio"
                aria-checked={value === hid}
                disabled={disabled || !available}
                onClick={() => onChange(hid)}
              >
                <span className="option-card__check" />
                <span className="option-card__title">
                  {h.name} <span className="caption">{h.nameEn}</span>
                </span>
                <span className="option-card__desc">{h.desc}</span>
                <span className="option-card__meta">
                  보증 {h.guaranteed}명 · 좌석 {h.seats}석{!available ? ' · 예약 마감' : !fits ? ' · 인원 확인 필요' : ''}
                </span>
              </button>
            );
          })}
        </div>
        {f.hint && <span className="field__hint">{f.hint}</span>}
      </div>
    );
  }

  if ((f.kind === 'radio' || f.kind === 'multi') && f.options) {
    const multi = f.kind === 'multi';
    const arr = multi ? (Array.isArray(value) ? value : []) : [];
    const isOn = (v: string) => (multi ? arr.includes(v) : value === v);
    const toggle = (v: string) => {
      if (disabled) return;
      if (multi) onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
      else onChange(v);
    };
    if (f.layout === 'cards') {
      return (
        <div className="field">
          {label}
          <div className={`option-grid ${f.options.length >= 3 ? 'option-grid--3' : 'option-grid--2'}`} role={multi ? 'group' : 'radiogroup'} aria-label={f.label}>
            {f.options.map((o) => (
              <button type="button" key={o.value} className="option-card" role={multi ? 'checkbox' : 'radio'} aria-checked={isOn(o.value)} onClick={() => toggle(o.value)}>
                <span className="option-card__check" />
                <span className="option-card__title">{o.label}</span>
                {o.desc && <span className="option-card__desc">{o.desc}</span>}
                {o.catalogKey && <span className="option-card__meta">{priceHint(catalog, o.catalogKey)}</span>}
              </button>
            ))}
          </div>
          {f.hint && <span className="field__hint">{f.hint}</span>}
        </div>
      );
    }
    return (
      <div className="field">
        {label}
        <div className="row wrap gap-8" role={multi ? 'group' : 'radiogroup'} aria-label={f.label}>
          {f.options.map((o) => {
            const hint = priceHint(catalog, o.catalogKey);
            return (
              <button type="button" key={o.value} className="chip chip--gold-active" aria-pressed={isOn(o.value)} onClick={() => toggle(o.value)} title={o.desc}>
                {o.label}
                {hint && hint !== '기본 포함' && <span className="caption text-gold">{hint}</span>}
              </button>
            );
          })}
        </div>
        {f.hint && <span className="field__hint">{f.hint}</span>}
      </div>
    );
  }

  if (f.kind === 'select' && f.options) {
    return (
      <label className="field" htmlFor={id}>
        {label}
        <select id={id} className="select" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          <option value="">선택해 주세요</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (f.kind === 'textarea') {
    return (
      <label className="field" htmlFor={id}>
        {label}
        <textarea id={id} className="textarea" value={String(value ?? '')} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
        {f.hint && <span className="field__hint">{f.hint}</span>}
      </label>
    );
  }

  const type = f.kind === 'tel' ? 'tel' : f.kind === 'email' ? 'email' : f.kind === 'date' ? 'date' : f.kind === 'time' ? 'time' : 'text';
  return (
    <label className="field" htmlFor={id}>
      {label}
      <input id={id} className="input" type={type} value={String(value ?? '')} placeholder={f.placeholder} aria-invalid={error || undefined} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      {f.hint && <span className="field__hint">{f.hint}</span>}
    </label>
  );
}
