import type { Env } from '../config.js';
import { logVerbose } from '../state.js';

export function computeUrlPairs(from: Env, to: Env): Array<{ search: string; replace: string }> {
  const fromArr = from.urls ?? [];
  const toArr = to.urls ?? [];
  const max = Math.max(fromArr.length, toArr.length);
  const pairs: Array<{ search: string; replace: string }> = [];
  if (max === 0) {
    const fallbackFrom = fromArr[0] ?? 'http://localhost';
    const fallbackTo = toArr[0] ?? (to.ssh ? `https://${to.ssh.host}` : 'http://localhost');
    pairs.push({ search: fallbackFrom, replace: fallbackTo });
  } else {
    if (fromArr.length !== toArr.length && max > 0) {
      logVerbose('urls length mismatch:', fromArr.length, '->', toArr.length, '(using first as fallback)');
    }
    for (let i = 0; i < max; i++) {
      const search = fromArr[i] ?? fromArr[0] ?? 'http://localhost';
      const replace = toArr[i] ?? toArr[0] ?? (to.ssh ? `https://${to.ssh.host}` : 'http://localhost');
      pairs.push({ search, replace });
    }
  }

  // Add WordPress installation path replacement if both environments have wordpress_path defined
  const fromPath = from.wordpress_path ?? (from.ssh?.path);
  const toPath = to.wordpress_path ?? (to.ssh?.path);

  if (fromPath && toPath && fromPath !== toPath) {
    // Normalize paths: remove trailing slashes for consistency
    const normalizedFrom = fromPath.replace(/\/+$/, '');
    const normalizedTo = toPath.replace(/\/+$/, '');
    if (normalizedFrom !== normalizedTo) {
      logVerbose('Adding wordpress_path replacement:', normalizedFrom, '->', normalizedTo);
      pairs.push({ search: normalizedFrom, replace: normalizedTo });
    }
  }

  return pairs;
}
