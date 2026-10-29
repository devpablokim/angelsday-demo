import { ddayLabel } from '@shared/dates';
import { EVENT_TYPE_LIST, EVENT_TYPES, honoreeLabel } from '@shared/eventTypes';
import { computeStep, STEPS } from '@shared/steps';
import { HALLS, VENUE } from '@shared/venue';
import { Link } from 'react-router';
import { Logo } from '../../brand/Logo';
import { openChat } from '../../components/ChatBot';
import { Icon } from '../../components/Icon';
import { EventBadge, Img } from '../../components/ui';
import { useBookings, useStore, useToday } from '../../data/hooks';
import { ENV } from '../../data/store';
import { DEMO_IDS } from '../../data/seed';

export function HomePage() {
  const store = useStore();
  return (
    <>
      <section className="home-hero">
        <div className="container home-hero__grid">
          <div className="home-hero__copy">
            <span className="overline">ANGELSDAY PARTY HOUSE · SINCE {VENUE.since}</span>
            <h1 className="display-mega">
              가장 행복한 순간,
              <br />
              맛있는 기억으로 남다
            </h1>
            <p className="body-md home-hero__lead">스몰웨딩부터 돌잔치, 기업행사까지 12년 동안 음식으로 특별한 순간을 준비해왔습니다. 이제 문의부터 행사 사진까지, 고객님만의 페이지에서 한눈에 확인하세요.</p>
            <div className="row wrap gap-12">
              <Link to="/calendar" className="btn btn--primary btn--lg">
                대관 가능일 확인 <Icon name="arrowRight" size={18} />
              </Link>
              <Link to="/inquiry" className="btn btn--secondary btn--lg">
                행사 문의하기
              </Link>
            </div>
          </div>
          <div className="home-hero__visual" aria-hidden="true">
            <Img src={HALLS[0].image} alt="" ratio="4 / 5" className="home-hero__photo" />
            <div className="home-hero__preview">
              <span className="overline">MY EVENT PAGE</span>
              <p className="home-hero__preview-title">
                <em>이몽룡</em>님과 <em>성춘향</em>님의
                <br />
                행복한 웨딩까지
              </p>
              <span className="home-hero__preview-dday">D-86</span>
              <div className="home-hero__preview-steps">
                {STEPS.map((s) => (
                  <i key={s.no} className={s.no < 4 ? 'done' : s.no === 4 ? 'current' : ''} />
                ))}
              </div>
              <span className="caption">STEP 4 · 준비 사항 확인</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-stats">
        <div className="container home-stats__grid">
          {[
            ['7,000+', '케이터링 · 연회 행사 경험'],
            ['120', '여 가지 프리미엄 뷔페 메뉴'],
            ['15–250', '명 맞춤형 프라이빗 단독룸'],
            ['400', '평 스카이라운지 · 자연채광'],
          ].map(([n, l]) => (
            <div key={l} className="home-stats__item">
              <span className="numeral home-stats__num">{n}</span>
              <span className="caption">{l}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="journey">
        <div className="container">
          <div className="section-head">
            <span className="overline">YOUR JOURNEY</span>
            <h2 className="display-lg">문의하는 순간, 고객님만의 행사 페이지가 열려요</h2>
            <p className="body-md text-muted">어디까지 준비됐는지, 다음에 무엇을 하면 되는지 — 이 페이지만 보면 알 수 있어요. 궁금한 점은 언제든 챗봇 상담으로 물어보세요.</p>
          </div>
          <ol className="journey-grid">
            {STEPS.map((s) => (
              <li key={s.no} className="journey-card">
                <span className="journey-card__no numeral">{String(s.no).padStart(2, '0')}</span>
                <h3 className="title-md">{s.title}</h3>
                <p className="body-sm">{s.about}</p>
                <div className="journey-card__who">
                  <span>
                    <b>고객님</b> {s.customerAction}
                  </span>
                  <span>
                    <b className="text-gold">엔젤스데이</b> {s.angelsAction}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--soft" id="events">
        <div className="container">
          <div className="section-head">
            <span className="overline">PARTY TYPE</span>
            <h2 className="display-lg">어떤 날을 준비하시나요?</h2>
          </div>
          <div className="card-grid card-grid--3">
            {EVENT_TYPE_LIST.map((t) => {
              const c = EVENT_TYPES[t];
              return (
                <article key={t} className="card event-card">
                  <div className="row between">
                    <EventBadge type={t} />
                    <span className="caption">
                      {c.guestRange[0]}–{c.guestRange[1]}명
                    </span>
                  </div>
                  <h3 className="display-sm mt-16">{c.tagline}</h3>
                  <ul className="event-card__list">
                    {c.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                  <div className="row gap-8 mt-24">
                    {c.usesHall && (
                      <Link to={`/calendar?type=${t}`} className="btn btn--secondary btn--sm grow">
                        가능일 보기
                      </Link>
                    )}
                    <Link to={`/inquiry?type=${t}`} className="btn btn--primary btn--sm grow">
                      {c.label} 문의
                    </Link>
                  </div>
                </article>
              );
            })}
            <article className="card card--ink event-card event-card--cta">
              <Logo layout="monogram" height={48} />
              <h3 className="display-sm mt-16">어떤 행사인지 아직 고민 중이신가요?</h3>
              <p className="body-sm mt-8">20년 경력 파티디렉터가 인원과 예산에 맞는 구성을 제안해 드려요.</p>
              <button className="btn btn--gold btn--sm mt-24" onClick={() => openChat('어떤 행사로 진행하면 좋을지 추천해 주세요')}>
                컨시어지에게 물어보기
              </button>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="halls">
        <div className="container">
          <div className="section-head">
            <span className="overline">PARTY HALL</span>
            <h2 className="display-lg">자연채광이 가득한 프라이빗 연회공간</h2>
          </div>
          <div className="hall-grid">
            {HALLS.filter((h) => h.id !== 'whole').map((h) => (
              <article key={h.id} className="hall-card">
                <Img src={h.image} alt={`${h.name} 전경`} ratio="4 / 3" />
                <div className="hall-card__body">
                  <div className="row between">
                    <h3 className="title-md">{h.name}</h3>
                    <span className="overline">{h.nameEn}</span>
                  </div>
                  <p className="body-sm text-muted">{h.desc}</p>
                  <p className="hall-card__cap">
                    보증 <b>{h.guaranteed}</b>명 · 좌석 <b>{h.seats}</b>석
                  </p>
                </div>
              </article>
            ))}
          </div>
          <p className="caption mt-16">200명 이상 행사는 400평 전체 공간을 4시간 단독으로 이용할 수 있어요.</p>
        </div>
      </section>

      {store.mode === 'demo' && <DemoShowcase />}

      <CtaBand />
    </>
  );
}

function DemoShowcase() {
  const bookings = useBookings();
  const today = useToday();
  const ids = Object.values(DEMO_IDS) as string[];
  const list = (bookings ?? []).filter((b) => ids.includes(b.id)).sort((a, b) => computeStep(a, today) - computeStep(b, today));
  if (!list.length) return null;
  return (
    <section className="section section--soft">
      <div className="container">
        <div className="section-head">
          <span className="overline">DEMO</span>
          <h2 className="display-lg">단계별 고객 페이지 둘러보기</h2>
          <p className="body-md text-muted">실제 고객이 받게 될 관리 URL 예시예요. 각 단계에서 고객이 보는 화면을 확인해 보세요. 관리자 화면은 하단의 ‘관리자’ 링크(데모 비밀번호 {ENV.adminPasscode})로 들어갈 수 있어요.</p>
        </div>
        <div className="demo-list">
          {list.map((b) => {
            const step = computeStep(b, today);
            return (
              <Link key={b.id} to={`/my/${b.id}`} className="demo-item">
                <span className="demo-item__step numeral">{step}</span>
                <span className="grow">
                  <span className="row gap-8 wrap">
                    <EventBadge type={b.eventType} short />
                    <span className="caption">{STEPS[step - 1].title}</span>
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
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="cta-band">
      <div className="container cta-band__inner">
        <Logo layout="monogram" height={40} />
        <p className="display-sm">원하시는 날짜가 있으신가요?</p>
        <p className="body-sm text-muted">담당자가 실시간 일정을 확인해 안내드립니다.</p>
        <div className="row wrap gap-8 cta-band__actions">
          <Link to="/inquiry" className="btn btn--primary">
            웨딩 · 연회 · 기업 문의
          </Link>
          <a href={`tel:${VENUE.phone}`} className="btn btn--secondary">
            <Icon name="phone" size={18} /> {VENUE.phone}
          </a>
          <a href={ENV.kakaoUrl} target="_blank" rel="noreferrer" className="btn btn--secondary">
            카카오톡 상담
          </a>
        </div>
      </div>
    </section>
  );
}
