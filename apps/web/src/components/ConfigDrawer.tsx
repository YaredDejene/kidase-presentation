import React from 'react';
import { DEFAULT_LANG_COLORS, type LangSlot, type OrderedLanguage } from '@kidase/shared';
import { select, switchTrack, switchKnob, iconBtn } from '../theme';
import { Strings, UiLang, UI_LANGS, LANG_BY_SLOT } from '../i18n';
import { Gear, Close, Link } from '../icons';
import { DatePicker } from './datepicker/DatePicker';

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
  uiLang: UiLang;
  setUiLang: (l: UiLang) => void;
  sections: SectionItem[];
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 22 };
const h3: React.CSSProperties = { fontSize: 14, fontWeight: 600, margin: '0 0 3px', color: 'var(--text)' };
const sub: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', margin: '0 0 14px' };

export const ConfigDrawer: React.FC<Props> = (p) => {
  const sel = select(p.isDark);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div onClick={p.onClose} style={{ position: 'absolute', inset: 0, background: 'rgb(0 0 0 / 0.45)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 440, maxWidth: '92vw', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: '-14px 0 50px rgb(0 0 0 / 0.35)', animation: 'slidein .22s ease', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gear size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{p.t.settings}</h2>
          </div>
          <button className="ic" onClick={p.onClose} style={iconBtn}><Close /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          {/* sections (shown when the API provides them) */}
          {p.sections.length > 0 && (
            <section style={card}>
              <h3 style={{ ...h3, marginBottom: 12 }}>{p.t.sections}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.sections.map((sc, i) => (
                  <button key={i} onClick={sc.jump} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `1px solid ${sc.active ? 'var(--accent)' : 'var(--border)'}`, background: sc.active ? 'var(--elevated)' : 'transparent', color: sc.active ? 'var(--text)' : 'var(--text2)' }}>
                    <span>{sc.name}</span><span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{sc.range}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* date — Ethiopian or Gregorian calendar based on the interface language */}
          <section style={card}>
            <h3 style={h3}>{p.t.serviceDate}</h3>
            <p style={sub}>{p.t.dateSub}</p>
            <DatePicker value={p.gregDate} onChange={p.onGreg} uiLang={p.uiLang} />
          </section>

          {/* languages */}
          <section style={card}>
            <h3 style={h3}>{p.t.languages}</h3>
            <p style={sub}>{p.t.langSub(p.capacity)}</p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {p.languages.map(l => {
                const on = p.activeSlots.includes(l.slot);
                const blocked = !on && p.activeSlots.length >= p.capacity;
                const meta = LANG_BY_SLOT[l.slot] || { amh: '' };
                return (
                  <div key={l.slot} onClick={() => p.toggleLang(l.slot)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid var(--border)', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.4 : 1 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: l.color ?? DEFAULT_LANG_COLORS[l.slot], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{l.name}</span>
                      <span style={{ fontSize: 14, color: 'var(--text2)', fontFamily: "'Noto Serif Ethiopic Variable',serif", marginLeft: 8 }}>{meta.amh}</span>
                    </div>
                    <div style={switchTrack(on)}><span style={switchKnob(on)} /></div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* mehella */}
          <section style={{ ...card, padding: '18px 22px' }}>
            <div onClick={p.toggleMehella} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{p.t.mehella} <span style={{ fontFamily: "'Noto Serif Ethiopic Variable',serif", fontWeight: 400, color: 'var(--text2)', marginLeft: 6 }}>መሐላ</span></div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{p.t.mehellaSub}</div>
              </div>
              <div style={switchTrack(p.isMehella)}><span style={switchKnob(p.isMehella)} /></div>
            </div>
          </section>

          {/* interface language */}
          <section style={{ ...card, padding: '18px 22px' }}>
            <h3 style={{ ...h3, marginBottom: 12 }}>{p.t.uiLang}</h3>
            <select value={p.uiLang} onChange={e => p.setUiLang(e.target.value as UiLang)} style={{ ...sel, width: '100%' }}>
              {UI_LANGS.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
            </select>
          </section>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <CopyLink />
          <button className="accent-btn" onClick={p.onClose} style={{ height: 42, padding: '0 26px', borderRadius: 9, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{p.t.done}</button>
        </div>
      </div>
    </div>
  );
};

const CopyLink: React.FC = () => {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };
  return (
    <button className="outline-btn" onClick={copy} style={{ height: 42, padding: '0 16px', borderRadius: 9, border: '1px solid var(--border2)', background: 'transparent', color: copied ? 'var(--accent)' : 'var(--text2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
      <Link /> {copied ? 'Link copied' : 'Copy share link'}
    </button>
  );
};
