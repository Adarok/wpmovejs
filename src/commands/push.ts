import { Command } from 'commander';
import path from 'node:path';
import os from 'node:os';
import { getEnv, loadConfig, resolvePaths, handleForbiddenTargets } from '../config.js';
import fs from 'fs-extra';
import { runHook } from '../hooks.js';
import { computeUrlPairs } from '../utils/urls.js';
import { rsync, ssh, shQuote } from '../utils/shell.js';
import { includePathsFor, excludePathsFor } from '../utils/rsyncFilters.js';
import { resolveTargets } from '../utils/targets.js';
import { wp } from '../services/wpcli.js';
import { buildRsyncOpts } from '../utils/syncOptions.js';
import { DEFAULT_WORDPRESS_EXCLUDES } from '../constants.js';
import { logDry, logInfo, logOk, logWarn } from '../state.js';
import { preflight } from '../preflight.js';

export default function push(): Command {
  const cmd = new Command('push')
  .description('Push database and/or files from local to remote environment')
  .option('-e, --environment <name>', 'remote environment name to push to')
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
      if (!remoteName) {
        throw new Error('Missing --environment/-e. Example: wpmovejs push -e staging --only db,uploads');
      }
      const cfg = await loadConfig();
      const local = getEnv(cfg, 'local');
      const remote = getEnv(cfg, remoteName);
      if (!remote.ssh) throw new Error(`Remote '${remoteName}' has no ssh config`);

      const requestedTargets = resolveTargets(opts as any);
      const isDry = Boolean(opts.dry_run ?? opts.dryRun);

      // Check for forbidden targets
      const targets = handleForbiddenTargets(requestedTargets, remote, 'push', remoteName, logWarn);
      if (targets === null) {
        return;
      }

      // Parse specific items if provided
      const specificItems = opts.items ? opts.items.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined;
      if (specificItems && specificItems.length > 0 && !targets.includes('plugins') && !targets.includes('themes')) {
        throw new Error('--items requires -p/--plugins or -t/--themes flag');
      }

      let remoteWpAvailable = true;
      if (!isDry) {
        const res = await preflight(local, remote, { targets, operation: 'push', forceMysql: Boolean(opts.mysql) });
        remoteWpAvailable = res.remoteWpAvailable;
      }

      if (!isDry) {
        await runHook(local.hooks?.push?.before);
        await runHook(remote.hooks?.push?.before, { ...remote.ssh, path: remote.ssh.path });
      }

  const localWp = local.wordpress_path ?? '.';
  const paths = resolvePaths(local);
      const remotePath = `${remote.ssh.user}@${remote.ssh.host}:${remote.ssh.path}`;
  const uploadsRel = paths.uploads;
  const pluginsRel = paths.plugins;
  const muPluginsRel = paths.mu_plugins;
  const themesRel = paths.themes;
  const languagesRel = paths.languages;

        const syncOpts = buildRsyncOpts(local, remote, { ssh: remote.ssh, dryRun: opts.dryRun, delete: true });
      // Sync from the WP root so filters behave consistently
      const srcRoot = localWp.endsWith('/') ? localWp : localWp + '/';
      const dstRoot = remotePath + '/';
      if (targets.includes('wordpress')) {
        const wpContentRel = resolvePaths(local).wp_content;
        const excludes = ['/' + wpContentRel.replace(/^\/?/, '') + '/*', ...DEFAULT_WORDPRESS_EXCLUDES, ...(syncOpts.excludes ?? [])];
        await rsync(srcRoot, dstRoot, { ...syncOpts, excludes });
      }
      if (targets.includes('uploads')) {
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(uploadsRel), excludes: excludePathsFor(uploadsRel, syncOpts.excludes) });
      }
      if (targets.includes('plugins')) {
        const items = specificItems;
        const label = items ? `Plugins (${items.join(', ')})` : undefined;
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(pluginsRel, items), excludes: excludePathsFor(pluginsRel, syncOpts.excludes, items), label });
      }
      if (targets.includes('mu-plugins')) {
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(muPluginsRel), excludes: excludePathsFor(muPluginsRel, syncOpts.excludes) });
      }
      if (targets.includes('themes')) {
        const items = specificItems;
        const label = items ? `Themes (${items.join(', ')})` : undefined;
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(themesRel, items), excludes: excludePathsFor(themesRel, syncOpts.excludes, items), label });
      }
      if (targets.includes('languages')) {
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(languagesRel), excludes: excludePathsFor(languagesRel, syncOpts.excludes) });
      }

      // Run DB last to ensure files/plugins are present for wp-cli operations
      if (targets.includes('db')) {
        if (isDry) {
          logDry('Would export DB locally, transfer to remote, import, and run search-replace');
        } else {
          logInfo('Database push: export local → import remote and search-replace');
          const tmpLocal = path.join(os.tmpdir(), `wpmovejs-${Date.now()}.sql`);
          const transformedLocal = path.join(os.tmpdir(), `wpmovejs-${Date.now()}-sr.sql`);
          const tmpBase = path.basename(tmpLocal);
          const remoteDir = remote.ssh.path;
          const tmpRemote = `${remoteDir}/${tmpBase}`;

          try {
            if (opts.mysql || !remoteWpAvailable) {
              // Create transformed SQL locally without modifying DB, then import remotely via mysql
              const pairs = computeUrlPairs(local, remote);
              const flatPairs = pairs.flatMap((p) => [p.search, p.replace]);
              await wp(['search-replace', ...flatPairs, '--quiet', '--skip-columns=guid', '--all-tables', '--allow-root', `--export=${transformedLocal}`], { bin: local.wp_cli, cwd: local.wordpress_path });
              await rsync(transformedLocal, `${remote.ssh.user}@${remote.ssh.host}:${tmpRemote}`, { ssh: remote.ssh, dryRun: false });
              // Fallback: use mysql client to import
              const db = remote.db!;
              const mysqlCreds = [
                `-h${db.host}`,
                `-u${db.user}`,
                db.password ? `-p${db.password}` : '',
                db.name,
              ].filter(Boolean).join(' ');
              const mysqlCmd = `mysql ${mysqlCreds} < ${shQuote(tmpRemote)}`;
              await ssh(
                remote.ssh.user,
                remote.ssh.host,
                `sh -lc ${shQuote(`cd ${shQuote(remoteDir)} && ${mysqlCmd}`)}`,
                remote.ssh.port,
                { stdio: 'pipe' }
              );
            } else {
              await wp(['db', 'export', tmpLocal], { bin: local.wp_cli, cwd: local.wordpress_path });
              await rsync(tmpLocal, `${remote.ssh.user}@${remote.ssh.host}:${tmpRemote}`, { ssh: remote.ssh, dryRun: false });
              await wp(['db', 'import', tmpRemote], { remote: { ...remote.ssh, path: remoteDir }, bin: remote.wp_cli });
            }

            if (!(opts.mysql || !remoteWpAvailable)) {
              const pairs = computeUrlPairs(local, remote);
              for (const p of pairs) {
                await wp(['search-replace', p.search, p.replace, '--quiet', '--skip-columns=guid', '--all-tables', '--allow-root'], { remote: { ...remote.ssh, path: remoteDir }, bin: remote.wp_cli });
              }
            }
          } finally {
            // Always clean up temp files, even if operation fails
            try { await fs.promises.unlink(tmpLocal); } catch {}
            try { await fs.promises.unlink(transformedLocal); } catch {}
            try { await ssh(remote.ssh.user, remote.ssh.host, `rm -f ${shQuote(tmpRemote)}`, remote.ssh.port); } catch {}
          }
          logOk('Database push completed');
        }
      }

      if (!isDry) {
        await runHook(local.hooks?.push?.after);
        await runHook(remote.hooks?.push?.after, { ...remote.ssh, path: remote.ssh.path });
      }

      logOk('Push completed');
    });
  return cmd;
}
