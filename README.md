# wpmovejs

[![npm version](https://img.shields.io/npm/v/%40adarok%2Fwpmovejs.svg)](https://www.npmjs.com/package/@adarok/wpmovejs)

TypeScript/Node.js CLI to move/sync WordPress between environments. Inspired by the Ruby tool "wordmove" with a modern, explicit UX.

## Requirements

- Node.js 18+
- rsync
- ssh
- wp-cli on local, and on remotes for remote DB operations

## Install

- Primary (npmjs.com):
  - `npm i -g @adarok/wpmovejs`
  - Package: https://www.npmjs.com/package/@adarok/wpmovejs
- Project-local:
  - `npm i -D @adarok/wpmovejs`
  - `npx wpmovejs --help`

## Quick Start

```sh
# 1) Create a comprehensive config
wpmovejs init
# Overwrite if it already exists
wpmovejs init --force

# 2) Edit wpmove.yml for your envs (local, staging, production)

# 3) Check your setup
wpmovejs doctor --environment local

# 4) See configured environments
wpmovejs list

# 5) Push db + uploads to remote
wpmovejs push -e production --only db,uploads

# 6) Pull db + uploads from remote
wpmovejs pull -e production --only db,uploads

# Tip: preview changes without touching DB/hooks
wpmovejs push -e production --all --dry-run
```

## Configuration: wpmove.yml

Run `wpmovejs init` to generate a full, commented template. Key fields:

- `wordpress_path`: Local WordPress root (directory containing `wp-content`).
- `wp_cli`: Command/binary to run wp-cli.
- `ssh`: Remote connection (`host`, `user`, `port`, `path`).
- `db`: Database credentials (`host`, `name`, `user`, `password`, `charset`).
- `urls`: One or more site URLs for search-replace; pairs map by index.
- `exclude`: Always-ignored patterns for file sync (applies both directions).
- `sync`: rsync tuning (`excludes`, `includes`, `delete`).
- `paths`: Override common paths if your layout is non-standard.
- `hooks`: Pre/post commands for `push` and `pull` (local/remote).

Example (trimmed):

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
  urls: [http://localhost]
  exclude: [.git/]
  sync:
    excludes: [wp-content/cache/]
    includes: []
    delete: false
  paths:
    wp_content: wp-content
    wp_config: wp-config.php
  hooks:
    push:
      before:
        local: [echo "Backing up local before push"]
      after:
        remote: [wp cache flush]

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
  urls: [https://example.com]
  exclude: [.well-known/acme-challenge/]
  sync:
    excludes: [wp-content/cache/]
    includes: []
    delete: false
```

## Commands

- `init`: Create a comprehensive `wpmove.yml` template.
- `doctor --environment <env>`: Verify prerequisites and validate config.
- `list`: Show configured environments and their targets.
- `push -e <env>`: Push db/files from local to `<env>`.
- `pull -e <env>`: Pull db/files from `<env>` to local.
- `ssh -e <env> [cmd...]`: Open interactive SSH or run a remote command (cd to `ssh.path` by default; `--no-cd` to disable).
- `shell -e <env>`: Open `wp shell` locally/remotely (respects `wordpress_path`/`ssh.path`; supports `--local`, `--no-cd`).
- `db shell|cli -e <env> [args...]`: Open DB client via `wp db cli` locally/remotely (supports `--local`, `--no-cd`).
- `wp -e <env> [args...]`: Run any wp-cli command in env context (flags passed through; `--path` injected automatically).

Global:
- `-v/--verbose`: Print executed commands.

Push/Pull targets:
- Flags: `-w/--wordpress`, `-u/--uploads`, `-t/--themes`, `-p/--plugins`, `-m/--mu-plugins`, `-l/--languages`, `-d/--db`, `--all`.
- `--only <targets>`: Comma-separated alternative (e.g., `--only db,uploads`).
- `--dry-run`: Preview file ops; DB and hooks are skipped entirely.

## File Sync Behavior

- Root-based rsync from WordPress root with include/exclude filters.
- Environment excludes applied both ways: `final = local.exclude ∪ remote.exclude ∪ destination.sync.excludes`.
- WordPress core target excludes `wp-content/*` (so core only) and `/wp-config.php` by default.
- Use `sync.includes` to surface specific paths when needed.

## Database Sync Behavior

- Export → transfer → import → `wp search-replace` pairs → cleanup temp files.
- URL pairs map by index; if lengths differ, remaining entries reuse the first value.
- Dry-run skips all DB work and hooks (only previews file changes).

## Utilities

SSH:
- `wpmovejs ssh -e production`
- `wpmovejs ssh -e production --no-cd`
- `wpmovejs ssh -e production wp core version --allow-root`

Shells:
- `wpmovejs shell -e local`
- `wpmovejs db shell -e production -- --pager=less -A`

wp-cli passthrough:
- `wpmovejs wp -e staging plugin list --format=json`
- `wpmovejs wp -e staging search-replace https://staging.example.com https://example.com --skip-columns=guid --all-tables`

## Tips

- Use `--dry-run` first to validate filters before syncing files.
- Keep `urls` accurate to avoid broken serialized data.
- Add sensitive files (like `wp-config.php`, `.env`) to `exclude` to be extra safe.
- `.env` is auto-loaded; use `--verbose` for troubleshooting.

## Development

```sh
npm i
npm run build
node dist/cli.js --help
```

```sh
# During development
npm run dev
```

Contributions welcome.