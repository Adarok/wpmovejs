import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { logInfo, logOk, logWarn } from '../state.js';
import { ensureWpmoveExcluded } from '../constants.js';

type AnyObject = Record<string, any>;

async function findMovefile(cwd: string): Promise<string | null> {
  const candidates = ['Movefile', 'Movefile.yml', 'movefile.yml', 'Movefile.yaml', 'movefile.yaml'];
  for (const name of candidates) {
    const p = path.resolve(cwd, name);
    if (await fs.pathExists(p)) return p;
  }
  return null;
}

function mapEnv(name: string, src: AnyObject): AnyObject {
  const out: AnyObject = {};
  const urls: string[] = [];
  if (typeof src.vhost === 'string' && src.vhost.trim()) urls.push(src.vhost.trim());
  if (Array.isArray(src.vhosts)) urls.push(...src.vhosts.filter((u: any) => typeof u === 'string'));
  if (urls.length) out.urls = urls;

  // Paths and wordpress root
  if (typeof src.wordpress_path === 'string' && src.wordpress_path.trim()) {
    if (src.ssh) {
      // Remote: map to ssh.path
      out.ssh = {
        host: String(src.ssh.host || ''),
        user: String(src.ssh.user || ''),
        port: src.ssh.port ? Number(src.ssh.port) : undefined,
        path: src.wordpress_path,
      };
      if (!out.ssh.host || !out.ssh.user) logWarn(`Environment '${name}': ssh.host/user missing in Movefile`);
    } else {
      // Local
      out.wordpress_path = src.wordpress_path;
    }
  }

  // Database
  if (src.database && typeof src.database === 'object') {
    const db = src.database as AnyObject;
    out.db = {
      host: String(db.host || ''),
      name: String(db.name || ''),
      user: String(db.user || ''),
      password: db.password ? String(db.password) : '',
      charset: db.charset ? String(db.charset) : undefined,
    };
  }

  // Exclude
  if (Array.isArray(src.exclude)) {
    out.exclude = ensureWpmoveExcluded(src.exclude.filter((x: any) => typeof x === 'string' && x.trim()).map((s: string) => s.trim()));
  } else {
    // If no excludes in Movefile, add wpmove.yml as default
    out.exclude = ['wpmove.yml'];
  }

  // Paths overrides
  if (src.paths && typeof src.paths === 'object') {
    const p = src.paths as AnyObject;
    const paths: AnyObject = {};
    for (const k of ['wp_content', 'wp_config', 'plugins', 'mu_plugins', 'themes', 'uploads', 'languages']) {
      if (typeof p[k] === 'string' && p[k].trim()) paths[k] = p[k];
    }
    if (Object.keys(paths).length) out.paths = paths;
  }

  // rsync options → best-effort delete flag
  const rsyncOpts = src.rsync_options;
  if (typeof rsyncOpts === 'string' && rsyncOpts.includes('--delete')) {
    out.sync = { delete: true };
  } else if (Array.isArray(rsyncOpts) && rsyncOpts.some((o: any) => String(o).includes('--delete'))) {
    out.sync = { delete: true };
  }

  return out;
}

function mapMovefileToWpmove(move: AnyObject): AnyObject {
  const out: AnyObject = {};
  for (const [key, val] of Object.entries(move)) {
    if (!val || typeof val !== 'object') continue;
    if (key === 'global') continue;
    // Heuristic: treat as env if it has any env-ish keys
    const v = val as AnyObject;
    const isEnv = 'wordpress_path' in v || 'database' in v || 'ssh' in v || 'vhost' in v || 'vhosts' in v;
    if (!isEnv) continue;
    out[key] = mapEnv(key, v);
  }
  return out;
}

export default function migrate(): Command {
  const cmd = new Command('migrate')
    .description('Migrate a WordMove Movefile into a wpmove.yml config')
    .option('-f, --force', 'overwrite existing wpmove.yml', false)
    .action(async (opts) => {
      const cwd = process.cwd();
      const target = path.resolve(cwd, 'wpmove.yml');
      if (await fs.pathExists(target) && !opts.force) {
        throw new Error(`Refusing to overwrite existing ${target}. Use --force to override.`);
      }

      const movefile = await findMovefile(cwd);
      if (!movefile) {
        throw new Error('No Movefile found. Searched: Movefile, Movefile.yml, movefile.yml');
      }

      logInfo(`Reading ${path.basename(movefile)}`);
      const content = await fs.readFile(movefile, 'utf8');
      let data: AnyObject;
      try {
        data = parse(content) as AnyObject;
      } catch (err: any) {
        throw new Error(`Failed to parse ${path.basename(movefile)}: ${err?.message || err}`);
      }

      const mapped = mapMovefileToWpmove(data);
      if (!Object.keys(mapped).length) {
        logWarn('Movefile parsed, but no environments were detected. Writing an empty template.');
      }

      const yml = stringify(mapped, { indent: 2 });
      await fs.writeFile(target, yml, 'utf8');
      logOk(`Wrote ${target}`);
    });
  return cmd;
}
