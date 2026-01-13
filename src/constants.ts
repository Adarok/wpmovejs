// Default excludes used when generating wpmove.yml templates (init/sniff commands)
// These match the template in init.ts for consistency
export const DEFAULT_TEMPLATE_EXCLUDES = [
  '.git/',
  'node_modules/',
  '*.sql',
  'wp-config.php',
  'wpmove*.yml',
];

// Ensures wpmove.yml is always in the exclude list (used by migrate command)
export function ensureWpmoveExcluded(excludes: string[]): string[] {
  const normalized = excludes.map(e => e.trim()).filter(Boolean);
  if (!normalized.includes('wpmove.yml')) {
    normalized.push('wpmove.yml');
  }
  return normalized;
}
