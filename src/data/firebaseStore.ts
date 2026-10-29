// Firebase 저장소 — Firestore(실시간) · Auth(관리자) · Cloud Functions(결제·챗봇·메일) · Storage(사진)
import { DEFAULT_CATALOG } from '@shared/catalog';
import { localBotReply } from '@shared/chatFaq';
import { enabledMap } from '@shared/emailRules';
import { normalizeCode } from '@shared/ids';
import type { Booking, CalendarEntry, Catalog } from '@shared/types';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, initializeFirestore, onSnapshot, orderBy, query, setDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import type { AdminUser, ChatTurn, DataStore } from './store';

export function createFirebaseStore(): DataStore {
  const env = import.meta.env;
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  const auth = getAuth(app);
  const fns = getFunctions(app, (env.VITE_FIREBASE_FUNCTIONS_REGION as string) || 'asia-northeast3');
  const storage = getStorage(app);

  const call = <I, O>(name: string) => httpsCallable<I, O>(fns, name);

  return {
    mode: 'firebase',

    listenBooking(id, cb) {
      return onSnapshot(
        doc(db, 'bookings', id),
        (s) => cb(s.exists() ? ({ ...(s.data() as Booking), id: s.id }) : null),
        () => cb(null),
      );
    },
    listenBookings(cb) {
      return onSnapshot(query(collection(db, 'bookings'), orderBy('date')), (s) => cb(s.docs.map((d) => ({ ...(d.data() as Booking), id: d.id }))));
    },
    listenCalendar(cb) {
      return onSnapshot(collection(db, 'calendar'), (s) => cb(s.docs.map((d) => ({ ...(d.data() as CalendarEntry), id: d.id }))));
    },
    listenAdminCalendar(cb) {
      return onSnapshot(query(collection(db, 'calendar'), where('source', '==', 'manual')), (s) => cb(s.docs.map((d) => ({ ...(d.data() as CalendarEntry), id: d.id }))));
    },
    listenCatalog(cb) {
      return onSnapshot(doc(db, 'settings', 'catalog'), (s) => cb(s.exists() ? (s.data() as Catalog) : DEFAULT_CATALOG));
    },
    listenEmailRules(cb) {
      return onSnapshot(doc(db, 'settings', 'emailRules'), (s) => cb(enabledMap(s.exists() ? (s.data().enabled as Record<string, boolean>) : undefined)));
    },

    async findBookingByCode(code) {
      const n = normalizeCode(code);
      if (n.length < 6) return null;
      const snap = await getDoc(doc(db, 'codes', n));
      return snap.exists() ? (snap.data().bookingId as string) : null;
    },
    async createBooking(b) {
      await setDoc(doc(db, 'bookings', b.id), b);
      if (b.accessCode) await setDoc(doc(db, 'codes', normalizeCode(b.accessCode)), { bookingId: b.id, createdAt: b.createdAt });
    },
    async saveBooking(b) {
      await setDoc(doc(db, 'bookings', b.id), { ...b, updatedAt: new Date().toISOString() });
    },
    async saveCalendarEntry(e) {
      await setDoc(doc(db, 'calendar', e.id), { ...e, source: 'manual' });
    },
    async deleteCalendarEntry(id) {
      await deleteDoc(doc(db, 'calendar', id));
    },
    async saveCatalog(c) {
      await setDoc(doc(db, 'settings', 'catalog'), { ...c, updatedAt: new Date().toISOString() });
    },
    async saveEmailRules(enabled) {
      await setDoc(doc(db, 'settings', 'emailRules'), { enabled });
    },

    async payDeposit(bookingId, method) {
      await call<{ bookingId: string; method: string }, { ok: boolean }>('payDeposit')({ bookingId, method });
    },
    async chat(bookingId, history: ChatTurn[]) {
      try {
        const res = await call<{ bookingId?: string; history: ChatTurn[] }, { text: string }>('chat')({ bookingId, history: history.slice(-12) });
        return res.data.text;
      } catch {
        const last = [...history].reverse().find((h) => h.role === 'user');
        return localBotReply(last?.content ?? '').text;
      }
    },
    async sendEmailNow(bookingId, ruleId) {
      await call<{ bookingId: string; ruleId: string }, { ok: boolean }>('sendEmailNow')({ bookingId, ruleId });
    },
    async runEmailScheduler() {
      const res = await call<Record<string, never>, { sent: number }>('runEmailScheduler')({});
      return res.data.sent;
    },
    async uploadPhoto(bookingId, file) {
      const r = ref(storage, `bookings/${bookingId}/photos/${Date.now()}-${file.name}`);
      await uploadBytes(r, file, { contentType: file.type });
      return getDownloadURL(r);
    },

    onAdminChange(cb) {
      return onAuthStateChanged(auth, async (u) => {
        if (!u) return cb(null);
        const token = await u.getIdTokenResult();
        cb(token.claims.admin === true ? ({ email: u.email ?? '', name: u.displayName ?? u.email ?? '관리자' } satisfies AdminUser) : null);
      });
    },
    async adminSignIn(email, password) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdTokenResult(true);
      if (token.claims.admin !== true) {
        await signOut(auth);
        throw new Error('관리자 권한이 없는 계정이에요. README 의 관리자 지정 방법을 확인하세요.');
      }
    },
    async adminSignOut() {
      await signOut(auth);
    },
  };
}
