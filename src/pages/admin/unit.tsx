import { BUSINESS_UNITS, unitInfo, unitOf, type BusinessUnit } from '@shared/units';
import type { Booking } from '@shared/types';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useBookings } from '../../data/hooks';

/** 관리 화면에서 보고 있는 사업부 (베뉴 / 케이터링). 브라우저에 기억해 둡니다. */
const KEY = 'angelsday.admin.unit';
const UnitContext = createContext<{
  unit: BusinessUnit;
  setUnit: (u: BusinessUnit) => void;
}>({ unit: 'venue', setUnit: () => undefined });

function initialUnit(): BusinessUnit {
  try {
    const fromUrl = new URLSearchParams(location.search).get('unit');
    if (fromUrl === 'venue' || fromUrl === 'catering') return fromUrl;
    const saved = localStorage.getItem(KEY);
    if (saved === 'venue' || saved === 'catering') return saved;
  } catch {
    /* 저장소를 쓸 수 없으면 베뉴부터 */
  }
  return 'venue';
}

export function AdminUnitProvider({ children }: { children: ReactNode }) {
  const [unit, set] = useState<BusinessUnit>(initialUnit);
  const setUnit = useCallback((u: BusinessUnit) => {
    set(u);
    try {
      localStorage.setItem(KEY, u);
    } catch {
      /* 기억하지 못해도 화면은 바뀝니다 */
    }
  }, []);
  const value = useMemo(() => ({ unit, setUnit }), [unit, setUnit]);
  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}

export function useAdminUnit() {
  return useContext(UnitContext);
}

/** 지금 보고 있는 사업부의 고객(예약)만 */
export function useUnitBookings(): Booking[] | undefined {
  const all = useBookings();
  const { unit } = useAdminUnit();
  return useMemo(() => all?.filter((b) => unitOf(b) === unit), [all, unit]);
}

/** 사업부 전환 — 사이드바(side)와 고객 관리 상단 탭(tabs) 모양 */
export function UnitSwitch({ variant = 'side' }: { variant?: 'side' | 'tabs' }) {
  const { unit, setUnit } = useAdminUnit();
  const all = useBookings();
  if (variant === 'tabs') {
    return (
      <div className="tabs unit-tabs" role="tablist" aria-label="사업부">
        {BUSINESS_UNITS.map((u) => {
          const n = all?.filter((b) => unitOf(b) === u.id && !b.cancelledAt).length ?? 0;
          return (
            <button key={u.id} className="tab" role="tab" aria-selected={unit === u.id} onClick={() => setUnit(u.id)}>
              {u.label} 고객<span className="count">{n}</span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="unit-switch" role="radiogroup" aria-label="사업부">
      {BUSINESS_UNITS.map((u) => (
        <button key={u.id} type="button" role="radio" aria-checked={unit === u.id} className={`unit-switch__btn${unit === u.id ? ' is-active' : ''}`} onClick={() => setUnit(u.id)}>
          <span className="unit-switch__en">{u.en}</span>
          {u.label}
        </button>
      ))}
    </div>
  );
}

/** 페이지 제목 옆 사업부 표시 */
export function UnitTag() {
  const { unit } = useAdminUnit();
  return <span className={`badge unit-tag unit-tag--${unit}`}>{unitInfo(unit).label}</span>;
}
