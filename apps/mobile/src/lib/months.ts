/** Month keys ("2026-10") and their day ranges; the unit the readings cache is fetched and stored in. */

export const monthKey = (iso: string) => iso.slice(0, 7);

export function monthRange(key: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, '0')}` };
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
