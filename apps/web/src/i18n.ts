import type { Country } from '@kidase/shared';

export type UiLang = 'en' | 'am' | 'ti';

export interface Strings {
  settings: string; liturgy: string; liturgySub: string; serviceDate: string; dateSub: string;
  ethiopian: string; gregorian: string; languages: string; langSub: (n: number) => string; mehella: string; mehellaSub: string;
  context: string; resolved: string; uiLang: string; done: string; sections: string; date: string; feast: string;
  readings: string; shortcuts: string; loadingSlide: string; errTitle: string; errSub: string; retry: string;
  project: string; toggleThumbs: string; prevSlide: string; nextSlide: string;
  exportTitle: string; exportTip: string; settingsTip: string; themeLight: string; themeDark: string; admin: string; more: string; exit: string;
  noSlidesTitle: string; noSlidesSub: string; changeDate: string; copyLink: string; linkCopied: string;
  pdfSub: (n: number) => string; pptxSub: string; cancel: string; download: string; rendering: string;
  exportReady: string; exportAgain: string; exportFailed: string; slide: string;
  country: string; countrySub: string; countryNames: Record<Country, string>;
  /** One label per entry of SHORTCUTS, same order. */
  shortcutLabels: string[];
}

export const T: Record<UiLang, Strings> = {
  en: {
    settings: 'Presentation settings', liturgy: 'Liturgy', liturgySub: "Auto-selected from today's date. Change if needed.", serviceDate: 'Service date', dateSub: "Pick the date to load that day's readings and slides.", ethiopian: 'Ethiopian', gregorian: 'Gregorian', languages: 'Languages', langSub: n => `Up to ${n} shown simultaneously on the slide.`, mehella: 'Mehella mode', mehellaSub: 'Show responsorial chant variants where available.', context: 'Liturgical context', resolved: 'Resolved automatically', uiLang: 'Interface language', done: 'Done', sections: 'Sections', date: 'Date', feast: 'Feast', readings: 'Gitsawe readings', shortcuts: 'Keyboard shortcuts', loadingSlide: 'Loading liturgy…', errTitle: "Couldn't load slides", errSub: 'The server did not respond. Check your connection.', retry: 'Retry',
    project: 'Project', toggleThumbs: 'Toggle thumbnails', prevSlide: 'Previous', nextSlide: 'Next',
    exportTitle: 'Export presentation', exportTip: 'Export / Download', settingsTip: 'Settings (date & languages)', themeLight: 'Light theme', themeDark: 'Dark theme', admin: 'Admin', more: 'More', exit: 'Exit',
    noSlidesTitle: 'No slides for this date', noSlidesSub: 'This liturgy has no readings assigned to the selected gitsawe. Try another date.', changeDate: 'Change date', copyLink: 'Copy share link', linkCopied: 'Link copied',
    pdfSub: n => `All ${n} slides · print-ready`, pptxSub: 'Editable · one slide per page', cancel: 'Cancel', download: 'Download', rendering: 'Rendering slides & composing file…',
    exportReady: 'Export ready', exportAgain: 'Export again', exportFailed: 'Export failed', slide: 'Slide',
    country: 'Country', countrySub: 'Sets the patriarch and country named in the prayers.', countryNames: { et: 'Ethiopia', er: 'Eritrea', both: 'Ethiopia and Eritrea' },
    shortcutLabels: ['Previous / next slide', 'Next slide', 'Project fullscreen', 'Liturgical info', 'Exit fullscreen / close', 'Keyboard shortcuts'],
  },
  am: {
    settings: 'የዝግጅት ቅንብሮች', liturgy: 'ቅዳሴ', liturgySub: 'ከዛሬው ቀን በራስ-ሰር ተመርጧል። ከፈለጉ ይቀይሩ።', serviceDate: 'የቅዳሴ ቀን', dateSub: 'የዕለቱን ምንባባትና ስላይዶች ለመጫን ቀን ይምረጡ።', ethiopian: 'ኢትዮጵያዊ', gregorian: 'ግሪጎሪያን', languages: 'ቋንቋዎች', langSub: n => `በስላይዱ ላይ እስከ ${n} በአንድ ጊዜ ይታያሉ።`, mehella: 'የምህላ ሁነታ', mehellaSub: 'ባሉበት የምህላ ዓይነቶችን አሳይ።', context: 'የቅዳሴ መረጃ', resolved: 'በራስ-ሰር ተወስኗል', uiLang: 'የመተግበሪያ ቋንቋ', done: 'ተከናውኗል', sections: 'ክፍሎች', date: 'ቀን', feast: 'በዓል', readings: 'የግፃዌ ምንባባት', shortcuts: 'የቁልፍ አቋራጮች', loadingSlide: 'ቅዳሴ በመጫን ላይ…', errTitle: 'ስላይዶችን መጫን አልተቻለም', errSub: 'አገልጋዩ ምላሽ አልሰጠም። ግንኙነትዎን ያረጋግጡ።', retry: 'እንደገና ሞክር',
    project: 'አሳይ', toggleThumbs: 'ትንንሽ ምስሎችን አሳይ / ደብቅ', prevSlide: 'ቀዳሚ', nextSlide: 'ቀጣይ',
    exportTitle: 'ዝግጅቱን አውርድ', exportTip: 'አውርድ', settingsTip: 'ቅንብሮች (ቀንና ቋንቋዎች)', themeLight: 'ብሩህ ገጽታ', themeDark: 'ጨለማ ገጽታ', admin: 'አስተዳዳሪ', more: 'ተጨማሪ', exit: 'ውጣ',
    noSlidesTitle: 'ለዚህ ቀን ስላይድ የለም', noSlidesSub: 'ይህ ቅዳሴ ለተመረጠው ግፃዌ ምንባብ አልተመደበለትም። ሌላ ቀን ይሞክሩ።', changeDate: 'ቀን ቀይር', copyLink: 'የማጋሪያ አገናኝ ቅዳ', linkCopied: 'አገናኙ ተቀድቷል',
    pdfSub: n => `ሁሉም ${n} ስላይዶች · ለህትመት ዝግጁ`, pptxSub: 'ሊስተካከል የሚችል · በአንድ ገጽ አንድ ስላይድ', cancel: 'ሰርዝ', download: 'አውርድ', rendering: 'ስላይዶች እየተዘጋጁ ፋይሉ እየተሰራ ነው…',
    exportReady: 'ፋይሉ ዝግጁ ነው', exportAgain: 'እንደገና አውርድ', exportFailed: 'ማውረድ አልተሳካም', slide: 'ስላይድ',
    country: 'ሀገር', countrySub: 'በጸሎቱ የሚጠሩትን ፓትርያርክና ሀገር ይወስናል።', countryNames: { et: 'ኢትዮጵያ', er: 'ኤርትራ', both: 'ኢትዮጵያና ኤርትራ' },
    shortcutLabels: ['ቀዳሚ / ቀጣይ ስላይድ', 'ቀጣይ ስላይድ', 'በሙሉ ስክሪን አሳይ', 'የቅዳሴ መረጃ', 'ከሙሉ ስክሪን ውጣ / ዝጋ', 'የቁልፍ አቋራጮች'],
  },
  ti: {
    settings: 'ናይ መርኢት ቅጥዕታት', liturgy: 'ቅዳሴ', liturgySub: 'ካብ ናይ ሎሚ ዕለት ብቐጥታ ተመሪጹ። እንተደሊኹም ቀይሩ።', serviceDate: 'ዕለት ኣገልግሎት', dateSub: 'ናይታ ዕለት ንባባትን ስላይዳትን ንምጽዓን ዕለት ምረጽ።', ethiopian: 'ኢትዮጵያዊ', gregorian: 'ግሪጎርያን', languages: 'ቋንቋታት', langSub: n => `ኣብ ስላይድ ክሳብ ${n} ብሓደ ግዜ ይረኣዩ።`, mehella: 'ኩነታት ምህላ', mehellaSub: 'ዘለዉ ናይ ምህላ ዓይነታት ኣርኢ።', context: 'ሓበሬታ ቅዳሴ', resolved: 'ብቐጥታ ተወሲኑ', uiLang: 'ቋንቋ መተግበሪ', done: 'ተወዲኡ', sections: 'ክፋላት', date: 'ዕለት', feast: 'በዓል', readings: 'ንባባት ግጻዌ', shortcuts: 'ሓጸርቲ መንገድታት ቁልፊ', loadingSlide: 'ቅዳሴ ኣብ ምጽዓን…', errTitle: 'ስላይዳት ክጽዕን ኣይከኣለን', errSub: 'ኣገልጋሊ ኣይመለሰን። ርክብኩም ኣረጋግጹ።', retry: 'መሊስካ ፈትን',
    project: 'ኣርኢ', toggleThumbs: 'ንኣሽቱ ስእልታት ኣርኢ / ሕባእ', prevSlide: 'ዝሓለፈ', nextSlide: 'ዝቕጽል',
    exportTitle: 'መርኢት ኣውርድ', exportTip: 'ኣውርድ', settingsTip: 'ቅጥዕታት (ዕለትን ቋንቋታትን)', themeLight: 'ብሩህ ገጽታ', themeDark: 'ጸልማት ገጽታ', admin: 'ኣመሓዳሪ', more: 'ተወሳኺ', exit: 'ውጻእ',
    noSlidesTitle: 'ነዛ ዕለት ስላይድ የለን', noSlidesSub: 'እዚ ቅዳሴ ነቲ ዝተመርጸ ግጻዌ ንባብ ኣይተመደበሉን። ካልእ ዕለት ፈትኑ።', changeDate: 'ዕለት ቀይር', copyLink: 'መካፈሊ ሊንክ ቅዳሕ', linkCopied: 'ሊንክ ተቐዲሑ',
    pdfSub: n => `ኩሎም ${n} ስላይዳት · ንሕትመት ድሉው`, pptxSub: 'ክእረም ዝኽእል · ኣብ ሓደ ገጽ ሓደ ስላይድ', cancel: 'ሰርዝ', download: 'ኣውርድ', rendering: 'ስላይዳት ይዳለዉ ፋይል ይስራሕ ኣሎ…',
    exportReady: 'ፋይል ድሉው እዩ', exportAgain: 'መሊስካ ኣውርድ', exportFailed: 'ምውራድ ኣይተዓወተን', slide: 'ስላይድ',
    country: 'ሃገር', countrySub: 'ኣብ ጸሎት ዝጥቀሱ ፓትርያርክን ሃገርን ይውስን።', countryNames: { et: 'ኢትዮጵያ', er: 'ኤርትራ', both: 'ኢትዮጵያን ኤርትራን' },
    shortcutLabels: ['ዝሓለፈ / ዝቕጽል ስላይድ', 'ዝቕጽል ስላይድ', 'ብምሉእ ስክሪን ኣርኢ', 'ሓበሬታ ቅዳሴ', 'ካብ ምሉእ ስክሪን ውጻእ / ዕጾ', 'ሓጸርቲ መንገድታት ቁልፊ'],
  },
};

