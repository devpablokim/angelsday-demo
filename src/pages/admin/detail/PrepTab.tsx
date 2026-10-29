import { addDays, diffDays, formatDate, todayKST } from '@shared/dates';
import { uid } from '@shared/ids';
import * as ops from '@shared/ops';
import { generatePrep } from '@shared/prepTemplates';
import type { Booking, PrepTask, ScheduleItem, TaskStatus } from '@shared/types';
import { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { Empty, Sheet, Switch, TaskStatusChip } from '../../../components/ui';
import { useToday } from '../../../data/hooks';
import { useSaveBooking } from '../adminUtils';

const STATUSES: TaskStatus[] = ['todo', 'doing', 'done'];
const STATUS_TEXT: Record<TaskStatus, string> = { todo: '준비 예정', doing: '진행 중', done: '완료' };

export function PrepTab({ booking: b }: { booking: Booking }) {
  const save = useSaveBooking();
  const today = useToday();
  const [editing, setEditing] = useState<PrepTask | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [noteFor, setNoteFor] = useState<{ task: PrepTask; status: TaskStatus; note: string } | null>(null);
  const done = b.prepTasks.filter((t) => t.status === 'done').length;
  const pct = b.prepTasks.length ? Math.round((done / b.prepTasks.length) * 100) : 0;

  function openNew() {
    setIsNew(true);
    setEditing({ id: uid('pt'), title: '', owner: '플래너', dueDate: addDays(b.date, -7) < today ? today : addDays(b.date, -7), status: 'todo', visibleToCustomer: true });
  }

  async function generate() {
    const gen = generatePrep(b, todayKST());
    await save(
      ops.log({ ...b, prepTasks: gen.prepTasks, checklist: b.checklist.length ? b.checklist : gen.checklist, daySchedule: b.daySchedule.length ? b.daySchedule : gen.daySchedule }, 'admin', 'prep', '준비 리스트를 템플릿으로 생성했어요', true),
      '템플릿으로 준비 리스트를 만들었어요.',
    );
  }

  async function saveTask() {
    if (!editing || !editing.title.trim()) return;
    const before = b.prepTasks.find((t) => t.id === editing.id);
    let next = ops.upsertTask(b, { ...editing, title: editing.title.trim(), status: before?.status ?? editing.status });
    if (before && before.status !== editing.status) next = ops.setTaskStatus(next, editing.id, editing.status);
    if (await save(next, isNew ? '준비 항목을 추가했어요.' : '준비 항목을 수정했어요.')) setEditing(null);
  }

  return (
    <div className="stack gap-16">
      <section className="card">
        <div className="card__head">
          <div>
            <div className="title-md">엔젤스데이 준비 리스트</div>
            <p className="caption">상태를 바꾸면 고객 페이지 STEP 4에 바로 반영돼요. “고객 공개”를 끄면 내부용 항목이 됩니다.</p>
          </div>
          <button className="btn btn--primary btn--sm" onClick={openNew}>
            <Icon name="plus" size={16} /> 항목 추가
          </button>
        </div>
        {b.prepTasks.length > 0 && (
          <div className="row gap-12 mb-16">
            <div className="progress grow">
              <div className="progress__bar" style={{ width: `${pct}%` }} />
            </div>
            <span className="caption">
              {done}/{b.prepTasks.length} 완료 · {pct}%
            </span>
          </div>
        )}
        {b.prepTasks.length === 0 ? (
          <Empty>
            준비 리스트가 아직 없어요.
            <p className="caption mt-8">예약금이 결제되면 자동으로 생성돼요. 지금 행사 종류별 템플릿으로 만들 수도 있어요.</p>
            <button className="btn btn--secondary btn--sm mt-16" onClick={() => void generate()}>
              <Icon name="sparkle" size={16} /> 템플릿으로 생성
            </button>
          </Empty>
        ) : (
          <ul className="prep-rows">
            {b.prepTasks.map((t) => {
              const d = diffDays(today, t.dueDate);
              const overdue = d < 0 && t.status !== 'done';
              return (
                <li key={t.id} className={`prep-row ${t.status === 'done' ? 'is-done' : ''}`}>
                  <div className="prep-row__main">
                    <div className="row gap-8 wrap">
                      <span className={`list-item__title ${t.status === 'done' ? 'list-item__title--done' : ''}`}>{t.title}</span>
                      {!t.visibleToCustomer && <span className="badge badge--outline">내부용</span>}
                    </div>
                    <div className="list-item__meta">
                      {t.owner} · {formatDate(t.dueDate)} <span className={overdue ? 'text-error' : ''}>({d === 0 ? '오늘' : d > 0 ? `${d}일 남음` : `${-d}일 지남`})</span>
                    </div>
                    {t.note && <p className="prep-row__note">{t.note}</p>}
                  </div>
                  <div className="prep-row__actions">
                    <select
                      className="select select--sm"
                      value={t.status}
                      aria-label={`${t.title} 상태`}
                      onChange={(e) => setNoteFor({ task: t, status: e.target.value as TaskStatus, note: t.note ?? '' })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_TEXT[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn--ghost btn--icon"
                      onClick={() => {
                        setIsNew(false);
                        setEditing(t);
                      }}
                      aria-label={`${t.title} 수정`}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button className="btn btn--ghost btn--icon" onClick={() => void save(ops.removeTask(b, t.id), '항목을 삭제했어요.')} aria-label={`${t.title} 삭제`}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <DayScheduleEditor booking={b} />

      <Sheet
        open={!!noteFor}
        onClose={() => setNoteFor(null)}
        title={noteFor ? `“${noteFor.task.title}” → ${STATUS_TEXT[noteFor.status]}` : ''}
        footer={
          <button
            className="btn btn--primary btn--block"
            onClick={async () => {
              if (!noteFor) return;
              if (await save(ops.setTaskStatus(b, noteFor.task.id, noteFor.status, noteFor.note.trim() || undefined), '준비 상태를 업데이트했어요.')) setNoteFor(null);
            }}
          >
            상태 변경
          </button>
        }
      >
        {noteFor && (
          <>
            <div className="row gap-8">
              <TaskStatusChip status={noteFor.task.status} />
              <Icon name="arrowRight" size={16} />
              <TaskStatusChip status={noteFor.status} />
            </div>
            <label className="field mt-16">
              <span className="field__label">고객에게 보일 진행 메모 (선택)</span>
              <textarea className="textarea" value={noteFor.note} onChange={(e) => setNoteFor({ ...noteFor, note: e.target.value })} placeholder="예) 시안 2종을 메일로 보내드렸어요." />
            </label>
          </>
        )}
      </Sheet>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? '준비 항목 추가' : '준비 항목 수정'}
        footer={
          <button className="btn btn--primary btn--block" disabled={!editing?.title.trim()} onClick={() => void saveTask()}>
            저장
          </button>
        }
      >
        {editing && (
          <div className="stack gap-16">
            <label className="field">
              <span className="field__label">항목</span>
              <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="예) 꽃장식 시안 공유" />
            </label>
            <div className="form-grid form-grid--2">
              <label className="field">
                <span className="field__label">담당</span>
                <input className="input" value={editing.owner} onChange={(e) => setEditing({ ...editing, owner: e.target.value })} />
              </label>
              <label className="field">
                <span className="field__label">기한</span>
                <input className="input" type="date" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} />
              </label>
            </div>
            <div className="row gap-8">
              {STATUSES.map((s) => (
                <button key={s} className="chip chip--sm" aria-pressed={editing.status === s} onClick={() => setEditing({ ...editing, status: s })}>
                  {STATUS_TEXT[s]}
                </button>
              ))}
            </div>
            <label className="field">
              <span className="field__label">메모</span>
              <textarea className="textarea" value={editing.note ?? ''} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
            </label>
            <Switch checked={editing.visibleToCustomer} onChange={(v) => setEditing({ ...editing, visibleToCustomer: v })} label="고객 페이지에 공개" />
          </div>
        )}
      </Sheet>
    </div>
  );
}

function DayScheduleEditor({ booking: b }: { booking: Booking }) {
  const save = useSaveBooking();
  const [items, setItems] = useState<ScheduleItem[] | null>(null);
  const list = items ?? b.daySchedule;
  const editing = items !== null;
  return (
    <section className="card">
      <div className="card__head">
        <div>
          <div className="title-md">당일 타임테이블</div>
          <p className="caption">고객 페이지 STEP 5와 D-1 안내 메일에 표시돼요.</p>
        </div>
        {editing ? (
          <div className="row gap-8">
            <button className="btn btn--ghost btn--sm" onClick={() => setItems(null)}>
              취소
            </button>
            <button
              className="btn btn--primary btn--sm"
              onClick={async () => {
                const clean = list.filter((i) => i.title.trim()).sort((a, z) => a.time.localeCompare(z.time));
                if (await save(ops.log({ ...b, daySchedule: clean }, 'admin', 'prep', '당일 타임테이블을 업데이트했어요'), '타임테이블을 저장했어요.')) setItems(null);
              }}
            >
              저장
            </button>
          </div>
        ) : (
          <button className="btn btn--secondary btn--sm" onClick={() => setItems(b.daySchedule.length ? b.daySchedule : generatePrep(b).daySchedule)}>
            <Icon name="edit" size={16} /> 편집
          </button>
        )}
      </div>
      {list.length === 0 && !editing ? (
        <p className="caption">아직 타임테이블이 없어요. 편집을 누르면 행사 종류별 기본 일정이 채워져요.</p>
      ) : (
        <ul className="schedule-edit">
          {list.map((s, i) => (
            <li key={i} className="schedule-edit__row">
              {editing ? (
                <>
                  <input className="input input--sm" type="time" value={s.time} onChange={(e) => setItems(list.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} aria-label="시간" />
                  <input className="input input--sm grow" value={s.title} onChange={(e) => setItems(list.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} aria-label="내용" />
                  <button className="btn btn--ghost btn--icon" onClick={() => setItems(list.filter((_, j) => j !== i))} aria-label="삭제">
                    <Icon name="trash" size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="numeral schedule-edit__time">{s.time}</span>
                  <span className="body-sm text-ink">{s.title}</span>
                </>
              )}
            </li>
          ))}
          {editing && (
            <li>
              <button className="btn btn--ghost btn--sm" onClick={() => setItems([...list, { time: b.time, title: '' }])}>
                <Icon name="plus" size={16} /> 일정 추가
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
