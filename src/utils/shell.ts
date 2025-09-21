import { execa } from 'execa';
import chalk from 'chalk';
import { labels, logVerbose } from '../state.js';

export async function whichCmd(cmd: string): Promise<string | null> {
  try {
    const { execa: execaFn } = await import('execa');
    const res = await execaFn('which', [cmd]);
    return res.stdout.trim();
  } catch {
    return null;
  }
}

export async function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; stdio?: 'inherit' | 'pipe' } = {}
) {
  const shownArgs = maskSecrets(args.join(' '));
  logVerbose(chalk.gray('$'), chalk.white(cmd), chalk.gray(shownArgs));
  return execa(cmd, args, { cwd: opts.cwd, env: opts.env, stdio: opts.stdio ?? 'inherit' });
}

function maskSecrets(input: string): string {
  // Mask MySQL-style inline passwords like -ppassword, MYSQL_PWD=secret
  let out = input.replace(/-p[^\s'";|&]+/g, '-p****');
  out = out.replace(/MYSQL_PWD=[^\s'";|&]+/g, 'MYSQL_PWD=****');
  return out;
}

export async function ssh(
  user: string,
  host: string,
  command: string,
  port = 22,
  opts: { stdio?: 'inherit' | 'pipe' } = {}
) {
  const shown = maskSecrets(command);
  console.log(labels.remote, chalk.white('ssh'), chalk.gray(`${user}@${host}:${port}`), chalk.gray(shown));
  return run('ssh', ['-p', String(port), `${user}@${host}`, command], { stdio: opts.stdio });
}

export async function rsync(
  src: string,
  dest: string,
  opts: {
    delete?: boolean;
    dryRun?: boolean;
    excludes?: string[];
    includes?: string[];
    ssh?: { user: string; host: string; port?: number };
  } = {}
) {
  const args = ['-az', '--human-readable'];
  if (opts.delete) args.push('--delete');
  if (opts.dryRun) args.push('--dry-run');
  // Enable detailed per-file output
  args.push('--itemize-changes', '--info=NAME,SKIP,DEL,REMOVE,STATS');
  for (const inc of opts.includes ?? []) args.push('--include', inc);
  for (const exc of opts.excludes ?? []) args.push('--exclude', exc);
  if (opts.ssh) args.push('-e', `ssh -p ${opts.ssh.port ?? 22}`);
  args.push(src, dest);
  const direction = src.includes('@') ? `${chalk.magenta('remote')} → ${chalk.cyan('local')}` : `${chalk.cyan('local')} → ${chalk.magenta('remote')}`;
  console.log(labels.info, chalk.white('rsync'), chalk.gray(direction));
  console.log(chalk.gray('  ' + args.join(' ')));
  // Inherit stdio so rsync prints file list live
  return run('rsync', args, { stdio: 'inherit' });
}

export function shQuote(input: string): string {
  // POSIX-safe single-quote escaping: wrap in single quotes and escape inner single quotes as: '"'"'
  return "'" + input.replace(/'/g, `'"'"'`) + "'";
}
