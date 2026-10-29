import { computeStep, STEPS } from '@shared/steps';
import type { Booking } from '@shared/types';
import { VENUE } from '@shared/venue';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Logo } from '../brand/Logo';
import { useStore } from '../data/hooks';
import { ENV, type ChatTurn } from '../data/store';
import { Icon } from './Icon';

const QUICK_GENERAL = ['예약은 어떻게 진행돼요?', '홀은 몇 명까지 가능해요?', '예약금과 환불 규정', '주차 안내', '메뉴 구성이 궁금해요', '상담원 연결'];
const QUICK_BOOKING = ['지금 어떤 단계예요?', '견적 금액 알려주세요', '인원이 바뀌면요?', '환불 규정', '주차 안내', '상담원 연결'];

const STORAGE = 'angelsday.chat.';

function loadHistory(key: string): ChatTurn[] {
  try {
    const raw = sessionStorage.getItem(STORAGE + key);
    return raw ? (JSON.parse(raw) as ChatTurn[]) : [];
  } catch {
    return [];
  }
}

export function ChatBot({ booking, raised }: { booking?: Booking | null; raised?: boolean }) {
  const store = useStore();
  const key = booking?.id ?? 'general';
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>(() => loadHistory(key));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTurns(loadHistory(key)), [key]);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE + key, JSON.stringify(turns.slice(-30)));
    } catch {
      /* 저장 불가 환경 */
    }
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, key, busy]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<string | undefined>).detail;
      if (q) void ask(q);
    };
    window.addEventListener('angelsday:chat', onOpen);
    return () => window.removeEventListener('angelsday:chat', onOpen);
  });

  const greeting = booking
    ? `안녕하세요, ${booking.customer.name}님. 엔젤스데이 컨시어지예요.\n지금은 STEP ${computeStep(booking)} '${STEPS[computeStep(booking) - 1].title}' 단계예요. 궁금한 점을 편하게 물어보세요.`
    : '안녕하세요, 엔젤스데이 컨시어지예요.\n대관, 견적, 진행 과정 등 궁금한 점을 편하게 물어보세요.';

  async function ask(q: string) {
    const content = q.trim();
    if (!content || busy) return;
    const next: ChatTurn[] = [...turns, { role: 'user', content }];
    setTurns(next);
    setText('');
    setBusy(true);
    try {
      const reply = await store.chat(booking?.id, next);
      setTurns([...next, { role: 'assistant', content: reply }]);
    } catch {
      setTurns([...next, { role: 'assistant', content: `잠시 연결이 원활하지 않아요. 전화 ${VENUE.phone}로 연락 주시면 바로 도와드릴게요.` }]);
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(text);
  };

  const lastBot = [...turns].reverse().find((t) => t.role === 'assistant');
  const showEscalate = !!lastBot && /(전화|카카오톡|상담원|플래너에게 연결)/.test(lastBot.content);

  return (
    <>
      {!open && (
        <button className={`chat-fab ${raised ? 'chat-fab--raised' : ''}`} onClick={() => setOpen(true)} aria-label="상담 챗봇 열기">
          <span className="chat-fab__mono">
            <Logo layout="monogram" height={26} />
          </span>
          <span className="chat-fab__text">상담하기</span>
        </button>
      )}
      {open && (
        <section className="chat-panel" role="dialog" aria-label="엔젤스데이 상담 챗봇">
          <header className="chat-panel__head">
            <span className="chat-panel__avatar">
              <Logo layout="monogram" height={24} />
            </span>
            <div className="grow">
              <div className="title-sm">엔젤스데이 컨시어지</div>
              <div className="caption">{store.mode === 'demo' ? '데모 · 자주 묻는 질문 기반 응답' : '보통 몇 초 안에 답변해요'}</div>
            </div>
            <button className="btn btn--ghost btn--icon" onClick={() => setOpen(false)} aria-label="닫기">
              <Icon name="close" />
            </button>
          </header>
          <div className="chat-panel__body" ref={bodyRef} aria-live="polite">
            <div className="bubble bubble--bot">{greeting}</div>
            {turns.map((t, i) => (
              <div key={i} className={`bubble ${t.role === 'user' ? 'bubble--me' : 'bubble--bot'}`}>
                {t.content}
              </div>
            ))}
            {busy && (
              <div className="bubble bubble--bot bubble--typing" aria-label="답변 작성 중">
                <i />
                <i />
                <i />
              </div>
            )}
            {showEscalate && !busy && (
              <div className="chat-escalate">
                <a className="btn btn--secondary btn--sm" href={`tel:${VENUE.phone}`}>
                  <Icon name="phone" size={16} /> 전화 상담
                </a>
                <a className="btn btn--gold btn--sm" href={ENV.kakaoUrl} target="_blank" rel="noreferrer">
                  카카오톡 상담
                </a>
              </div>
            )}
          </div>
          <div className="chat-panel__quick">
            {(booking ? QUICK_BOOKING : QUICK_GENERAL).map((q) => (
              <button key={q} className="chip chip--sm" onClick={() => void ask(q)} disabled={busy}>
                {q}
              </button>
            ))}
          </div>
          <form className="chat-panel__form" onSubmit={onSubmit}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지를 입력하세요" aria-label="메시지" />
            <button className="chat-panel__send" type="submit" disabled={!text.trim() || busy} aria-label="보내기">
              <Icon name="send" size={18} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}

/** 페이지 어디서든 챗봇 열기 (질문을 넘기면 바로 전송) */
export function openChat(question?: string) {
  window.dispatchEvent(new CustomEvent('angelsday:chat', { detail: question }));
}
