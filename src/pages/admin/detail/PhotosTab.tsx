import { formatDateTime } from '@shared/dates';
import { uid } from '@shared/ids';
import * as ops from '@shared/ops';
import { balancePaid } from '@shared/steps';
import type { Booking, Photo, RevisionRequest } from '@shared/types';
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
  const [videoUrl, setVideoUrl] = useState('');
  const [replies, setReplies] = useState<Record<string, string>>({});
  const openRequests: RevisionRequest[] = (b.revisionRequests ?? []).filter((r) => r.status === 'open');
  const versionOf = (p: Photo) => (p.kind === 'video' ? 'video' : p.version === 'original' ? 'original' : 'edited');
  const setVersion = (p: Photo, v: string) =>
    setPhotos(b.photos.map((x) => (x.id === p.id ? (v === 'video' ? { ...x, kind: 'video' as const, version: undefined } : { ...x, kind: 'photo' as const, version: v as Photo['version'] }) : x)));
  async function reply(r: RevisionRequest) {
    const text = (replies[r.id] ?? '').trim();
    if (!text) return;
    if (await save(ops.replyRevision(b, r.id, text), '수정 요청을 반영 완료로 바꾸고 고객에게 알렸어요.')) setReplies((m) => ({ ...m, [r.id]: '' }));
  }
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

      {openRequests.length > 0 && (
        <section className="card card--gold">
          <div className="title-md">고객 수정 요청 {openRequests.length}건</div>
          <ul className="list mt-12">
            {openRequests.map((r) => (
              <li key={r.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                <div className="list-item__body">
                  <div className="list-item__title">{r.message}</div>
                  <div className="list-item__meta">
                    {formatDateTime(r.at)}
                    {r.mediaIds.length ? ` · ${r.mediaIds.map((id) => b.photos.find((p) => p.id === id)?.caption || '항목').join(', ')}` : ' · 전체'}
                  </div>
                  <div className="row gap-8 mt-8">
                    <input className="input input--sm grow" value={replies[r.id] ?? ''} onChange={(e) => setReplies((m) => ({ ...m, [r.id]: e.target.value }))} placeholder="예) 요청하신 3장 피부 톤 보정을 반영해 다시 올렸어요" aria-label="답변" />
                    <button className="btn btn--primary btn--sm" disabled={!(replies[r.id] ?? '').trim()} onClick={() => void reply(r)}>
                      반영 완료
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="card">
        <div className="card__head">
          <div className="title-md">
            사진·영상 {b.photos.length}개 <span className="caption">보정본 {b.photos.filter((p) => versionOf(p) === 'edited').length} · 원본 {b.photos.filter((p) => versionOf(p) === 'original').length} · 영상 {b.photos.filter((p) => versionOf(p) === 'video').length}</span>
          </div>
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
        <div className="row gap-8 mb-16">
          <input className="input input--sm grow" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="영상 URL로 추가 (mp4)" aria-label="영상 URL" />
          <button
            className="btn btn--secondary btn--sm"
            disabled={!/^(https?:\/\/|\/)/.test(videoUrl.trim())}
            onClick={async () => {
              const poster = b.photos.find((p) => p.kind !== 'video')?.url;
              if (await setPhotos([...b.photos, { id: uid('vd'), url: videoUrl.trim(), kind: 'video', poster, caption: '하이라이트 영상' }], '영상을 추가했어요.')) setVideoUrl('');
            }}
          >
            영상 추가
          </button>
        </div>
        {b.photos.length === 0 ? (
          <Empty>아직 사진이 없어요.</Empty>
        ) : (
          <ul className="photo-admin-grid">
            {b.photos.map((p) => (
              <li key={p.id} className="photo-admin">
                <Img src={p.kind === 'video' ? p.poster ?? '' : p.url} alt={p.caption || '행사 사진'} ratio="4 / 3" />
                <div className="row gap-4 mt-8">
                  <select className="input input--sm" value={versionOf(p)} onChange={(e) => void setVersion(p, e.target.value)} aria-label="종류">
                    <option value="edited">보정본</option>
                    <option value="original">원본</option>
                    <option value="video">영상</option>
                  </select>
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
