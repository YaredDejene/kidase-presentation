import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LangSlot, Country } from '@kidase/shared';
import { isVerseSlide, isStandaloneService, DEFAULT_LANG_COLORS } from '@kidase/shared';
import { fetchPresentations, fetchRender, RenderPayload } from './api/client';
import { WebSlideRenderer } from './components/WebSlideRenderer';
import { Stage } from './components/Stage';
import { ConfigDrawer } from './components/ConfigDrawer';
import { Admin } from './components/Admin';
import { InfoPanel, readingLabel } from './components/InfoPanel';
import { toEC } from 'kenat';
import { ExportDialog } from './components/ExportDialog';
import { HelpOverlay } from './components/HelpOverlay';
import { Landing } from './components/Landing';
import { themeVars, iconBtn, ThemeName } from './theme';
import { T, T_KIDAN, UiLang, LANG_BY_SLOT, ETH_MONTHS_SHORT } from './i18n';
import * as I from './icons';

const pad = (n: number) => String(n).padStart(2, '0');
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Native Fullscreen API helpers (with WebKit fallback) for true edge-to-edge projection. */
type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };
function fsElement(): Element | null {
  const d = document as FsDoc;
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}
/** iPhone Safari has no element fullscreen; the caller then shows the overlay without it. */
function requestFs(el: HTMLElement): boolean {
  const e = el as FsEl;
  const fn = e.requestFullscreen ?? e.webkitRequestFullscreen;
  if (!fn) return false;
  fn.call(e);
  return true;
}
function exitFs() {
  const d = document as FsDoc;
  (d.exitFullscreen ?? d.webkitExitFullscreen)?.call(d);
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Horizontal swipe handlers: a clear sideways move (over 50px) turns the page. */
function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => { const t = e.touches[0]; start.current = { x: t.clientX, y: t.clientY }; },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current; start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x, dy = t.clientY - s.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? onLeft : onRight)();
    },
  };
}

/**
 * The address bar stays clean. A share link carries the view in readable
 * query words (date, slide, country, languages, mehella, presentation), is
 * applied once on load and then removed from the address bar. Preferences
 * live in localStorage; the date and slide of the current tab in
 * sessionStorage, for today only, so a refresh during a service keeps the
 * place while tomorrow starts fresh.
 */
interface Link { presentation?: string; date?: string; slide?: number; country?: Country; languages?: string[]; mehella?: boolean }
function readLink(): Link {
  const q = new URLSearchParams(location.search);
  const out: Link = {};
  if (q.get('presentation')) out.presentation = q.get('presentation')!;
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.get('date') ?? '')) out.date = q.get('date')!;
  if (q.get('slide')) out.slide = Math.max(0, (parseInt(q.get('slide')!, 10) || 1) - 1);
  if (q.get('country') === 'ethiopia') out.country = 'et';
  if (q.get('country') === 'eritrea') out.country = 'er';
  if (q.get('country') === 'ethiopia-eritrea') out.country = 'both';
  if (q.get('languages')) out.languages = q.get('languages')!.split(',').filter(Boolean);
  if (q.get('mehella') === '1') out.mehella = true;
  return out;
}
const LINK = readLink();

/**
 * One viewer, one service per path: /kidase and /kidan each show the presentations
 * of that type. The root is the landing page, except that a root URL with a query
 * string is an old Kidase share link and opens the viewer.
 */
