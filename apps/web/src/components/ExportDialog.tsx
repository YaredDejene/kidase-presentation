import React, { useState } from 'react';
import type { OrderedLanguage } from '@kidase/shared';
import type { RenderPayload } from '../api/client';
import { iconBtn } from '../theme';
import { Close, Download, Check } from '../icons';

type Status = 'idle' | 'running' | 'done';

interface Props {
  onClose: () => void;
  payload: RenderPayload;
  languages: OrderedLanguage[];
}

const FORMATS = [
  { key: 'pdf', label: 'PDF', sub: (n: number) => `All ${n} slides · print-ready` },
  { key: 'pptx', label: 'PowerPoint', sub: () => 'Editable · one slide per page' },
] as const;

export const ExportDialog: React.FC<Props> = ({ onClose, payload, languages }) => {
  const [fmt, setFmt] = useState<'pdf' | 'pptx'>('pdf');
  const [status, setStatus] = useState<Status>('idle');
  const [pct, setPct] = useState(0);
  const [fileName, setFileName] = useState('');

  const base = `kidase_${payload.context.gregorian}`;

  const run = async () => {
    const name = `${base}.${fmt}`;
    setFileName(name);
    setStatus('running');
    setPct(0);
    const onProgress = (c: number, t: number) => setPct(Math.round((c / t) * 100));
    try {
      // The PDF and PPTX libraries are over half the bundle; load them only when exporting.
      const { exportPdf, exportPptx } = await import('../export/exporters');
      if (fmt === 'pdf') await exportPdf(payload, languages, name, onProgress);
      else await exportPptx(payload, languages, name, onProgress);
      setStatus('done');
    } catch (e) {
      setStatus('idle');
      // eslint-disable-next-line no-alert
      alert(`Export failed: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={status === 'running' ? undefined : onClose} style={{ position: 'absolute', inset: 0, background: 'rgb(0 0 0 / 0.5)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 30px 80px rgb(0 0 0 / 0.5)', animation: 'fadeup .2s ease', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Download size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Export presentation</h2>
          </div>
          <button className="ic" onClick={onClose} style={iconBtn}><Close /></button>
        </div>

        {status === 'idle' && (
          <>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FORMATS.map(f => {
                const on = fmt === f.key;
                return (
                  <div key={f.key} onClick={() => setFmt(f.key)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--elevated)' : 'transparent' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${on ? 'var(--accent)' : 'var(--border2)'}`, background: on ? 'var(--accent)' : 'transparent', boxShadow: on ? 'inset 0 0 0 3px var(--surface)' : 'none' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.sub(payload.slides.length)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
              <button className="outline-btn" onClick={onClose} style={btnOutline}>Cancel</button>
              <button className="accent-btn" onClick={run} style={btnAccent}><Download size={16} /> Download</button>
            </div>
          </>
        )}

        {status === 'running' && (
          <div style={{ padding: '26px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
              <span style={{ color: 'var(--text)' }}>{fileName}</span>
              <span style={{ color: 'var(--accent)' }}>{pct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--elevated)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width .16s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Rendering slides &amp; composing file…</div>
          </div>
        )}

        {status === 'done' && (
          <div style={{ padding: '24px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: 16 }}>
              <Check size={22} color="#10b981" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Export ready</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{fileName}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button className="outline-btn" onClick={() => setStatus('idle')} style={btnOutline}>Export again</button>
              <button className="accent-btn" onClick={onClose} style={btnAccent}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const btnOutline: React.CSSProperties = { height: 40, padding: '0 18px', borderRadius: 9, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' };
const btnAccent: React.CSSProperties = { height: 40, padding: '0 22px', borderRadius: 9, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 };
