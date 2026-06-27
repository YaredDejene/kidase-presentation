import React, { useState } from 'react';
import { iconBtn } from '../theme';
import { Close, Download } from '../icons';

interface Props { onClose: () => void; slideCount: number; }

const FORMATS = [
  { key: 'pdf', label: 'PDF', sub: 'All slides · print-ready' },
  { key: 'png', label: 'PNG image', sub: 'Current slide only · 1920×1080' },
  { key: 'pptx', label: 'PowerPoint', sub: 'Editable · one slide per page' },
];

/** Export UI (matches the design). Actual file generation is a follow-up;
 *  PDF currently uses the browser print dialog. */
export const ExportDialog: React.FC<Props> = ({ onClose, slideCount }) => {
  const [fmt, setFmt] = useState('pdf');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgb(0 0 0 / 0.5)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 30px 80px rgb(0 0 0 / 0.5)', animation: 'fadeup .2s ease', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Download size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Export presentation</h2>
          </div>
          <button className="ic" onClick={onClose} style={iconBtn}><Close /></button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FORMATS.map(f => {
            const on = fmt === f.key;
            const sub = f.key === 'pdf' ? `All ${slideCount} slides · print-ready` : f.sub;
            return (
              <div key={f.key} onClick={() => setFmt(f.key)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--elevated)' : 'transparent' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${on ? 'var(--accent)' : 'var(--border2)'}`, background: on ? 'var(--accent)' : 'transparent', boxShadow: on ? 'inset 0 0 0 3px var(--surface)' : 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <button className="outline-btn" onClick={onClose} style={{ height: 40, padding: '0 18px', borderRadius: 9, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button className="accent-btn" onClick={() => { if (fmt === 'pdf') window.print(); onClose(); }} style={{ height: 40, padding: '0 22px', borderRadius: 9, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={16} /> Download
          </button>
        </div>
      </div>
    </div>
  );
};
