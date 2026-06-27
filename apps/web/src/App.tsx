import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { LangSlot } from '@kidase/shared';
import { fetchPresentations, fetchRender, RenderPayload } from './api/client';
import { WebSlideRenderer } from './components/WebSlideRenderer';
import { Stage } from './components/Stage';
import { ConfigDrawer } from './components/ConfigDrawer';
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
function requestFs(el: HTMLElement) {
  const e = el as FsEl;
  (e.requestFullscreen ?? e.webkitRequestFullscreen)?.call(e);
}
function exitFs() {
  const d = document as FsDoc;
  (d.exitFullscreen ?? d.webkitExitFullscreen)?.call(d);
}

/** Shareable view state encoded in the URL hash. */
interface HashState {
  p?: string; d?: string; m?: boolean; l?: LangSlot[]; s?: number; ui?: UiLang; th?: ThemeName;
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
    return out;
  } catch { return {}; }
}
const HASH = readHash();

const LOGO: React.CSSProperties = {
  borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontWeight: 700, fontFamily: "'Noto Serif Ethiopic',serif", flexShrink: 0,
};

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeName>(HASH.th ?? 'dark');
  const [uiLang, setUiLang] = useState<UiLang>(HASH.ui ?? 'en');
  const [selectedId, setSelectedId] = useState<string>(HASH.p ?? '');
  const [gregDate, setGregDate] = useState<string>(HASH.d ?? todayIso());
  const [isMehella, setIsMehella] = useState(HASH.m ?? false);
  const [activeSlots, setActiveSlots] = useState<LangSlot[]>(HASH.l ?? []);
  const pendingSlide = useRef<number>(HASH.s ?? 0);
  const [render, setRender] = useState<RenderPayload | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [railOpen, setRailOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const t = T[uiLang];
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchPresentations().then(list => {
      if (list.length) setSelectedId(prev => prev || list[0].id);
    }).catch(e => setError(String(e.message ?? e)));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true); setError(null);
    fetchRender(selectedId, gregDate, isMehella)
      .then(payload => {
        if (cancelled) return;
        setRender(payload);
        setSlideIndex(Math.min(pendingSlide.current, Math.max(payload.slides.length - 1, 0)));
        pendingSlide.current = 0;
        const avail = payload.languages.map(l => l.slot);
        setActiveSlots(prev => { const kept = prev.filter(s => avail.includes(s)); return kept.length ? kept : avail; });
      })
      .catch(e => !cancelled && setError(String(e.message ?? e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [selectedId, gregDate, isMehella]);

  const slideCount = render?.slides.length ?? 0;
  const next = useCallback(() => setSlideIndex(i => Math.min(i + 1, Math.max(slideCount - 1, 0))), [slideCount]);
  const prev = useCallback(() => setSlideIndex(i => Math.max(i - 1, 0)), []);

  const bumpControls = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setControlsVisible(true);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2800);
  }, []);
  // "Project" enters real browser fullscreen (hides the address bar / OS chrome).
  const toggleFullscreen = useCallback(() => {
    if (fsElement()) exitFs(); else requestFs(document.documentElement);
  }, []);

  // Keep the projection overlay in sync with the actual fullscreen state
  // (covers Esc, F11, and the OS exiting fullscreen).
  useEffect(() => {
    const onChange = () => { setFullscreen(!!fsElement()); setControlsVisible(true); bumpControls(); };
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
      else if (e.key === 'Escape' && fullscreen) exitFs();
      else if (e.key === 'i' || e.key === 'I') setInfoOpen(v => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, configOpen, exportOpen, infoOpen, fullscreen, next, prev, toggleFullscreen]);

  const toggleLang = (slot: LangSlot) => setActiveSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  const orderedActiveSlots = (render?.languages ?? []).map(l => l.slot).filter(s => activeSlots.includes(s));

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
    try { history.replaceState(null, '', `#${q.toString()}`); } catch { /* ignore */ }
  }, [selectedId, gregDate, isMehella, activeSlots, slideIndex, uiLang, theme]);

  const current = render?.slides[slideIndex];
  const definition = current ? render?.templates[current.templateId] : undefined;

  const rootStyle: React.CSSProperties = { minHeight: '100vh', height: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', ...themeVars(theme) };

  const slideStage = (slide: NonNullable<typeof current>, def: NonNullable<typeof definition>) => (
    <Stage>
      <WebSlideRenderer definition={def} activeSlots={orderedActiveSlots} block={slide.block} title={slide.title} footer={slide.footer} />
    </Stage>
  );

  return (
    <div style={rootStyle}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', position: 'relative' }}>

        {/* floating nav pill */}
        <div style={{ position: 'absolute', bottom: 14, left: 14, zIndex: 20, display: 'flex', alignItems: 'center', gap: 2, background: 'var(--surface)', borderRadius: 11, padding: 4, boxShadow: '0 6px 22px rgb(0 0 0 / 0.32)' }}>
          <button className="ic" onClick={() => setRailOpen(v => !v)} title="Toggle thumbnails" style={iconBtn}><I.Layout /></button>
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
          <button className="ic" onClick={prev} title="Previous (←)" style={iconBtn}><I.ChevronLeft /></button>
          <span style={{ fontSize: 13, color: 'var(--text)', minWidth: 52, textAlign: 'center', fontWeight: 500 }}>{slideCount ? slideIndex + 1 : 0} / {slideCount}</span>
          <button className="ic" onClick={next} title="Next (→)" style={iconBtn}><I.ChevronRight /></button>
        </div>

        {/* toolbar */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 0 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <div style={{ ...LOGO, width: 28, height: 28, fontSize: 15 }}>ቅ</div>
            <span style={{ fontWeight: 600, fontSize: 14.5, letterSpacing: '-0.01em', color: 'var(--text)' }}>{render?.presentation.name ?? 'Kidase'}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button className="ic" onClick={() => setHelpOpen(true)} title="Keyboard shortcuts (?)" style={iconBtn}><I.Help /></button>
          <button className="ic" onClick={() => setInfoOpen(true)} title="Liturgical info (i)" style={iconBtn}><I.Info /></button>
          <button className="ic" onClick={() => setExportOpen(true)} title="Export / Download" style={iconBtn}><I.Download /></button>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
          <button className="ic" onClick={() => setConfigOpen(true)} title="Settings (date & languages)" style={iconBtn}><I.Gear /></button>
          <button className="ic" onClick={() => setTheme(v => v === 'dark' ? 'light' : 'dark')} title="Toggle theme" style={iconBtn}>{isDark ? <I.Sun /> : <I.Moon />}</button>
          <button className="ic" title="Admin (sign-in in Phase 4)" style={iconBtn}><I.Users /></button>
          <button className="accent-btn" onClick={toggleFullscreen} title="Project fullscreen (F)" style={{ height: 36, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <I.Project /> Project
          </button>
        </div>

        {/* body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {railOpen && (
            <div style={{ width: 214, borderRight: '1px solid var(--border)', background: 'var(--surface)', overflowX: 'hidden', overflowY: 'auto', padding: '10px 10px 64px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
              {render?.slides.map((s, i) => {
                const def = render.templates[s.templateId];
                const activeRow = i === slideIndex;
                return (
                  <div key={s.id} onClick={() => setSlideIndex(i)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 5, borderRadius: 8, cursor: 'pointer', border: `1px solid ${activeRow ? 'var(--accent)' : 'transparent'}`, background: activeRow ? 'var(--elevated)' : 'transparent' }}>
                    <span style={{ fontSize: 11, color: activeRow ? 'var(--accent)' : 'var(--muted)', width: 20, flexShrink: 0, fontWeight: 600, textAlign: 'center' }}>{pad(i + 1)}</span>
                    <div style={{ width: 150, height: 84, flexShrink: 0, borderRadius: 5, overflow: 'hidden', background: '#000' }}>
                      {def && <Stage><WebSlideRenderer definition={def} activeSlots={orderedActiveSlots} block={s.block} title={s.title} footer={s.footer} /></Stage>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36, minWidth: 0, containerType: 'size' }}>
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
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 6px', color: 'var(--text)' }}>No slides for this date</h3>
                <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 18px' }}>This liturgy has no readings assigned to the selected gitsawe. Try another date.</p>
                <button className="outline-btn" onClick={() => setConfigOpen(true)} style={{ height: 38, padding: '0 18px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Change date</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {configOpen && (
        <ConfigDrawer
          isDark={isDark} t={t} onClose={() => setConfigOpen(false)}
          gregDate={gregDate} onGreg={setGregDate}
          languages={render?.languages ?? []} activeSlots={activeSlots} toggleLang={toggleLang}
          isMehella={isMehella} toggleMehella={() => setIsMehella(v => !v)}
          uiLang={uiLang} setUiLang={setUiLang}
          sections={[]}
        />
      )}
      {infoOpen && <InfoPanel t={t} onClose={() => setInfoOpen(false)} render={render} />}
      {exportOpen && render && <ExportDialog onClose={() => setExportOpen(false)} payload={render} activeSlots={orderedActiveSlots} />}
      {helpOpen && <HelpOverlay t={t} onClose={() => setHelpOpen(false)} />}

      {/* fullscreen projection */}
      {fullscreen && current && definition && (
        <div onMouseMove={bumpControls} style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', containerType: 'size', cursor: controlsVisible ? 'default' : 'none' }}>
          <div style={{ width: 'min(100cqw, calc(100cqh * 16 / 9))', aspectRatio: '16/9' }}>{slideStage(current, definition)}</div>
          <div style={{ position: 'fixed', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: controlsVisible ? 'auto' : 'none', opacity: controlsVisible ? 1 : 0, transform: controlsVisible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity .25s ease, transform .25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(20,20,20,0.92)', border: '1px solid #333', borderRadius: 14, padding: '8px 10px', backdropFilter: 'blur(12px)', boxShadow: '0 12px 40px rgb(0 0 0 / 0.5)' }}>
              <button onClick={prev} title="Previous (←)" style={fsBtn}><I.ChevronLeft size={20} /></button>
              <span style={{ fontSize: 14, color: '#fff', minWidth: 64, textAlign: 'center', fontWeight: 500 }}>{slideIndex + 1} / {slideCount}</span>
              <button onClick={next} title="Next (→)" style={fsBtn}><I.ChevronRight size={20} /></button>
              <div style={{ width: 1, height: 22, background: '#333', margin: '0 4px' }} />
              {(render?.languages ?? []).map(l => {
                const on = activeSlots.includes(l.slot);
                const meta = LANG_BY_SLOT[l.slot] || { short: l.name.slice(0, 2), color: '#fff' };
                return (
                  <button key={l.slot} onClick={() => toggleLang(l.slot)} title={l.name} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 9px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${on ? '#444' : '#2a2a2a'}`, background: on ? '#262626' : 'transparent', color: on ? '#fff' : '#666' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, opacity: on ? 1 : 0.4, flexShrink: 0 }} />{meta.short}
                  </button>
                );
              })}
              <div style={{ width: 1, height: 22, background: '#333', margin: '0 4px' }} />
              <button onClick={exitFs} title="Exit (Esc)" style={fsBtn}><I.Minimize size={20} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const fsBtn: React.CSSProperties = { width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer' };
