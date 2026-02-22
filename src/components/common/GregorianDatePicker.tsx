import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DayPicker } from 'react-day-picker';
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

export const GregorianDatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = parseDate(value);
  const today = new Date();

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

  const handleSelect = useCallback((day: Date | undefined) => {
    if (!day) return;
    if (isSameDay(day, today)) {
      onChange(null);
    } else {
      onChange(formatDate(day));
    }
    setIsOpen(false);
  }, [onChange, today]);

  const handleToday = useCallback(() => {
    onChange(null);
    setIsOpen(false);
  }, [onChange]);

  const displayText = value
    ? selected.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })
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
        <div className="dp-dropdown dp-dropdown--gregorian">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            classNames={{
              root: 'dp-rdp',
              months: 'dp-rdp-months',
              month: 'dp-rdp-month',
              month_caption: 'dp-rdp-caption',
              caption_label: 'dp-rdp-caption-label',
              nav: 'dp-rdp-nav',
              button_previous: 'dp-rdp-nav-btn dp-rdp-nav-prev',
              button_next: 'dp-rdp-nav-btn dp-rdp-nav-next',
              chevron: 'dp-rdp-chevron',
              month_grid: 'dp-rdp-grid',
              weekdays: 'dp-rdp-weekdays',
              weekday: 'dp-weekday',
              week: 'dp-rdp-week',
              day: 'dp-rdp-day',
              day_button: 'dp-day',
              selected: 'dp-day--selected',
              today: 'dp-day--today',
              outside: 'dp-day--other',
            }}
          />
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
