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
- `ssh <remote> [cmd...]`: Open an interactive SSH session or run a remote command. By default, it cd's into the configured `ssh.path`. Use `--no-cd` to disable.
- `shell <env>`: Open a WP-CLI interactive shell (`wp shell`) on `local` or a remote environment. Respects `wordpress_path`/`ssh.path`. Use `--no-cd` to disable, `--local` to force local.
- `db shell|cli <env> [args...]`: Open the DB CLI via `wp db cli` locally or remotely. Supports `--no-cd` and `--local`.
- `wp <env> [args...]`: Run any wp-cli command in the context of an environment. All flags are passed through.

Use `--only db,uploads,plugins,themes` to select subsets. Add `--dry-run` to preview rsync/db steps and `-v/--verbose` to print executed commands.

### SSH examples

```sh
# Open an interactive shell on production, cd into ssh.path
wpmovejs ssh production

# Run a command remotely and return
wpmovejs ssh production wp core version --allow-root

# Open a session without cd
wpmovejs ssh production --no-cd
```

### WP-CLI shell examples

```sh
# Local wp shell inside wordpress_path
wpmovejs shell local

# Remote wp shell inside ssh.path
wpmovejs shell production

# Force local even if env has ssh configured
wpmovejs shell local --local

# Without cd into site path
wpmovejs shell production --no-cd
```

### DB shell examples

```sh
# Local MySQL client via wp db cli
wpmovejs db shell local

# Remote MySQL client via wp db cli
wpmovejs db shell production

# Pass extra args to the DB client
wpmovejs db shell production -- --pager=less -A
```

### wp-cli passthrough examples

```sh
# Run a core update check remotely
wpmovejs wp production core check-update

# List plugins locally with custom format
wpmovejs wp local plugin list --format=json

# Run search-replace remotely (path is injected)
wpmovejs wp staging search-replace https://staging.example.com https://example.com --skip-columns=guid --all-tables
```

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