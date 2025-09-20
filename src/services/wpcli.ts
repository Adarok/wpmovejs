import { run, ssh, shQuote } from '../utils/shell.js';
import chalk from 'chalk';
import { labels } from '../state.js';

export interface WPOptions {
  bin?: string;
  cwd?: string;
  remote?: { user: string; host: string; port?: number; path: string };
}

export async function wp(args: string[], options: WPOptions = {}) {
  const bin = options.bin ?? 'wp';
  const pathFlag = options.remote ? `--path=${options.remote.path}` : options.cwd ? `--path=${options.cwd}` : null;
  const fullArgs = pathFlag ? [pathFlag, ...args] : [...args];
  if (options.remote) {
    const cmd = `${shQuote(bin)} ${fullArgs.map((a) => shQuote(a)).join(' ')}`;
    console.log(labels.remote, chalk.white('wp'), chalk.gray(cmd));
    return ssh(options.remote.user, options.remote.host, cmd, options.remote.port);
  }
  console.log(labels.local, chalk.white(bin), chalk.gray(fullArgs.join(' ')));
  return run(bin, fullArgs, { cwd: options.cwd });
}
