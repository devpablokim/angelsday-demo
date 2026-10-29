import { ddayLabel } from '@shared/dates';
import { honoreeLabel } from '@shared/eventTypes';
import { computeStep, STEPS } from '@shared/steps';
import { VENUE } from '@shared/venue';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Icon } from '../../components/Icon';
import { EventBadge } from '../../components/ui';
import { useBookings, useStore, useToday } from '../../data/hooks';
import { DEMO_IDS } from '../../data/seed';

/** 링크 또는 코드로 내 행사 페이지 찾기 */
export function MyLookupPage() {
  const store = useStore();
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const m = code.trim().match(/my\/([\w-]+)/);
    const id = m ? m[1] : code.trim();
    if (id) navigate(`/my/${id}`);
  };

  return (
    <section className="section">
      <div className="container container--narrow">
        <span className="overline">MY EVENT</span>
        <h1 className="display-lg mt-8">내 행사 페이지 찾기</h1>
        <p className="body-md text-muted mt-12">문의 접수 후 메일로 받은 링크를 붙여넣거나, 링크 끝의 코드를 입력하세요.</p>
        <form className="lookup mt-24" onSubmit={submit}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="https://…/my/xxxx 또는 코드" aria-label="링크 또는 코드" />
          <button className="btn btn--primary" type="submit" disabled={!code.trim()}>
            열기
          </button>
        </form>
        <p className="caption mt-12">링크를 잃어버리셨나요? {VENUE.phone}로 연락 주시면 본인 확인 후 다시 보내드려요.</p>
        {store.mode === 'demo' && <DemoLinks />}
      </div>
    </section>
  );
}

function DemoLinks() {
  const bookings = useBookings();
  const today = useToday();
  const ids = Object.values(DEMO_IDS) as string[];
  const list = (bookings ?? []).filter((b) => ids.includes(b.id)).sort((a, b) => computeStep(a, today) - computeStep(b, today));
  return (
    <div className="mt-48">
      <div className="label">데모 고객 페이지</div>
      <div className="demo-list mt-12">
        {list.map((b) => {
          const s = computeStep(b, today);
          return (
            <Link key={b.id} to={`/my/${b.id}`} className="demo-item">
              <span className="demo-item__step numeral">{s}</span>
              <span className="grow">
                <span className="row gap-8 wrap">
                  <EventBadge type={b.eventType} short />
                  <span className="caption">{STEPS[s - 1].title}</span>
                </span>
                <span className="title-sm demo-item__name">{honoreeLabel(b.eventType, b.honorees)}</span>
              </span>
              <span className="numeral demo-item__dday">{ddayLabel(b.date, today)}</span>
              <Icon name="chevronRight" size={18} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
