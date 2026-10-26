import { ethMonthLength, fromEth, fromIso, toEth, toIso, type EthDate } from '@/lib/ethDate';

export interface Cell {
  iso: string;
  eth: EthDate;
  gYear: number;
  gMonth: number;
  gDay: number;
  /** 0 is Monday, 6 is Sunday: the grid starts the week on Monday as the mock does. */
  weekday: number;
}

export interface MonthRef { year: number; month: number }

const mondayFirst = (d: Date) => (d.getDay() + 6) % 7;

function cell(iso: string): Cell {
  const d = fromIso(iso);
  return { iso, eth: toEth(iso), gYear: d.getFullYear(), gMonth: d.getMonth() + 1, gDay: d.getDate(), weekday: mondayFirst(d) };
}

/** All days of an Ethiopian month, in order. Pagume yields five or six. */
export function ethMonthCells(year: number, month: number): Cell[] {
  const n = ethMonthLength(year, month);
  return Array.from({ length: n }, (_, i) => cell(fromEth({ year, month, day: i + 1 })));
}

export function gregMonthCells(year: number, month: number): Cell[] {
  const n = new Date(year, month, 0).getDate();
  return Array.from({ length: n }, (_, i) => cell(toIso(new Date(year, month - 1, i + 1, 12))));
}

/** Empty slots before the first day so the grid aligns to Monday. */
export const leadingBlanks = (cells: Cell[]) => (cells.length ? cells[0].weekday : 0);

export function stepEthMonth(m: MonthRef, delta: number): MonthRef {
  let { year, month } = m;
  month += delta;
  while (month > 13) { month -= 13; year += 1; }
  while (month < 1) { month += 13; year -= 1; }
  return { year, month };
}

export function stepGregMonth(m: MonthRef, delta: number): MonthRef {
  const d = new Date(m.year, m.month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** The month a date falls in, in the given system. */
export function monthOf(iso: string, system: 'ethiopian' | 'gregorian'): MonthRef {
  if (system === 'ethiopian') { const e = toEth(iso); return { year: e.year, month: e.month }; }
  const d = fromIso(iso);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
