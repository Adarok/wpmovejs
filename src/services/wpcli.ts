import { run, ssh } from '../utils/shell.js';

export interface WPOptions {
  bin?: string;
  cwd?: string;
  remote?: { user: string; host: string; port?: number; path: string };
}

export async function wp(args: string[], options: WPOptions = {}) {
  const bin = options.bin ?? 'wp';
  if (options.remote) {
    const cmd = `${bin} ${args.join(' ')}`;
    const cd = options.remote.path ? `cd ${options.remote.path} && ` : '';
    return ssh(options.remote.user, options.remote.host, `${cd}${cmd}`, options.remote.port);
  }
  return run(bin, args, { cwd: options.cwd });
}
