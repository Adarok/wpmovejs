import { Command } from 'commander';
import path from 'node:path';
import os from 'node:os';
import { getEnv, loadConfig, resolvePaths } from '../config.js';
import fs from 'fs-extra';
import { runHook } from '../hooks.js';
import { computeUrlPairs } from '../utils/urls.js';
import { rsync, ssh, shQuote } from '../utils/shell.js';
import { includePathsFor, excludePathsFor } from '../utils/rsyncFilters.js';
import { resolveTargets } from '../utils/targets.js';
import { wp } from '../services/wpcli.js';
import { buildRsyncOpts } from '../utils/syncOptions.js';
import { DEFAULT_WORDPRESS_EXCLUDES } from '../constants.js';

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
  .option('--all', 'include all: wordpress,uploads,themes,plugins,mu-plugins,languages,db')
  .option('--only <targets>', 'comma-separated alternatives to flags: db,uploads,plugins,themes,mu-plugins,languages,wordpress')
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

      const targets = resolveTargets(opts as any);
      const isDry = Boolean(opts.dry_run ?? opts.dryRun);

      if (!isDry) {
        await runHook(local.hooks?.push?.before);
        await runHook(remote.hooks?.push?.before, { ...remote.ssh, path: remote.ssh.path });
      }

      if (targets.includes('db')) {
        if (isDry) {
          console.log('[dry-run] Would export DB locally, transfer to remote, import, and run search-replace');
        } else {
          const tmpLocal = path.join(os.tmpdir(), `wpmovejs-${Date.now()}.sql`);
          const tmpBase = path.basename(tmpLocal);
          const remoteDir = remote.ssh.path;
          const tmpRemote = `${remoteDir}/${tmpBase}`;

          await wp(['db', 'export', tmpLocal], { bin: local.wp_cli, cwd: local.wordpress_path });
          await rsync(tmpLocal, `${remote.ssh.user}@${remote.ssh.host}:${tmpRemote}`, { ssh: remote.ssh, dryRun: false });
          await wp(['db', 'import', tmpRemote], { remote: { ...remote.ssh, path: remoteDir }, bin: remote.wp_cli });

          const pairs = computeUrlPairs(local, remote);
          for (const p of pairs) {
            await wp(['search-replace', p.search, p.replace, '--quiet', '--skip-columns=guid', '--all-tables', '--allow-root'], { remote: { ...remote.ssh, path: remoteDir }, bin: remote.wp_cli });
          }

          try { await fs.promises.unlink(tmpLocal); } catch {}
          try { await ssh(remote.ssh.user, remote.ssh.host, `rm -f ${shQuote(tmpRemote)}`, remote.ssh.port); } catch {}
        }
      }

  const localWp = local.wordpress_path ?? '.';
  const paths = resolvePaths(local);
      const remotePath = `${remote.ssh.user}@${remote.ssh.host}:${remote.ssh.path}`;
  const uploadsRel = paths.uploads;
  const pluginsRel = paths.plugins;
  const muPluginsRel = paths.mu_plugins;
  const themesRel = paths.themes;
  const languagesRel = paths.languages;

        const syncOpts = buildRsyncOpts(local, remote, { ssh: remote.ssh, dryRun: opts.dryRun });
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
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(pluginsRel), excludes: excludePathsFor(pluginsRel, syncOpts.excludes) });
      }
      if (targets.includes('mu-plugins')) {
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(muPluginsRel), excludes: excludePathsFor(muPluginsRel, syncOpts.excludes) });
      }
      if (targets.includes('themes')) {
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(themesRel), excludes: excludePathsFor(themesRel, syncOpts.excludes) });
      }
      if (targets.includes('languages')) {
        await rsync(srcRoot, dstRoot, { ...syncOpts, includes: includePathsFor(languagesRel), excludes: excludePathsFor(languagesRel, syncOpts.excludes) });
      }

      if (!isDry) {
        await runHook(local.hooks?.push?.after);
        await runHook(remote.hooks?.push?.after, { ...remote.ssh, path: remote.ssh.path });
      }
      console.log('Push completed');
    });
  return cmd;
}
