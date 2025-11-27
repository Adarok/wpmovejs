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

export function includePathsFor(relPath: string, specificItems?: string[]): string[] {
  const parts = relPath.split('/').filter(Boolean);
  const acc: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const seg = parts.slice(0, i + 1).join('/');
    acc.push(ensureTrailingSlash(ensureLeadingSlash(seg)));
  }

  // If specific items are provided (e.g., specific plugin/theme names), include only those
  if (specificItems && specificItems.length > 0) {
    const full = ensureLeadingSlash(parts.join('/'));
    for (const item of specificItems) {
      acc.push(`${full}/${item}/***`);
    }
  } else {
    // Ensure all contents under relPath are included
    const full = ensureLeadingSlash(parts.join('/'));
    acc.push(`${full}/***`);
  }
  return acc;
}

export function excludePathsFor(relPath: string, userExcludes: string[] = [], specificItems?: string[]): string[] {
  const start = dirname(relPath);
  const parts = start.split('/').filter(Boolean);
  const acc: string[] = [];
  for (let i = parts.length; i >= 0; i--) {
    const seg = parts.slice(0, i).join('/');
    const base = seg ? ensureTrailingSlash(ensureLeadingSlash(seg)) : '/';
    const pattern = base === '/' ? '/*' : base + '*';
    acc.push(pattern);
  }

  // If specific items are provided, add an exclude rule to hide all siblings in the target directory
  if (specificItems && specificItems.length > 0) {
    const fullParts = relPath.split('/').filter(Boolean);
    const full = ensureLeadingSlash(fullParts.join('/'));
    acc.push(`${full}/*`);
  }

  // CRITICAL: User excludes must come BEFORE hiding rules so they can protect files from deletion
  return [...userExcludes, ...acc];
}
