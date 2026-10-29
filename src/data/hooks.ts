import { DEFAULT_CATALOG } from '@shared/catalog';
import { todayKST } from '@shared/dates';
import { enabledMap } from '@shared/emailRules';
import type { Booking, CalendarEntry, Catalog } from '@shared/types';
import { createContext, useContext, useEffect, useState } from 'react';
import type { AdminUser, DataStore } from './store';

export const StoreContext = createContext<DataStore | null>(null);

export function useStore(): DataStore {
  const s = useContext(StoreContext);
  if (!s) throw new Error('StoreContext 가 없습니다.');
  return s;
}

/** undefined = 불러오는 중, null = 없음 */
export function useBooking(id: string | undefined): Booking | null | undefined {
  const store = useStore();
  const [b, setB] = useState<Booking | null | undefined>(undefined);
  useEffect(() => {
    if (!id) return setB(null);
    setB(undefined);
    return store.listenBooking(id, setB);
  }, [store, id]);
  return b;
}

export function useBookings(): Booking[] | undefined {
  const store = useStore();
  const [list, setList] = useState<Booking[] | undefined>(undefined);
  useEffect(() => store.listenBookings(setList), [store]);
  return list;
}

export function useCalendar(): CalendarEntry[] {
  const store = useStore();
  const [list, setList] = useState<CalendarEntry[]>([]);
  useEffect(() => store.listenCalendar(setList), [store]);
  return list;
}

export function useAdminCalendar(): CalendarEntry[] {
  const store = useStore();
  const [list, setList] = useState<CalendarEntry[]>([]);
  useEffect(() => store.listenAdminCalendar(setList), [store]);
  return list;
}

export function useCatalog(): Catalog {
  const store = useStore();
  const [c, setC] = useState<Catalog>(DEFAULT_CATALOG);
  useEffect(() => store.listenCatalog(setC), [store]);
  return c;
}

export function useEmailRules(): Record<string, boolean> {
  const store = useStore();
  const [m, setM] = useState<Record<string, boolean>>(enabledMap());
  useEffect(() => store.listenEmailRules(setM), [store]);
  return m;
}

/** undefined = 확인 중 */
export function useAdmin(): AdminUser | null | undefined {
  const store = useStore();
  const [u, setU] = useState<AdminUser | null | undefined>(undefined);
  useEffect(() => store.onAdminChange(setU), [store]);
  return u;
}

/** 자정이 지나면 D-day 가 갱신되도록 오늘 날짜를 상태로 */
export function useToday(): string {
  const [t, setT] = useState(todayKST());
  useEffect(() => {
    const id = setInterval(() => setT(todayKST()), 60_000);
    return () => clearInterval(id);
  }, []);
  return t;
}
