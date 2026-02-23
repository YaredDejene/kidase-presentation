import React from 'react';
import { useLocale } from '../../hooks/useLocale';
import { GregorianDatePicker } from './GregorianDatePicker';
import { EthiopianDatePicker } from './EthiopianDatePicker';

interface DatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export const DatePicker: React.FC<DatePickerProps> = (props) => {
  const { locale } = useLocale();
  return locale === 'am'
    ? <EthiopianDatePicker {...props} />
    : <GregorianDatePicker {...props} />;
};
