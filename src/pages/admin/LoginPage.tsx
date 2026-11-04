import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Logo } from '../../brand/Logo';
import { useAdmin, useStore } from '../../data/hooks';
import { ENV } from '../../data/store';
import { errorMessage } from './adminUtils';

export function LoginPage() {
  const store = useStore();
  const admin = useAdmin();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/admin';
  const [email, setEmail] = useState(store.mode === 'demo' ? 'admin@angelsday.kr' : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const quickTried = useRef(false);

  useEffect(() => {
    if (admin) nav(from.startsWith('/admin') && from !== '/admin/login' ? from : '/admin', { replace: true });
  }, [admin, from, nav]);

  async function signIn(pw: string) {
    setBusy(true);
    setError('');
    try {
      await store.adminSignIn(email.trim(), pw);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void signIn(password);
  }

  // 데모 모드 전용: 제안서 QR(…/admin/login?enter=demo)로 들어오면 비밀번호 없이 바로 대시보드로 갑니다.
  // 데모 비밀번호는 이 화면에 이미 공개돼 있고 데이터도 방문자 브라우저에만 저장되므로, 실제 운영(firebase) 모드에는 영향이 없습니다.
  useEffect(() => {
    if (store.mode !== 'demo' || admin || quickTried.current || params.get('enter') !== 'demo') return;
    quickTried.current = true;
    void signIn(ENV.adminPasscode);
  }, [store.mode, admin, params]);

  return (
    <div className="admin-login">
      <div className="admin-login__panel">
        <Logo layout="stacked" variant="white" height={150} />
        <p className="admin-login__tag">운영자 전용 관리 페이지</p>
      </div>
      <form className="admin-login__form" onSubmit={onSubmit}>
        <div className="hide-desktop" style={{ marginBottom: 8 }}>
          <Logo layout="horizontal" variant="ink" height={40} />
        </div>
        <div className="overline">ADMIN</div>
        <h1 className="display-md">관리자 로그인</h1>
        <p className="body-sm text-muted">견적 작성, 준비 리스트, 고객별 진행 단계와 예상 매출을 관리합니다.</p>
        <label className="field">
          <span className="field__label">이메일</span>
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@angelsday.kr" required={store.mode !== 'demo'} />
        </label>
        <label className="field">
          <span className="field__label">비밀번호</span>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-invalid={!!error || undefined} />
          {error && <span className="field__error">{error}</span>}
        </label>
        {store.mode === 'demo' && (
          <div className="callout callout--neutral">
            <span className="callout__icon">i</span>
            <span className="body-sm">
              데모 비밀번호: <b className="text-ink">{ENV.adminPasscode}</b>
              <br />
              <span className="caption">데이터는 이 브라우저에만 저장됩니다.</span>
            </span>
          </div>
        )}
        <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : '로그인'}
        </button>
        {store.mode === 'demo' && (
          <button className="btn btn--secondary btn--block" type="button" onClick={() => void signIn(ENV.adminPasscode)} disabled={busy}>
            비밀번호 없이 데모 둘러보기
          </button>
        )}
        <Link to="/" className="caption" style={{ textAlign: 'center' }}>
          ← 고객 사이트로 돌아가기
        </Link>
      </form>
    </div>
  );
}
