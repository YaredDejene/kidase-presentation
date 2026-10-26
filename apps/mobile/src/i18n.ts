export type UiLang = 'en' | 'am' | 'ti';

export const UI_LANGS: { key: UiLang; label: string }[] = [
  { key: 'en', label: 'English' }, { key: 'am', label: 'አማርኛ' }, { key: 'ti', label: 'ትግርኛ' },
];

export interface Strings {
  today: string; calendar: string; settings: string;
  readAll: string; verses: (n: number) => string; textMissing: string; showingSaved: string;
  notSavedTitle: string; notSavedSub: string; tryAgain: string; loading: string;
  next: string; endOfReadings: string; close: string; textOptions: string; textSize: string;
  readingLanguage: string; readingLanguageSub: string; parallelLanguage: string; parallelLanguageSub: string;
  off: string; done: string; cancel: string; chooseDate: string; openCalendar: string;
  copy: string; share: string;
  reading: string; display: string; reminder: string; interfaceLanguage: string; interfaceLanguageSub: string;
  calendarSystem: string; ethiopian: string; gregorian: string; geezNumerals: string; appearance: string;
  system: string; light: string; dark: string; churchMode: string; churchModeSub: string;
  dailyReminder: string; about: string; back: string;
  chooseReadingLanguage: string; alsoSecond: string; alsoSecondSub: string; continueLabel: string; changeLater: string;
  upcoming: string; feast: string; fast: string; sunday: string; inDays: (n: number) => string; todayLabel: string; tomorrow: string;
  pagumeNote: (days: number) => string; followsSystemText: string; preview: string;
  todaysGospel: string; aboutBody: string; aboutLink: string;
  prevDay: string; nextDay: string;
}

