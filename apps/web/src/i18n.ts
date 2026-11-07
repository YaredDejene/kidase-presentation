import type { Country } from '@kidase/shared';

export type UiLang = 'en' | 'am' | 'ti';

export interface Strings {
  settings: string; liturgy: string; liturgySub: string; serviceDate: string; dateSub: string;
  ethiopian: string; gregorian: string; languages: string; langSub: (n: number) => string; mehella: string; mehellaSub: string; readingsSub: string; groupService: string; groupSlides: string; groupApp: string;
  context: string; resolved: string; uiLang: string; done: string; sections: string; date: string; feast: string;
  readings: string; shortcuts: string; loadingSlide: string; errTitle: string; errSub: string; retry: string;
  project: string; toggleThumbs: string; prevSlide: string; nextSlide: string;
  exportTitle: string; exportTip: string; settingsTip: string; themeLight: string; themeDark: string; admin: string; more: string; exit: string;
  noSlidesTitle: string; noSlidesSub: string; changeDate: string; copyLink: string; linkCopied: string;
  pdfSub: (n: number) => string; cancel: string; download: string; rendering: string;
  exportReady: string; exportAgain: string; exportFailed: string; slide: string;
  country: string; countrySub: string; countryNames: Record<Country, string>;
  /** One label per entry of SHORTCUTS, same order. */
  shortcutLabels: string[];
}

