# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-09-20
- Package scoped to `@adarok/wpmovejs`.
- Add GitHub Actions CI (Node 18/20) with build + typecheck.
- Add Release workflow: publish to npm on GitHub Release with provenance, tag/version guard, and scope enforcement.
- WP-CLI passthrough: ensured positional options pass and `--path` injection works remotely.
- Rsync filters: verified excludes/includes for push and pull both directions.
- Init template and README expanded; docs on environment selection `-e` and dry-run semantics.

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
