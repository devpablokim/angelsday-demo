import { formatDateTime } from '@shared/dates';
import { uid } from '@shared/ids';
import * as ops from '@shared/ops';
import { balancePaid } from '@shared/steps';
import type { Booking, Photo } from '@shared/types';
import { useState, type ChangeEvent } from 'react';
import { Icon } from '../../../components/Icon';
import { Empty, Img, Sheet, useToast } from '../../../components/ui';
import { useStore } from '../../../data/hooks';
import { errorMessage, useSaveBooking } from '../adminUtils';

export function PhotosTab({ booking: b }: { booking: Booking }) {
  const store = useStore();
  const save = useSaveBooking();
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [album, setAlbum] = useState(b.photoAlbumUrl ?? '');
  const [uploading, setUploading] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const paidAll = balancePaid(b);

  const setPhotos = (photos: Photo[], msg?: string) => save({ ...b, photos, updatedAt: new Date().toISOString() }, msg);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(files.length);
    const added: Photo[] = [];
    for (const f of files) {
      try {
        const u = await store.uploadPhoto(b.id, f);
        added.push({ id: uid('ph'), url: u, caption: f.name.replace(/\.[^.]+$/, '') });
      } catch (err) {
        toast(`${f.name}: ${errorMessage(err)}`, 'error');
      }
      setUploading((n) => n - 1);
    }
    if (added.length) await setPhotos([...b.photos, ...added], `사진 ${added.length}장을 추가했어요.`);
  }

  async function toggleRelease() {
    const release = !b.photosReleasedAt;
    if (await save(ops.releasePhotos(b, release), release ? '사진을 고객에게 공개했어요.' : '사진을 비공개로 전환했어요.')) setConfirmOpen(false);
  }

  return (
    <div className="stack gap-16">
      <section className={`card ${b.photosReleasedAt ? 'card--gold' : ''}`}>
        <div className="card__head">
          <div>
            <div className="title-md">{b.photosReleasedAt ? '사진 공개 중' : '사진 비공개'}</div>
            <p className="caption">
              {b.photosReleasedAt ? `공개 ${formatDateTime(b.photosReleasedAt)} · ` : ''}고객은 잔금 결제가 완료되고 사진이 공개되면 STEP 6에서 볼 수 있어요.
            </p>
          </div>
          <button className={`btn btn--sm ${b.photosReleasedAt ? 'btn--secondary' : 'btn--primary'}`} onClick={() => (b.photosReleasedAt || paidAll ? void toggleRelease() : setConfirmOpen(true))} disabled={!b.photosReleasedAt && b.photos.length === 0}>
            {b.photosReleasedAt ? '비공개로 전환' : '고객에게 사진 공개'}
          </button>
        </div>
        {!paidAll && (
          <div className="callout">
            <span className="callout__icon">!</span>
            <p className="body-sm">잔금 결제가 아직 확인되지 않았어요. 공개해도 잔금 결제 전까지 고객 페이지는 STEP 5에 머물러요.</p>
          </div>
        )}
        <div className="row gap-8 mt-16 wrap">
          <input className="input input--sm grow" value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="원본 앨범 다운로드 링크 (구글 드라이브, 네이버 MYBOX 등)" aria-label="원본 앨범 링크" />
          <button className="btn btn--secondary btn--sm" disabled={album === (b.photoAlbumUrl ?? '')} onClick={() => void save({ ...b, photoAlbumUrl: album.trim() || undefined }, '앨범 링크를 저장했어요.')}>
            링크 저장
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <div className="title-md">행사 사진 {b.photos.length}장</div>
          <label className="btn btn--primary btn--sm">
            {uploading ? <span className="spinner" /> : <Icon name="image" size={16} />}
            {uploading ? `업로드 중 (${uploading})` : '사진 업로드'}
            <input type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e)} />
          </label>
        </div>
        <div className="row gap-8 mb-16">
          <input className="input input--sm grow" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="이미지 URL로 추가" aria-label="이미지 URL" />
          <button
            className="btn btn--secondary btn--sm"
            disabled={!/^https?:\/\//.test(url.trim())}
            onClick={async () => {
              if (await setPhotos([...b.photos, { id: uid('ph'), url: url.trim(), caption: '' }], '사진을 추가했어요.')) setUrl('');
            }}
          >
            추가
          </button>
        </div>
        {b.photos.length === 0 ? (
          <Empty>아직 사진이 없어요.</Empty>
        ) : (
          <ul className="photo-admin-grid">
            {b.photos.map((p) => (
              <li key={p.id} className="photo-admin">
                <Img src={p.url} alt={p.caption || '행사 사진'} ratio="4 / 3" />
                <div className="row gap-4 mt-8">
                  <input
                    className="input input--sm grow"
                    defaultValue={p.caption ?? ''}
                    placeholder="설명"
                    aria-label="사진 설명"
                    onBlur={(e) => {
                      if (e.target.value !== (p.caption ?? '')) void setPhotos(b.photos.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)));
                    }}
                  />
                  <button className="btn btn--ghost btn--icon" onClick={() => void setPhotos(b.photos.filter((x) => x.id !== p.id), '사진을 삭제했어요.')} aria-label="사진 삭제">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {store.mode === 'demo' && <p className="caption mt-16">데모 모드에서는 업로드한 사진이 축소되어 이 브라우저에만 저장돼요. Firebase 모드에서는 Storage에 원본이 올라갑니다.</p>}
      </section>

      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="잔금 결제 전에 공개할까요?"
        footer={
          <div className="row gap-8">
            <button className="btn btn--secondary grow" onClick={() => setConfirmOpen(false)}>
              취소
            </button>
            <button className="btn btn--primary grow" onClick={() => void toggleRelease()}>
              그래도 공개
            </button>
          </div>
        }
      >
        <p className="body-sm">잔금이 확인되지 않아 고객 페이지는 STEP 6로 넘어가지 않아요. 잔금 결제를 등록하면 바로 사진이 보여요.</p>
      </Sheet>
    </div>
  );
}
