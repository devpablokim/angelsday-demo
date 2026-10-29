import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
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

  useEffect(() => {
    if (admin) nav(from.startsWith('/admin') && from !== '/admin/login' ? from : '/admin', { replace: true });
  }, [admin, from, nav]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await store.adminSignIn(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

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
        <Link to="/" className="caption" style={{ textAlign: 'center' }}>
          ← 고객 사이트로 돌아가기
        </Link>
      </form>
    </div>
  );
}
