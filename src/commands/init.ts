import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';

export default function init(): Command {
  const cmd = new Command('init')
    .description('Create a comprehensive wpmove.yml in the current directory')
    .option('-f, --force', 'overwrite existing file if present')
    .action(async (opts) => {
      const file = path.resolve(process.cwd(), 'wpmove.yml');
      const exists = await fs.pathExists(file);
      if (exists && !opts.force) {
        console.error(`File already exists: ${file}. Use --force to overwrite.`);
        process.exitCode = 1;
        return;
      }

      const template = `# wpmove.yml
# Environments configuration for WordPress migrations
# This template includes all supported options with sensible defaults.

local:
  # Path to your local WordPress installation (must be absolute, e.g., /var/www/html)
  # If omitted, current working directory is used
  # wordpress_path: /absolute/path/to/wordpress
  # wp-cli command/binary to use locally
  wp_cli: wp
  # Local database credentials (used when pushing db to remote)
  db:
    host: 127.0.0.1
    name: wordpress
    user: root
    password: ''
    charset: utf8mb4
  # One or more URLs; used to compute search-replace pairs during DB sync
  urls:
    - http://localhost
  # Top-level excludes always ignored when syncing this environment
  exclude:
    - .git/
    - node_modules/
    - '*.sql'
    - wp-config.php
    - wpmove*.yml
  # Rsync tuning applied when this env is the destination of pull
  sync:
    excludes:
      - wp-content/cache/
    includes: []
    delete: false
  # Path overrides; adjust if your structure is non-standard
  paths:
    wp_content: wp-content
    wp_config: wp-config.php
    plugins: wp-content/plugins
    mu_plugins: wp-content/mu-plugins
    themes: wp-content/themes
    uploads: wp-content/uploads
    languages: wp-content/languages
  # Hooks executed before/after push/pull. Commands run via sh -lc locally or over SSH remotely.
  hooks:
    push:
      before:
        local:
          - echo "Backing up local before push"
        remote: []
      after:
        local: []
        remote:
          - wp cache flush
    pull:
      before:
        local: []
        remote: []
      after:
        local:
          - wp cache flush
        remote: []

production:
  # Remote SSH connection details (required for push/pull)
  ssh:
    host: example.com
    user: deploy
    port: 22
    path: /var/www/html
  # wp-cli command on the remote host
  wp_cli: wp
  # Remote database credentials (used when pulling db from remote)
  db:
    host: 127.0.0.1
    name: wordpress
    user: wp
    password: secret
    charset: utf8mb4
  # One or more URLs on the remote site
  urls:
    - https://example.com
  # Always ignored when syncing to this remote
  exclude:
    - .well-known/acme-challenge/
    - '*.sql'
    - wpmove.yml
  # Rsync tuning applied when this env is the destination of push
  sync:
    excludes:
      - wp-content/cache/
    includes: []
    delete: false
  # Path overrides for the remote host (adjust if needed)
  paths:
    wp_content: wp-content
    wp_config: wp-config.php
    plugins: wp-content/plugins
    mu_plugins: wp-content/mu-plugins
    themes: wp-content/themes
    uploads: wp-content/uploads
    languages: wp-content/languages
  # Remote hooks
  hooks:
    push:
      before:
        local: []
        remote:
          - echo "About to deploy on remote"
      after:
        local: []
        remote:
          - wp cache flush --allow-root
    pull:
      before:
        local: []
        remote: []
      after:
        local: []
        remote: []
  # Forbid specific operations on this environment (safety measure for production)
  # Set to true to prevent accidental push/pull of specific targets
  forbid:
    push:
      db: false        # Set to true to prevent pushing database to this environment
      # wordpress: false
      # plugins: false
      # themes: false
      # uploads: false
      # mu_plugins: false
      # languages: false
    pull:
      db: false        # Set to true to prevent pulling database from this environment
      # wordpress: false
      # plugins: false
      # themes: false
      # uploads: false
      # mu_plugins: false
      # languages: false
`;

      await fs.writeFile(file, template, { encoding: 'utf8', mode: 0o600 });
      console.log(`Created ${file}`);
    });

  return cmd;
}
