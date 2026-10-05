export type UiLang = 'en' | 'am' | 'ti';

export interface Strings {
  settings: string; liturgy: string; liturgySub: string; serviceDate: string; dateSub: string;
  ethiopian: string; gregorian: string; languages: string; langSub: (n: number) => string; mehella: string; mehellaSub: string;
  context: string; resolved: string; uiLang: string; done: string; sections: string; date: string; feast: string;
  readings: string; shortcuts: string; loadingSlide: string; errTitle: string; errSub: string; retry: string;
}

export const T: Record<UiLang, Strings> = {
  en: { settings: 'Presentation settings', liturgy: 'Liturgy', liturgySub: "Auto-selected from today's date — change if needed.", serviceDate: 'Service date', dateSub: "Pick the date to load that day's readings and slides.", ethiopian: 'Ethiopian', gregorian: 'Gregorian', languages: 'Languages', langSub: n => `Up to ${n} shown simultaneously on the slide.`, mehella: 'Mehella mode', mehellaSub: 'Show responsorial chant variants where available.', context: 'Liturgical context', resolved: 'Resolved automatically', uiLang: 'Interface language', done: 'Done', sections: 'Sections', date: 'Date', feast: 'Feast', readings: 'Gitsawe readings', shortcuts: 'Keyboard shortcuts', loadingSlide: 'Loading liturgy…', errTitle: "Couldn't load slides", errSub: 'The server did not respond. Check your connection.', retry: 'Retry' },
  am: { settings: 'የዝግጅት ቅንብሮች', liturgy: 'ቅዳሴ', liturgySub: 'ከዛሬው ቀን በራስ-ሰር ተመርጧል — ከፈለጉ ይቀይሩ።', serviceDate: 'የቅዳሴ ቀን', dateSub: 'የዕለቱን ምንባባትና ስላይዶች ለመጫን ቀን ይምረጡ።', ethiopian: 'ኢትዮጵያዊ', gregorian: 'ግሪጎሪያን', languages: 'ቋንቋዎች', langSub: n => `በስላይዱ ላይ እስከ ${n} በአንድ ጊዜ ይታያሉ።`, mehella: 'የመሐላ ሁነታ', mehellaSub: 'ባሉበት የመሐላ ዓይነቶችን አሳይ።', context: 'የቅዳሴ መረጃ', resolved: 'በራስ-ሰር ተወስኗል', uiLang: 'የመተግበሪያ ቋንቋ', done: 'ተከናውኗል', sections: 'ክፍሎች', date: 'ቀን', feast: 'በዓል', readings: 'የግፃዌ ምንባባት', shortcuts: 'የቁልፍ አቋራጮች', loadingSlide: 'ቅዳሴ በመጫን ላይ…', errTitle: 'ስላይዶችን መጫን አልተቻለም', errSub: 'አገልጋዩ ምላሽ አልሰጠም። ግንኙነትዎን ያረጋግጡ።', retry: 'እንደገና ሞክር' },
  ti: { settings: 'ናይ መርኢት ቅጥዕታት', liturgy: 'ቅዳሴ', liturgySub: 'ካብ ናይ ሎሚ ዕለት ብቐጥታ ተመሪጹ — እንተደሊኹም ቀይሩ።', serviceDate: 'ዕለት ኣገልግሎት', dateSub: 'ናይታ ዕለት ንባባትን ስላይዳትን ንምጽዓን ዕለት ምረጽ።', ethiopian: 'ኢትዮጵያዊ', gregorian: 'ግሪጎርያን', languages: 'ቋንቋታት', langSub: n => `ኣብ ስላይድ ክሳብ ${n} ብሓደ ግዜ ይረኣዩ።`, mehella: 'ኩነታት መሐላ', mehellaSub: 'ዘለዉ ናይ መሐላ ዓይነታት ኣርኢ።', context: 'ሓበሬታ ቅዳሴ', resolved: 'ብቐጥታ ተወሲኑ', uiLang: 'ቋንቋ መተግበሪ', done: 'ተወዲኡ', sections: 'ክፋላት', date: 'ዕለት', feast: 'በዓል', readings: 'ንባባት ግጻዌ', shortcuts: 'ሓጸርቲ መንገድታት ቁልፊ', loadingSlide: 'ቅዳሴ ኣብ ምጽዓን…', errTitle: 'ስላይዳት ክጽዕን ኣይከኣለን', errSub: 'ኣገልጋሊ ኣይመለሰን። ርክብኩም ኣረጋግጹ።', retry: 'መሊስካ ፈትን' },
};

export const UI_LANGS: { key: UiLang; label: string }[] = [
  { key: 'en', label: 'English' }, { key: 'am', label: 'አማርኛ' }, { key: 'ti', label: 'ትግርኛ' },
];

export const ETH_MONTHS_LONG = ['መስከረም · Meskerem', 'ጥቅምት · Tikimt', 'ኅዳር · Hidar', 'ታኅሣሥ · Tahsas', 'ጥር · Tir', 'የካቲት · Yekatit', 'መጋቢት · Megabit', 'ሚያዝያ · Miazia', 'ግንቦት · Ginbot', 'ሰኔ · Sene', 'ሐምሌ · Hamle', 'ነሐሴ · Nehase', 'ጳጉሜን · Pagume'];
export const ETH_MONTHS_SHORT = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'];

/** Per-slot language presentation metadata (amharic name, short chip label, dot color). */
export const LANG_BY_SLOT: Record<string, { amh: string; short: string; color: string }> = {
  Lang1: { amh: 'ግዕዝ', short: 'ግ', color: '#FFFFFF' },
  Lang2: { amh: 'አማርኛ', short: 'አ', color: '#FFFF00' },
  Lang3: { amh: 'ትግርኛ', short: 'ት', color: '#00FF00' },
  Lang4: { amh: 'እንግሊዝኛ', short: 'En', color: '#00BFFF' },
};

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['←', '→'], label: 'Previous / next slide' },
  { keys: ['Space'], label: 'Next slide' },
  { keys: ['F'], label: 'Project fullscreen' },
  { keys: ['I'], label: 'Liturgical info' },
  { keys: ['Esc'], label: 'Exit fullscreen / close' },
  { keys: ['?'], label: 'Keyboard shortcuts' },
];
