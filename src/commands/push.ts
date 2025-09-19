import { Command } from 'commander';
import path from 'node:path';
import os from 'node:os';
import { getEnv, loadConfig } from '../config.js';
import fs from 'fs-extra';
import { rsync } from '../utils/shell.js';
import { wp } from '../services/wpcli.js';

export default function push(): Command {
  const cmd = new Command('push')
    .description('Push database and/or files from local to remote environment')
    .argument('<remote>', 'remote environment name to push to')
    .option('--only <targets>', 'comma-separated: db,uploads,plugins,themes', 'db,uploads')
    .action(async (remoteName, opts) => {
      const cfg = await loadConfig();
      const local = getEnv(cfg, 'local');
      const remote = getEnv(cfg, remoteName);
      if (!remote.ssh) throw new Error(`Remote '${remoteName}' has no ssh config`);

      const targets = String(opts.only).split(',').map((s) => s.trim());

      if (targets.includes('db')) {
        const tmpLocal = path.join(os.tmpdir(), `wpmovejs-${Date.now()}.sql`);
        const tmpBase = path.basename(tmpLocal);
        const remoteDir = remote.ssh.path;
        const tmpRemote = `${remoteDir}/${tmpBase}`;

        await wp(['db', 'export', tmpLocal], { bin: local.wp_cli, cwd: local.wordpress_path });
        await rsync(tmpLocal, `${remote.ssh.user}@${remote.ssh.host}:${tmpRemote}`, { ssh: remote.ssh });
        await wp(['db', 'import', tmpRemote], { remote: { ...remote.ssh, path: remoteDir }, bin: remote.wp_cli });

        const search = (local.urls && local.urls[0]) ?? 'http://localhost';
        const replace = (remote.urls && remote.urls[0]) ?? `https://${remote.ssh.host}`;
        await wp(['db', 'search-replace', search, replace, '--all-tables'], { remote: { ...remote.ssh, path: remoteDir }, bin: remote.wp_cli });

        try { await fs.promises.unlink(tmpLocal); } catch {}
        try { await wp(['eval', `unlink('${tmpRemote}')`], { remote: { ...remote.ssh, path: remoteDir }, bin: remote.wp_cli }); } catch {}
      }

      const localWp = local.wordpress_path ?? '.';
      const remotePath = `${remote.ssh.user}@${remote.ssh.host}:${remote.ssh.path}`;
      const uploads = path.join(localWp, 'wp-content/uploads/');
      const plugins = path.join(localWp, 'wp-content/plugins/');
      const themes = path.join(localWp, 'wp-content/themes/');

      if (targets.includes('uploads')) await rsync(uploads, remotePath + '/wp-content/uploads/', { ssh: remote.ssh });
      if (targets.includes('plugins')) await rsync(plugins, remotePath + '/wp-content/plugins/', { ssh: remote.ssh });
      if (targets.includes('themes')) await rsync(themes, remotePath + '/wp-content/themes/', { ssh: remote.ssh });

      console.log('Push completed');
    });
  return cmd;
}
