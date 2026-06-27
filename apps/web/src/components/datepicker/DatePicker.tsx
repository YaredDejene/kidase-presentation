import React from 'react';
import type { UiLang } from '../../i18n';
import { EthiopianDatePicker } from './EthiopianDatePicker';
import { GregorianDatePicker } from './GregorianDatePicker';

interface Props {
  value: string;
  onChange: (v: string) => void;
  uiLang: UiLang;
}

const TODAY_LABEL: Record<UiLang, string> = { en: 'Today', am: 'ዛሬ', ti: 'ሎሚ' };

/** Picks the Ethiopian or Gregorian calendar based on the interface language
 *  (mirrors the desktop DatePicker wrapper). */
export const DatePicker: React.FC<Props> = ({ value, onChange, uiLang }) => {
  const todayLabel = TODAY_LABEL[uiLang];
  return uiLang === 'en'
    ? <GregorianDatePicker value={value} onChange={onChange} todayLabel={todayLabel} />
    : <EthiopianDatePicker value={value} onChange={onChange} todayLabel={todayLabel} />;
};
