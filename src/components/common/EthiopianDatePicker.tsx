import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MonthGrid, toEC } from 'kenat';
import { formatEthiopianDate } from '../../domain/formatting';
import type { EthiopianDay } from '../../types/kenat';
import '../../styles/datepicker.css';

interface DatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

function parseDate(value: string | null): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatGregorian(g: { year: number; month: number; day: number }): string {
  const y = g.year;
  const m = String(g.month).padStart(2, '0');
  const d = String(g.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const EthiopianDatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert the Gregorian value to Ethiopian to determine initial view
  const selected = parseDate(value);
  const selectedEC = useMemo(
    () => toEC(selected.getFullYear(), selected.getMonth() + 1, selected.getDate()),
    [selected.getFullYear(), selected.getMonth(), selected.getDate()]
  );

  const [viewYear, setViewYear] = useState(selectedEC.year);
  const [viewMonth, setViewMonth] = useState(selectedEC.month);

  // Sync view when value changes externally
  useEffect(() => {
    const d = parseDate(value);
    const ec = toEC(d.getFullYear(), d.getMonth() + 1, d.getDate());
    setViewYear(ec.year);
    setViewMonth(ec.month);
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

  // Generate the grid for current view
  const grid = useMemo(
    () => MonthGrid.create({
      year: viewYear,
      month: viewMonth,
      weekStart: 0,
      weekdayLang: 'amharic',
      mode: 'christian',
    }),
    [viewYear, viewMonth]
  );

  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 1) {
      setViewMonth(13);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 13) {
      setViewMonth(1);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  }, [viewMonth]);

  const handleSelectDay = useCallback((day: EthiopianDay) => {
    if (!day) return;
    const g = day.gregorian;
    // Check if this is today
    if (day.isToday) {
      onChange(null);
    } else {
      onChange(formatGregorian(g));
    }
    setIsOpen(false);
  }, [onChange]);

  const handleToday = useCallback(() => {
    onChange(null);
    const now = new Date();
    const ec = toEC(now.getFullYear(), now.getMonth() + 1, now.getDate());
    setViewYear(ec.year);
    setViewMonth(ec.month);
    setIsOpen(false);
  }, [onChange]);

  // Display text in trigger
  const displayText = value
    ? formatEthiopianDate(selected)
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
              {grid.monthName} {grid.year}
            </span>
            <button className="dp-nav-btn" onClick={handleNextMonth} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="dp-weekdays">
            {grid.headers.map((header: string, i: number) => (
              <span key={i} className="dp-weekday">{header}</span>
            ))}
          </div>

          <div className="dp-days">
            {grid.days.map((day: EthiopianDay | null, i: number) => {
              if (day === null) {
                return <span key={i} className="dp-day dp-day--other" />;
              }
              const isSelected =
                day.ethiopian.day === selectedEC.day &&
                day.ethiopian.month === selectedEC.month &&
                day.ethiopian.year === selectedEC.year;
              return (
                <button
                  key={i}
                  className={[
                    'dp-day',
                    day.isToday ? 'dp-day--today' : '',
                    isSelected ? 'dp-day--selected' : '',
                  ].join(' ')}
                  onClick={() => handleSelectDay(day)}
                  type="button"
                >
                  {day.ethiopian.day}
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
