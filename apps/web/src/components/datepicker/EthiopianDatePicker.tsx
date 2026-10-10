import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MonthGrid, toEC } from 'kenat';
import { formatEthiopianDate } from '@kidase/shared';
import './datepicker.css';

interface Props { value: string; onChange: (v: string) => void; todayLabel: string; }
interface EthDay { ethiopian: { year: number; month: number; day: number }; gregorian: { year: number; month: number; day: number }; isToday: boolean; }

const parse = (v: string) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const fmtG = (g: { year: number; month: number; day: number }) => `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export const EthiopianDatePicker: React.FC<Props> = ({ value, onChange, todayLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = parse(value);
  const selectedEC = useMemo(() => toEC(selected.getFullYear(), selected.getMonth() + 1, selected.getDate()), [selected.getFullYear(), selected.getMonth(), selected.getDate()]);
  const [viewYear, setViewYear] = useState(selectedEC.year);
  const [viewMonth, setViewMonth] = useState(selectedEC.month);

  useEffect(() => {
    const d = parse(value);
    const ec = toEC(d.getFullYear(), d.getMonth() + 1, d.getDate());
    setViewYear(ec.year); setViewMonth(ec.month);
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isOpen]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grid: any = useMemo(() => MonthGrid.create({ year: viewYear, month: viewMonth, weekStart: 0, weekdayLang: 'amharic', mode: 'christian' }), [viewYear, viewMonth]);

  const prevMonth = useCallback(() => { if (viewMonth === 1) { setViewMonth(13); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }, [viewMonth]);
  const nextMonth = useCallback(() => { if (viewMonth === 13) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }, [viewMonth]);
  const selectDay = useCallback((day: EthDay) => { if (!day) return; onChange(fmtG(day.gregorian)); setIsOpen(false); }, [onChange]);
  const goToday = useCallback(() => { onChange(todayIso()); const n = new Date(); const ec = toEC(n.getFullYear(), n.getMonth() + 1, n.getDate()); setViewYear(ec.year); setViewMonth(ec.month); setIsOpen(false); }, [onChange]);

  return (
    <div className="dp-container" ref={containerRef}>
      <button className="dp-trigger" onClick={() => setIsOpen(!isOpen)} type="button">
        <svg className="dp-trigger-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        <span className="dp-trigger-text" style={{ fontFamily: "'Noto Serif Ethiopic Variable',serif" }}>{formatEthiopianDate(selected)}</span>
        <svg className="dp-trigger-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {isOpen && (
        <div className="dp-dropdown">
          <div className="dp-header">
            <button className="dp-nav-btn" onClick={prevMonth} type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg></button>
            <span className="dp-month-year" style={{ fontFamily: "'Noto Serif Ethiopic Variable',serif" }}>{grid.monthName} {grid.year}</span>
            <button className="dp-nav-btn" onClick={nextMonth} type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></button>
          </div>
          <div className="dp-weekdays">{grid.headers.map((hd: string, i: number) => <span key={i} className="dp-weekday">{hd}</span>)}</div>
          <div className="dp-days">
            {grid.days.map((day: EthDay | null, i: number) => {
              if (!day) return <span key={i} className="dp-day dp-day--other" />;
              const sel = day.ethiopian.day === selectedEC.day && day.ethiopian.month === selectedEC.month && day.ethiopian.year === selectedEC.year;
              return <button key={i} className={['dp-day', day.isToday ? 'dp-day--today' : '', sel ? 'dp-day--selected' : ''].join(' ')} onClick={() => selectDay(day)} type="button">{day.ethiopian.day}</button>;
            })}
          </div>
          <div className="dp-footer"><button className="dp-today-btn" onClick={goToday} type="button">{todayLabel}</button></div>
        </div>
      )}
    </div>
  );
};
