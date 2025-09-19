import { Command } from 'commander';
import { loadConfig, getEnv } from '../config.js';
import { run, shQuote } from '../utils/shell.js';

export default function shell(): Command {
  const cmd = new Command('shell')
    .description('Open a WP-CLI interactive shell (wp shell) locally or on a remote environment')
    .argument('<env>', 'environment name (use "local" or a remote name)')
    .option('--local', 'force running locally even if env has ssh')
    .option('--no-cd', 'do not cd into configured path before starting the shell')
    .action(async (envName: string, opts: { local?: boolean; cd?: boolean }) => {
      const cfg = await loadConfig();
      const env = getEnv(cfg, envName);
      const shouldCd = opts.cd !== false && Boolean(env.wordpress_path || env.ssh?.path);

      if (opts.local || !env.ssh) {
        const wpPath = env.wordpress_path ?? process.cwd();
        const cmd = shouldCd ? `cd ${shQuote(wpPath)} && ${env.wp_cli ?? 'wp'} shell` : `${env.wp_cli ?? 'wp'} shell`;
        await run('sh', ['-lc', cmd]);
        return;
      }

      const userAtHost = `${env.ssh.user}@${env.ssh.host}`;
      const port = env.ssh.port ?? 22;
      const cdPrefix = shouldCd && env.ssh?.path ? `cd ${shQuote(env.ssh.path)} && ` : '';
      const remoteCmd = `${cdPrefix}${env.wp_cli ?? 'wp'} shell`;
      await run('ssh', ['-t', '-p', String(port), userAtHost, remoteCmd]);
    });

  return cmd;
}
