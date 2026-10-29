import { VENUE } from '@shared/venue';
import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { Sheet, useToast } from '../../components/ui';
import { useStore } from '../../data/hooks';
import { ENV } from '../../data/store';

export function SettingsPage() {
  const store = useStore();
  const toast = useToast();
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="overline">SETTINGS</div>
          <h1 className="display-md">설정</h1>
        </div>
      </div>

      <div className="detail-grid">
        <section className="card">
          <div className="title-md">데이터 모드</div>
          <div className="mode-badge mt-16">
            <span className={`badge ${store.mode === 'demo' ? 'badge--gold' : 'badge--ink'}`}>{store.mode === 'demo' ? 'DEMO' : 'FIREBASE'}</span>
            <span className="body-sm text-ink">{store.mode === 'demo' ? '브라우저 localStorage에 저장되는 데모 모드' : 'Firestore · Auth · Cloud Functions 연결됨'}</span>
          </div>
          <p className="caption mt-16">
            <code>.env.local</code>의 <code>VITE_DATA_MODE</code>를 <code>firebase</code>로 바꾸고 Firebase 웹 앱 설정값을 입력하면 실제 데이터베이스로 전환돼요.
          </p>
          <dl className="kv mt-16">
            <dt>고객 링크 기준</dt>
            <dd className="break">{ENV.publicBaseUrl || location.origin}</dd>
            <dt>카카오톡 채널</dt>
            <dd className="break">{ENV.kakaoUrl}</dd>
          </dl>
          {store.mode === 'demo' && store.resetDemo && (
            <button className="btn btn--danger btn--sm mt-24" onClick={() => setResetOpen(true)}>
              데모 데이터 초기화
            </button>
          )}
        </section>

        <section className="card">
          <div className="title-md">Firebase 비공개 키 (서비스 계정)</div>
          <ul className="guide-list mt-16">
            <li>
              <Icon name="lock" size={18} />
              <span>
                로컬 관리 스크립트용 키는 프로젝트의 <code>.secrets/firebase-service-account.json</code>에 두세요. 이 폴더는 <code>.gitignore</code>로 저장소에 올라가지 않아요.
              </span>
            </li>
            <li>
              <Icon name="settings" size={18} />
              <span>
                GitHub Actions 자동 배포는 키 내용을 저장소 Secret(<code>FIREBASE_SERVICE_ACCOUNT</code>)에 넣어 사용해요.
              </span>
            </li>
            <li>
              <Icon name="sparkle" size={18} />
              <span>Cloud Functions 운영 환경은 키 파일 없이 기본 서비스 계정으로 동작해요. 키를 웹 코드나 채팅에 붙여넣지 마세요.</span>
            </li>
          </ul>
          <p className="caption mt-16">자세한 순서는 README의 “Firebase 비공개 키” 섹션을 확인하세요.</p>
        </section>

        <section className="card">
          <div className="title-md">사업장 정보</div>
          <dl className="kv mt-16">
            <dt>상호</dt>
            <dd>{VENUE.name}</dd>
            <dt>대표</dt>
            <dd>{VENUE.ceo}</dd>
            <dt>사업자번호</dt>
            <dd>{VENUE.bizNo}</dd>
            <dt>주소</dt>
            <dd>{VENUE.address}</dd>
            <dt>전화</dt>
            <dd>{VENUE.phone}</dd>
            <dt>이메일</dt>
            <dd>{VENUE.email}</dd>
          </dl>
          <p className="caption mt-16">
            사업장 정보·홀·공휴일은 <code>shared/venue.ts</code>, 챗봇 FAQ와 환불 규정 문구는 <code>shared/chatFaq.ts</code>에서 관리해요.
          </p>
        </section>
      </div>

      <Sheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="데모 데이터를 초기화할까요?"
        footer={
          <button
            className="btn btn--danger btn--block"
            onClick={() => {
              store.resetDemo?.();
              setResetOpen(false);
              toast('데모 데이터를 오늘 날짜 기준으로 다시 만들었어요.');
            }}
          >
            초기화
          </button>
        }
      >
        <p className="body-sm">이 브라우저에 저장된 모든 예약 · 가격표 · 일정이 지워지고, 오늘 날짜 기준의 샘플 고객 8명이 다시 만들어져요.</p>
      </Sheet>
    </div>
  );
}
