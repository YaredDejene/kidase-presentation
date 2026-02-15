import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/datepicker.css';

interface DatePickerProps {
  value: string | null; // "YYYY-MM-DD" or null for today
  onChange: (value: string | null) => void;
}

const DAY_KEYS = ['daysSu', 'daysMo', 'daysTu', 'daysWe', 'daysTh', 'daysFr', 'daysSa'];
const MONTH_KEYS = [
  'monthJanuary', 'monthFebruary', 'monthMarch', 'monthApril', 'monthMay', 'monthJune',
  'monthJuly', 'monthAugust', 'monthSeptember', 'monthOctober', 'monthNovember', 'monthDecember',
];

function parseDate(value: string | null): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const selected = parseDate(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // Sync view when value changes externally
  useEffect(() => {
    const d = parseDate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  }, [viewMonth]);

  const handleSelectDay = useCallback((day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (isSameDay(d, today)) {
      onChange(null);
    } else {
      onChange(formatDate(d));
    }
    setIsOpen(false);
  }, [viewYear, viewMonth, onChange, today]);

  const handleToday = useCallback(() => {
    onChange(null);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  }, [onChange, today]);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false });
  }

  const displayText = value
    ? selected.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : t('today');

  return (
    <div className="dp-container" ref={containerRef}>
      <button
        className="dp-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <svg className="dp-trigger-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className={`dp-trigger-text ${!value ? 'dp-trigger-today' : ''}`}>
          {displayText}
        </span>
        <svg className="dp-trigger-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="dp-dropdown">
          <div className="dp-header">
            <button className="dp-nav-btn" onClick={handlePrevMonth} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="dp-month-year">
              {t(MONTH_KEYS[viewMonth])} {viewYear}
            </span>
            <button className="dp-nav-btn" onClick={handleNextMonth} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="dp-weekdays">
            {DAY_KEYS.map(key => (
              <span key={key} className="dp-weekday">{t(key)}</span>
            ))}
          </div>

          <div className="dp-days">
            {cells.map((cell, i) => {
              const cellDate = cell.current
                ? new Date(viewYear, viewMonth, cell.day)
                : null;
              const isToday = cellDate && isSameDay(cellDate, today);
              const isSelected = cellDate && isSameDay(cellDate, selected);
              return (
                <button
                  key={i}
                  className={[
                    'dp-day',
                    !cell.current ? 'dp-day--other' : '',
                    isToday ? 'dp-day--today' : '',
                    isSelected ? 'dp-day--selected' : '',
                  ].join(' ')}
                  onClick={() => cell.current && handleSelectDay(cell.day)}
                  disabled={!cell.current}
                  type="button"
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="dp-footer">
            <button className="dp-today-btn" onClick={handleToday} type="button">
              {t('today')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
