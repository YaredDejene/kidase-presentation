/** Type declarations for the `kenat` Ethiopian calendar library. */

export interface EthiopianDay {
  ethiopian: { year: number; month: number; day: number };
  gregorian: { year: number; month: number; day: number };
  isToday: boolean;
}

export interface EthiopianMonthNames {
  amharic: string[];
  geez: string[];
  english: string[];
}
