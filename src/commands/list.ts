import { Command } from 'commander';
import { loadConfig } from '../config.js';

export default function listCmd(): Command {
  const cmd = new Command('list')
    .description('List configured environments')
    .action(async () => {
      const cfg = await loadConfig();
      const names = Object.keys(cfg);
      if (!names.length) {
        console.log('No environments configured in wpmove.yml');
        return;
      }
      for (const name of names) {
        const env = cfg[name];
        const target = env.ssh ? `${env.ssh.user}@${env.ssh.host}:${env.ssh.path}` : 'local';
        console.log(`${name} -> ${target}`);
      }
    });
  return cmd;
}
