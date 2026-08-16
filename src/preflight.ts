import fs from 'fs-extra';
import path from 'node:path';
import { Env } from './config.js';
import { run, shQuote, sshDest, whichCmd } from './utils/shell.js';
import { Target } from './utils/targets.js';
import { labels, logInfo, logWarn } from './state.js';

function hasFileTargets(targets: Target[]): boolean {
  return targets.some((t) => t !== 'db');
}

type SshConfig = { user?: string; host: string; port?: number; path: string };

async function sshExec(ssh: SshConfig, command: string): Promise<void> {
  const args: string[] = [];
  if (ssh.port) args.push('-p', String(ssh.port));
  args.push(sshDest(ssh), command);
  await run('ssh', args, { stdio: 'pipe' });
}

async function remoteHasCommand(ssh: SshConfig, bin: string): Promise<boolean> {
  // `wp_cli` may be a full command line (e.g. "php /usr/local/bin/wp"); probe the binary only.
  const binary = bin.trim().split(/\s+/)[0];
  const probe = `command -v ${shQuote(binary)} >/dev/null 2>&1`;
  // The plain probe runs in ssh's default shell, which sees the same PATH the real
  // commands get. `sh -lc` is only a fallback: it reads /etc/profile and ~/.profile
  // but not ~/.bashrc, so it can miss binaries an interactive ssh session finds.
  const probes = [probe, `sh -lc ${shQuote(probe)}`, `${shQuote(binary)} --version >/dev/null 2>&1`];
  for (const cmd of probes) {
    try {
      await sshExec(ssh, cmd);
      return true;
    } catch {
      // try next probe
    }
  }
  return false;
}

export async function preflight(
  local: Env,
  remote: Env,
  opts: { targets: Target[]; operation: 'push' | 'pull'; forceMysql?: boolean }
): Promise<{ remoteWpAvailable: boolean }> {
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
    const args = ['-o', 'BatchMode=yes'] as string[];
    if (ssh.port) args.push('-p', String(ssh.port));
    args.push(sshDest(ssh), 'true');
    await run('ssh', args, { stdio: 'pipe' });
  } catch (_e) {
    throw new Error(`SSH connectivity failed to ${sshDest(ssh)}${ssh.port ? `:${ssh.port}` : ''}`);
  }

  // Remote path checks
  const remotePathCmd = opts.operation === 'push' && hasFileTargets(opts.targets)
    ? `test -d ${shQuote(ssh.path)} && test -w ${shQuote(ssh.path)}`
    : `test -d ${shQuote(ssh.path)}`;

  try {
    const args = [] as string[];
    if (ssh.port) args.push('-p', String(ssh.port));
    args.push(sshDest(ssh), remotePathCmd);
    await run('ssh', args, { stdio: 'pipe' });
  } catch {
    if (opts.operation === 'push' && hasFileTargets(opts.targets)) {
      throw new Error(`Remote path missing or not writable: ${ssh.path}`);
    }
    throw new Error(`Remote path missing: ${ssh.path}`);
  }

  // wp-cli availability when DB involved
  let remoteWpAvailable = true;
  if (opts.targets.includes('db')) {
    // Local wp
    const wpBin = local.wp_cli ?? 'wp';
    const wpPath = await whichCmd(wpBin);
    if (!wpPath) throw new Error(`Local wp-cli not found: ${wpBin}`);

    // Remote wp presence
    const remoteWpBin = remote.wp_cli ?? 'wp';
    remoteWpAvailable = await remoteHasCommand(ssh, remoteWpBin);
    if (!remoteWpAvailable) {
      logWarn(`Remote wp-cli not found (${remoteWpBin}); will fall back to mysql/mysqldump if needed`);
    }

    // If remote wp-cli is not available or forced mysql, verify mysql tools exist remotely
    if (opts.forceMysql || !remoteWpAvailable) {
      if (!remote.db || !remote.db.name || !remote.db.user || !remote.db.host) {
        throw new Error('Remote db credentials (host,name,user) are required for mysql/mysqldump fallback');
      }
      if (!(await remoteHasCommand(ssh, 'mysql'))) {
        throw new Error('Remote mysql client not found in PATH');
      }
      if (!(await remoteHasCommand(ssh, 'mysqldump'))) {
        throw new Error('Remote mysqldump not found in PATH');
      }
    }
  }

  console.log(labels.ok, 'Preflight checks passed');
  return { remoteWpAvailable };
}
