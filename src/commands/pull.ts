import { Command } from 'commander';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { getEnv, loadConfig } from '../config.js';
import { rsync } from '../utils/shell.js';
import { wp } from '../services/wpcli.js';

export default function pull(): Command {
  const cmd = new Command('pull')
    .description('Pull database and/or files from remote to local environment')
    .argument('<remote>', 'remote environment name to pull from')
    .option('--only <targets>', 'comma-separated: db,uploads,plugins,themes', 'db,uploads')
    .action(async (remoteName, opts) => {
      const cfg = await loadConfig();
      const local = getEnv(cfg, 'local');
      const remote = getEnv(cfg, remoteName);
      if (!remote.ssh) throw new Error(`Remote '${remoteName}' has no ssh config`);

      const targets = String(opts.only).split(',').map((s) => s.trim());

      if (targets.includes('db')) {
        const remoteDir = remote.ssh.path;
        const tmpRemote = `${remoteDir}/wpmovejs-${Date.now()}.sql`;
        const tmpLocal = path.join(os.tmpdir(), path.basename(tmpRemote));

        await wp(['db', 'export', tmpRemote], { remote: { ...remote.ssh, path: remoteDir }, bin: remote.wp_cli });
        await rsync(`${remote.ssh.user}@${remote.ssh.host}:${tmpRemote}`, tmpLocal, { ssh: remote.ssh });
        await wp(['db', 'import', tmpLocal], { bin: local.wp_cli, cwd: local.wordpress_path });

        const search = (remote.urls && remote.urls[0]) ?? `https://${remote.ssh.host}`;
        const replace = (local.urls && local.urls[0]) ?? 'http://localhost';
        await wp(['db', 'search-replace', search, replace, '--all-tables'], { bin: local.wp_cli, cwd: local.wordpress_path });

        try { await fs.promises.unlink(tmpLocal); } catch {}
        try { await wp(['eval', `unlink('${tmpRemote}')`], { remote: { ...remote.ssh, path: remoteDir }, bin: remote.wp_cli }); } catch {}
      }

      const localWp = local.wordpress_path ?? '.';
      const remotePath = `${remote.ssh.user}@${remote.ssh.host}:${remote.ssh.path}`;
      const uploads = path.join(localWp, 'wp-content/uploads/');
      const plugins = path.join(localWp, 'wp-content/plugins/');
      const themes = path.join(localWp, 'wp-content/themes/');

      if (targets.includes('uploads')) await rsync(remotePath + '/wp-content/uploads/', uploads, { ssh: remote.ssh });
      if (targets.includes('plugins')) await rsync(remotePath + '/wp-content/plugins/', plugins, { ssh: remote.ssh });
      if (targets.includes('themes')) await rsync(remotePath + '/wp-content/themes/', themes, { ssh: remote.ssh });

      console.log('Pull completed');
    });
  return cmd;
}
