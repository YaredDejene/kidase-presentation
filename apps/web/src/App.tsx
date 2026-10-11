import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LangSlot, Country } from '@kidase/shared';
import { isVerseSlide, DEFAULT_LANG_COLORS } from '@kidase/shared';
import { fetchPresentations, fetchRender, RenderPayload } from './api/client';
import { WebSlideRenderer } from './components/WebSlideRenderer';
import { Stage } from './components/Stage';
import { ConfigDrawer } from './components/ConfigDrawer';
import { Admin } from './components/Admin';
import { InfoPanel } from './components/InfoPanel';
import { ExportDialog } from './components/ExportDialog';
import { HelpOverlay } from './components/HelpOverlay';
import { themeVars, iconBtn, ThemeName } from './theme';
import { T, UiLang, LANG_BY_SLOT } from './i18n';
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

/** Shareable view state encoded in the URL hash. */
interface HashState {
  p?: string; d?: string; m?: boolean; l?: LangSlot[]; s?: number; ui?: UiLang; th?: ThemeName; c?: Country;
}
function readHash(): HashState {
  try {
    const q = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    const out: HashState = {};
    if (q.get('p')) out.p = q.get('p')!;
    if (q.get('d')) out.d = q.get('d')!;
    if (q.get('m')) out.m = q.get('m') === '1';
    if (q.get('l')) out.l = q.get('l')!.split(',').filter(Boolean) as LangSlot[];
    if (q.get('s')) out.s = parseInt(q.get('s')!, 10) || 0;
    if (q.get('ui')) out.ui = q.get('ui') as UiLang;
    if (q.get('th')) out.th = q.get('th') as ThemeName;
    if (q.get('c') === 'et' || q.get('c') === 'er') out.c = q.get('c') as Country;
    return out;
  } catch { return {}; }
}
const HASH = readHash();
function storedCountry(): Country | null {
  try { const c = localStorage.getItem('kidase_country'); return c === 'er' || c === 'et' ? c : null; } catch { return null; }
}

const ETHIOPIC = "'Noto Serif Ethiopic Variable',serif";
const LOGO: React.CSSProperties = {
  borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontWeight: 700, fontFamily: ETHIOPIC, flexShrink: 0,
};
const MOBILE_QUERY = '(max-width: 768px)';

/** Most languages any template in the payload shows at once; slides with smaller templates show the first ones. */
const languageCapacity = (payload: RenderPayload) =>
  Math.max(0, ...Object.values(payload.templates).map(def => def.languages.length));