export const UI_LANGS: { key: UiLang; label: string }[] = [
  { key: 'en', label: 'English' }, { key: 'am', label: 'አማርኛ' }, { key: 'ti', label: 'ትግርኛ' },
];

export const ETH_MONTHS_LONG = ['መስከረም · Meskerem', 'ጥቅምት · Tikimt', 'ኅዳር · Hidar', 'ታኅሣሥ · Tahsas', 'ጥር · Tir', 'የካቲት · Yekatit', 'መጋቢት · Megabit', 'ሚያዝያ · Miazia', 'ግንቦት · Ginbot', 'ሰኔ · Sene', 'ሐምሌ · Hamle', 'ነሐሴ · Nehase', 'ጳጉሜን · Pagume'];
export const ETH_MONTHS_SHORT = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'];

/** Per-slot language presentation metadata (amharic name, short chip label). */
export const LANG_BY_SLOT: Record<string, { amh: string; short: string }> = {
  Lang1: { amh: 'ግዕዝ', short: 'ግ' },
  Lang2: { amh: 'አማርኛ', short: 'አ' },
  Lang3: { amh: 'ትግርኛ', short: 'ት' },
  Lang4: { amh: 'እንግሊዝኛ', short: 'En' },
};

/** Keys per shortcut; labels come from Strings.shortcutLabels in the same order. */
export const SHORTCUTS: string[][] = [['←', '→'], ['Space'], ['F'], ['I'], ['Esc'], ['?']];
