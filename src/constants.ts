export const DEFAULT_WORDPRESS_EXCLUDES = ['/wp-config.php', '*.sql'];

// Ensures wpmove.yml is always in the exclude list
export function ensureWpmoveExcluded(excludes: string[]): string[] {
  const normalized = excludes.map(e => e.trim()).filter(Boolean);
  if (!normalized.includes('wpmove.yml')) {
    normalized.push('wpmove.yml');
  }
  return normalized;
}
