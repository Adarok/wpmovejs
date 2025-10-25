# Changelog

All notable changes to this project will be documented in this file.

## [0.3.4] - 2025-10-25
- Database: Fix mysqldump GTID compatibility with fallback for older MySQL/MariaDB versions.
- Database: Ensure remote SQL dumps are always cleaned up via try-finally blocks.
- Database: Add `*.sql` to default excludes to prevent SQL dumps from being synced.
- Database: Fix search-replace to run separate commands for URL and wordpress_path replacements.
- Database: Simplify push mysql fallback to match wordmove approach (backup→modify→export→restore).
- Rsync: Enable `--delete` flag for file operations to remove orphaned files on destination.
- Rsync: Add `-l` flag to preserve symbolic links during sync operations.
- Rsync: Enhanced output with phase labels (Themes, Plugins, Uploads, etc.) and color-coded file actions.
- Rsync: Parse itemize output to show user-friendly ADD/UPD/DEL/DIR labels with summary counts.

## [0.3.3] - 2025-09-21
- Command: add `browse` to open the selected environment URL in the system browser (macOS, Linux, Windows supported).
- Security/UX: mask DB passwords in logged `mysqldump`/`mysql` commands; suppress remote SSH login banners for DB ops.
- Pull: ensure `wp search-replace` always runs at the end after import, including mysql/mysqldump fallback.

## [0.3.2] - 2025-09-20
- Add MIT LICENSE file to the repository.

## [0.3.1] - 2025-09-20
- Release workflow: add manual `workflow_dispatch` with tag input; checkout specified tag.
- README: add Release workflow badge and npm downloads badge.

## [0.3.0] - 2025-09-20
- Colorized CLI output with clear `[local]` and `[remote]` labels.
- rsync now streams per-file changes live; dry-run lists files using `--itemize-changes` and recursive include patterns.
- Execute database sync last in both push and pull to ensure wp-cli has required files/plugins.
- Filters: include chain updated to add recursive include (`/***`) so dry-run shows files inside target directories.

## [0.2.3] - 2025-09-20
- Add ESLint (flat config) with CI lint step; fix initial warnings.
- Dependabot: group npm updates to reduce PR noise.
- README: add npm badge and highlight npmjs.com as the primary install method.

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
