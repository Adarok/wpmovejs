import { execa } from 'execa';

export async function whichCmd(cmd: string): Promise<string | null> {
  try {
    const { execa: execaFn } = await import('execa');
    const res = await execaFn('which', [cmd]);
    return res.stdout.trim();
  } catch {
    return null;
  }
}

export async function run(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv; stdio?: 'inherit' | 'pipe' } = {}) {
  return execa(cmd, args, { cwd: opts.cwd, env: opts.env, stdio: opts.stdio ?? 'inherit' });
}

export async function ssh(user: string, host: string, command: string, port = 22) {
  return run('ssh', ['-p', String(port), `${user}@${host}`, command]);
}

export async function rsync(src: string, dest: string, opts: { delete?: boolean; ssh?: { user: string; host: string; port?: number } } = {}) {
  const args = ['-az'];
  if (opts.delete) args.push('--delete');
  if (opts.ssh) args.push('-e', `ssh -p ${opts.ssh.port ?? 22}`);
  args.push(src, dest);
  return run('rsync', args);
}
