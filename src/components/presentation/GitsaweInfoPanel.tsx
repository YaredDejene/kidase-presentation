import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';
import { formatEthiopianDateShort } from '../../domain/formatting';

const gitsaweLabelKeys: Record<string, string> = {
  lineId: 'gitsaweLineId',
  kidaseType: 'gitsaweKidaseType',
  gitsaweType: 'gitsaweGitsaweType',
  messageStPaul: 'gitsaweStPaul',
  messageApostle: 'gitsaweApostle',
  messageBookOfActs: 'gitsaweBookOfActs',
  messageApostleEvangelist: 'gitsaweApostleEvangelist',
  misbak: 'gitsaweMisbak',
  wengel: 'gitsaweWengel',
  evangelist: 'gitsaweEvangelist',
};

export function useGitsaweDateLabel(): string {
  const { i18n } = useTranslation();
  const { ruleEvaluationDate } = useAppStore();
  return useMemo(() => {
    const date = ruleEvaluationDate
      ? new Date(ruleEvaluationDate + 'T12:00:00')
      : new Date();
    if (i18n.language === 'am') {
      return formatEthiopianDateShort(date);
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [i18n.language, ruleEvaluationDate]);
}

export const GitsaweInfoPanel: React.FC<{ gitsawe: Record<string, unknown> }> = ({ gitsawe }) => {
  const { t } = useTranslation('presentation');
  const dateLabel = useGitsaweDateLabel();

  const entries = Object.entries(gitsaweLabelKeys)
    .map(([key, labelKey]) => ({ label: t(labelKey), value: gitsawe[key] }))
    .filter((e): e is { label: string; value: string | number } => e.value != null && e.value !== '');

  if (entries.length === 0) return null;

  return (
    <div className="pres-page-gitsawe">
      <div className="pres-page-gitsawe-header">{t('currentGitsawe')} ({dateLabel})</div>
      <div className="pres-page-gitsawe-grid">
        {entries.map(({ label, value }) => (
          <div className="pres-page-gitsawe-row" key={label}>
            <span className="pres-page-gitsawe-label">{label}:</span>
            <span>{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
