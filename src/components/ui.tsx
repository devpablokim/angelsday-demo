import { EVENT_TYPES } from '@shared/eventTypes';
import type { CalendarStatus, EventType, TaskStatus } from '@shared/types';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Logo } from '../brand/Logo';
import { Icon } from './Icon';

/* ───────── Toast ───────── */
interface ToastItem {
  id: number;
  text: string;
  tone: 'default' | 'error';
}
const ToastCtx = createContext<(text: string, tone?: 'default' | 'error') => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: 'default' | 'error' = 'default') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.tone === 'error' ? 'toast--error' : ''}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/* ───────── Sheet (모바일 바텀시트 / 데스크톱 모달) ───────── */
export function Sheet({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${wide ? 'sheet--wide' : ''}`} role="dialog" aria-modal="true" tabIndex={-1} ref={ref}>
        <div className="sheet__grip" />
        {title && (
          <div className="sheet__head">
            <div className="title-md">{title}</div>
            <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="닫기">
              <Icon name="close" />
            </button>
          </div>
        )}
        {children}
        {footer && <div className="mt-24">{footer}</div>}
      </div>
    </div>
  );
}

/* ───────── Badges ───────── */
export function EventBadge({ type, short }: { type: EventType; short?: boolean }) {
  const label = short ? { wedding: '웨딩', dol: '돌잔치', birthday: '생신연', corporate: '기업행사', catering: '케이터링' }[type] : EVENT_TYPES[type].label;
  return <span className={`badge badge--event-${type}`}>{label}</span>;
}

const STATUS_LABEL: Record<CalendarStatus, string> = { confirmed: '계약 확정', pending: '예약 문의중', promo: '프로모션일', blocked: '휴무 · 마감' };
export function StatusPill({ status }: { status: CalendarStatus }) {
  return <span className={`status-pill status-pill--${status}`}>{STATUS_LABEL[status]}</span>;
}
export const statusLabel = (s: CalendarStatus) => STATUS_LABEL[s];

const TASK_LABEL: Record<TaskStatus, string> = { todo: '준비 예정', doing: '진행 중', done: '완료' };
export function TaskStatusChip({ status }: { status: TaskStatus }) {
  return <span className={`task-status task-status--${status}`}>{TASK_LABEL[status]}</span>;
}
export const taskLabel = (s: TaskStatus) => TASK_LABEL[s];

/* ───────── 이미지 (실패 시 브랜드 플레이스홀더) ───────── */
export function Img({ src, alt, className, ratio = '4 / 3' }: { src?: string; alt: string; className?: string; ratio?: string }) {
  const [failed, setFailed] = useState(!src);
  useEffect(() => setFailed(!src), [src]);
  return (
    <div className={`img-frame ${className ?? ''}`} style={{ aspectRatio: ratio }}>
      {failed ? (
        <div className="img-frame__placeholder" aria-label={alt} role="img">
          <Logo layout="monogram" height={44} />
        </div>
      ) : (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} referrerPolicy="no-referrer" />
      )}
    </div>
  );
}

/* ───────── Loading ───────── */
export function PageLoading() {
  return (
    <div className="page-loading">
      <Logo layout="monogram" height={56} className="page-loading__mono" />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Logo layout="monogram" height={40} className="empty__mono" />
      {children}
    </div>
  );
}

/* ───────── Counter ───────── */
export function Counter({ value, onChange, min = 0, max = 999, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="counter">
      <button type="button" onClick={() => onChange(clamp(value - (value > 50 ? 5 : 1)))} aria-label={`${label} 줄이기`}>
        −
      </button>
      <input inputMode="numeric" value={value} aria-label={label} onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, '')) || 0))} />
      <button type="button" onClick={() => onChange(clamp(value + (value >= 50 ? 5 : 1)))} aria-label={`${label} 늘리기`}>
        +
      </button>
    </div>
  );
}

/* ───────── Switch ───────── */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" />
      <span>{label}</span>
    </label>
  );
}

/* ───────── 복사 ───────── */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
