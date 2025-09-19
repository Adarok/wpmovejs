import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { whichCmd } from '../utils/shell.js';

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
        if (!config[opts.environment]) {
          missing.push(`environment '${opts.environment}' not found in wpmove.yml`);
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
