import { VENUE } from '@shared/venue';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Logo } from '../brand/Logo';
import { useStore } from '../data/hooks';
import { ENV } from '../data/store';
import { ChatBot } from './ChatBot';
import { Icon } from './Icon';

const NAV = [
  { to: '/calendar', label: '대관 가능일', en: 'SCHEDULE' },
  { to: '/#events', label: '행사 안내', en: 'PARTY TYPE' },
  { to: '/#journey', label: '진행 과정', en: 'JOURNEY' },
  { to: '/my', label: '내 행사 조회', en: 'MY EVENT' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname, loc.hash]);
  return (
    <header className="top-nav">
      <div className="container top-nav__inner">
        <Link to="/" className="top-nav__brand" aria-label="엔젤스데이 홈">
          <Logo layout="horizontal" variant="ink" height={36} />
        </Link>
        <nav className="top-nav__links" aria-label="주요 메뉴">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive && !n.to.includes('#') ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="top-nav__actions">
          <Link to="/inquiry" className="btn btn--primary btn--sm">
            문의하기
          </Link>
          <button className="btn btn--ghost btn--icon hide-desktop-lg" onClick={() => setOpen((v) => !v)} aria-label="메뉴" aria-expanded={open}>
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-menu" aria-label="모바일 메뉴">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to}>
              {n.label}
              <span className="overline">{n.en}</span>
            </Link>
          ))}
          <Link to="/inquiry">
            행사 문의하기 <span className="overline">INQUIRY</span>
          </Link>
          <div className="row gap-8 mt-24">
            <a className="btn btn--secondary grow" href={`tel:${VENUE.phone}`}>
              <Icon name="phone" size={18} /> 전화 상담
            </a>
            <a className="btn btn--gold grow" href={ENV.kakaoUrl} target="_blank" rel="noreferrer">
              카카오톡 상담
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const store = useStore();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <Logo layout="horizontal" variant="white" height={40} />
            <p className="mt-16">최고의 날을 위한 최고의 파티하우스, 엔젤스데이.<br />가장 행복한 순간, 맛있는 기억으로 남다.</p>
          </div>
          <div>
            <div className="footer__title">CUSTOMER CENTER</div>
            <p>
              TEL <a href={`tel:${VENUE.phone}`}>{VENUE.phone}</a>
              <br />
              FAX {VENUE.fax}
              <br />
              E-MAIL <a href={`mailto:${VENUE.email}`}>{VENUE.email}</a>
            </p>
          </div>
          <div>
            <div className="footer__title">LOCATION</div>
            <p>
              {VENUE.address}
              <br />
              <a href={VENUE.mapUrl} target="_blank" rel="noreferrer">
                지도에서 보기 →
              </a>
            </p>
          </div>
        </div>
        <div className="footer__bottom">
          <span>
            상호 {VENUE.name} · 대표 {VENUE.ceo} · 사업자등록번호 {VENUE.bizNo}
          </span>
          <span className="row gap-16">
            <a href={ENV.designSystemUrl ?? (ENV.hashRouter ? './design-system/index.html' : '/design-system/')}>디자인 시스템</a>
            <Link to="/admin">관리자</Link>
            <span>© Since {VENUE.since} 엔젤스데이 파티하우스{store.mode === 'demo' ? ' · DEMO' : ''}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function CustomerLayout() {
  const loc = useLocation();
  const isMyPage = loc.pathname.startsWith('/my/');
  useEffect(() => {
    if (loc.hash) {
      const el = document.getElementById(loc.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [loc.pathname, loc.hash]);
  return (
    <div className="site">
      <SiteHeader />
      <main className="site__main">
        <Outlet />
      </main>
      <SiteFooter />
      {!isMyPage && <ChatBot raised={loc.pathname === '/inquiry'} />}
    </div>
  );
}
