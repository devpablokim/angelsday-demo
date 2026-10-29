// 엔젤스데이 Cloud Functions (asia-northeast3 · 서울)
//  - onBookingWritten  : 공개 캘린더 동기화 + 이벤트 메일(문의 접수·견적·결제·사진)
//  - scheduledEmails   : 매일 10:00 KST D-N 안내 메일
//  - runEmailScheduler : 관리자 수동 실행 (callable)
//  - sendEmailNow      : 관리자 메일 수동 발송 (callable)
//  - payDeposit        : 예약금 결제 승인 (callable, 기본 MOCK)
//  - chat              : 상담 챗봇 (callable, Claude API)
//  - deliverMail       : mail 컬렉션 → 지메일 SMTP 실제 발송
import './app';

export { onBookingWritten } from './bookings';
export { scheduledEmails, runEmailScheduler, sendEmailNow } from './scheduler';
export { payDeposit } from './payments';
export { chat } from './chat';
export { deliverMail } from './delivery';
