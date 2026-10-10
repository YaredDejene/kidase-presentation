import React from 'react';
import type { RenderPayload } from '../api/client';
import { iconBtn } from '../theme';
import { Strings } from '../i18n';
import { Close } from '../icons';

interface Props { t: Strings; onClose: () => void; render: RenderPayload | null; }

const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 8 };

export const InfoPanel: React.FC<Props> = ({ t, onClose, render }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgb(0 0 0 / 0.45)' }} />
    <aside style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 384, maxWidth: '90vw', background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto', animation: 'slidein .22s ease', boxShadow: '-12px 0 40px rgb(0 0 0 / 0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{t.context}</h3>
        <button className="ic" onClick={onClose} style={iconBtn}><Close /></button>
      </div>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={eyebrow}>{t.date}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', fontFamily: "'Noto Serif Ethiopic Variable',serif", marginBottom: 2 }}>{render?.context.ethDateLabel}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{render?.context.gregorian}</div>
        </div>
        {render?.context.feast && (
          <>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div>
              <div style={eyebrow}>{t.feast} · <span style={{ fontFamily: "'Noto Serif Ethiopic Variable',serif" }}>በዓል</span></div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{render.context.feast}</div>
              {render.context.feastAmh && <div style={{ fontSize: 16, color: 'var(--text2)', fontFamily: "'Noto Serif Ethiopic Variable',serif" }}>{render.context.feastAmh}</div>}
            </div>
          </>
        )}
        {render && render.readings.length > 0 && (
          <>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div>
              <div style={eyebrow}>{t.readings} · <span style={{ fontFamily: "'Noto Serif Ethiopic Variable',serif" }}>ግፃዌ</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {render.readings.map(r => (
                  <div key={r.key} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{r.label}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', fontFamily: "'Noto Serif Ethiopic Variable',serif" }}>{r.labelAmh}</div>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{r.ref || r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  </div>
);