export const T: Record<UiLang, Strings> = {
  en: {
    settings: 'Presentation settings', liturgy: 'Liturgy', liturgySub: "Auto-selected from today's date. Change if needed.", serviceDate: 'Service date', dateSub: "Pick the date to load that day's readings and slides.", ethiopian: 'Ethiopian', gregorian: 'Gregorian', languages: 'Languages', langSub: n => `Up to ${n} shown simultaneously on the slide.`, mehella: 'Mehella mode', mehellaSub: "Use the readings and anaphora for a day of supplication instead of the day's regular gitsawe.", groupService: 'Service', groupSlides: 'On the slides', groupApp: 'App', readingsSub: "This day's gitsawe lists more than one reference for these readings. Pick the one to use.", context: 'Liturgical context', resolved: 'Resolved automatically', uiLang: 'Interface language', done: 'Done', sections: 'Sections', date: 'Date', feast: 'Feast', readings: 'Gitsawe readings', shortcuts: 'Keyboard shortcuts', loadingSlide: 'Loading liturgy…', errTitle: "Couldn't load slides", errSub: 'The server did not respond. Check your connection.', retry: 'Retry',
    project: 'Project', toggleThumbs: 'Toggle thumbnails', prevSlide: 'Previous', nextSlide: 'Next',
    exportTitle: 'Export presentation', exportTip: 'Export / Download', settingsTip: 'Settings (date & languages)', themeLight: 'Light theme', themeDark: 'Dark theme', admin: 'Admin', more: 'More', exit: 'Exit',
    noSlidesTitle: 'No slides for this date', noSlidesSub: 'This liturgy has no readings assigned to the selected gitsawe. Try another date.', changeDate: 'Change date', copyLink: 'Copy share link', linkCopied: 'Link copied',
    pdfSub: n => `All ${n} slides · print-ready`, cancel: 'Cancel', download: 'Download', rendering: 'Rendering slides & composing file…',
    exportReady: 'Export ready', exportAgain: 'Export again', exportFailed: 'Export failed', slide: 'Slide',
    country: 'Country', countrySub: 'Sets the patriarch and country named in the prayers.', countryNames: { et: 'Ethiopia', er: 'Eritrea', both: 'Ethiopia and Eritrea' },
    shortcutLabels: ['Previous / next slide', 'Next slide', 'Project fullscreen', 'Liturgical info', 'Exit fullscreen / close', 'Keyboard shortcuts'],
  },
  am: {
    settings: 'የዝግጅት ቅንብሮች', liturgy: 'ቅዳሴ', liturgySub: 'ከዛሬው ቀን በራስ-ሰር ተመርጧል። ከፈለጉ ይቀይሩ።', serviceDate: 'የቅዳሴ ቀን', dateSub: 'የዕለቱን ምንባባትና ስላይዶች ለመጫን ቀን ይምረጡ።', ethiopian: 'ኢትዮጵያዊ', gregorian: 'ግሪጎሪያን', languages: 'ቋንቋዎች', langSub: n => `በስላይዱ ላይ እስከ ${n} በአንድ ጊዜ ይታያሉ።`, mehella: 'የምህላ ሁነታ', mehellaSub: 'ከዕለቱ ግጻዌ ይልቅ የዕለተ ምህላ ምንባባትንና ቅዳሴን ይጠቀማል።', groupService: 'የዕለቱ ቅዳሴ', groupSlides: 'በስላይዶቹ ላይ', groupApp: 'መተግበሪያ', readingsSub: 'የዕለቱ ግጻዌ ለእነዚህ ምንባባት ከአንድ በላይ ጥቅስ ይዟል። የሚነበበውን ይምረጡ።', context: 'የቅዳሴ መረጃ', resolved: 'በራስ-ሰር ተወስኗል', uiLang: 'የመተግበሪያ ቋንቋ', done: 'ተከናውኗል', sections: 'ክፍሎች', date: 'ቀን', feast: 'በዓል', readings: 'የግፃዌ ምንባባት', shortcuts: 'የቁልፍ አቋራጮች', loadingSlide: 'ቅዳሴ በመጫን ላይ…', errTitle: 'ስላይዶችን መጫን አልተቻለም', errSub: 'አገልጋዩ ምላሽ አልሰጠም። ግንኙነትዎን ያረጋግጡ።', retry: 'እንደገና ሞክር',
    project: 'አሳይ', toggleThumbs: 'ትንንሽ ምስሎችን አሳይ / ደብቅ', prevSlide: 'ቀዳሚ', nextSlide: 'ቀጣይ',
    exportTitle: 'ዝግጅቱን አውርድ', exportTip: 'አውርድ', settingsTip: 'ቅንብሮች (ቀንና ቋንቋዎች)', themeLight: 'ብሩህ ገጽታ', themeDark: 'ጨለማ ገጽታ', admin: 'አስተዳዳሪ', more: 'ተጨማሪ', exit: 'ውጣ',
    noSlidesTitle: 'ለዚህ ቀን ስላይድ የለም', noSlidesSub: 'ይህ ቅዳሴ ለተመረጠው ግፃዌ ምንባብ አልተመደበለትም። ሌላ ቀን ይሞክሩ።', changeDate: 'ቀን ቀይር', copyLink: 'የማጋሪያ አገናኝ ቅዳ', linkCopied: 'አገናኙ ተቀድቷል',
    pdfSub: n => `ሁሉም ${n} ስላይዶች · ለህትመት ዝግጁ`, cancel: 'ሰርዝ', download: 'አውርድ', rendering: 'ስላይዶች እየተዘጋጁ ፋይሉ እየተሰራ ነው…',
    exportReady: 'ፋይሉ ዝግጁ ነው', exportAgain: 'እንደገና አውርድ', exportFailed: 'ማውረድ አልተሳካም', slide: 'ስላይድ',
    country: 'ሀገር', countrySub: 'በጸሎቱ የሚጠሩትን ፓትርያርክና ሀገር ይወስናል።', countryNames: { et: 'ኢትዮጵያ', er: 'ኤርትራ', both: 'ኢትዮጵያና ኤርትራ' },
    shortcutLabels: ['ቀዳሚ / ቀጣይ ስላይድ', 'ቀጣይ ስላይድ', 'በሙሉ ስክሪን አሳይ', 'የቅዳሴ መረጃ', 'ከሙሉ ስክሪን ውጣ / ዝጋ', 'የቁልፍ አቋራጮች'],
  },
  ti: {
    settings: 'ናይ መርኢት ቅጥዕታት', liturgy: 'ቅዳሴ', liturgySub: 'ካብ ናይ ሎሚ ዕለት ብቐጥታ ተመሪጹ። እንተደሊኹም ቀይሩ።', serviceDate: 'ዕለት ኣገልግሎት', dateSub: 'ናይታ ዕለት ንባባትን ስላይዳትን ንምጽዓን ዕለት ምረጽ።', ethiopian: 'ኢትዮጵያዊ', gregorian: 'ግሪጎርያን', languages: 'ቋንቋታት', langSub: n => `ኣብ ስላይድ ክሳብ ${n} ብሓደ ግዜ ይረኣዩ።`, mehella: 'ኩነታት ምህላ', mehellaSub: 'ኣብ ክንዲ ግጻዌ ናይታ ዕለት፣ ንባባትን ቅዳሴን ዕለተ ምህላ ይጥቀም።', groupService: 'ቅዳሴ ናይታ ዕለት', groupSlides: 'ኣብ ስላይዳት', groupApp: 'መተግበሪ', readingsSub: 'ግጻዌ ናይዛ ዕለት ነዞም ንባባት ካብ ሓደ ንላዕሊ ጥቕሲ ሒዙ ኣሎ። ዝንበብ ምረጽ።', context: 'ሓበሬታ ቅዳሴ', resolved: 'ብቐጥታ ተወሲኑ', uiLang: 'ቋንቋ መተግበሪ', done: 'ተወዲኡ', sections: 'ክፋላት', date: 'ዕለት', feast: 'በዓል', readings: 'ንባባት ግጻዌ', shortcuts: 'ሓጸርቲ መንገድታት ቁልፊ', loadingSlide: 'ቅዳሴ ኣብ ምጽዓን…', errTitle: 'ስላይዳት ክጽዕን ኣይከኣለን', errSub: 'ኣገልጋሊ ኣይመለሰን። ርክብኩም ኣረጋግጹ።', retry: 'መሊስካ ፈትን',
    project: 'ኣርኢ', toggleThumbs: 'ንኣሽቱ ስእልታት ኣርኢ / ሕባእ', prevSlide: 'ዝሓለፈ', nextSlide: 'ዝቕጽል',
    exportTitle: 'መርኢት ኣውርድ', exportTip: 'ኣውርድ', settingsTip: 'ቅጥዕታት (ዕለትን ቋንቋታትን)', themeLight: 'ብሩህ ገጽታ', themeDark: 'ጸልማት ገጽታ', admin: 'ኣመሓዳሪ', more: 'ተወሳኺ', exit: 'ውጻእ',
    noSlidesTitle: 'ነዛ ዕለት ስላይድ የለን', noSlidesSub: 'እዚ ቅዳሴ ነቲ ዝተመርጸ ግጻዌ ንባብ ኣይተመደበሉን። ካልእ ዕለት ፈትኑ።', changeDate: 'ዕለት ቀይር', copyLink: 'መካፈሊ ሊንክ ቅዳሕ', linkCopied: 'ሊንክ ተቐዲሑ',
    pdfSub: n => `ኩሎም ${n} ስላይዳት · ንሕትመት ድሉው`, cancel: 'ሰርዝ', download: 'ኣውርድ', rendering: 'ስላይዳት ይዳለዉ ፋይል ይስራሕ ኣሎ…',
    exportReady: 'ፋይል ድሉው እዩ', exportAgain: 'መሊስካ ኣውርድ', exportFailed: 'ምውራድ ኣይተዓወተን', slide: 'ስላይድ',
    country: 'ሃገር', countrySub: 'ኣብ ጸሎት ዝጥቀሱ ፓትርያርክን ሃገርን ይውስን።', countryNames: { et: 'ኢትዮጵያ', er: 'ኤርትራ', both: 'ኢትዮጵያን ኤርትራን' },
    shortcutLabels: ['ዝሓለፈ / ዝቕጽል ስላይድ', 'ዝቕጽል ስላይድ', 'ብምሉእ ስክሪን ኣርኢ', 'ሓበሬታ ቅዳሴ', 'ካብ ምሉእ ስክሪን ውጻእ / ዕጾ', 'ሓጸርቲ መንገድታት ቁልፊ'],
  },
};

