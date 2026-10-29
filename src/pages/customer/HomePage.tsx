import { EVENT_TYPE_LIST, EVENT_TYPES } from '@shared/eventTypes';
import { STEPS } from '@shared/steps';
import type { EventType, HallId } from '@shared/types';
import { HALLS, VENUE } from '@shared/venue';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../brand/Logo';
import { openChat } from '../../components/ChatBot';
import { Icon } from '../../components/Icon';
import { EventBadge, Sheet } from '../../components/ui';
import { EVENT_PHOTOS, FEATURES, GALLERY, HALL_PHOTOS, HERO_SLIDES, img, PLACES } from '../../content/photos';
import { ENV } from '../../data/store';

const EVENT_COVER: Record<EventType, string> = {
  wedding: img('events/wedding-5'),
  dol: img('events/dol-4'),
  birthday: img('events/birthday-1'),
  corporate: img('events/corporate-3'),
  catering: img('events/catering-2'),
};

type RoomId = Exclude<HallId, 'whole'>;
const ROOMS: RoomId[] = ['lovely', 'aloha', 'bellita', 'sia'];

export function HomePage() {
  const [lightbox, setLightbox] = useState<{ list: string[]; i: number; title: string } | null>(null);
  const open = (list: string[], i: number, title: string) => setLightbox({ list, i, title });

  return (
    <>
      <Hero />

      <section className="land-stats">
        <div className="container land-stats__grid">
          {[
            ['12', '년째 특별한 날을 준비해요'],
            ['7,000+', '케이터링 · 연회 행사 경험'],
            ['120', '여 가지 프리미엄 뷔페'],
            ['400', '평 스카이라운지 · 4개 홀'],
          ].map(([n, l]) => (
            <div key={l} className="land-stats__item">
              <span className="numeral land-stats__num">{n}</span>
              <span className="caption">{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 소개 · 특징 */}
      <section className="section" id="about">
        <div className="container">
          <div className="section-head">
            <span className="overline">INTRODUCTION</span>
            <h2 className="display-lg">최고의 날을 위한 최고의 파티하우스</h2>
            <p className="body-md text-muted">김포 장기역 스카이라운지에서 2014년부터 웨딩, 돌잔치, 생신연, 기업행사를 준비해 왔습니다. 자연채광이 가득한 프라이빗 연회공간과 호텔 출신 셰프의 음식으로 하루를 완성해요.</p>
          </div>
          <div className="feature-grid">
            {FEATURES.map((f, i) => (
              <article key={f.title} className="feature">
                <button className="feature__media" onClick={() => open(FEATURES.map((x) => x.image), i, f.title)}>
                  <img src={f.image} alt={f.title} loading="lazy" />
                </button>
                <span className="feature__no numeral">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="title-md">{f.title}</h3>
                <p className="body-sm text-muted">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 홀 */}
      <HallsSection onOpen={open} />

      {/* 부대 공간 */}
      <section className="section" id="places">
        <div className="container">
          <div className="section-head">
            <span className="overline">ETC PLACE</span>
            <h2 className="display-lg">호텔 출신 셰프의 즉석 조리 서비스</h2>
          </div>
          <div className="place-list">
            {PLACES.map((p) => (
              <article key={p.id} className="place">
                <div className="place__text">
                  <span className="overline">{p.en}</span>
                  <h3 className="display-sm mt-8">{p.title}</h3>
                  <p className="body-sm text-muted mt-8">{p.desc}</p>
                </div>
                <PhotoStrip photos={p.photos} title={p.title} onOpen={open} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 행사 종류 */}
      <section className="section section--soft" id="events">
        <div className="container">
          <div className="section-head">
            <span className="overline">PARTY TYPE</span>
            <h2 className="display-lg">어떤 날을 준비하시나요?</h2>
          </div>
          <div className="event-grid">
            {EVENT_TYPE_LIST.map((t) => {
              const c = EVENT_TYPES[t];
              return (
                <article key={t} className="event-tile">
                  <button className="event-tile__media" onClick={() => open(EVENT_PHOTOS[t], 0, c.label)} aria-label={`${c.label} 사진 보기`}>
                    <img src={EVENT_COVER[t]} alt={`${c.label} 행사 사진`} loading="lazy" />
                    <span className="event-tile__count">
                      <Icon name="image" size={14} /> {EVENT_PHOTOS[t].length}
                    </span>
                  </button>
                  <div className="event-tile__body">
                    <div className="row between">
                      <EventBadge type={t} />
                      <span className="caption">
                        {c.guestRange[0]}–{c.guestRange[1]}명
                      </span>
                    </div>
                    <h3 className="display-sm mt-12">{c.tagline}</h3>
                    <ul className="event-tile__list">
                      {c.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                    <div className="row gap-8 event-tile__actions">
                      {c.usesHall && (
                        <Link to={`/calendar?type=${t}`} className="btn btn--secondary btn--sm grow">
                          가능일 보기
                        </Link>
                      )}
                      <Link to={`/inquiry?type=${t}`} className="btn btn--primary btn--sm grow">
                        {c.label} 문의
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
            <article className="event-tile event-tile--cta">
              <Logo layout="monogram" height={52} />
              <h3 className="display-sm mt-16">어떤 구성이 좋을지 고민되시나요?</h3>
              <p className="body-sm mt-8">20년 경력 파티디렉터가 인원과 예산에 맞는 구성을 제안해 드려요.</p>
              <button className="btn btn--gold btn--sm mt-24" onClick={() => openChat('어떤 행사로 진행하면 좋을지 추천해 주세요')}>
                컨시어지에게 물어보기
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* 진행 과정 */}
      <section className="section" id="journey">
        <div className="container">
          <div className="section-head">
            <span className="overline">YOUR JOURNEY</span>
            <h2 className="display-lg">문의부터 행사 사진까지, 한 페이지에서</h2>
            <p className="body-md text-muted">문의를 남기면 고객님만의 행사 페이지와 예약 비밀번호가 생겨요. 지금 어떤 단계인지, 다음에 무엇을 하면 되는지 언제든 확인하세요.</p>
          </div>
          <ol className="journey-row">
            {STEPS.map((s) => (
              <li key={s.no} className="journey-row__item">
                <span className="journey-row__no numeral">{s.no}</span>
                <span className="title-sm">{s.title}</span>
                <span className="caption">{s.customerAction}</span>
              </li>
            ))}
          </ol>
          <div className="row wrap gap-8 mt-32">
            <Link to="/inquiry" className="btn btn--primary">
              행사 문의하기 <Icon name="arrowRight" size={16} />
            </Link>
            <Link to="/my" className="btn btn--secondary">
              <Icon name="lock" size={16} /> 예약 비밀번호로 내 행사 보기
            </Link>
          </div>
        </div>
      </section>

      {/* 갤러리 */}
      <section className="section section--soft" id="gallery">
        <div className="container">
          <div className="section-head">
            <span className="overline">GALLERY</span>
            <h2 className="display-lg">엔젤스데이에서의 하루</h2>
          </div>
          <div className="gallery-grid">
            {GALLERY.slice(0, 12).map((src, i) => (
              <button key={src} className="gallery-grid__item" onClick={() => open(GALLERY, i, '갤러리')}>
                <img src={src} alt={`행사 갤러리 ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 오시는 길 */}
      <section className="section" id="location">
        <div className="container location">
          <div className="location__media">
            <img src={img('places/photo-2')} alt="엔젤스데이 입구" loading="lazy" />
          </div>
          <div className="location__info">
            <span className="overline">LOCATION</span>
            <h2 className="display-md mt-8">오시는 길</h2>
            <dl className="kv mt-24">
              <dt>주소</dt>
              <dd>{VENUE.address}</dd>
              <dt>교통</dt>
              <dd>{VENUE.addressShort}</dd>
              <dt>주차</dt>
              <dd>{VENUE.parking}</dd>
              <dt>상담</dt>
              <dd>
                <a href={`tel:${VENUE.phone}`}>{VENUE.phone}</a>
              </dd>
            </dl>
            <div className="row wrap gap-8 mt-24">
              <a className="btn btn--secondary btn--sm" href={VENUE.mapUrl} target="_blank" rel="noreferrer">
                <Icon name="map" size={16} /> 네이버 지도
              </a>
              <a className="btn btn--secondary btn--sm" href={VENUE.kakaoMapUrl} target="_blank" rel="noreferrer">
                카카오맵
              </a>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />

      <Lightbox state={lightbox} onChange={setLightbox} />
    </>
  );
}

function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);
  const s = HERO_SLIDES[i];
  return (
    <section className="land-hero" aria-label="엔젤스데이 소개">
      {HERO_SLIDES.map((h, k) => (
        <img key={h.image} className={`land-hero__bg ${k === i ? 'is-on' : ''}`} src={h.image} alt="" fetchPriority={k === 0 ? 'high' : 'low'} />
      ))}
      <div className="land-hero__shade" />
      <div className="container land-hero__inner">
        <span className="overline land-hero__over">ANGELSDAY PARTY HOUSE · SINCE {VENUE.since}</span>
        <h1 key={s.title} className="land-hero__title">
          {s.title.split('\n').map((line, k) => (
            <span key={k}>
              {line}
              <br />
            </span>
          ))}
        </h1>
        <p key={s.desc} className="land-hero__desc">
          {s.desc}
        </p>
        <div className="row wrap gap-8 land-hero__cta">
          <Link to="/calendar" className="btn btn--gold btn--lg">
            대관 가능일 확인 <Icon name="arrowRight" size={18} />
          </Link>
          <Link to="/inquiry" className="btn btn--on-ink btn--lg">
            행사 문의하기
          </Link>
        </div>
        <div className="land-hero__dots" role="tablist" aria-label="슬라이드">
          {HERO_SLIDES.map((h, k) => (
            <button key={h.image} role="tab" aria-selected={k === i} aria-label={`${k + 1}번째 슬라이드`} className={k === i ? 'is-on' : ''} onClick={() => setI(k)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HallsSection({ onOpen }: { onOpen: (list: string[], i: number, title: string) => void }) {
  const [room, setRoom] = useState<RoomId>('lovely');
  const [photo, setPhoto] = useState(0);
  const hall = HALLS.find((h) => h.id === room)!;
  const photos = HALL_PHOTOS[room];
  useEffect(() => setPhoto(0), [room]);
  return (
    <section className="section section--soft" id="halls">
      <div className="container">
        <div className="section-head">
          <span className="overline">PARTY HALL</span>
          <h2 className="display-lg">자연채광이 가득한 프라이빗 연회공간</h2>
        </div>
        <div className="chip-row" role="tablist" aria-label="홀 선택">
          {ROOMS.map((r) => (
            <button key={r} role="tab" aria-selected={room === r} className="chip" aria-pressed={room === r} onClick={() => setRoom(r)}>
              {HALLS.find((h) => h.id === r)!.name}
            </button>
          ))}
        </div>
        <div className="hall-show mt-24">
          <div className="hall-show__gallery">
            <button className="hall-show__main" onClick={() => onOpen(photos, photo, hall.name)} aria-label={`${hall.name} 사진 크게 보기`}>
              <img key={photos[photo]} src={photos[photo]} alt={`${hall.name} ${photo + 1}`} />
            </button>
            <div className="hall-show__thumbs">
              {photos.map((p, k) => (
                <button key={p} className={k === photo ? 'is-on' : ''} onClick={() => setPhoto(k)} aria-label={`${k + 1}번째 사진`}>
                  <img src={p} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
          <div className="hall-show__info">
            <span className="overline">{hall.nameEn} ROOM</span>
            <h3 className="display-md mt-8">{hall.name}</h3>
            <p className="body-md text-muted mt-12">{hall.desc}</p>
            <div className="hall-show__cap">
              <div>
                <span className="label">보증 인원</span>
                <span className="numeral">{hall.guaranteed}</span>
              </div>
              <div>
                <span className="label">총 좌석</span>
                <span className="numeral">{hall.seats}</span>
              </div>
            </div>
            <p className="body-sm">
              <b className="text-ink">추천 행사</b> · {hall.bestFor}
            </p>
            <div className="row wrap gap-8 mt-24">
              <Link to={`/calendar?hall=${room}`} className="btn btn--primary btn--sm">
                {hall.name} 가능일 보기
              </Link>
              <Link to={`/inquiry?hall=${room}`} className="btn btn--secondary btn--sm">
                이 홀로 문의
              </Link>
            </div>
          </div>
        </div>
        <p className="caption mt-16">200명 이상 행사는 400평 전체 공간을 4시간 단독으로 이용할 수 있어요.</p>
      </div>
    </section>
  );
}

function PhotoStrip({ photos, title, onOpen }: { photos: string[]; title: string; onOpen: (list: string[], i: number, title: string) => void }) {
  return (
    <div className="photo-strip" role="list">
      {photos.map((p, i) => (
        <button key={p} role="listitem" className="photo-strip__item" onClick={() => onOpen(photos, i, title)} aria-label={`${title} 사진 ${i + 1}`}>
          <img src={p} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function Lightbox({ state, onChange }: { state: { list: string[]; i: number; title: string } | null; onChange: (s: { list: string[]; i: number; title: string } | null) => void }) {
  const move = (d: number) => state && onChange({ ...state, i: (state.i + d + state.list.length) % state.list.length });
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowLeft') move(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  return (
    <Sheet open={!!state} onClose={() => onChange(null)} title={state ? `${state.title} · ${state.i + 1}/${state.list.length}` : ''} wide>
      {state && (
        <div className="lightbox">
          <img src={state.list[state.i]} alt={`${state.title} ${state.i + 1}`} />
          {state.list.length > 1 && (
            <div className="lightbox__nav">
              <button className="mcal__arrow" onClick={() => move(-1)} aria-label="이전 사진">
                <Icon name="chevronLeft" />
              </button>
              <button className="mcal__arrow" onClick={() => move(1)} aria-label="다음 사진">
                <Icon name="chevronRight" />
              </button>
            </div>
          )}
        </div>
      )}
    </Sheet>
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
