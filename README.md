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
```

## Quick start

```sh
# Create a config
wpmovejs init

# Check your setup
wpmovejs doctor --env local

# List environments
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
  urls:
    - http://localhost

production:
  ssh:
    host: example.com
    user: deploy
    port: 22
    path: /var/www/html
  db:
    host: 127.0.0.1
    name: wordpress
    user: wp
    password: secret
  urls:
    - https://example.com
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

Use `--only db,uploads,plugins,themes` to select subsets.

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