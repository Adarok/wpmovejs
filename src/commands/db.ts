import { Command } from 'commander';
import { loadConfig, getEnv } from '../config.js';
import { run, shQuote } from '../utils/shell.js';

function buildDbShell(): Command {
  const cmd = new Command('shell')
    .aliases(['cli'])
    .description('Open database CLI via wp db cli (local or remote)')
    .option('-e, --environment <name>', 'environment name (use "local" or a remote name)')
    .argument('[args...]', 'additional args passed to wp db cli')
    .option('--local', 'force running locally even if env has ssh')
    .option('--no-cd', 'do not cd into configured path before executing')
    .action(async (args: string[] = [], opts: { environment?: string; local?: boolean; cd?: boolean }) => {
      const cfg = await loadConfig();
      const envName = opts.environment ?? 'local';
      const env = getEnv(cfg, envName);
      const shouldCd = opts.cd !== false && Boolean(env.wordpress_path || env.ssh?.path);
      const extra = args.join(' ');

      if (opts.local || !env.ssh) {
        const wpPath = env.wordpress_path ?? process.cwd();
        const cmd = shouldCd ? `cd ${shQuote(wpPath)} && ${env.wp_cli ?? 'wp'} db cli ${extra}` : `${env.wp_cli ?? 'wp'} db cli ${extra}`;
        await run('sh', ['-lc', cmd]);
        return;
      }

      const userAtHost = `${env.ssh.user}@${env.ssh.host}`;
      const port = env.ssh.port ?? 22;
      const cdPrefix = shouldCd && env.ssh?.path ? `cd ${shQuote(env.ssh.path)} && ` : '';
      const remoteCmd = `${cdPrefix}${env.wp_cli ?? 'wp'} db cli ${extra}`.trim();
      await run('ssh', ['-t', '-p', String(port), userAtHost, remoteCmd]);
    });
  return cmd;
}

export default function db(): Command {
  const cmd = new Command('db').description('Database helpers');
  cmd.addCommand(buildDbShell());
  return cmd;
}
