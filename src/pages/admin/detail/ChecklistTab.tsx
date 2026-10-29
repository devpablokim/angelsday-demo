import { addDays, diffDays, formatDate, formatDateTime } from '@shared/dates';
import * as ops from '@shared/ops';
import type { Booking } from '@shared/types';
import { useState, type FormEvent } from 'react';
import { Icon } from '../../../components/Icon';
import { Empty } from '../../../components/ui';
import { useToday } from '../../../data/hooks';
import { useSaveBooking } from '../adminUtils';

const BY: Record<string, string> = { template: '기본', admin: '관리자 추가', customer: '고객 추가' };

export function ChecklistTab({ booking: b }: { booking: Booking }) {
  const save = useSaveBooking();
  const today = useToday();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [due, setDue] = useState(() => (addDays(b.date, -7) < today ? today : addDays(b.date, -7)));
  const done = b.checklist.filter((c) => c.done).length;
  const pct = b.checklist.length ? Math.round((done / b.checklist.length) * 100) : 0;

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (await save(ops.addChecklist(b, title.trim(), due, 'admin', desc.trim() || undefined), '고객 체크리스트에 추가했어요.')) {
      setTitle('');
      setDesc('');
    }
  }

  return (
    <div className="detail-grid">
      <section className="card">
        <div className="card__head">
          <div>
            <div className="title-md">고객 체크리스트</div>
            <p className="caption">고객이 STEP 4에서 하나씩 완료해요. 완료 현황이 실시간으로 보여요.</p>
          </div>
          <span className="numeral kpi-inline">{pct}%</span>
        </div>
        {b.checklist.length > 0 && (
          <div className="progress mb-16">
            <div className="progress__bar" style={{ width: `${pct}%` }} />
          </div>
        )}
        {b.checklist.length === 0 ? (
          <Empty>체크리스트가 아직 없어요. 예약금 결제 시 행사 종류별 기본 항목이 생성돼요.</Empty>
        ) : (
          <ul className="list">
            {b.checklist.map((c) => {
              const d = diffDays(today, c.dueDate);
              return (
                <li key={c.id} className="list-item">
                  <label className="check">
                    <input type="checkbox" checked={c.done} onChange={(e) => void save(ops.toggleChecklist(b, c.id, e.target.checked, 'admin'))} aria-label={`${c.title} 완료`} />
                  </label>
                  <div className="list-item__body">
                    <div className={`list-item__title ${c.done ? 'list-item__title--done' : ''}`}>{c.title}</div>
                    {c.description && <div className="caption">{c.description}</div>}
                    <div className="list-item__meta">
                      {formatDate(c.dueDate)}까지 · {BY[c.addedBy]}
                      {c.done && c.doneAt ? ` · 완료 ${formatDateTime(c.doneAt)}` : !c.done && d < 0 ? <span className="text-error"> · {-d}일 지남</span> : ''}
                    </div>
                  </div>
                  <button className="btn btn--ghost btn--icon" onClick={() => void save(ops.removeChecklist(b, c.id), '항목을 삭제했어요.')} aria-label={`${c.title} 삭제`}>
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form className="card stack gap-16" onSubmit={onAdd}>
        <div className="title-md">항목 추가</div>
        <label className="field">
          <span className="field__label">할 일</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 혼주 한복 대여 일정 확인" />
        </label>
        <label className="field">
          <span className="field__label">설명 (선택)</span>
          <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">기한</span>
          <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <button className="btn btn--primary" type="submit" disabled={!title.trim()}>
          고객 체크리스트에 추가
        </button>
      </form>
    </div>
  );
}