export const UI_LANGS: { key: UiLang; label: string }[] = [
  { key: 'en', label: 'English' }, { key: 'am', label: 'አማርኛ' }, { key: 'ti', label: 'ትግርኛ' },
];

/** Ethiopian month names in each interface language. */
export const ETH_MONTHS: Record<UiLang, string[]> = {
  en: ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'],
  am: ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'],
  ti: ['መስከረም', 'ጥቅምቲ', 'ሕዳር', 'ታሕሳስ', 'ጥሪ', 'ለካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰነ', 'ሓምለ', 'ነሓሰ', 'ጳጉሜን'],
};

/** Tigrinya weekday names, Sunday first; the calendar library only has Amharic ones. */
export const TI_WEEKDAYS = ['ሰንበት', 'ሰኑይ', 'ሰሉስ', 'ረቡዕ', 'ሓሙስ', 'ዓርቢ', 'ቀዳም'];

/** An Ethiopian date in the interface language, e.g. "Tikimt 29, 2019" or "ጥቅምት 29, 2019". */
export const ethDateText = (ui: UiLang, ec: { year: number; month: number; day: number }) =>
  `${ETH_MONTHS[ui][ec.month - 1]} ${ec.day}, ${ec.year}`;

/** Liturgy language names for the Amharic and Tigrinya interfaces, keyed by the English name. */
const LANG_NAMES: Record<string, { am: string; ti: string }> = {
  "Ge'ez": { am: 'ግዕዝ', ti: 'ግዕዝ' }, Geez: { am: 'ግዕዝ', ti: 'ግዕዝ' },
  Amharic: { am: 'አማርኛ', ti: 'ኣምሓርኛ' },
  Tigrinya: { am: 'ትግርኛ', ti: 'ትግርኛ' }, Tigrigna: { am: 'ትግርኛ', ti: 'ትግርኛ' },
  English: { am: 'እንግሊዝኛ', ti: 'እንግሊዝኛ' },
  'Afaan Oromoo': { am: 'ኦሮምኛ', ti: 'ኦሮምኛ' },
  Kinyarwanda: { am: 'ኪንያርዋንዳ', ti: 'ኪንያርዋንዳ' },
  Swedish: { am: 'ስዊድንኛ', ti: 'ሽወደንኛ' },
};
/** A liturgy language's name in the interface language; unknown names stay as given. */
export const langName = (ui: UiLang, name: string) => (ui === 'en' ? name : LANG_NAMES[name]?.[ui] ?? name);

/** Short chip label per language slot. */
export const LANG_BY_SLOT: Record<string, { short: string }> = {
  Lang1: { short: 'ግ' },
  Lang2: { short: 'አ' },
  Lang3: { short: 'ት' },
  Lang4: { short: 'En' },
};

/** Keys per shortcut; labels come from Strings.shortcutLabels in the same order. */
export const SHORTCUTS: string[][] = [['←', '→'], ['Space'], ['F'], ['I'], ['Esc'], ['?']];
