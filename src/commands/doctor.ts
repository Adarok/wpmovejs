import { Command } from 'commander';
import { getEnv, loadConfig, resolvePaths } from '../config.js';
import { whichCmd } from '../utils/shell.js';
import path from 'node:path';

export default function doctor(): Command {
  const cmd = new Command('doctor')
    .description('Check prerequisites and configuration')
  .option('-e, --environment <name>', 'environment name to validate', 'local')
  .action(async (opts: { environment: string }) => {
      const missing: string[] = [];
      const wpPath = await whichCmd('wp');
      if (!wpPath) missing.push('wp (wp-cli)');
      const rsyncPath = await whichCmd('rsync');
      if (!rsyncPath) missing.push('rsync');

      try {
        const config = await loadConfig();
        const env = getEnv(config, opts.environment);
        // Basic path checks
        const wpPath = env.wordpress_path ?? '.';
        if (path.isAbsolute(wpPath)) {
          missing.push(`wordpress_path should be relative to project (got absolute: ${wpPath})`);
        }
        const p = resolvePaths(env);
        const rels = [p.wp_content, p.plugins, p.mu_plugins, p.themes, p.uploads, p.languages, p.wp_config];
        if (rels.some((r) => r.startsWith('/') || r.includes('..'))) {
          missing.push('paths.* entries must be relative and must not contain ..');
        }
        // URL sanity
        if (env.urls && env.urls.length === 0) missing.push('urls is empty');
        if (env.urls && env.urls.some((u) => !/^https?:\/\//i.test(u))) missing.push('urls must start with http:// or https://');
        // SSH sanity
        if (env.ssh) {
          if (!env.ssh.path || !env.ssh.path.startsWith('/')) missing.push('ssh.path must be an absolute path starting with /');
        }
      } catch (e: any) {
        missing.push(e.message);
      }

      if (missing.length) {
        console.error('Doctor found issues:\n- ' + missing.join('\n- '));
        process.exitCode = 1;
      } else {
        console.log('All good.');
      }
    });
  return cmd;
}
