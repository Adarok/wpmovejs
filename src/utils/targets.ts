export type Target = 'wordpress' | 'uploads' | 'themes' | 'plugins' | 'mu-plugins' | 'languages' | 'db';

export function resolveTargets(opts: {
  only?: string;
  wordpress?: boolean;
  uploads?: boolean;
  themes?: boolean;
  plugins?: boolean;
  muPlugins?: boolean;
  ['mu-plugins']?: boolean;
  languages?: boolean;
  db?: boolean;
  all?: boolean;
}): Target[] {
  if (opts.only) {
    return String(opts.only)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as Target[];
  }
  const map: Record<Target, boolean> = {
    wordpress: Boolean(opts.wordpress),
    uploads: Boolean(opts.uploads),
    themes: Boolean(opts.themes),
    plugins: Boolean(opts.plugins),
    'mu-plugins': Boolean(opts.muPlugins ?? opts['mu-plugins']),
    languages: Boolean(opts.languages),
    db: Boolean(opts.db),
  };
  if (opts.all) return Object.keys(map) as Target[];
  const selected = (Object.entries(map).filter(([, v]) => v).map(([k]) => k) as Target[]);
  return selected.length ? selected : (['db', 'uploads'] as Target[]);
}
