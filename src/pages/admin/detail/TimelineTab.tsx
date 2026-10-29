import { formatDateTime } from '@shared/dates';
import * as ops from '@shared/ops';
import type { Booking } from '@shared/types';
import { useState, type FormEvent } from 'react';
import { Switch } from '../../../components/ui';
import { useSaveBooking } from '../adminUtils';

const ACTOR: Record<string, string> = { customer: '고객', admin: '관리자', system: '시스템' };

export function TimelineTab({ booking: b }: { booking: Booking }) {
  const save = useSaveBooking();
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'customer' | 'admin' | 'internal'>('all');

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    if (await save(ops.addNote(b, msg.trim(), !visible), visible ? '고객에게도 보이는 기록을 남겼어요.' : '내부 메모를 남겼어요.')) setMsg('');
  }

  const list = [...b.timeline]
    .reverse()
    .filter((t) => (filter === 'all' ? true : filter === 'internal' ? t.internal : t.actor === filter && !t.internal));

  return (
    <div className="detail-grid detail-grid--wide-first">
      <section className="card">
        <div className="card__head">
          <div className="title-md">전체 기록 {b.timeline.length}건</div>
          <div className="row gap-4 wrap">
            {(['all', 'customer', 'admin', 'internal'] as const).map((f) => (
              <button key={f} className="chip chip--sm" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {{ all: '전체', customer: '고객', admin: '관리자', internal: '내부용' }[f]}
              </button>
            ))}
          </div>
        </div>
        <ol className="timeline">
          {list.map((t) => (
            <li key={t.id} className={`timeline__item timeline__item--${t.actor}`}>
              <div className="timeline__time">
                {formatDateTime(t.at)} · {ACTOR[t.actor]}
                {t.internal && <span className="badge badge--outline" style={{ marginLeft: 6 }}>내부용</span>}
              </div>
              <div className="timeline__msg">{t.message}</div>
            </li>
          ))}
        </ol>
      </section>
      <form className="card stack gap-16" onSubmit={onAdd}>
        <div className="title-md">기록 남기기</div>
        <p className="caption">통화 내용, 현장 특이사항, 고객과 합의한 내용을 남겨 주세요. 행사 전까지의 모든 정보가 이곳에 쌓여요.</p>
        <textarea className="textarea" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="예) 신랑 어머님 통화 — 폐백 음식 견과류 제외 요청" aria-label="기록 내용" />
        <Switch checked={visible} onChange={setVisible} label="고객 페이지 기록에도 보이기" />
        <button className="btn btn--primary" type="submit" disabled={!msg.trim()}>
          기록 저장
        </button>
      </form>
    </div>
  );
}
