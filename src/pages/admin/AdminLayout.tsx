import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Logo } from '../../brand/Logo';
import { Icon, type IconName } from '../../components/Icon';
import { useAdmin, useStore } from '../../data/hooks';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/admin', label: '대시보드', icon: 'chart', end: true },
  { to: '/admin/bookings', label: '고객 관리', icon: 'users' },
  { to: '/admin/preview', label: '고객 화면 보기', icon: 'external' },
  { to: '/admin/calendar', label: '캘린더', icon: 'calendar' },
  { to: '/admin/pricing', label: '가격표', icon: 'receipt' },
  { to: '/admin/emails', label: '메일 자동화', icon: 'mail' },
  { to: '/admin/settings', label: '설정', icon: 'settings' },
];

export function AdminLayout() {
  const store = useStore();
  const admin = useAdmin();
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0); // 최신 Chromium 은 scrollTo 가 Promise 를 반환하므로 블록으로 감쌉니다
  }, [loc.pathname]);

  return (
    <div className="admin">
      <aside className="admin-side" aria-label="관리자 메뉴">
        <Link to="/admin" className="admin-side__brand" aria-label="관리자 홈">
          <Logo layout="horizontal" variant="white" height={38} />
        </Link>
        <div className="admin-side__label">OPERATIONS</div>
        <nav className="admin-side__nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `admin-side__link ${isActive ? 'is-active' : ''}`}>
              <Icon name={n.icon} size={18} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-side__foot">
          <Link to="/" className="admin-side__link" target="_blank">
            <Icon name="external" size={18} />
            고객 사이트
          </Link>
          <button className="admin-side__link" onClick={() => void store.adminSignOut()}>
            <Icon name="logout" size={18} />
            로그아웃
          </button>
          <div className="admin-side__user">
            <span className="admin-side__avatar">
              <Logo layout="monogram" height={20} />
            </span>
            <span className="stack">
              <span className="admin-side__name">{admin?.name ?? '관리자'}</span>
              <span className="admin-side__mode">{store.mode === 'demo' ? 'DEMO MODE' : 'FIREBASE'}</span>
            </span>
          </div>
        </div>
      </aside>

      <header className="admin-top">
        <div className="admin-top__bar">
          <Link to="/admin" aria-label="관리자 홈">
            <Logo layout="horizontal" variant="white" height={30} showTagline={false} />
          </Link>
          <div className="row gap-4">
            {store.mode === 'demo' && <span className="admin-top__mode">DEMO</span>}
            <Link to="/" className="admin-top__icon" target="_blank" aria-label="고객 사이트">
              <Icon name="external" size={18} />
            </Link>
            <button className="admin-top__icon" onClick={() => void store.adminSignOut()} aria-label="로그아웃">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
        <nav className="admin-tabs" aria-label="관리자 메뉴">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `admin-tabs__link ${isActive ? 'is-active' : ''}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
