import { Command } from 'commander';
import { getEnv, loadConfig } from '../config.js';
import { wp as wpExec } from '../services/wpcli.js';

export default function wp(): Command {
  const cmd = new Command('wp')
    .description('Run wp-cli in the context of an environment (local or remote)')
    .option('-e, --environment <name>', 'environment name (use "local" or a remote name)')
    .allowUnknownOption(true)
    .passThroughOptions()
    .argument('[args...]', 'wp-cli arguments and options (passed as-is)')
    .action(async (args: string[] = [], opts: { environment?: string }) => {
      const cfg = await loadConfig();
      const envName = opts.environment ?? 'local';
      const env = getEnv(cfg, envName);
      const bin = env.wp_cli ?? 'wp';
      if (env.ssh) {
        await wpExec(args, { bin, remote: { ...env.ssh, path: env.ssh.path } });
      } else {
        await wpExec(args, { bin, cwd: env.wordpress_path });
      }
    });
  return cmd;
}
