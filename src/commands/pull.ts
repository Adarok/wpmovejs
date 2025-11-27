import { Command } from 'commander';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { getEnv, loadConfig, resolvePaths } from '../config.js';
import { rsync, ssh, shQuote } from '../utils/shell.js';
import { includePathsFor, excludePathsFor } from '../utils/rsyncFilters.js';
import { wp } from '../services/wpcli.js';
import { runHook } from '../hooks.js';
import { computeUrlPairs } from '../utils/urls.js';
import { buildRsyncOpts } from '../utils/syncOptions.js';
import { DEFAULT_WORDPRESS_EXCLUDES } from '../constants.js';
import { resolveTargets } from '../utils/targets.js';
import { logDry, logInfo, logOk, logWarn } from '../state.js';
import { preflight } from '../preflight.js';

export default function pull(): Command {
  const cmd = new Command('pull')
  .description('Pull database and/or files from remote to local environment')
  .option('-e, --environment <name>', 'remote environment name to pull from')
  .option('-w, --wordpress', 'include WordPress core (excluding wp-content)')
  .option('-u, --uploads', 'include uploads')
  .option('-t, --themes', 'include themes')
  .option('-p, --plugins', 'include plugins')
  .option('-m, --mu-plugins', 'include mu-plugins')
  .option('-l, --languages', 'include languages')
  .option('-d, --db', 'include database')
  .option('--mysql', 'use remote mysql/mysqldump instead of wp-cli for DB operations')
  .option('--all', 'include all: wordpress,uploads,themes,plugins,mu-plugins,languages,db')
  .option('--only <targets>', 'comma-separated alternatives to flags: db,uploads,plugins,themes,mu-plugins,languages,wordpress')
  .option('--items <names>', 'comma-separated list of specific plugin or theme names to sync (use with -p/-t)')
    .option('--dry-run', 'show what would be done', false)
    .action(async (opts) => {
      const remoteName = opts.environment;
      if (!remoteName) throw new Error('Missing --environment/-e. Example: wpmovejs pull -e staging --only db,uploads');
      const cfg = await loadConfig();
      const local = getEnv(cfg, 'local');
      const remote = getEnv(cfg, remoteName);
      if (!remote.ssh) throw new Error(`Remote '${remoteName}' has no ssh config`);

  const targets = resolveTargets(opts as any);

      const isDry = Boolean(opts.dry_run ?? opts.dryRun);

      // Parse specific items if provided
      const specificItems = opts.items ? opts.items.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined;
      if (specificItems && specificItems.length > 0 && !targets.includes('plugins') && !targets.includes('themes')) {
        throw new Error('--items requires -p/--plugins or -t/--themes flag');
      }

      let remoteWpAvailable = true;
      if (!isDry) {
        const res = await preflight(local, remote, { targets, operation: 'pull', forceMysql: Boolean(opts.mysql) });
        remoteWpAvailable = res.remoteWpAvailable;
      }
      if (!isDry) {
        await runHook(local.hooks?.pull?.before);
        await runHook(remote.hooks?.pull?.before, { ...remote.ssh, path: remote.ssh.path });
      }

  const localWp = local.wordpress_path ?? '.';
  const paths = resolvePaths(local);
      const remotePath = `${remote.ssh.user}@${remote.ssh.host}:${remote.ssh.path}`;
  const uploadsRel = paths.uploads;
  const pluginsRel = paths.plugins;
  const muPluginsRel = paths.mu_plugins;
  const themesRel = paths.themes;
  const languagesRel = paths.languages;

  const syncOpts = buildRsyncOpts(remote, local, { ssh: remote.ssh, dryRun: opts.dryRun, delete: true });
      const srcRoot = `${remotePath}/`;
      const dstRoot = localWp.endsWith('/') ? localWp : localWp + '/';
      if (targets.includes('wordpress')) {
        const excludes = ['/' + resolvePaths(remote).wp_content.replace(/^\/?/, '') + '/*', ...DEFAULT_WORDPRESS_EXCLUDES, ...(syncOpts.excludes ?? [])];
        await rsync(srcRoot, dstRoot, { ...syncOpts, excludes, label: 'WordPress core' });
      }
      if (targets.includes('uploads')) await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(uploadsRel), excludes: excludePathsFor(uploadsRel, syncOpts.excludes), label: 'Uploads' });
      if (targets.includes('plugins')) {
        const items = specificItems;
        const label = items ? `Plugins (${items.join(', ')})` : 'Plugins';
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(pluginsRel, items), excludes: excludePathsFor(pluginsRel, syncOpts.excludes, items), label });
      }
      if (targets.includes('mu-plugins')) await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(muPluginsRel), excludes: excludePathsFor(muPluginsRel, syncOpts.excludes), label: 'MU-Plugins' });
      if (targets.includes('themes')) {
        const items = specificItems;
        const label = items ? `Themes (${items.join(', ')})` : 'Themes';
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(themesRel, items), excludes: excludePathsFor(themesRel, syncOpts.excludes, items), label });
      }
      if (targets.includes('languages')) await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(languagesRel), excludes: excludePathsFor(languagesRel, syncOpts.excludes), label: 'Languages' });

      // Run DB last to ensure themes/plugins/mu-plugins are present for wp-cli
      if (targets.includes('db')) {
        if (isDry) {
          logDry('Would export DB on remote, transfer, import locally, and run search-replace');
        } else {
        logInfo('Database pull: export remote → import local and search-replace');
        const remoteDir = remote.ssh.path;
        const tmpRemote = `${remoteDir}/wpmovejs-${Date.now()}.sql`;
        const tmpLocal = path.join(os.tmpdir(), path.basename(tmpRemote));

        try {
          if (opts.mysql || !remoteWpAvailable) {
            // Fallback: remote dump using mysqldump with credentials
            const db = remote.db!;
            const creds = [
              `-h${db.host}`,
              `-u${db.user}`,
              db.password ? `-p${db.password}` : '',
              db.name,
            ].filter(Boolean).join(' ');

            // Try with --set-gtid-purged=OFF first (supported in MySQL 5.6+/MariaDB 10.0+)
            // Fall back without it if the flag is not recognized
            try {
              await ssh(
                remote.ssh.user,
                remote.ssh.host,
                `sh -lc ${shQuote(`cd ${shQuote(remoteDir)} && mysqldump ${creds} --single-transaction --set-gtid-purged=OFF > ${shQuote(tmpRemote)}`)}`,
                remote.ssh.port,
                { stdio: 'pipe' }
              );
            } catch (err: any) {
              // Check if error is due to unknown variable
              if (err?.message?.includes('unknown variable') || err?.message?.includes('set-gtid-purged')) {
                logWarn('mysqldump --set-gtid-purged not supported, retrying without it');
                await ssh(
                  remote.ssh.user,
                  remote.ssh.host,
                  `sh -lc ${shQuote(`cd ${shQuote(remoteDir)} && mysqldump ${creds} --single-transaction > ${shQuote(tmpRemote)}`)}`,
                  remote.ssh.port,
                  { stdio: 'pipe' }
                );
              } else {
                throw err;
              }
            }
          } else {
            await wp(['db', 'export', tmpRemote], { remote: { ...remote.ssh, path: remoteDir }, bin: remote.wp_cli });
          }
          await rsync(`${remote.ssh.user}@${remote.ssh.host}:${tmpRemote}`, tmpLocal, { ssh: remote.ssh, dryRun: false });
          await wp(['db', 'import', tmpLocal], { bin: local.wp_cli, cwd: local.wordpress_path });
          // Always run local search-replace after import (both fallback and normal paths)
          const pairs = computeUrlPairs(remote, local);
          for (const p of pairs) {
            await wp(['search-replace', p.search, p.replace, '--quiet', '--skip-columns=guid', '--all-tables', '--allow-root'], { bin: local.wp_cli, cwd: local.wordpress_path });
          }
        } finally {
          // Always clean up temp files, even if operation fails
          try { await fs.promises.unlink(tmpLocal); } catch {}
          try { await ssh(remote.ssh.user, remote.ssh.host, `rm -f ${shQuote(tmpRemote)}`, remote.ssh.port); } catch {}
        }
        logOk('Database pull completed');
        }
      }

      if (!isDry) {
        await runHook(local.hooks?.pull?.after);
        await runHook(remote.hooks?.pull?.after, { ...remote.ssh, path: remote.ssh.path });
      }
  logOk('Pull completed');
    });
  return cmd;
}
