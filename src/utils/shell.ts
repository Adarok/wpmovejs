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
  port?: number,
  opts: { stdio?: 'inherit' | 'pipe' } = {}
) {
  const shown = maskSecrets(command);
  const target = port ? `${user}@${host}:${port}` : `${user}@${host}`;
  console.log(labels.remote, chalk.white('ssh'), chalk.gray(target), chalk.gray(shown));
  const args = [] as string[];
  if (port) args.push('-p', String(port));
  args.push(`${user}@${host}`, command);
  return run('ssh', args, { stdio: opts.stdio });
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
    label?: string;
  } = {}
) {
  const args = ['-azl', '--human-readable'];
  if (opts.delete) args.push('--delete');
  if (opts.dryRun) args.push('--dry-run');
  // Enable detailed per-file output
  args.push('--itemize-changes', '--info=NAME,SKIP,DEL,REMOVE,STATS');
  const includes = opts.includes ?? [];
  const parentIncludes = includes.filter((i) => !i.endsWith('/***'));
  const recursiveIncluses = includes.filter((i) => i.endsWith('/***'));
  for (const inc of parentIncludes) args.push('--include', inc);
  for (const exc of opts.excludes ?? []) args.push('--exclude', exc);
  for (const inc of recursiveIncluses) args.push('--include', inc);
  if (opts.ssh) {
    const sshCmd = opts.ssh.port ? `ssh -p ${opts.ssh.port}` : 'ssh';
    args.push('-e', sshCmd);
  }
  args.push(src, dest);
  const direction = src.includes('@') ? `${chalk.magenta('remote')} → ${chalk.cyan('local')}` : `${chalk.cyan('local')} → ${chalk.magenta('remote')}`;
  const phaseLabel = opts.label ? chalk.white(opts.label) + ' ' : '';
  console.log(labels.info, phaseLabel + chalk.white('rsync'), chalk.gray(direction));
  logVerbose(chalk.gray('  ' + args.join(' ')));

  // Run rsync with piped output so we can parse and format it
  const result = await execa('rsync', args, { stdio: 'pipe', all: true });

  // Parse and display rsync output in a user-friendly way
  if (result.all) {
    const lines = result.all.split('\n');
    let addedFiles = 0;
    let updatedFiles = 0;
    let deletedFiles = 0;
    let addedDirs = 0;

    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Parse itemize output (e.g., "<f+++++++++ path/to/file")
      const itemMatch = line.match(/^([<>ch.*][fdLDS.][c+.][s.][t.][p.][o.][g.][u.][a.][x.]) (.+)$/);
      if (itemMatch) {
        const [, flags, filepath] = itemMatch;
        const flag0 = flags[0]; // < or > or c or h or *
        const flag1 = flags[1]; // f=file, d=dir, L=symlink, etc.
        const flag2 = flags[2]; // c=checksum differs, +=new

        // Determine action
        let action = '';
        let color = chalk.white;
        let shouldCount = true;

        if (flag0 === '*') {
          // Deletion
          action = 'DEL';
          color = chalk.red;
          deletedFiles++;
        } else if (flag2 === '+') {
          // New file or directory
          if (flag1 === 'f' || flag1 === 'L') {
            action = 'ADD';
            color = chalk.green;
            addedFiles++;
          } else if (flag1 === 'd') {
            action = 'DIR';
            color = chalk.blue;
            addedDirs++;
          }
        } else if (flag2 === 'c' || flags.includes('s')) {
          // Modified (checksum or size changed)
          action = 'UPD';
          color = chalk.yellow;
          updatedFiles++;
        } else if (flag1 === 'd' && flag2 === '.') {
          // Directory timestamp/permissions only - skip
          shouldCount = false;
        } else if (flags.substring(2).includes('t') || flags.substring(2).includes('p')) {
          // Only timestamp or permissions changed
          action = 'CHG';
          color = chalk.gray;
          shouldCount = false;
        } else {
          // Other changes
          shouldCount = false;
        }

        if (shouldCount || action) {
          console.log(`  ${color(action.padEnd(3))} ${chalk.gray(filepath)}`);
        }
      }
      // Parse stats line (e.g., "sent 1.23M bytes  received 456 bytes")
      else if (line.includes('sent') && line.includes('bytes')) {
        console.log(chalk.gray(`  ${line.trim()}`));
      }
      // Parse total size line
      else if (line.includes('total size')) {
        console.log(chalk.gray(`  ${line.trim()}`));
      }
    }

    // Show summary if anything was transferred
    const totalChanges = addedFiles + updatedFiles + deletedFiles;
    if (totalChanges > 0 || addedDirs > 0) {
      const parts = [];
      if (addedFiles > 0) parts.push(chalk.green(`${addedFiles} added`));
      if (updatedFiles > 0) parts.push(chalk.yellow(`${updatedFiles} updated`));
      if (deletedFiles > 0) parts.push(chalk.red(`${deletedFiles} deleted`));
      if (addedDirs > 0) parts.push(chalk.blue(`${addedDirs} dirs`));
      console.log(chalk.gray(`  Summary: `) + parts.join(chalk.gray(', ')));
    } else {
      console.log(chalk.gray(`  No changes`));
    }
  }

  return result;
}

export function shQuote(input: string): string {
  // POSIX-safe single-quote escaping: wrap in single quotes and escape inner single quotes as: '"'"'
  return "'" + input.replace(/'/g, `'"'"'`) + "'";
}
