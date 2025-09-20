function ensureLeadingSlash(p: string) {
  return p.startsWith('/') ? p : '/' + p;
}

function ensureTrailingSlash(p: string) {
  return p.endsWith('/') ? p : p + '/';
}

function dirname(relPath: string) {
  const parts = relPath.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

export function includePathsFor(relPath: string): string[] {
  const parts = relPath.split('/').filter(Boolean);
  const acc: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const seg = parts.slice(0, i + 1).join('/');
    acc.push(ensureTrailingSlash(ensureLeadingSlash(seg)));
  }
  // Ensure all contents under relPath are included
  const full = ensureLeadingSlash(parts.join('/'));
  acc.push(`${full}/***`);
  return acc;
}

export function excludePathsFor(relPath: string, userExcludes: string[] = []): string[] {
  const start = dirname(relPath);
  const parts = start.split('/').filter(Boolean);
  const acc: string[] = [];
  for (let i = parts.length; i >= 0; i--) {
    const seg = parts.slice(0, i).join('/');
    const base = seg ? ensureTrailingSlash(ensureLeadingSlash(seg)) : '/';
    const pattern = base === '/' ? '/*' : base + '*';
    acc.push(pattern);
  }
  return [...acc, ...userExcludes];
}
