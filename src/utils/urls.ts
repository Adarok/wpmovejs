import type { Env } from '../config.js';

export function computeUrlPairs(from: Env, to: Env): Array<{ search: string; replace: string }> {
  const fromArr = from.urls ?? [];
  const toArr = to.urls ?? [];
  const max = Math.max(fromArr.length, toArr.length);
  const pairs: Array<{ search: string; replace: string }> = [];
  if (max === 0) {
    const fallbackFrom = fromArr[0] ?? 'http://localhost';
    const fallbackTo = toArr[0] ?? (to.ssh ? `https://${to.ssh.host}` : 'http://localhost');
    pairs.push({ search: fallbackFrom, replace: fallbackTo });
    return pairs;
  }
  for (let i = 0; i < max; i++) {
    const search = fromArr[i] ?? fromArr[0] ?? 'http://localhost';
    const replace = toArr[i] ?? toArr[0] ?? (to.ssh ? `https://${to.ssh.host}` : 'http://localhost');
    pairs.push({ search, replace });
  }
  return pairs;
}
