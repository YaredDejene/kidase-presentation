import type { LangText } from './entities/Presentation';

/** Public viewer countries; each swaps the patriarch and country placeholders. */
export type Country = 'et' | 'er' | 'both';
export const COUNTRIES: Country[] = ['et', 'er', 'both'];

/** Per-language values, Lang1 Geez, Lang2 Amharic, Lang3 Tigrinya, Lang4 English, Lang5 Afaan Oromoo, Lang6 Kinyarwanda. */
export const COUNTRY_VARIABLES: Record<Country, Record<'@PATRIARCH_NAME' | '@COUNTRY_NAME', LangText>> = {
  et: {
    '@PATRIARCH_NAME': { Lang1: 'አባ ማትያስ', Lang2: 'አባ ማትያስ', Lang3: 'ኣባ ማትያስ', Lang4: 'Abba Matthias', Lang5: 'Abbaa Maatiyaas', Lang6: 'Abba Matiyasi' },
    '@COUNTRY_NAME': { Lang1: 'ኢትዮጵያ', Lang2: 'ኢትዮጵያ', Lang3: 'ኢትዮጵያ', Lang4: 'Ethiopia', Lang5: 'Itoophiyaa', Lang6: 'Etiyopiya' },
  },
  er: {
    '@PATRIARCH_NAME': { Lang1: 'አባ ባስልዮስ', Lang2: 'አባ ባስልዮስ', Lang3: 'ኣባ ባስልዮስ', Lang4: 'Abba Basileios', Lang5: 'Abbaa Baasiliyoos', Lang6: 'Abba Basili' },
    '@COUNTRY_NAME': { Lang1: 'ኤርትራ', Lang2: 'ኤርትራ', Lang3: 'ኤርትራ', Lang4: 'Eritrea', Lang5: 'Eertiraa', Lang6: 'Eritereya' },
  },
  both: {
    '@PATRIARCH_NAME': { Lang1: 'አባ ማትያስ ወአባ ባስልዮስ', Lang2: 'አባ ማትያስና አባ ባስልዮስ', Lang3: 'ኣባ ማትያስን ኣባ ባስልዮስን', Lang4: 'Abba Matthias and Abba Basileios', Lang5: 'Abbaa Maatiyaas fi Abbaa Baasiliyoos', Lang6: 'Abba Matiyasi na Abba Basili' },
    '@COUNTRY_NAME': { Lang1: 'ኢትዮጵያ ወኤርትራ', Lang2: 'ኢትዮጵያና ኤርትራ', Lang3: 'ኢትዮጵያን ኤርትራን', Lang4: 'Ethiopia and Eritrea', Lang5: 'Itoophiyaa fi Eertiraa', Lang6: 'Etiyopiya na Eritereya' },
  },
};

/** Placeholders the public viewer leaves blank: it serves no single parish. */
export const BLANK_FOR_COUNTRY = ['@CHURCH_NAME', '@ARCHBISHOP_NAME'];
/** Shown in their place, so the gap is visible and the reader fills it in. */
export const BLANK_VALUE = '_______';
