import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';

export default function init(): Command {
  const cmd = new Command('init')
    .description('Create a sample wpmove.yml in the current directory')
    .option('-f, --force', 'overwrite existing file if present')
    .action(async (opts) => {
      const file = path.resolve(process.cwd(), 'wpmove.yml');
      const exists = await fs.pathExists(file);
      if (exists && !opts.force) {
        console.error(`File already exists: ${file}. Use --force to overwrite.`);
        process.exitCode = 1;
        return;
      }

      const template = `# wpmove.yml\n# Environments configuration for WordPress migrations\n# Rename or adjust as needed.\nlocal:\n  wordpress_path: ./wordpress\n  wp_cli: wp\n  db:\n    host: 127.0.0.1\n    name: wordpress\n    user: root\n    password: ''\n    charset: utf8mb4\n  urls:\n    - http://localhost\nremote:\n  ssh:\n    host: example.com\n    user: deploy\n    port: 22\n    path: /var/www/html\n  db:\n    host: 127.0.0.1\n    name: wordpress\n    user: wp\n    password: secret\n  urls:\n    - https://example.com\n`;

      await fs.writeFile(file, template, 'utf8');
      console.log(`Created ${file}`);
    });

  return cmd;
}