export type Mode = 'Kidase' | 'Kidan';
type Screen = 'landing' | 'viewer' | 'admin';
const MODE_BY_PATH: Record<string, Mode> = { '/kidase': 'Kidase', '/kidan': 'Kidan' };
const PATH = location.pathname.replace(/\/+$/, '') || '/';
const MODE: Mode = MODE_BY_PATH[PATH] ?? 'Kidase';
const BOOT_SCREEN: Screen = PATH === '/admin' ? 'admin' : MODE_BY_PATH[PATH] || (PATH === '/' && location.search) ? 'viewer' : 'landing';
/** What the viewer shows per service. Kidan has no Gitsawe readings, no Mehella variants and no country placeholders. */
const FEATURES = {
  Kidase: { mehella: true, country: true, readings: true },
  Kidan: { mehella: false, country: false, readings: false },
}[MODE];
const BRAND = { Kidase: { amh: 'ቅዳሴ', latin: 'KIDASE' }, Kidan: { amh: 'ኪዳን', latin: 'KIDAN' } }[MODE];
const MODE_PATH = `/${MODE.toLowerCase()}`;
// The address bar stays clean and on the service path, so a reload never lands on the landing page.
if (BOOT_SCREEN === 'viewer' && (location.search || location.pathname !== MODE_PATH)) {
  try { history.replaceState(null, '', MODE_PATH); } catch { /* ignore */ }
}
const langSlug = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-');
const COUNTRY_WORD: Record<Country, string> = { et: 'ethiopia', er: 'eritrea', both: 'ethiopia-eritrea' };

interface Prefs { ui?: UiLang; theme?: ThemeName; country?: Country; mehella?: boolean; languages?: LangSlot[] }
interface Session { day: string; presentation?: string; date: string; slide: number }
function readJson<T>(store: Storage, key: string): T | null {
  try { return JSON.parse(store.getItem(key) ?? 'null'); } catch { return null; }
}
// Each service remembers its own languages and place; Kidan starts from the Kidase theme and interface language.
const PREFS_KEY = `${MODE.toLowerCase()}_prefs`;
const SESSION_KEY = `${MODE.toLowerCase()}_session`;
const PREFS: Prefs = { ...readJson<Prefs>(localStorage, 'kidase_prefs'), ...readJson<Prefs>(localStorage, PREFS_KEY) };
const SESSION: Session | null = (() => { const s = readJson<Session>(sessionStorage, SESSION_KEY); return s?.day === todayIso() ? s : null; })();

const ETHIOPIC = "'Noto Serif Ethiopic Variable',serif";
const MOBILE_QUERY = '(max-width: 768px)';

/** Most languages any template in the payload shows at once; slides with smaller templates show the first ones. */
const languageCapacity = (payload: RenderPayload) =>
  Math.max(0, ...Object.values(payload.templates).map(def => def.languages.length));

