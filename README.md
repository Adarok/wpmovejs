# wpmovejs

TypeScript/Node.js CLI to move/sync WordPress between environments. Inspired by the Ruby tool "wordmove", but modernized with Commander and a simpler, explicit UX.

## Requirements

- Node.js 18+
- rsync
- ssh
- wp-cli available locally, and on remotes for remote DB operations

## Install

Global:

```sh
npm i -g wpmovejs
```

Local to a repo:

```sh
npm i -D wpmovejs
npx wpmovejs --help
wpmovejs push production --only db,uploads --dry-run

## Quick start

```sh
# Create a comprehensive config
wpmovejs init
# Overwrite if it already exists
wpmovejs init --force

# Check your setup
wpmovejs doctor --env local

# List environments
  sync:
    excludes:
      - .git/
      - wp-content/cache/
    delete: false
  hooks:
    push:
      before:
        local:
          - echo "Backing up local before push"
      after:
        remote:
          - wp cache flush
wpmovejs list

# Push db + uploads to remote
wpmovejs push production --only db,uploads

# Pull db + uploads from remote
wpmovejs pull production --only db,uploads
```

## Configuration: `wpmove.yml`

```yaml
local:
  wordpress_path: ./wordpress
  wp_cli: wp
  db:
    host: 127.0.0.1
    name: wordpress
    user: root
    password: ''
    charset: utf8mb4
  urls:
    - http://localhost
  exclude:
    - .git/
  sync:
    excludes:
      - wp-content/cache/
    includes: []
    delete: false
  paths:
    wp_content: wp-content
    wp_config: wp-config.php
    plugins: wp-content/plugins
    mu_plugins: wp-content/mu-plugins
    themes: wp-content/themes
    uploads: wp-content/uploads
    languages: wp-content/languages
  hooks:
    push:
      before:
        local:
          - echo "Backing up local before push"
      after:
        remote:
          - wp cache flush

production:
  ssh:
    host: example.com
    user: deploy
    port: 22
    path: /var/www/html
  wp_cli: wp
  db:
    host: 127.0.0.1
    name: wordpress
    user: wp
    password: secret
    charset: utf8mb4
  urls:
    - https://example.com
  exclude:
    - .well-known/acme-challenge/
  sync:
    excludes:
      - wp-content/cache/
    includes: []
    delete: false
  paths:
    wp_content: wp-content
    wp_config: wp-config.php
    plugins: wp-content/plugins
    mu_plugins: wp-content/mu-plugins
    themes: wp-content/themes
    uploads: wp-content/uploads
    languages: wp-content/languages
  hooks:
    push:
      before:
        remote:
          - echo "About to deploy on remote"
      after:
        remote:
          - wp cache flush --allow-root
```

Notes:
- `wordpress_path` is where WordPress lives locally (used for rsync paths and local wp-cli cwd).
- Remote `ssh.path` should be the directory containing WordPress (the directory with `wp-content`).
- `urls` determine search-replace pairs during db sync.

## Commands

- `init`: Generate a starter `wpmove.yml`.
- `doctor`: Verify prerequisites and validate config.
- `list`: Show configured environments and their targets.
- `push <remote>`: Push db/files from `local` to `<remote>`.
- `pull <remote>`: Pull db/files from `<remote>` to `local`.

Use `--only db,uploads,plugins,themes` to select subsets. Add `--dry-run` to preview rsync/db steps and `-v/--verbose` to print executed commands.

## Sync Options & Hooks

Add under the environment where they apply (remote for push, local for pull):

```yaml
sync:
  excludes:
    - .git/
    - wp-content/cache/
  includes: []
  delete: false
hooks:
  push:
    before:
      local:
        - echo "Backup local before push"
    after:
      remote:
        - wp cache flush
  pull:
    before: {}
    after: {}

Notes on excludes:
- Environment-level `exclude` applies in both directions. We always combine `local.exclude ∪ remote.exclude`.
- WordPress core sync (`--wordpress`) excludes the target's `wp-content/*` by default and also `wp-config.php` to avoid overwriting sensitive local settings.
```

## Implementation Notes

- Uses `rsync` for files and `wp-cli` for database operations.
- Commander-based CLI with subcommands for clear extensibility.
- YAML config with schema validation via Zod.

## Development

```sh
pnpm i # or npm i
pnpm build
node dist/cli.js --help
```

```sh
# During development
pnpm dev
```

Contributions welcome.