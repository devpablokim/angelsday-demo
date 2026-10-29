import { dayAvailability, promoOf } from '@shared/calendar';
import { formatDate, formatDateShort } from '@shared/dates';
import { EVENT_TYPE_LIST, EVENT_TYPES, headlinePlain } from '@shared/eventTypes';
import * as ops from '@shared/ops';
import type { EventType, HallId, Requirements } from '@shared/types';
import { HALLS, hallName, HOLIDAYS, recommendHalls, ROOM_HALLS, TIME_SLOTS } from '@shared/venue';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Logo } from '../../brand/Logo';
import { FieldInput } from '../../components/FieldInput';
import { Icon } from '../../components/Icon';
import { Headline } from '../../components/Journey';
import { copyText, Counter, PageLoading, useToast } from '../../components/ui';
import { useBooking, useCalendar, useStore, useToday } from '../../data/hooks';
import { customerUrl } from '../../data/store';
import { headline } from '@shared/eventTypes';
import { STEPS } from '@shared/steps';

const DEFAULT_GUESTS: Record<EventType, number> = { wedding: 100, dol: 50, birthday: 40, corporate: 50, catering: 100 };

export function InquiryPage() {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const today = useToday();
  const entries = useCalendar();
  const [params] = useSearchParams();

  const [type, setType] = useState<EventType>((params.get('type') as EventType) || 'wedding');
  const [date, setDate] = useState(params.get('date') ?? '');
  const [time, setTime] = useState(params.get('time') ?? EVENT_TYPES[(params.get('type') as EventType) || 'wedding'].defaultTime);
  const [hallId, setHallId] = useState<HallId | undefined>((params.get('hall') as HallId) || undefined);
  const [guests, setGuests] = useState(DEFAULT_GUESTS[type]);
  const [honoree, setHonoree] = useState<Requirements>({});
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [memo, setMemo] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  const cfg = EVENT_TYPES[type];
  const slotTaken = useMemo(() => {
    if (!date) return new Map<string, boolean>();
    const av = dayAvailability(date, entries, [...ROOM_HALLS, 'whole']);
    return new Map(av.map((s) => [`${s.hallId}|${s.time}`, !!s.taken]));
  }, [date, entries]);
  const promo = date ? promoOf(date, entries) : undefined;
  const recommended = recommendHalls(guests, type);

  const pickType = (t: EventType) => {
    setType(t);
    setGuests(DEFAULT_GUESTS[t]);
    if (!params.get('time')) setTime(EVENT_TYPES[t].defaultTime);
    setHonoree({});
  };

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!date) e.date = '날짜를 선택해 주세요.';
    else if (date < today) e.date = '오늘 이후 날짜를 선택해 주세요.';
    if (!time) e.time = '시간을 선택해 주세요.';
    if (cfg.usesHall && !hallId) e.hall = '홀을 선택해 주세요.';
    if (cfg.usesHall && hallId && slotTaken.get(`${hallId}|${time}`)) e.hall = '선택하신 홀·시간은 이미 예약되어 있어요.';
    for (const f of cfg.honoreeFields) if (f.required && !String(honoree[f.key] ?? f.defaultValue ?? '').trim()) e[f.key] = `${f.label}을(를) 입력해 주세요.`;
    if (!customer.name.trim()) e.name = '성함을 입력해 주세요.';
    if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(customer.phone.trim())) e.phone = '연락 가능한 휴대폰 번호를 입력해 주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) e.email = '안내 메일을 받을 이메일을 입력해 주세요.';
    if (!agree) e.agree = '개인정보 수집·이용에 동의해 주세요.';
    return e;
  }, [date, today, time, cfg, hallId, slotTaken, honoree, customer, agree]);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setTried(true);
    const first = Object.keys(errors)[0];
    if (first) {
      toast(errors[first], 'error');
      document.getElementById(`q-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    try {
      const values: Requirements = {};
      for (const f of cfg.honoreeFields) values[f.key] = honoree[f.key] ?? f.defaultValue ?? '';
      const b = ops.createBooking({
        eventType: type,
        date,
        time,
        hallId: cfg.usesHall ? hallId : undefined,
        guests,
        customer: { name: customer.name.trim(), phone: customer.phone.trim(), email: customer.email.trim() },
        honoreeValues: values,
        memo: memo.trim() || undefined,
      });
      await store.createBooking(b);
      navigate(`/inquiry/done/${b.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '접수 중 문제가 생겼어요. 다시 시도해 주세요.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => (tried && errors[k] ? <span className="field__error">{errors[k]}</span> : null);

  return (
    <form className="inquiry" onSubmit={submit} noValidate>
      <section className="page-head">
        <div className="container container--narrow">
          <Link to="/calendar" className="back-link">
            <Icon name="arrowLeft" size={16} /> 대관 가능일
          </Link>
          <span className="overline mt-24" style={{ display: 'block' }}>
            INQUIRY
          </span>
          <h1 className="display-lg mt-8">행사 문의 · 예약</h1>
          <p className="body-md text-muted mt-12">기본 정보만 남겨주시면 고객님만의 행사 관리 페이지가 바로 만들어져요. 자세한 필요사항은 그 페이지에서 천천히 작성하시면 돼요.</p>
        </div>
      </section>

      <div className="container container--narrow inquiry__body">
        <fieldset className="q-block">
          <legend className="q-block__title">
            <span className="numeral">01</span> 어떤 행사인가요?
          </legend>
          <div className="option-grid option-grid--2" role="radiogroup">
            {EVENT_TYPE_LIST.map((t) => (
              <button type="button" key={t} className="option-card" role="radio" aria-checked={type === t} onClick={() => pickType(t)}>
                <span className="option-card__check" />
                <span className="option-card__title">{EVENT_TYPES[t].label}</span>
                <span className="option-card__desc">{EVENT_TYPES[t].tagline}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="q-block" id="q-date">
          <legend className="q-block__title">
            <span className="numeral">02</span> 언제인가요?
          </legend>
          <div className="form-grid form-grid--2">
            <label className="field">
              <span className="field__label">
                희망 날짜 <span className="req">*</span>
              </span>
              <input className="input" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={(tried && !!errors.date) || undefined} />
              {date && (
                <span className="field__hint">
                  {formatDateShort(date)}
                  {HOLIDAYS[date] ? ` · ${HOLIDAYS[date]}` : ''}
                  {promo ? ` · ${promo.title} ${promo.discountRate ?? ''}% 할인일` : ''}
                </span>
              )}
              {err('date')}
            </label>
            {cfg.usesHall ? (
              <div className="field" id="q-time">
                <span className="field__label">
                  시간 <span className="req">*</span>
                </span>
                <div className="row wrap gap-8">
                  {TIME_SLOTS.map((s) => (
                    <button type="button" key={s.id} className="chip chip--gold-active" aria-pressed={time === s.time} onClick={() => setTime(s.time)}>
                      {s.time} <span className="caption">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <label className="field" id="q-time">
                <span className="field__label">
                  행사 시작 시각 <span className="req">*</span>
                </span>
                <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            )}
          </div>
        </fieldset>

        <fieldset className="q-block">
          <legend className="q-block__title">
            <span className="numeral">03</span> 몇 분과 함께하시나요?
          </legend>
          <div className="row wrap gap-12">
            <Counter value={guests} onChange={setGuests} min={1} max={1000} label="예상 인원" />
            <span className="body-sm text-muted">명 (예상 인원 · 나중에 바꿀 수 있어요)</span>
          </div>
        </fieldset>

        {cfg.usesHall && (
          <fieldset className="q-block" id="q-hall">
            <legend className="q-block__title">
              <span className="numeral">04</span> 어느 홀을 원하세요?
            </legend>
            <div className="option-grid option-grid--2" role="radiogroup">
              {HALLS.map((h) => {
                const taken = date ? slotTaken.get(`${h.id}|${time}`) : false;
                const rec = recommended.includes(h.id);
                return (
                  <button type="button" key={h.id} className="option-card" role="radio" aria-checked={hallId === h.id} disabled={taken} onClick={() => setHallId(h.id)}>
                    <span className="option-card__check" />
                    <span className="option-card__title">
                      {h.name} {rec && <span className="badge badge--gold">인원 추천</span>}
                    </span>
                    <span className="option-card__desc">{h.desc}</span>
                    <span className="option-card__meta">
                      보증 {h.guaranteed}명 · 좌석 {h.seats}석{taken ? ' · 선택한 시간 마감' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            {err('hall')}
          </fieldset>
        )}

        <fieldset className="q-block">
          <legend className="q-block__title">
            <span className="numeral">{cfg.usesHall ? '05' : '04'}</span> 주인공을 알려주세요
          </legend>
          <div className="form-grid form-grid--2">
            {cfg.honoreeFields.map((f) => (
              <div key={f.key} id={`q-${f.key}`} className={f.kind === 'radio' ? 'span-2' : undefined}>
                <FieldInput field={f} value={honoree[f.key] ?? f.defaultValue} onChange={(v) => setHonoree((h) => ({ ...h, [f.key]: v }))} error={tried && !!errors[f.key]} />
                {err(f.key)}
              </div>
            ))}
          </div>
          {Object.values(honoree).some(Boolean) && (
            <div className="preview-headline">
              <span className="overline">미리보기</span>
              <p>
                <Headline text={headline(type, { ...previewHonorees(type, honoree, cfg.honoreeFields) })} /> <b className="text-gold">D-?</b>
              </p>
            </div>
          )}
        </fieldset>

        <fieldset className="q-block">
          <legend className="q-block__title">
            <span className="numeral">{cfg.usesHall ? '06' : '05'}</span> 연락처
          </legend>
          <div className="form-grid form-grid--2">
            <label className="field" id="q-name">
              <span className="field__label">
                성함 <span className="req">*</span>
              </span>
              <input className="input" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} autoComplete="name" />
              {err('name')}
            </label>
            <label className="field" id="q-phone">
              <span className="field__label">
                휴대폰 <span className="req">*</span>
              </span>
              <input className="input" type="tel" inputMode="tel" placeholder="010-0000-0000" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} autoComplete="tel" />
              {err('phone')}
            </label>
            <label className="field span-2" id="q-email">
              <span className="field__label">
                이메일 <span className="req">*</span>
              </span>
              <input className="input" type="email" inputMode="email" placeholder="안내 메일과 관리 링크를 보내드려요" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} autoComplete="email" />
              {err('email')}
            </label>
            <label className="field span-2">
              <span className="field__label">남기실 말씀</span>
              <textarea className="textarea" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="원하시는 분위기, 예산, 궁금한 점을 자유롭게 적어 주세요." />
            </label>
          </div>
          <label className="check mt-16" id="q-agree">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              <b>[필수]</b> 개인정보 수집·이용 동의 — 성함·연락처·이메일을 문의 응대 및 행사 진행 안내 목적으로 수집하며, 행사 종료 후 1년간 보관합니다.
            </span>
          </label>
          {err('agree')}
        </fieldset>
      </div>

      <div className="submit-bar">
        <div className="container container--narrow submit-bar__inner">
          <div className="submit-bar__summary">
            <span className="caption">{cfg.label}</span>
            <span className="title-sm">
              {date ? formatDate(date) : '날짜 미정'} · {time}
              {cfg.usesHall && hallId ? ` · ${hallName(hallId)}` : ''} · {guests}명
            </span>
          </div>
          <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>
            {busy ? <span className="spinner" /> : '문의 접수하기'}
          </button>
        </div>
      </div>
    </form>
  );
}

function previewHonorees(type: EventType, v: Requirements, fields: { key: string; defaultValue?: unknown }[]) {
  const val = (k: string) => String(v[k] ?? fields.find((f) => f.key === k)?.defaultValue ?? '') || '○○○';
  switch (type) {
    case 'wedding':
      return { primary: val('groom'), secondary: val('bride') };
    case 'dol':
      return { primary: val('baby') };
    case 'birthday':
      return { primary: val('honoree'), detail: val('milestone') };
    case 'corporate':
      return { primary: val('company'), detail: val('eventName') };
    case 'catering':
      return { primary: val('organization'), detail: val('eventName') };
  }
}

export function InquiryDonePage() {
  const { id } = useParams();
  const b = useBooking(id);
  const toast = useToast();
  if (b === undefined) return <PageLoading />;
  if (!b) return <p className="container section">접수 내역을 찾을 수 없어요.</p>;
  const url = customerUrl(b.id);
  return (
    <section className="section done">
      <div className="container container--narrow">
        <div className="done__card">
          <Logo layout="monogram" height={64} />
          <span className="overline mt-24">THANK YOU</span>
          <h1 className="display-md mt-8">문의가 접수되었어요</h1>
          <p className="body-md text-muted mt-12">{headlinePlain(b.eventType, b.honorees)} 함께 준비할 고객님만의 행사 페이지가 열렸어요.</p>
          {b.accessCode && (
            <div className="done__code">
              <span className="label">예약 비밀번호</span>
              <span className="done__code-value">{b.accessCode}</span>
              <span className="caption">‘내 행사 조회’에서 이 비밀번호로 언제든 페이지를 열 수 있어요.</span>
            </div>
          )}
          <div className="done__link">
            <span className="caption">내 행사 관리 링크 · {b.customer.email}로도 보내드렸어요</span>
            <code>{url}</code>
            <div className="row gap-8 wrap">
              <button className="btn btn--secondary btn--sm" onClick={async () => toast((await copyText(url)) ? '링크를 복사했어요' : '복사하지 못했어요')}>
                <Icon name="copy" size={16} /> 링크 복사
              </button>
            </div>
          </div>
          <ol className="done__steps">
            {STEPS.slice(0, 3).map((s) => (
              <li key={s.no}>
                <span className="numeral">{s.no}</span>
                <span>
                  <b>{s.title}</b>
                  <br />
                  <span className="caption">{s.customerAction}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link to={`/my/${b.id}`} className="btn btn--primary btn--lg btn--block mt-24">
            내 행사 페이지로 이동 <Icon name="arrowRight" size={18} />
          </Link>
          <p className="caption mt-12">링크와 비밀번호는 고객님만 아는 정보예요. 가족이나 함께 준비하는 분께만 공유해 주세요.</p>
        </div>
      </div>
    </section>
  );
}
