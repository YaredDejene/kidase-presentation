import React from 'react';
import { iconBtn } from '../theme';
import { Strings, SHORTCUTS } from '../i18n';
import { Close } from '../icons';

export const HelpOverlay: React.FC<{ t: Strings; onClose: () => void }> = ({ t, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgb(0 0 0 / 0.5)' }} />
    <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 30px 80px rgb(0 0 0 / 0.5)', animation: 'fadeup .2s ease', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{t.shortcuts}</h2>
        <button className="ic" onClick={onClose} style={iconBtn}><Close /></button>
      </div>
      <div style={{ padding: '8px 22px 18px', display: 'flex', flexDirection: 'column' }}>
        {SHORTCUTS.map((sc, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{sc.label}</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {sc.keys.map(k => <kbd key={k} style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'var(--text2)', background: 'var(--elevated)', border: '1px solid var(--border2)', borderRadius: 6, padding: '3px 9px', minWidth: 22, textAlign: 'center', lineHeight: 1.4 }}>{k}</kbd>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