export const App: React.FC = () => {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [theme, setTheme] = useState<ThemeName>(HASH.th ?? 'dark');
  const [uiLang, setUiLang] = useState<UiLang>(HASH.ui ?? 'en');
  const [selectedId, setSelectedId] = useState<string>(HASH.p ?? '');
  const [gregDate, setGregDate] = useState<string>(HASH.d ?? todayIso());
  const [isMehella, setIsMehella] = useState(HASH.m ?? false);
  const [country, setCountry] = useState<Country>(HASH.c ?? storedCountry() ?? 'et');
  useEffect(() => { try { localStorage.setItem('kidase_country', country); } catch { /* ignore */ } }, [country]);
  const [activeSlots, setActiveSlots] = useState<LangSlot[]>(HASH.l ?? []);
  const pendingSlide = useRef<number>(HASH.s ?? 0);
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
  const [screen, setScreen] = useState<'viewer' | 'admin'>('viewer');
  const [adminToken, setAdminToken] = useState<string | null>(() => { try { return localStorage.getItem('kidase_admin_token'); } catch { return null; } });
  const updateToken = useCallback((tk: string | null) => {
    setAdminToken(tk);
    try { if (tk) localStorage.setItem('kidase_admin_token', tk); else localStorage.removeItem('kidase_admin_token'); } catch { /* ignore */ }
  }, []);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const t = T[uiLang];
  const isDark = theme === 'dark';
  useEffect(() => { document.documentElement.lang = uiLang; }, [uiLang]);

  useEffect(() => {
    fetchPresentations().then(list => {
      if (list.length) setSelectedId(prev => prev || list[0].id);
    }).catch(e => setError(String(e.message ?? e)));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true); setError(null);
    fetchRender(selectedId, gregDate, isMehella, country)
      .then(payload => {
        if (cancelled) return;
        setRender(payload);
        // First load honours the shared link's slide; later reloads (date, country, mehella) keep the place.
        setSlideIndex(i => Math.min(pendingSlide.current || i, Math.max(payload.slides.length - 1, 0)));
        pendingSlide.current = 0;
        // Start with the presentation's own selection; viewers can switch to any other language.
        const avail = payload.languages.map(l => l.slot);
        const defaults = payload.languages.filter(l => l.enabled !== false).map(l => l.slot); // older payloads have no flag
        const cap = languageCapacity(payload);
        setActiveSlots(prev => { const kept = prev.filter(s => avail.includes(s)).slice(0, cap); return kept.length ? kept : defaults.slice(0, cap); });
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
      else if (e.key === 'i' || e.key === 'I') setInfoOpen(v => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, configOpen, exportOpen, infoOpen, fullscreen, next, prev, toggleFullscreen, exitProjection]);

  const capacity = render ? languageCapacity(render) : 0;
  const toggleLang = (slot: LangSlot) => setActiveSlots(prev =>
    prev.includes(slot) ? prev.filter(s => s !== slot) : prev.length < capacity ? [...prev, slot] : prev);
  // Stable identity so the memoized slide renderers skip work when the selection is unchanged.
  const activeLanguages = useMemo(() => (render?.languages ?? []).filter(l => activeSlots.includes(l.slot)), [render, activeSlots]);

  // Sync shareable view state into the URL hash so "Copy share link" reproduces the view.
  useEffect(() => {
    const q = new URLSearchParams();
    if (selectedId) q.set('p', selectedId);
    q.set('d', gregDate);
    q.set('m', isMehella ? '1' : '0');
    if (activeSlots.length) q.set('l', activeSlots.join(','));
    q.set('s', String(slideIndex));
    if (uiLang !== 'en') q.set('ui', uiLang);
    if (theme !== 'dark') q.set('th', theme);
    if (country !== 'et') q.set('c', country);
    try { history.replaceState(null, '', `#${q.toString()}`); } catch { /* ignore */ }
  }, [selectedId, gregDate, isMehella, activeSlots, slideIndex, uiLang, theme, country]);

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

  const dateLine = render && (
    <button className="ic" onClick={() => setConfigOpen(true)} title={t.serviceDate} style={{ display: 'flex', alignItems: 'center', gap: 6, height: isMobile ? 20 : 28, padding: '0 6px', margin: '0 -6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text2)', fontSize: isMobile ? 12 : 13, maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <I.Calendar size={14} color="var(--muted)" />
      <span style={{ fontFamily: ETHIOPIC, color: 'var(--text)' }}>{render.context.ethDateLabel}</span>
      <span style={{ color: 'var(--muted)' }}>{render.context.gregorian}</span>
      {!isMobile && <span style={{ color: 'var(--muted)' }}>· {t.slides(slideCount)}</span>}
    </button>
  );

  const projectBtn = (
    <button className="accent-btn" onClick={toggleFullscreen} title={`${t.project} (F)`} style={{ height: isMobile ? 40 : 36, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
      <I.Project /> {t.project}
    </button>
  );
  const themeBtn = (
    <button className="ic" onClick={() => setTheme(v => v === 'dark' ? 'light' : 'dark')} title={isDark ? t.themeLight : t.themeDark} style={iconBtn}>{isDark ? <I.Sun /> : <I.Moon />}</button>
  );

  const moreItems: { label: string; icon: React.ReactNode; run: () => void }[] = [
    { label: t.context, icon: <I.Info />, run: () => setInfoOpen(true) },
    { label: t.exportTip, icon: <I.Download />, run: () => setExportOpen(true) },
    { label: isDark ? t.themeLight : t.themeDark, icon: isDark ? <I.Sun /> : <I.Moon />, run: () => setTheme(v => v === 'dark' ? 'light' : 'dark') },
    { label: t.admin, icon: <I.Users />, run: () => setScreen('admin') },
  ];

  return (
    <div className="app-root" style={rootStyle}>
      <div className="app-root" style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', position: 'relative' }}>

        {/* floating nav pill (desktop) */}
        {!isMobile && (
          <div style={{ position: 'absolute', bottom: 14, left: 14, zIndex: 20, display: 'flex', alignItems: 'center', gap: 2, background: 'var(--surface)', borderRadius: 11, padding: 4, boxShadow: '0 6px 22px rgb(0 0 0 / 0.32)' }}>
            <button className="ic" onClick={() => setRailOpen(v => !v)} title={t.toggleThumbs} style={iconBtn}><I.Layout /></button>
            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
            <button className="ic" onClick={prev} title={`${t.prevSlide} (←)`} style={iconBtn}><I.ChevronLeft /></button>
            <span style={{ fontSize: 13, color: 'var(--text)', minWidth: 52, textAlign: 'center', fontWeight: 500 }}>{slideCount ? slideIndex + 1 : 0} / {slideCount}</span>
            <button className="ic" onClick={next} title={`${t.nextSlide} (→)`} style={iconBtn}><I.ChevronRight /></button>
          </div>
        )}

        {/* toolbar */}
        <div style={{ minHeight: 56, display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '8px 12px' : '0 12px 0 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <div style={{ ...LOGO, width: 28, height: 28, fontSize: 15 }}>ቅ</div>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 2 : 12, minWidth: 0, flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 14.5, letterSpacing: '-0.01em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{render?.presentation.name ?? 'Kidase'}{render?.presentation.secondaryName && ` + ${render.presentation.secondaryName}`}</span>
            {dateLine}
          </div>
          {!isMobile && (
            <>
              <button className="ic" onClick={() => setHelpOpen(true)} title={`${t.shortcuts} (?)`} style={iconBtn}><I.Help /></button>
              <button className="ic" onClick={() => setInfoOpen(true)} title={`${t.context} (i)`} style={iconBtn}><I.Info /></button>
              <button className="ic" onClick={() => setExportOpen(true)} title={t.exportTip} style={iconBtn}><I.Download /></button>
              <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
              <button className="ic" onClick={() => setConfigOpen(true)} title={t.settingsTip} style={iconBtn}><I.Gear /></button>
              {themeBtn}
              <button className="ic" onClick={() => setScreen('admin')} title={t.admin} style={iconBtn}><I.Users /></button>
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
              <div style={{ width: 'min(100cqw, calc(100cqh * 16 / 9))', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 24px 70px rgb(0 0 0 / 0.45), inset 0 1px 0 rgba(255,255,255,0.05)', outline: '1px solid rgba(255,255,255,0.06)' }}>
                {slideStage(current, definition)}
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
          </div>

          {railOpen && isMobile && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: 6, padding: '6px 10px', overflowX: 'auto', overflowY: 'hidden', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              {render?.slides.map(thumbnail)}
            </div>
          )}
        </div>

        {/* bottom action bar (mobile) */}
        {isMobile && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', paddingBottom: 'calc(6px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
            <button className="ic" onClick={() => setRailOpen(v => !v)} title={t.toggleThumbs} style={mobileBtn}><I.Layout /></button>
            <button className="ic" onClick={prev} title={t.prevSlide} style={mobileBtn}><I.ChevronLeft /></button>
            <span style={{ fontSize: 13, color: 'var(--text)', minWidth: 52, textAlign: 'center', fontWeight: 500 }}>{slideCount ? slideIndex + 1 : 0} / {slideCount}</span>
            <button className="ic" onClick={next} title={t.nextSlide} style={mobileBtn}><I.ChevronRight /></button>
            <div style={{ flex: 1 }} />
            <button className="ic" onClick={() => setConfigOpen(true)} title={t.settingsTip} style={mobileBtn}><I.Gear /></button>
            {projectBtn}
            <button className="ic" onClick={() => setMoreOpen(v => !v)} title={t.more} style={mobileBtn}><I.More /></button>
            {moreOpen && (
              <>
                <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                <div style={{ position: 'absolute', bottom: '100%', right: 8, marginBottom: 6, zIndex: 31, minWidth: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 40px rgb(0 0 0 / 0.4)', padding: 6, animation: 'fadeup .15s ease' }}>
                  {moreItems.map(item => (
                    <button key={item.label} className="row-hover" onClick={() => { setMoreOpen(false); item.run(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 44, padding: '0 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 14, cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ color: 'var(--text2)', display: 'flex' }}>{item.icon}</span>{item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
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
          sections={[]}
        />
      )}
      {infoOpen && <InfoPanel t={t} uiLang={uiLang} onClose={() => setInfoOpen(false)} render={render} onJump={i => { setSlideIndex(i); setInfoOpen(false); }} />}
      {exportOpen && render && <ExportDialog t={t} onClose={() => setExportOpen(false)} payload={render} languages={activeLanguages} />}
      {helpOpen && <HelpOverlay t={t} onClose={() => setHelpOpen(false)} />}

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
