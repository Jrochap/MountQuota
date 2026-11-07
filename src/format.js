const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'];

export function fmt(n) {
  if (n == null || Number.isNaN(n)) return '0';
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '−' + fmt(-n);
  if (n < 10) return n === Math.floor(n) ? String(n) : n.toFixed(1);
  if (n < 1000) return String(Math.floor(n));
  const e = Math.floor(Math.log10(n) / 3);
  if (e < SUF.length) {
    const v = n / Math.pow(1000, e);
    return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + SUF[e];
  }
  return n.toExponential(2).replace('+', '');
}
export const tons = n => fmt(n) + ' t';
export const cr = n => '₵' + fmt(n);
export const rp = n => fmt(n) + ' RP';
export const pct = (f, d = 2) => (f * 100).toFixed(d) + '%';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'SMARCH', 'QUARTEMBER', 'OVERTIMBER'];
export function clock(years, extraMonths = 0) {
  const n = 12 + extraMonths;
  const y = Math.floor(years);
  const mo = MONTHS[Math.min(n - 1, Math.floor((years - y) * n))];
  return { year: String(y).padStart(4, '0'), month: mo };
}
export const yrs = y => (y == null ? '—' : y < 10 ? y.toFixed(2) + ' yrs' : y.toFixed(1) + ' yrs');
