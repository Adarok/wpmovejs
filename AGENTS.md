# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

`@adarok/wpmovejs` — a TypeScript/Node.js (ESM, Node >= 20) CLI that moves and syncs WordPress
between environments (local, staging, production). It is a modern reimplementation of the Ruby
tool *wordmove*, favouring explicit, user-friendly UX over implicit magic.

Binary: `wpmovejs` → `dist/cli.js`. Built with tsup.

## Commands

```bash
npm run build       # tsup build (src/cli.ts -> dist/)
npm run dev         # tsup watch
npm run typecheck   # tsc --noEmit
npm test            # vitest run (unit)
npm run lint        # eslint . --ext .ts
npm run test:e2e    # build + docker-based e2e (requires test:e2e:setup first)
npm run test:e2e:full   # setup + e2e + teardown
```

Single test file: `npx vitest run tests/rsyncFilters.test.ts`

Before finishing a change, run at minimum `npm run typecheck` and `npm test`.

## Architecture

```
src/
├── cli.ts           # entry point, Commander.js program setup
├── config.ts        # loads wpmove.yml, validated with Zod at load time
├── constants.ts
├── state.ts         # global state (verbose) + colour-coded loggers
├── preflight.ts     # SSH / path / wp-cli availability checks
├── hooks.ts         # pre/post-operation hook execution
├── commands/        # one module per command, each exports a fn returning a Command
├── services/wpcli.ts# wp-cli execution wrapper
└── utils/           # shell, targets, rsyncFilters, syncOptions, urls
```

Commands are registered in [src/commands/index.ts](src/commands/index.ts):
`init`, `doctor`, `list`, `push`, `pull`, `ssh`, `shell`, `db`, `wp`, `migrate`, `browse`, `sniff`.

**Targets**: 7 sync targets — `wordpress`, `uploads`, `themes`, `plugins`, `mu-plugins`,
`languages`, `db` — selected via `-w -u -t -p -m -l -d`, `--all`, or `--only a,b`.
Default when nothing is specified: `db,uploads`. See [src/utils/targets.ts](src/utils/targets.ts).

**Forbid rules**: per-environment safety rules in config that block specific operations.

## Conventions

- ESM only (`"type": "module"`); use extensionless relative imports as existing files do.
- Config changes must be reflected in the Zod schema in [src/config.ts](src/config.ts).
- Adding a command: create `src/commands/<name>.ts` exporting a default fn returning a
  `Command`, then register it in `src/commands/index.ts`.
- Logging: always use the helpers from [src/state.ts](src/state.ts) rather than bare
  `console.log` — `logLocal` (cyan), `logRemote` (magenta), `logInfo` (blue), `logDry` (yellow),
  `logOk` (green), `logWarn` (yellow), `logError` (red), `logVerbose` (gray, `-v` only).
- Mask secrets in any log output (`-p****`, `MYSQL_PWD=****`).
- Update `CHANGELOG.md` for user-visible changes; the `release` script fails without an entry
  matching the current `package.json` version.

## Critical details

- **rsync filter order matters**: include (whitelist) rules first, then excludes — first
  matching rule wins. Covered by [tests/rsyncFilters.test.ts](tests/rsyncFilters.test.ts).
- **Database sync flow**: export → transfer over SSH → import → `wp search-replace` for each URL
  pair → clean up temp files. Entirely skipped in dry-run mode.
- **Dry-run** must never mutate remote or local state: no DB operations, no hooks.
- **Hooks** run via `sh -lc` (shell expansion); remote hooks `cd` into `ssh.path` first.

## Testing

- Unit tests live in `tests/*.test.ts` (config, rsyncFilters, shell, targets, urls).
- E2E tests in `tests/e2e/` use Docker Compose with an SSH + WordPress container;
  test timeout is 2 minutes. Fixtures in `tests/e2e/fixtures/`.
- Prefer adding a unit test for pure helpers in `src/utils/`; reserve E2E for full sync flows.