export const T: Record<UiLang, Strings> = {
  en: {
    today: 'Today', calendar: 'Calendar', settings: 'Settings',
    readAll: 'Read all', verses: n => `${n} verse${n === 1 ? '' : 's'}`, textMissing: 'Text for this passage is not yet available', showingSaved: 'Showing saved readings',
    notSavedTitle: "Readings aren't saved yet", notSavedSub: "Connect to the internet once and the whole year's readings are saved to your phone.", tryAgain: 'Try again', loading: 'Loading',
    next: 'Next', endOfReadings: "End of today's readings", close: 'Close', textOptions: 'Text options', textSize: 'Text size',
    readingLanguage: 'Reading language', readingLanguageSub: 'Readings, labels and the calendar', parallelLanguage: 'Parallel language', parallelLanguageSub: 'Shown beneath each verse',
    off: 'Off', done: 'Done', cancel: 'Cancel', chooseDate: 'Choose date', openCalendar: 'Open calendar',
    copy: 'Copy', share: 'Share',
    reading: 'Reading', display: 'Display', reminder: 'Reminder', interfaceLanguage: 'Interface language', interfaceLanguageSub: 'Menus, tabs and buttons',
    calendarSystem: 'Calendar', ethiopian: 'Ethiopian', gregorian: 'Gregorian', geezNumerals: "Ge'ez numerals", appearance: 'Appearance',
    system: 'System', light: 'Light', dark: 'Dark', churchMode: 'Church mode', churchModeSub: 'Dark, larger text, screen stays awake, no motion',
    dailyReminder: 'Daily reminder', about: 'About', back: 'Back',
    chooseReadingLanguage: 'Choose your reading language', alsoSecond: 'Also show a second language?', alsoSecondSub: 'It appears beneath each verse, so a family can read together.', continueLabel: 'Continue', changeLater: 'You can change this any time in Settings.',
    upcoming: 'Upcoming feasts and fasts', feast: 'Feast', fast: 'Fast day', sunday: 'Sunday', inDays: n => `in ${n} days`, todayLabel: 'today', tomorrow: 'tomorrow',
    pagumeNote: d => `Pagume is the 13th month: ${d} days this year, closing the Ethiopian year before Meskerem.`, followsSystemText: "Also follows your phone's text size setting.", preview: 'Preview',
    todaysGospel: "Today's Gospel", aboutBody: 'Daily readings from the Gitsawe, the lectionary of the Ethiopian and Eritrean Orthodox Tewahedo Church. Readings and verse text come from the Kidase presentation system.', aboutLink: 'kidase.org',
    prevDay: 'Previous day', nextDay: 'Next day',
  },
  am: {
    today: 'ዛሬ', calendar: 'ዓውደ ዓመት', settings: 'ቅንብሮች',
    readAll: 'ሁሉንም አንብብ', verses: n => `${n} ቁጥሮች`, textMissing: 'የዚህ ክፍል ጽሑፍ ገና አልተገኘም', showingSaved: 'የተቀመጡ ምንባባት እየታዩ ነው',
    notSavedTitle: 'ምንባባት ገና አልተቀመጡም', notSavedSub: 'አንድ ጊዜ ከበይነመረብ ጋር ይገናኙ፤ የዓመቱ ምንባባት በሙሉ በስልክዎ ይቀመጣሉ።', tryAgain: 'እንደገና ሞክር', loading: 'በመጫን ላይ',
    next: 'ቀጣይ', endOfReadings: 'የዛሬ ምንባባት ተጠናቀዋል', close: 'ዝጋ', textOptions: 'የጽሑፍ አማራጮች', textSize: 'የፊደል መጠን',
    readingLanguage: 'የንባብ ቋንቋ', readingLanguageSub: 'ለምንባቦች፣ ለመለያዎችና ለዓውደ ዓመቱ', parallelLanguage: 'ሁለተኛ ቋንቋ', parallelLanguageSub: 'ከእያንዳንዱ ቁጥር ሥር ይታያል',
    off: 'ጠፍቷል', done: 'ተከናውኗል', cancel: 'ሰርዝ', chooseDate: 'ቀን ይምረጡ', openCalendar: 'ዓውደ ዓመት ክፈት',
    copy: 'ቅዳ', share: 'አጋራ',
    reading: 'ንባብ', display: 'ማሳያ', reminder: 'ማስታወሻ', interfaceLanguage: 'የመተግበሪያው ቋንቋ', interfaceLanguageSub: 'ምናሌዎች፣ ትሮችና ቁልፎች',
    calendarSystem: 'የቀን አቆጣጠር', ethiopian: 'ኢትዮጵያዊ', gregorian: 'ግሪጎሪያን', geezNumerals: 'የግዕዝ ቁጥሮች', appearance: 'ገጽታ',
    system: 'እንደ ስልኩ', light: 'ብሩህ', dark: 'ጨለማ', churchMode: 'የቤተ ክርስቲያን ሁነታ', churchModeSub: 'ጨለማ፣ ትልቅ ፊደል፣ ማያው እይጠፋም፣ እንቅስቃሴ የለም',
    dailyReminder: 'ዕለታዊ ማስታወሻ', about: 'ስለ መተግበሪያው', back: 'ተመለስ',
    chooseReadingLanguage: 'የንባብ ቋንቋዎን ይምረጡ', alsoSecond: 'ሁለተኛ ቋንቋም ይታይ?', alsoSecondSub: 'ከእያንዳንዱ ቁጥር ሥር ስለሚታይ ቤተሰብ አብሮ ማንበብ ይችላል።', continueLabel: 'ቀጥል', changeLater: 'ይህን በቅንብሮች ውስጥ በማንኛውም ጊዜ መቀየር ይችላሉ።',
    upcoming: 'የሚመጡ በዓላትና አጽዋማት', feast: 'በዓል', fast: 'የጾም ቀን', sunday: 'ሰንበት', inDays: n => `በ${n} ቀናት ውስጥ`, todayLabel: 'ዛሬ', tomorrow: 'ነገ',
    pagumeNote: d => `ጳጉሜን 13ኛው ወር ነው፤ በዚህ ዓመት ${d} ቀናት አሉት፣ ከመስከረም በፊት ዓመቱን ይዘጋል።`, followsSystemText: 'የስልክዎን የፊደል መጠን ቅንብርም ይከተላል።', preview: 'ቅድመ እይታ',
    todaysGospel: 'የዛሬ ወንጌል', aboutBody: 'ከግፃዌ፣ ከኢትዮጵያና ከኤርትራ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን የንባብ መጽሐፍ፣ የዕለት ምንባባት። ምንባባቱና ጥቅሶቹ ከቅዳሴ ማቅረቢያ ሥርዓት ይመጣሉ።', aboutLink: 'kidase.org',
    prevDay: 'ቀዳሚ ቀን', nextDay: 'ቀጣይ ቀን',
  },
  ti: {
    today: 'ሎሚ', calendar: 'ዓውደ ዓመት', settings: 'ቅጥዕታት',
    readAll: 'ኩሉ ኣንብብ', verses: n => `${n} ቁጽርታት`, textMissing: 'ጽሑፍ እዚ ክፋል ገና ኣይተረኽበን', showingSaved: 'ዝተዓቀቡ ንባባት ይርኣዩ ኣለዉ',
    notSavedTitle: 'ንባባት ገና ኣይተዓቀቡን', notSavedSub: 'ሓንሳብ ምስ ኢንተርነት ተራኸቡ፤ ንባባት ናይ ምሉእ ዓመት ኣብ ስልክኹም ይዕቀቡ።', tryAgain: 'መሊስካ ፈትን', loading: 'ኣብ ምጽዓን',
    next: 'ዝቕጽል', endOfReadings: 'ንባባት ናይ ሎሚ ተወዲኦም', close: 'ዕጾ', textOptions: 'ኣማራጺታት ጽሑፍ', textSize: 'ዓቐን ፊደል',
    readingLanguage: 'ቋንቋ ንባብ', readingLanguageSub: 'ንባባት፣ መለለይታትን ዓውደ ዓመትን', parallelLanguage: 'ካልኣይ ቋንቋ', parallelLanguageSub: 'ኣብ ትሕቲ ነፍሲ ወከፍ ጥቕሲ ይርአ',
    off: 'ጠፊኡ', done: 'ተወዲኡ', cancel: 'ሰርዝ', chooseDate: 'ዕለት ምረጽ', openCalendar: 'ዓውደ ዓመት ክፈት',
    copy: 'ቅዳሕ', share: 'ኣካፍል',
    reading: 'ንባብ', display: 'መርኢት', reminder: 'መዘኻኸሪ', interfaceLanguage: 'ቋንቋ መተግበሪ', interfaceLanguageSub: 'ዝርዝራት፣ ትሮችን መላጉምን',
    calendarSystem: 'ኣቆጻጽራ', ethiopian: 'ኢትዮጵያዊ', gregorian: 'ግሪጎርያን', geezNumerals: 'ቁጽርታት ግእዝ', appearance: 'ገጽታ',
    system: 'ከም ስልኪ', light: 'ብሩህ', dark: 'ጸልማት', churchMode: 'ኩነታት ቤተ ክርስትያን', churchModeSub: 'ጸልማት፣ ዓቢ ፊደል፣ ስክሪን ኣይጠፍእን፣ ምንቅስቓስ የለን',
    dailyReminder: 'ዕለታዊ መዘኻኸሪ', about: 'ብዛዕባ', back: 'ተመለስ',
    chooseReadingLanguage: 'ቋንቋ ንባብካ ምረጽ', alsoSecond: 'ካልኣይ ቋንቋ እውን ይርአ?', alsoSecondSub: 'ኣብ ትሕቲ ነፍሲ ወከፍ ጥቕሲ ይርአ።', continueLabel: 'ቀጽል', changeLater: 'ድሕርኡ ኣብ ቅጥዕታት ክትቅይሮ ትኽእል ኢኻ።',
    upcoming: 'ዝመጹ በዓላትን ጾማትን', feast: 'በዓል', fast: 'መዓልቲ ጾም', sunday: 'ሰንበት', inDays: n => `ድሕሪ ${n} መዓልታት`, todayLabel: 'ሎሚ', tomorrow: 'ጽባሕ',
    pagumeNote: d => `ጳጉሜ 13ይ ወርሒ እያ፤ ኣብዚ ዓመት ${d} መዓልታት ኣለዋ፣ ቅድሚ መስከረም ንዓመቱ ትዓጹ።`, followsSystemText: 'ናይ ስልክኹም ዓቐን ፊደል እውን ይስዕብ።', preview: 'ቅድመ ርእይቶ',
    todaysGospel: 'ወንጌል ናይ ሎሚ', aboutBody: 'ዕለታዊ ንባባት ካብ ግጻዌ፣ መጽሓፍ ንባብ ናይ ኢትዮጵያን ኤርትራን ኦርቶዶክስ ተዋሕዶ ቤተ ክርስትያን። ንባባትን ጥቕስታትን ካብ ስርዓት መርኢት ቅዳሴ ይመጹ።', aboutLink: 'kidase.org',
    prevDay: 'ዝሓለፈ መዓልቲ', nextDay: 'ዝቕጽል መዓልቲ',
  },
};

/** Reading-language names in their own script; the server list is preferred when it has loaded. */
export const LANG_NAMES: Record<string, string> = {
  am: 'አማርኛ', ti: 'ትግርኛ', en: 'English', om: 'Afaan Oromoo', rw: 'Ikinyarwanda', sv: 'Svenska', gz: 'ግዕዝ',
};

/** Languages written in Ethiopic script, which take the Ethiopic serif and extra leading. */
export const ETHIOPIC_LANGS = new Set(['am', 'ti', 'gz']);
