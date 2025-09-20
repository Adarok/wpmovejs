import fs from 'fs-extra';
import path from 'node:path';
import { Env } from './config.js';
import { run, shQuote, whichCmd } from './utils/shell.js';
import { Target } from './utils/targets.js';
import { labels, logInfo } from './state.js';

function hasFileTargets(targets: Target[]): boolean {
  return targets.some((t) => t !== 'db');
}

export async function preflight(local: Env, remote: Env, opts: { targets: Target[]; operation: 'push' | 'pull' }) {
  const wpLocal = local.wordpress_path ?? '.';
  const localRoot = path.resolve(process.cwd(), wpLocal);

  logInfo('Preflight checks starting...');

  // Local path checks
  const localExists = await fs.pathExists(localRoot);
  if (!localExists) throw new Error(`Local wordpress_path does not exist: ${localRoot}`);
  const stats = await fs.stat(localRoot);
  if (!stats.isDirectory()) throw new Error(`Local wordpress_path is not a directory: ${localRoot}`);

  // Local write requirement on pull with file targets or DB import
  if (opts.operation === 'pull' && (hasFileTargets(opts.targets) || opts.targets.includes('db'))) {
    try {
      await fs.access(localRoot, fs.constants.W_OK);
    } catch {
      throw new Error(`Local wordpress_path is not writable: ${localRoot}`);
    }
  }

  // SSH connectivity
  if (!remote.ssh) throw new Error('Remote ssh configuration missing');
  const ssh = remote.ssh;
  try {
    await run('ssh', ['-o', 'BatchMode=yes', '-p', String(ssh.port ?? 22), `${ssh.user}@${ssh.host}`, 'true'], { stdio: 'pipe' });
  } catch (_e) {
    throw new Error(`SSH connectivity failed to ${ssh.user}@${ssh.host}:${ssh.port ?? 22}`);
  }

  // Remote path checks
  const remotePathCmd = opts.operation === 'push' && hasFileTargets(opts.targets)
    ? `test -d ${shQuote(ssh.path)} && test -w ${shQuote(ssh.path)}`
    : `test -d ${shQuote(ssh.path)}`;

  try {
    await run('ssh', ['-p', String(ssh.port ?? 22), `${ssh.user}@${ssh.host}`, remotePathCmd], { stdio: 'pipe' });
  } catch {
    if (opts.operation === 'push' && hasFileTargets(opts.targets)) {
      throw new Error(`Remote path missing or not writable: ${ssh.path}`);
    }
    throw new Error(`Remote path missing: ${ssh.path}`);
  }

  // wp-cli availability when DB involved
  if (opts.targets.includes('db')) {
    // Local wp
    const wpBin = local.wp_cli ?? 'wp';
    const wpPath = await whichCmd(wpBin);
    if (!wpPath) throw new Error(`Local wp-cli not found: ${wpBin}`);

    // Remote wp presence
    const remoteWpCheck = `sh -lc ${shQuote('command -v wp >/dev/null 2>&1')}`;
    try {
      await run('ssh', ['-p', String(ssh.port ?? 22), `${ssh.user}@${ssh.host}`, remoteWpCheck], { stdio: 'pipe' });
    } catch {
      throw new Error('Remote wp-cli not found in PATH');
    }
  }

  console.log(labels.ok, 'Preflight checks passed');
}
