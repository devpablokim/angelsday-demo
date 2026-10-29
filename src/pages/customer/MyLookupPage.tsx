import { VENUE } from '@shared/venue';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Logo } from '../../brand/Logo';
import { Icon } from '../../components/Icon';
import { useStore } from '../../data/hooks';

/** 예약 비밀번호(또는 링크)로 내 행사 페이지 열기 */
export function MyLookupPage() {
  const store = useStore();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = code.trim();
    if (!v) return;
    setError('');
    const link = v.match(/my\/([\w-]+)/);
    if (link) return navigate(`/my/${link[1]}`);
    setBusy(true);
    try {
      const id = await store.findBookingByCode(v);
      if (id) navigate(`/my/${id}`);
      else setError('일치하는 예약을 찾지 못했어요. 비밀번호를 다시 확인해 주세요.');
    } catch {
      setError('잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section lookup-page">
      <div className="container container--narrow">
        <div className="lookup-card">
          <Logo layout="monogram" height={48} />
          <span className="overline mt-24">MY EVENT</span>
          <h1 className="display-md mt-8">내 행사 페이지 열기</h1>
          <p className="body-md text-muted mt-12">문의 접수 후 받으신 <b className="text-ink">예약 비밀번호 8자리</b>를 입력하세요. 메일로 받은 링크를 붙여넣어도 돼요.</p>
          <form className="lookup mt-24" onSubmit={submit}>
            <input
              className="input lookup__input"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="예) K7MP-2QXR"
              aria-label="예약 비밀번호"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!error || undefined}
            />
            <button className="btn btn--primary" type="submit" disabled={!code.trim() || busy}>
              {busy ? <span className="spinner" /> : '열기'}
            </button>
          </form>
          {error && <p className="field__error mt-8">{error}</p>}
          <div className="lookup-help mt-24">
            <Icon name="lock" size={18} />
            <p className="caption">
              예약 비밀번호를 잊으셨나요? <a className="link" href={`tel:${VENUE.phone}`}>{VENUE.phone}</a>로 연락 주시면 본인 확인 후 다시 알려드려요.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
