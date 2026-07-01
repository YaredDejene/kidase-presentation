const BASE = import.meta.env.VITE_API_BASE ?? '';

export interface RestoreResult { counts: Record<string, number>; contentVersion: number; }

export async function adminLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/v1/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 401) throw new Error('Invalid email or password.');
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  return (await res.json()).token as string;
}

export async function downloadBackup(token: string): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/admin/backup`, { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error('Session expired — sign in again.');
  if (!res.ok) throw new Error(`Backup failed (${res.status})`);
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') || '';
  const m = cd.match(/filename="?([^"]+)"?/);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = m ? m[1] : 'kidase-backup.kidase';
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function restoreBackup(token: string, data: unknown): Promise<RestoreResult> {
  const res = await fetch(`${BASE}/api/v1/admin/restore`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error('Session expired — sign in again.');
  if (!res.ok) throw new Error(`Restore failed (${res.status})`);
  return res.json();
}
