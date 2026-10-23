import React from 'react';
import { iconBtn, select } from '../theme';
import { Strings, UiLang, UI_LANGS } from '../i18n';
import { Sun, Moon, ChevronRight } from '../icons';

interface Props {
  t: Strings;
  isDark: boolean;
  uiLang: UiLang;
  setUiLang: (l: UiLang) => void;
  toggleTheme: () => void;
}

const ETHIOPIC = "'Noto Serif Ethiopic Variable',serif";

/** Root page: pick a service. Plain links, so each button is a real page load into that service's viewer. */
export const Landing: React.FC<Props> = ({ t, isDark, uiLang, setUiLang, toggleTheme }) => {
  const services = [
    { href: '/kidase', amh: 'ቅዳሴ', latin: 'Kidase', desc: t.kidaseDesc },
    { href: '/kidan', amh: 'ኪዳን', latin: 'Kidan', desc: t.kidanDesc },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
        <select value={uiLang} onChange={e => setUiLang(e.target.value as UiLang)} style={{ ...select(isDark), height: 36 }}>
          {UI_LANGS.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
        </select>
        <button className="ic" onClick={toggleTheme} title={isDark ? t.themeLight : t.themeDark} style={iconBtn}>{isDark ? <Sun /> : <Moon />}</button>
      </div>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px 48px', textAlign: 'center' }}>
        <img src={isDark ? '/mark-dark.svg' : '/mark-light.svg'} alt="" width={72} height={72} />
        <h1 style={{ fontFamily: ETHIOPIC, fontSize: 34, fontWeight: 700, margin: '14px 0 6px', lineHeight: 1.1 }}>ቅዳሴ · ኪዳን</h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 440, margin: '0 0 32px', lineHeight: 1.5 }}>{t.landingSub}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 420 }}>
          {services.map(s => (
            <a key={s.href} href={s.href} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', textDecoration: 'none', textAlign: 'left' }}>
              <span style={{ fontFamily: ETHIOPIC, fontSize: 28, fontWeight: 700, lineHeight: 1, minWidth: 64 }}>{s.amh}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{s.latin}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text2)', marginTop: 2 }}>{s.desc}</span>
              </span>
              <ChevronRight color="var(--muted)" />
            </a>
          ))}
        </div>
      </main>
    </div>
  );
};
