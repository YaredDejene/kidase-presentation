import React, { useRef, useState } from 'react';
import { field, ThemeName } from '../theme';
import * as I from '../icons';
import { adminLogin, downloadBackup, restoreBackup, RestoreResult } from '../admin/adminApi';

interface Props {
  token: string | null;
  setToken: (t: string | null) => void;
  onBack: () => void;
  theme: ThemeName;
  toggleTheme: () => void;
  isDark: boolean;
}

const LOGO: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: "'Noto Serif Ethiopic Variable',serif" };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 110, background: 'var(--bg)', color: 'var(--text)', overflow: 'auto' };

export const Admin: React.FC<Props> = ({ token, setToken, onBack, theme, toggleTheme, isDark }) => {
  if (!token) return <SignIn onAuthed={setToken} onBack={onBack} isDark={isDark} />;
  return <Authed token={token} onSignOut={() => setToken(null)} onBack={onBack} theme={theme} toggleTheme={toggleTheme} isDark={isDark} />;
};

const SignIn: React.FC<{ onAuthed: (t: string) => void; onBack: () => void; isDark: boolean }> = ({ onAuthed, onBack, isDark }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fld = field(isDark);

  const submit = async () => {
    setBusy(true); setError(null);
    try { onAuthed(await adminLogin(email, password)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div style={overlay}>
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '24px 24px 140px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <button className="outline-btn" onClick={onBack} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}><I.ChevronLeft size={15} /> Back to viewer</button>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 32, marginTop: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Admin sign in</h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 24px' }}>Manage backups and restores.</p>
          <label style={lbl}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@church.org" style={{ ...fld, width: '100%', marginBottom: 16 }} />
          <label style={lbl}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" style={{ ...fld, width: '100%', marginBottom: 24 }} />
          {error && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#ff8a80', fontSize: 13 }}>{error}</div>}
          <button className="accent-btn" disabled={busy} onClick={submit} style={{ height: 44, width: '100%', borderRadius: 9, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </main>
    </div>
  );
};

const Authed: React.FC<{ token: string; onSignOut: () => void; onBack: () => void; theme: ThemeName; toggleTheme: () => void; isDark: boolean }> = ({ token, onSignOut, onBack }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'backing' | 'restoring' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const doBackup = async () => {
    setStatus('backing'); setMessage('');
    try { await downloadBackup(token); setStatus('idle'); }
    catch (e) { setStatus('error'); setMessage((e as Error).message); if (/sign in/i.test((e as Error).message)) onSignOut(); }
  };

  const onPickRestore = async (file: File) => {
    if (!window.confirm('Restore replaces ALL current data with the backup. Continue?')) return;
    setStatus('restoring'); setMessage('');
    try {
      const data = JSON.parse(await file.text());
      const res: RestoreResult = await restoreBackup(token, data);
      const total = Object.values(res.counts).reduce((a, b) => a + b, 0);
      setStatus('done');
      setMessage(`Restored ${total} records across ${Object.keys(res.counts).length} collections (content v${res.contentVersion}).`);
    } catch (e) {
      setStatus('error'); setMessage((e as Error).message);
      if (/sign in/i.test((e as Error).message)) onSignOut();
    }
  };

  return (
    <div style={{ ...overlay, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={LOGO}>ቅ</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.12 }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Kidase</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.02em' }}>ADMIN</span>
          </div>
        </div>
        <button className="outline-btn" onClick={onBack} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}><I.ChevronLeft size={15} /> Back to viewer</button>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside style={{ width: 230, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', padding: '18px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', padding: '6px 10px 16px' }}>Admin</div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 11, height: 40, padding: '0 12px', borderRadius: 9, border: 'none', background: 'var(--elevated)', color: 'var(--text)', fontSize: 13.5, fontWeight: 500, textAlign: 'left', width: '100%', cursor: 'default' }}><I.Database /> Data &amp; backup</button>
          <div style={{ flex: 1 }} />
          <button onClick={onSignOut} style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}><I.LogOut /> Sign out</button>
        </aside>

        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: 620, margin: '0 auto', padding: '34px 34px 90px' }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 5px', color: 'var(--text)' }}>Data &amp; backup</h1>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 22px', maxWidth: 540 }}>Download a full backup of the dataset or restore it from a <code>.kidase</code> file. Restoring replaces all data.</p>

            <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Backup &amp; restore</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 18px' }}>Backups include all liturgies, slides, gitsawes, verses and settings.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="outline-btn" onClick={doBackup} disabled={status === 'backing' || status === 'restoring'} style={dataBtn}><I.Download size={16} /> {status === 'backing' ? 'Preparing…' : 'Download backup'}</button>
                <button className="outline-btn" onClick={() => fileRef.current?.click()} disabled={status === 'backing' || status === 'restoring'} style={dataBtn}><I.Refresh size={16} /> {status === 'restoring' ? 'Restoring…' : 'Restore'}</button>
                <input ref={fileRef} type="file" accept=".kidase,.json,application/json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onPickRestore(f); e.target.value = ''; }} />
              </div>
              {status === 'done' && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <I.Check size={20} color="#10b981" /><span style={{ fontSize: 13.5, color: 'var(--text)' }}>{message}</span>
                </div>
              )}
              {status === 'error' && (
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#ff8a80', fontSize: 13 }}>{message}</div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 7 };
const dataBtn: React.CSSProperties = { flex: 1, height: 42, borderRadius: 9, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
