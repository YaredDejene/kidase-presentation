import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { todayIso } from '@/lib/ethDate';

interface DateContextValue { date: string; setDate: (iso: string) => void }

const DateContext = createContext<DateContextValue | null>(null);

/** The date Today shows; the Calendar tab and the picker sheet change it, the Reader keeps it. */
export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState(todayIso);
  const value = useMemo(() => ({ date, setDate }), [date]);
  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
}

export function useSelectedDate(): DateContextValue {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error('useSelectedDate must be used inside SelectedDateProvider');
  return ctx;
}