export const App: React.FC = () => {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [theme, setTheme] = useState<ThemeName>(PREFS.theme ?? 'dark');
  const [uiLang, setUiLang] = useState<UiLang>(PREFS.ui ?? 'en');
  const [defaultId, setDefaultId] = useState<string>('');
  // The remembered liturgy is only used once the list confirms it still exists (data reloads change ids).
  const [selectedId, setSelectedId] = useState<string>('');
  const wantedId = useRef<string | undefined>(LINK.presentation ?? SESSION?.presentation);
  const [gregDate, setGregDate] = useState<string>(LINK.date ?? SESSION?.date ?? todayIso());
  const [isMehella, setIsMehella] = useState(LINK.mehella ?? PREFS.mehella ?? false);
  const [country, setCountry] = useState<Country>(LINK.country ?? PREFS.country ?? 'et');
  const [activeSlots, setActiveSlots] = useState<LangSlot[]>(PREFS.languages ?? []);
  const pendingSlide = useRef<number>(LINK.slide ?? SESSION?.slide ?? 0);
  // Language names from a share link, resolved against the payload once it arrives.
  const pendingLanguages = useRef<string[] | undefined>(LINK.languages);
  const [render, setRender] = useState<RenderPayload | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [railOpen, setRailOpen] = useState(() => !window.matchMedia(MOBILE_QUERY).matches);
  const [configOpen, setConfigOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [apiFullscreen, setApiFullscreen] = useState(false);
  // Projection without the Fullscreen API (iPhone): the same overlay, inside the browser window.
  const [manualFullscreen, setManualFullscreen] = useState(false);
  const fullscreen = apiFullscreen || manualFullscreen;
  const [screen, setScreen] = useState<Screen>(BOOT_SCREEN);
  const [adminToken, setAdminToken] = useState<string | null>(() => { try { return localStorage.getItem('kidase_admin_token'); } catch { return null; } });
  const updateToken = useCallback((tk: string | null) => {
    setAdminToken(tk);
    try { if (tk) localStorage.setItem('kidase_admin_token', tk); else localStorage.removeItem('kidase_admin_token'); } catch { /* ignore */ }
  }, []);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const t = useMemo(() => (MODE === 'Kidan' ? { ...T[uiLang], ...T_KIDAN[uiLang] } : T[uiLang]), [uiLang]);
  const isDark = theme === 'dark';
  useEffect(() => { document.documentElement.lang = uiLang; }, [uiLang]);

  const [listEmpty, setListEmpty] = useState(false);
  useEffect(() => {
    if (BOOT_SCREEN === 'landing') return;
    fetchPresentations().then(all => {
      const list = all.filter(p => isStandaloneService(p.type) === (MODE === 'Kidan'));
      if (list.length) { setDefaultId(list[0].id); setSelectedId(prev => prev || list.find(p => p.id === wantedId.current)?.id || list[0].id); }
      else setListEmpty(true);
    }).catch(e => setError(String(e.message ?? e)));
  }, []);
  // The landing page keeps the HTML title for search engines; the viewer names its service.
  useEffect(() => { if (screen !== 'landing') document.title = `${MODE} · ${BRAND.amh}`; }, [screen]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true); setError(null);
    fetchRender(selectedId, gregDate, FEATURES.mehella && isMehella, country)
      .then(payload => {
        if (cancelled) return;
        setRender(payload);
        // First load honours the shared link's slide; later reloads (date, country, mehella) keep the place.
        const wanted = pendingSlide.current;
        pendingSlide.current = 0;
        setSlideIndex(i => Math.min(wanted || i, Math.max(payload.slides.length - 1, 0)));
        // Start with the presentation's own selection; viewers can switch to any other language.
        const avail = payload.languages.map(l => l.slot);
        const defaults = payload.languages.filter(l => l.enabled !== false).map(l => l.slot); // older payloads have no flag
        const cap = languageCapacity(payload);
        const linked = pendingLanguages.current?.map(n => payload.languages.find(l => langSlug(l.name) === n)?.slot).filter((s): s is LangSlot => !!s);
        pendingLanguages.current = undefined;
        setActiveSlots(prev => { const kept = (linked?.length ? linked : prev).filter(s => avail.includes(s)).slice(0, cap); return kept.length ? kept : defaults.slice(0, cap); });
      })
      .catch(e => !cancelled && setError(String(e.message ?? e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [selectedId, gregDate, isMehella, country]);

  const slideCount = render?.slides.length ?? 0;
  const next = useCallback(() => setSlideIndex(i => Math.min(i + 1, Math.max(slideCount - 1, 0))), [slideCount]);
  const prev = useCallback(() => setSlideIndex(i => Math.max(i - 1, 0)), []);
  const swipe = useSwipe(next, prev);

  const bumpControls = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setControlsVisible(true);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2800);
  }, []);
  const exitProjection = useCallback(() => {
    if (fsElement()) exitFs();
    setManualFullscreen(false);
  }, []);
  // "Project" enters real browser fullscreen (hides the address bar / OS chrome) where the browser allows it.
  const toggleFullscreen = useCallback(() => {
    if (fullscreen) { exitProjection(); return; }
    if (!requestFs(document.documentElement)) setManualFullscreen(true);
    // Phones: ask for landscape; only Android honours it, elsewhere it rejects quietly.
    try { (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation?.lock?.('landscape')?.catch(() => { /* ignore */ }); } catch { /* ignore */ }
  }, [fullscreen, exitProjection]);

  // Keep the projection overlay in sync with the actual fullscreen state
  // (covers Esc, F11, and the OS exiting fullscreen).
  useEffect(() => {
    const onChange = () => { setApiFullscreen(!!fsElement()); setControlsVisible(true); bumpControls(); };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [bumpControls]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); setHelpOpen(v => !v); return; }
      if (helpOpen) { if (e.key === 'Escape') setHelpOpen(false); return; }
      if (configOpen) { if (e.key === 'Escape') setConfigOpen(false); return; }
      if (exportOpen) { if (e.key === 'Escape') setExportOpen(false); return; }
      if (infoOpen && e.key === 'Escape') { setInfoOpen(false); return; }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); }
      else if (e.key === 'Escape' && fullscreen) exitProjection();
      else if ((e.key === 'i' || e.key === 'I') && FEATURES.readings) setInfoOpen(v => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, configOpen, exportOpen, infoOpen, fullscreen, next, prev, toggleFullscreen, exitProjection]);

  const capacity = render ? languageCapacity(render) : 0;
  const toggleLang = (slot: LangSlot) => setActiveSlots(prev =>
    prev.includes(slot) ? prev.filter(s => s !== slot) : prev.length < capacity ? [...prev, slot] : prev);
  // Stable identity so the memoized slide renderers skip work when the selection is unchanged.
  const activeLanguages = useMemo(() => (render?.languages ?? []).filter(l => activeSlots.includes(l.slot)), [render, activeSlots]);

  useEffect(() => {
    const prefs: Prefs = { ui: uiLang, theme, country, mehella: isMehella, languages: activeSlots };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [uiLang, theme, country, isMehella, activeSlots]);
  useEffect(() => {
    const session: Session = { day: todayIso(), presentation: selectedId, date: gregDate, slide: slideIndex };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
  }, [selectedId, gregDate, slideIndex]);

  // Built on demand for "Copy share link"; the address bar itself stays clean.
  const shareUrl = useMemo(() => {
    const q = new URLSearchParams();
    q.set('date', gregDate);
    q.set('slide', String(slideIndex + 1));
    if (FEATURES.country) q.set('country', COUNTRY_WORD[country]);
    if (activeLanguages.length) q.set('languages', activeLanguages.map(l => langSlug(l.name)).join(','));
    if (FEATURES.mehella && isMehella) q.set('mehella', '1');
    if (selectedId && selectedId !== defaultId) q.set('presentation', selectedId);
    return `${location.origin}${location.pathname}?${q.toString().replace(/%2C/g, ',')}`;
  }, [gregDate, slideIndex, country, activeLanguages, isMehella, selectedId, defaultId]);

  // Keep the active thumbnail in view in the rail or the strip.
  const activeThumb = useRef<HTMLDivElement>(null);
  useEffect(() => {
    activeThumb.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [slideIndex, railOpen, isMobile]);

  const current = render?.slides[slideIndex];
  const definition = current ? render?.templates[current.templateId] : undefined;
  const pageLabel = slideCount ? `${slideIndex + 1} / ${slideCount}` : '';

  const rootStyle: React.CSSProperties = { background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', ...themeVars(theme) };

  const slideStage = (slide: NonNullable<typeof current>, def: NonNullable<typeof definition>) => (
    <Stage>
      <WebSlideRenderer definition={def} languages={activeLanguages} block={slide.block} title={slide.title} footer={slide.footer} pageLabel={pageLabel} />
    </Stage>
  );

  const thumbnail = (s: RenderPayload['slides'][number], i: number) => {
    const def = render!.templates[s.templateId];
    const activeRow = i === slideIndex;
    const isVerse = isVerseSlide(s.id); // dynamically loaded verse, marked like desktop
    return (
      <div key={s.id} ref={activeRow ? activeThumb : undefined} onClick={() => setSlideIndex(i)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 5, borderRadius: 8, cursor: 'pointer', flexShrink: 0, border: `1px solid ${activeRow ? 'var(--accent)' : 'transparent'}`, boxShadow: isVerse ? 'inset 3px 0 0 #4a6a4a' : undefined, background: activeRow ? 'var(--elevated)' : 'transparent' }}>
        <span style={{ fontSize: 11, color: isVerse ? '#9a8acd' : activeRow ? 'var(--accent)' : 'var(--muted)', background: isVerse ? '#3a2a6a' : undefined, borderRadius: 4, padding: '4px 0', width: 20, flexShrink: 0, fontWeight: 600, textAlign: 'center' }}>{pad(i + 1)}</span>
        <div style={{ width: 150, height: 84, flexShrink: 0, borderRadius: 5, overflow: 'hidden', background: '#000' }}>
          {def && <LazyMount><Stage><WebSlideRenderer definition={def} languages={activeLanguages} block={s.block} title={s.title} footer={s.footer} /></Stage></LazyMount>}
        </div>
      </div>
    );
  };

  const ec = useMemo(() => {
    const g = render?.context.gregorian;
    if (!g) return null;
    const [y, m, d] = g.split('-').map(Number);
    return toEC(y, m, d);
  }, [render?.context.gregorian]);
  /** Liturgy name (desktop) and date, shown as plain text. */
  const contextText = render && ec && (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0, lineHeight: 1.3, flexShrink: isMobile ? 0 : 1 }}>
      {!isMobile && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{render.presentation.name}{render.presentation.secondaryName && ` + ${render.presentation.secondaryName}`}</span>}
      <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}><span style={{ fontFamily: ETHIOPIC }}>{ETH_MONTHS_SHORT[ec.month - 1]} {ec.day}, {ec.year}</span><span style={{ color: 'var(--muted)' }}> · {render.context.gregorian}</span></span>
    </div>
  );

  const secondaryStart = render?.slides.findIndex(sl => sl.isSecondary) ?? -1;
  const pctDone = slideCount > 1 ? (slideIndex / (slideCount - 1)) * 100 : 0;
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSlideIndex(Math.round(((e.clientX - r.left) / r.width) * (slideCount - 1)));
  };
  /** Progress through the liturgy along the bar's top edge; reading marks jump to that reading. */
  const timeline = slideCount > 1 && (
    <div onClick={seek} style={{ position: 'absolute', left: 0, right: 0, top: -5, height: 12, cursor: 'pointer', zIndex: 1 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 5, height: 2, background: 'var(--border2)' }} />
      <div style={{ position: 'absolute', left: 0, top: 5, height: 2, width: `${pctDone}%`, background: 'var(--accent)', transition: 'width .15s' }} />
      {FEATURES.readings && render?.readings.filter(r => r.slideIndex !== undefined).map(r => (
        <button key={r.key} title={readingLabel(r, uiLang)} onClick={e => { e.stopPropagation(); setSlideIndex(r.slideIndex!); }} style={{ position: 'absolute', left: `${(r.slideIndex! / (slideCount - 1)) * 100}%`, top: 1, width: 10, height: 10, marginLeft: -5, padding: 0, border: '2px solid var(--surface)', borderRadius: '50%', background: r.slideIndex! <= slideIndex ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer' }} />
      ))}
      {secondaryStart > 0 && (
        <button title={render!.presentation.secondaryName} onClick={e => { e.stopPropagation(); setSlideIndex(secondaryStart); }} style={{ position: 'absolute', left: `${(secondaryStart / (slideCount - 1)) * 100}%`, top: 0, width: 12, height: 12, marginLeft: -6, padding: 0, border: '2px solid var(--surface)', borderRadius: 2, transform: 'rotate(45deg)', background: 'var(--accent)', cursor: 'pointer' }} />
      )}
    </div>
  );

  const liturgyInfo = render && (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: 1, minWidth: 0, maxWidth: isMobile ? '100%' : 360, padding: isMobile ? 0 : '0 4px' }}>
      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{render.presentation.name}{render.presentation.secondaryName && ` + ${render.presentation.secondaryName}`}</span>
    </div>
  );

  const projectBtn = (
    <button className="accent-btn" onClick={toggleFullscreen} title={`${t.project} (F)`} style={{ height: isMobile ? 40 : 36, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 8, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
      <I.Project /> {t.project}
    </button>
  );
  type MenuItem = { label: string; icon: React.ReactNode; run: () => void };
  const themeItem: MenuItem = { label: isDark ? t.themeLight : t.themeDark, icon: isDark ? <I.Sun /> : <I.Moon />, run: () => setTheme(v => v === 'dark' ? 'light' : 'dark') };
  const adminItem: MenuItem = { label: t.admin, icon: <I.Users />, run: () => setScreen('admin') };
  const desktopMoreItems: MenuItem[] = [
    { label: `${t.shortcuts} (?)`, icon: <I.Help />, run: () => setHelpOpen(true) },
    themeItem,
    adminItem,
  ];
  const moreMenu = (items: MenuItem[], pos: React.CSSProperties) => moreOpen && (
    <>
      <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
      <div style={{ position: 'absolute', ...pos, zIndex: 31, minWidth: 220, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 40px rgb(0 0 0 / 0.4)', padding: 6, animation: 'fadeup .15s ease' }}>
        {items.map(item => (
          <button key={item.label} className="row-hover" onClick={() => { setMoreOpen(false); item.run(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 44, padding: '0 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 14, cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ color: 'var(--text2)', display: 'flex' }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </div>
    </>
  );
  const moreItems: MenuItem[] = [
    ...(FEATURES.readings ? [{ label: t.context, icon: <I.Info />, run: () => setInfoOpen(true) }] : []),
    { label: t.exportTip, icon: <I.Download />, run: () => setExportOpen(true) },
    themeItem,
    adminItem,
  ];

  if (screen === 'landing') {
    return (
      <div className="app-root" style={rootStyle}>
        <Landing t={t} isDark={isDark} uiLang={uiLang} setUiLang={setUiLang} toggleTheme={() => setTheme(v => v === 'dark' ? 'light' : 'dark')} />
      </div>
    );
  }

  return (
    <div className="app-root" style={rootStyle}>
      <div className="app-root" style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', position: 'relative' }}>

        {/* floating nav pill (desktop) */}
        {!isMobile && (
          <div style={{ position: 'absolute', zIndex: 20, display: 'flex', alignItems: 'center', gap: 2, background: 'var(--surface)', padding: 4, ...(railOpen
            // Docked to the bottom of the thumbnail column, so no thumbnails show beneath it.
            ? { bottom: 0, left: 0, width: 214, boxSizing: 'border-box', justifyContent: 'center', borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)' }
            : { bottom: 14, left: 14, borderRadius: 11, boxShadow: '0 6px 22px rgb(0 0 0 / 0.32)' }) }}>
            <button className="ic" onClick={() => setRailOpen(v => !v)} title={t.toggleThumbs} style={iconBtn}><I.Layout /></button>
            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
            <button className="ic" onClick={prev} title={`${t.prevSlide} (←)`} style={iconBtn}><I.ChevronLeft /></button>
            <span style={{ fontSize: 13, color: 'var(--text)', minWidth: 52, textAlign: 'center', fontWeight: 500 }}>{slideCount ? slideIndex + 1 : 0} / {slideCount}</span>
            <button className="ic" onClick={next} title={`${t.nextSlide} (→)`} style={iconBtn}><I.ChevronRight /></button>
          </div>
        )}

        {/* toolbar */}
        <div style={{ minHeight: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <a href="/" title={t.backToStart} style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, textDecoration: 'none' }}>
            <img src={isDark ? '/mark-dark.svg' : '/mark-light.svg'} alt="" width={34} height={34} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: ETHIOPIC, fontWeight: 700, fontSize: 19, lineHeight: 1, color: 'var(--text)' }}>{BRAND.amh}</span>
              {!isMobile && <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.32em', color: 'var(--text)', opacity: 0.8, whiteSpace: 'nowrap' }}>{BRAND.latin}</span>}
            </div>
          </a>
          <div style={{ flex: 1 }} />
          {contextText}
          {!isMobile && (
            <>
              <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 2px' }} />
              {FEATURES.readings && <button className="ic" onClick={() => setInfoOpen(true)} title={`${t.context} (I)`} style={iconBtn}><I.Info /></button>}
              <button className="ic" onClick={() => setExportOpen(true)} title={t.exportTip} style={iconBtn}><I.Download /></button>
              <button className="ic" onClick={() => setConfigOpen(true)} title={t.settingsTip} style={iconBtn}><I.Gear /></button>
              <div style={{ position: 'relative' }}>
                <button className="ic" onClick={() => setMoreOpen(v => !v)} title={t.more} style={iconBtn}><I.More /></button>
                {moreMenu(desktopMoreItems, { top: '100%', right: 0, marginTop: 6 })}
              </div>
              {projectBtn}
            </>
          )}
        </div>

        {/* body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: 0 }}>
          {railOpen && !isMobile && (
            <div style={{ width: 214, borderRight: '1px solid var(--border)', background: 'var(--surface)', overflowX: 'hidden', overflowY: 'auto', padding: '10px 10px 64px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
              {render?.slides.map(thumbnail)}
            </div>
          )}

          <div {...swipe} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 12 : 36, minWidth: 0, minHeight: 0, containerType: 'size' }}>
            {loading && (
              <div style={{ width: 'min(100cqw, calc(100cqh * 16 / 9))', aspectRatio: '16/9', borderRadius: 10, background: '#0c0c0c', outline: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 13 }}>{t.loadingSlide}</div>
            )}
            {!loading && error && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 380 }}>
                <div style={{ width: 54, height: 54, borderRadius: 14, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><I.Alert color="#ef4444" /></div>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 6px', color: 'var(--text)' }}>{t.errTitle}</h3>
                <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 18px' }}>{t.errSub}</p>
              </div>
            )}
            {!loading && !error && current && definition && (
              <div style={{ width: 'min(100cqw, calc((100cqh - 26px) * 16 / 9))' }}>
                <div style={{ aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 24px 70px rgb(0 0 0 / 0.45), inset 0 1px 0 rgba(255,255,255,0.05)', outline: '1px solid rgba(255,255,255,0.06)' }}>
                  {slideStage(current, definition)}
                </div>
                {/* liturgy timeline, right under the slide */}
                <div style={{ position: 'relative', top: 16, height: 10 }}>{timeline}</div>
              </div>
            )}
            {!loading && !error && render && render.slides.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 380 }}>
                <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><I.Calendar color="var(--muted)" /></div>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 6px', color: 'var(--text)' }}>{t.noSlidesTitle}</h3>
                <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 18px' }}>{t.noSlidesSub}</p>
                <button className="outline-btn" onClick={() => setConfigOpen(true)} style={{ height: 38, padding: '0 18px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{t.changeDate}</button>
              </div>
            )}
            {!loading && !error && listEmpty && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 380 }}>
                <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><I.Alert color="var(--muted)" /></div>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 6px', color: 'var(--text)' }}>{t.noPresTitle}</h3>
                <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 18px' }}>{t.noPresSub}</p>
                <a href="/" className="outline-btn" style={{ height: 38, padding: '0 18px', borderRadius: 8, border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>{t.backToStart}</a>
              </div>
            )}
          </div>

          {railOpen && isMobile && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: 6, padding: '6px 10px', overflowX: 'auto', overflowY: 'hidden', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              {render?.slides.map(thumbnail)}
            </div>
          )}
        </div>

        {isMobile && liturgyInfo && (
          <div style={{ padding: '6px 12px 0', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>{liturgyInfo}</div>
        )}

        {/* bottom action bar (mobile) */}
        {isMobile && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', paddingBottom: 'calc(6px + env(safe-area-inset-bottom))', borderTop: liturgyInfo ? 'none' : '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
            <button className="ic" onClick={() => setRailOpen(v => !v)} title={t.toggleThumbs} style={mobileBtn}><I.Layout /></button>
            <button className="ic" onClick={prev} title={t.prevSlide} style={mobileBtn}><I.ChevronLeft /></button>
            <span style={{ fontSize: 13, color: 'var(--text)', minWidth: 52, textAlign: 'center', fontWeight: 500 }}>{slideCount ? slideIndex + 1 : 0} / {slideCount}</span>
            <button className="ic" onClick={next} title={t.nextSlide} style={mobileBtn}><I.ChevronRight /></button>
            <div style={{ flex: 1 }} />
            <button className="ic" onClick={() => setConfigOpen(true)} title={t.settingsTip} style={mobileBtn}><I.Gear /></button>
            {projectBtn}
            <button className="ic" onClick={() => setMoreOpen(v => !v)} title={t.more} style={mobileBtn}><I.More /></button>
            {moreMenu(moreItems, { bottom: '100%', right: 8, marginBottom: 6 })}
          </div>
        )}
      </div>

      {configOpen && (
        <ConfigDrawer
          isDark={isDark} t={t} onClose={() => setConfigOpen(false)}
          gregDate={gregDate} onGreg={setGregDate}
          languages={render?.languages ?? []} activeSlots={activeSlots} toggleLang={toggleLang} capacity={capacity}
          isMehella={isMehella} toggleMehella={() => setIsMehella(v => !v)}
          uiLang={uiLang} setUiLang={setUiLang}
          country={country} setCountry={setCountry}
          shareUrl={shareUrl}
          sections={[]}
          features={FEATURES}
        />
      )}
      {infoOpen && FEATURES.readings && <InfoPanel t={t} uiLang={uiLang} onClose={() => setInfoOpen(false)} render={render} onJump={i => { setSlideIndex(i); setInfoOpen(false); }} />}
      {exportOpen && render && <ExportDialog t={t} onClose={() => setExportOpen(false)} payload={render} languages={activeLanguages} />}
      {helpOpen && <HelpOverlay t={t} onClose={() => setHelpOpen(false)} showInfoKey={FEATURES.readings} />}

      {/* fullscreen projection */}
      {fullscreen && current && definition && (
        <div {...swipe} onMouseMove={bumpControls} onPointerDown={bumpControls} style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', containerType: 'size', cursor: controlsVisible ? 'default' : 'none' }}>
          <div style={{ width: 'min(100cqw, calc(100cqh * 16 / 9))', aspectRatio: '16/9' }}>{slideStage(current, definition)}</div>
          <div style={{ position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom))', left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: controlsVisible ? 'auto' : 'none', opacity: controlsVisible ? 1 : 0, transform: controlsVisible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity .25s ease, transform .25s ease' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, maxWidth: 'calc(100vw - 24px)', background: 'rgba(20,20,20,0.92)', border: '1px solid #333', borderRadius: 14, padding: '8px 10px', backdropFilter: 'blur(12px)', boxShadow: '0 12px 40px rgb(0 0 0 / 0.5)' }}>
              <button onClick={prev} title={`${t.prevSlide} (←)`} style={fsBtn}><I.ChevronLeft size={20} /></button>
              <span style={{ fontSize: 14, color: '#fff', minWidth: 64, textAlign: 'center', fontWeight: 500 }}>{slideIndex + 1} / {slideCount}</span>
              <button onClick={next} title={`${t.nextSlide} (→)`} style={fsBtn}><I.ChevronRight size={20} /></button>
              <div style={{ width: 1, height: 22, background: '#333', margin: '0 4px' }} />
              {(render?.languages ?? []).map(l => {
                const on = activeSlots.includes(l.slot);
                const meta = LANG_BY_SLOT[l.slot] || { short: l.name.slice(0, 2) };
                const blocked = !on && activeSlots.length >= capacity;
                return (
                  <button key={l.slot} onClick={() => toggleLang(l.slot)} disabled={blocked} title={blocked ? t.langSub(capacity) : l.name} style={{ opacity: blocked ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 9px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${on ? '#444' : '#2a2a2a'}`, background: on ? '#262626' : 'transparent', color: on ? '#fff' : '#666' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color ?? DEFAULT_LANG_COLORS[l.slot], opacity: on ? 1 : 0.4, flexShrink: 0 }} />{meta.short}
                  </button>
                );
              })}
              <div style={{ width: 1, height: 22, background: '#333', margin: '0 4px' }} />
              <button onClick={exitProjection} title={`${t.exit} (Esc)`} style={fsBtn}><I.Minimize size={20} /></button>
            </div>
          </div>
        </div>
      )}

      {screen === 'admin' && (
        <Admin token={adminToken} setToken={updateToken} onBack={() => setScreen('viewer')} theme={theme} toggleTheme={() => setTheme(v => v === 'dark' ? 'light' : 'dark')} isDark={isDark} />
      )}
    </div>
  );
};

/** Mounts its children the first time they scroll near the viewport, so a long thumbnail rail only lays out what is visible. */
const LazyMount: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(true); }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return <div ref={ref} style={{ width: '100%', height: '100%' }}>{shown && children}</div>;
};

const mobileBtn: React.CSSProperties = { ...iconBtn, width: 44, height: 44 };
const fsBtn: React.CSSProperties = { width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer' };
