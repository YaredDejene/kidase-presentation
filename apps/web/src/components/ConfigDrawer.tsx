import React from 'react';
import { DEFAULT_LANG_COLORS, COUNTRIES, formatRefEn, type Country, type LangSlot, type OrderedLanguage } from '@kidase/shared';
import { select, switchTrack, switchKnob, iconBtn } from '../theme';
import { Strings, UiLang, UI_LANGS, langName } from '../i18n';
import { Gear, Close, Link } from '../icons';
import { DatePicker } from './datepicker/DatePicker';
import { readingLabel } from './InfoPanel';
import type { RenderPayload } from '../api/client';

export interface SectionItem { name: string; range: string; jump: () => void; active: boolean; }

interface Props {
  isDark: boolean;
  t: Strings;
  onClose: () => void;
  gregDate: string;
  onGreg: (v: string) => void;
  languages: OrderedLanguage[];
  activeSlots: LangSlot[];
  toggleLang: (slot: LangSlot) => void;
  /** Most languages the template shows at once. */
  capacity: number;
  isMehella: boolean;
  toggleMehella: () => void;
  readings: RenderPayload['readings'];
  /** Picks one of a reading's alternatives; the slides reload. */
  chooseReading: (key: string, index: number) => void;
  uiLang: UiLang;
  setUiLang: (l: UiLang) => void;
  country: Country;
  setCountry: (c: Country) => void;
  /** Full link reproducing the current view. */
  shareUrl: string;
  sections: SectionItem[];
}

/** Settings in three groups (service, slides, app): a small heading each and one rule between groups. */
const groupStyle = (first: boolean): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', gap: 22, ...(first ? {} : { borderTop: '1px solid var(--border)', paddingTop: 22 }) });
const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', margin: 0 };
const h3: React.CSSProperties = { fontSize: 14, fontWeight: 600, margin: '0 0 3px', color: 'var(--text)' };
const sub: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', margin: '0 0 12px' };

const Group: React.FC<{ label: string; first?: boolean; children: React.ReactNode }> = ({ label, first = false, children }) => (
  <section style={groupStyle(first)}>
    <h2 style={eyebrow}>{label}</h2>
    {children}
  </section>
);

export const ConfigDrawer: React.FC<Props> = (p) => {
  const sel = select(p.isDark);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div onClick={p.onClose} style={{ position: 'absolute', inset: 0, background: 'rgb(0 0 0 / 0.45)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 'min(440px, 100vw)', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: '-14px 0 50px rgb(0 0 0 / 0.35)', animation: 'slidein .22s ease', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gear size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{p.t.settings}</h2>
          </div>
          <button className="ic" onClick={p.onClose} style={iconBtn}><Close /></button>
        </div>

        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 22, overflowY: 'auto' }}>
          {/* sections (shown when the API provides them) */}
          {p.sections.length > 0 && (
            <Group label={p.t.sections} first>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.sections.map((sc, i) => (
                  <button key={i} onClick={sc.jump} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `1px solid ${sc.active ? 'var(--accent)' : 'var(--border)'}`, background: sc.active ? 'var(--elevated)' : 'transparent', color: sc.active ? 'var(--text)' : 'var(--text2)' }}>
                    <span>{sc.name}</span><span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{sc.range}</span>
                  </button>
                ))}
              </div>
            </Group>
          )}

          {/* What is celebrated: the day, its reading choices and Mehella */}
          <Group label={p.t.groupService} first={p.sections.length === 0}>
            <div>
              <h3 style={h3}>{p.t.serviceDate}</h3>
              <p style={sub}>{p.t.dateSub}</p>
              <DatePicker value={p.gregDate} onChange={p.onGreg} uiLang={p.uiLang} />
            </div>

            {p.readings.some(r => r.options) && (
              <div>
                <h3 style={h3}>{p.t.readings}</h3>
                <p style={sub}>{p.t.readingsSub}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {p.readings.filter(r => r.options).map(r => (
                    <label key={r.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{readingLabel(r, p.uiLang)}</span>
                      <select value={r.choice ?? 0} onChange={e => p.chooseReading(r.key, Number(e.target.value))} style={{ ...sel, width: '100%' }}>
                        {r.options!.map((ref, i) => <option key={i} value={i}>{p.uiLang === 'en' && r.key !== 'kidaseType' ? formatRefEn(ref) : ref}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div onClick={p.toggleMehella} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <h3 style={h3}>{p.t.mehella}</h3>
                <p style={{ ...sub, margin: 0 }}>{p.t.mehellaSub}</p>
              </div>
              <div style={switchTrack(p.isMehella)}><span style={switchKnob(p.isMehella)} /></div>
            </div>
          </Group>

          {/* What the slides show */}
          <Group label={p.t.groupSlides}>
            <div>
              <h3 style={h3}>{p.t.languages}</h3>
              <p style={{ ...sub, marginBottom: 6 }}>{p.t.langSub(p.capacity)}</p>
              {p.languages.map(l => {
                const on = p.activeSlots.includes(l.slot);
                const blocked = !on && p.activeSlots.length >= p.capacity;
                return (
                  <div key={l.slot} onClick={() => p.toggleLang(l.slot)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.4 : 1 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: l.color ?? DEFAULT_LANG_COLORS[l.slot], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{langName(p.uiLang, l.name)}</span>
                    </div>
                    <div style={switchTrack(on)}><span style={switchKnob(on)} /></div>
                  </div>
                );
              })}
            </div>

            {/* country: patriarch and country placeholders */}
            <div>
              <h3 style={h3}>{p.t.country}</h3>
              <p style={sub}>{p.t.countrySub}</p>
              <select value={p.country} onChange={e => p.setCountry(e.target.value as Country)} style={{ ...sel, width: '100%' }}>
                {COUNTRIES.map(c => <option key={c} value={c}>{p.t.countryNames[c]}</option>)}
              </select>
            </div>
          </Group>

          {/* This app */}
          <Group label={p.t.groupApp}>
            <div>
              <h3 style={{ ...h3, marginBottom: 10 }}>{p.t.uiLang}</h3>
              <select value={p.uiLang} onChange={e => p.setUiLang(e.target.value as UiLang)} style={{ ...sel, width: '100%' }}>
                {UI_LANGS.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
              </select>
            </div>
          </Group>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <CopyLink t={p.t} url={p.shareUrl} />
        </div>
      </div>
    </div>
  );
};

const CopyLink: React.FC<{ t: Strings; url: string }> = ({ t, url }) => {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };
  return (
    <button className="outline-btn" onClick={copy} style={{ height: 42, padding: '0 16px', borderRadius: 9, border: '1px solid var(--border2)', background: 'transparent', color: copied ? 'var(--accent)' : 'var(--text2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
      <Link /> {copied ? t.linkCopied : t.copyLink}
    </button>
  );
};
