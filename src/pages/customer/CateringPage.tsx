import { EVENT_TYPES } from '@shared/eventTypes';
import { STEPS } from '@shared/steps';
import { VENUE } from '@shared/venue';
import { useState } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../brand/Logo';
import { openChat } from '../../components/ChatBot';
import { Icon } from '../../components/Icon';
import { EVENT_PHOTOS, img } from '../../content/photos';
import { ENV } from '../../data/store';
import { Lightbox } from './HomePage';

interface MenuOption {
  value: string;
  label: string;
  desc?: string;
}

/** 케이터링 문의서의 '케이터링 구성' 선택지를 그대로 소개에 씁니다 (문의서와 소개가 어긋나지 않도록) */
function findOptions(node: unknown, label: string): MenuOption[] {
  if (!node || typeof node !== 'object') return [];
  const o = node as Record<string, unknown>;
  if (o.label === label && Array.isArray(o.options)) return o.options as MenuOption[];
  for (const v of Object.values(o)) {
    const found = findOptions(v, label);
    if (found.length) return found;
  }
  return [];
}

const cfg = EVENT_TYPES.catering;
const PHOTOS = EVENT_PHOTOS.catering;
const MENUS = findOptions(cfg, '케이터링 구성');

export function CateringPage() {
  const [lightbox, setLightbox] = useState<{ list: string[]; i: number; title: string } | null>(null);
  const open = (list: string[], i: number, title: string) => setLightbox({ list, i, title });

  return (
    <>
      <section className="land-hero" aria-label={`${VENUE.name} 케이터링 소개`}>
        <img className="land-hero__bg is-on" src={PHOTOS[0]} alt="" fetchPriority="high" />
        <div className="land-hero__shade" />
        <div className="container land-hero__inner">
          <span className="overline land-hero__over">{VENUE.nameEn} · CATERING</span>
          <h1 className="land-hero__title">
            연회장의 맛 그대로
            <br />
            원하시는 곳으로 찾아갑니다
          </h1>
          <p className="land-hero__desc">
            기업행사와 기관 행사, 야외 웨딩, 가족 연회까지 {cfg.guestRange[0]}명부터 {cfg.guestRange[1].toLocaleString('ko-KR')}명까지. 셰프와 연회팀이 직접 차리고 운영하고 정리합니다.
          </p>
          <div className="row wrap gap-8 land-hero__cta">
            <Link to="/inquiry?type=catering" className="btn btn--gold btn--lg">
              케이터링 문의하기 <Icon name="arrowRight" size={18} />
            </Link>
            <a href="#menu" className="btn btn--on-ink btn--lg">
              구성 살펴보기
            </a>
          </div>
        </div>
      </section>

      <section className="land-stats">
        <div className="container land-stats__grid">
          {[
            ['7,000+', '케이터링 · 연회 행사 경험'],
            [`${cfg.guestRange[0]}–${cfg.guestRange[1].toLocaleString('ko-KR')}`, '명까지 한 번에 준비해요'],
            [String(MENUS.length || 4), '가지 케이터링 구성'],
            ['20', '년 경력 파티디렉터'],
          ].map(([n, l]) => (
            <div key={l} className="land-stats__item">
              <span className="numeral land-stats__num">{n}</span>
              <span className="caption">{l}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="menu">
        <div className="container">
          <div className="section-head">
            <span className="overline">CATERING MENU</span>
            <h2 className="display-lg">행사 성격에 맞춰 구성을 고르세요</h2>
            <p className="body-md text-muted">인원과 장소, 예산을 알려 주시면 파티디렉터가 가장 잘 맞는 구성을 제안해 드려요. 견적서는 고객 전용 페이지에서 바로 확인하실 수 있습니다.</p>
          </div>
          <div className="feature-grid">
            {MENUS.map((m, i) => (
              <article key={m.value} className="feature">
                <button className="feature__media" onClick={() => open(PHOTOS, i % PHOTOS.length, m.label)}>
                  <img src={PHOTOS[(i + 1) % PHOTOS.length]} alt={m.label} loading="lazy" />
                </button>
                <span className="feature__no numeral">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="title-md">{m.label}</h3>
                {m.desc && <p className="body-sm text-muted">{m.desc}</p>}
                <Link to={`/inquiry?type=catering&menu=${m.value}`} className="btn btn--secondary btn--sm mt-8">
                  이 구성으로 문의
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft" id="why">
        <div className="container location">
          <div className="location__media">
            <img src={PHOTOS[3 % PHOTOS.length]} alt="케이터링 현장" loading="lazy" />
          </div>
          <div className="location__info">
            <span className="overline">WHY {VENUE.nameEn}</span>
            <h2 className="display-md mt-8">{cfg.tagline}</h2>
            <ul className="event-tile__list mt-24">
              {cfg.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <div className="row wrap gap-8 mt-24">
              <Link to="/inquiry?type=catering" className="btn btn--primary btn--sm">
                케이터링 문의하기
              </Link>
              <button className="btn btn--secondary btn--sm" onClick={() => openChat('케이터링 구성과 견적이 궁금해요')}>
                컨시어지에게 물어보기
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="journey">
        <div className="container">
          <div className="section-head">
            <span className="overline">YOUR JOURNEY</span>
            <h2 className="display-lg">문의부터 행사 사진까지, 한 페이지에서</h2>
            <p className="body-md text-muted">문의를 남기면 고객님만의 행사 페이지와 예약 비밀번호가 생겨요. 견적, 준비 상황, 당일 안내를 한곳에서 확인하세요.</p>
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
        </div>
      </section>

      <section className="section section--soft" id="gallery">
        <div className="container">
          <div className="section-head">
            <span className="overline">GALLERY</span>
            <h2 className="display-lg">현장에서 차린 테이블</h2>
          </div>
          <div className="gallery-grid">
            {[...PHOTOS, img('places/food-1'), img('places/food-4')].map((src, i, list) => (
              <button key={src} className="gallery-grid__item" onClick={() => open(list, i, '케이터링 갤러리')}>
                <img src={src} alt={`케이터링 사진 ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-band__inner">
          <Logo layout="monogram" height={40} />
          <p className="display-sm">행사 날짜와 인원만 알려 주세요</p>
          <p className="body-sm text-muted">장소 답사부터 메뉴 구성까지 담당자가 직접 안내드립니다.</p>
          <div className="row wrap gap-8 cta-band__actions">
            <Link to="/inquiry?type=catering" className="btn btn--primary">
              케이터링 문의
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

      <Lightbox state={lightbox} onChange={setLightbox} />
    </>
  );
}
