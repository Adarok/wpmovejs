# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-09-20
## [0.2.1] - 2025-09-20
- Release automation triggers on semver tag push (`v*.*.*`).
- CI fix: add `@types/node` to satisfy `types: ["node"]` in tsconfig.
- README: installation now references scoped package `@adarok/wpmovejs`.

## [0.2.2] - 2025-09-20
- CLI: show help when no args provided; execute reliably via npm global bin.


## [0.1.0] - 2025-09-20
- Initial release.
- Core commands: `init`, `doctor`, `list`, `push`, `pull`.
- Targets and flags: `--all`, `--only`, `-w/-u/-t/-p/-m/-l/-d`.
- Environment selection via `--environment/-e` across commands.
- YAML config with Zod validation; `wpmovejs init` writes full template.
- Rsync root-based filters with environment-level `exclude` applied both directions.
- Safe defaults: protects `wp-config.php` from wordpress target.
- DB sync with export/transfer/import and URL search-replace pairs.
- Dry-run previews file ops and skips DB and hooks entirely.
- Convenience: `ssh`, `shell` (wp shell), `db shell|cli`, and `wp` passthrough.
- Robust quoting/ssh/rsync helpers; verbose logging and `showHelpAfterError` UX polish.
