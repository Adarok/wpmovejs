import type { Env } from '../config.js';
import { logVerbose } from '../state.js';

/**
 * Extract the bare host+path portion of a URL by stripping the scheme (https://, http://, //).
 * Returns null if no scheme is found.
 */
function stripScheme(url: string): string | null {
  const m = url.match(/^(?:https?:)?\/\/(.+)$/);
  return m ? m[1] : null;
}

/**
 * Given a single search URL and replace URL, expand into scheme-variant pairs.
 * WordPress databases often store URLs with a different scheme than what the site
 * serves (e.g. http:// in DB but https:// via redirect/plugin). We generate
 * replacements for https://, http://, and protocol-relative // variants so that
 * all occurrences are caught regardless of stored scheme.
 *
 * Order matters: https → https first (exact match), then http → http, then // → //
 */
function expandSchemeVariants(search: string, replace: string): Array<{ search: string; replace: string }> {
  const searchBare = stripScheme(search);
  const replaceBare = stripScheme(replace);

  // If either URL doesn't have a recognisable scheme, just return the literal pair
  if (!searchBare || !replaceBare) {
    return [{ search, replace }];
  }

  return [
    { search: `https://${searchBare}`, replace: `https://${replaceBare}` },
    { search: `http://${searchBare}`, replace: `http://${replaceBare}` },
    { search: `//${searchBare}`, replace: `//${replaceBare}` },
  ];
}

export function computeUrlPairs(from: Env, to: Env): Array<{ search: string; replace: string }> {
  const fromArr = from.urls ?? [];
  const toArr = to.urls ?? [];
  const max = Math.max(fromArr.length, toArr.length);
  const pairs: Array<{ search: string; replace: string }> = [];
  if (max === 0) {
    const fallbackFrom = fromArr[0] ?? 'http://localhost';
    const fallbackTo = toArr[0] ?? (to.ssh ? `https://${to.ssh.host}` : 'http://localhost');
    pairs.push(...expandSchemeVariants(fallbackFrom, fallbackTo));
  } else {
    if (fromArr.length !== toArr.length && max > 0) {
      logVerbose('urls length mismatch:', fromArr.length, '->', toArr.length, '(using first as fallback)');
    }
    for (let i = 0; i < max; i++) {
      const search = fromArr[i] ?? fromArr[0] ?? 'http://localhost';
      const replace = toArr[i] ?? toArr[0] ?? (to.ssh ? `https://${to.ssh.host}` : 'http://localhost');
      pairs.push(...expandSchemeVariants(search, replace));
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
