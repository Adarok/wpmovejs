import chalk from 'chalk';

export const state = {
  verbose: false,
};

export function logVerbose(...args: unknown[]) {
  if (state.verbose) console.log(chalk.gray('[verbose]'), ...args);
}

export const labels = {
  local: chalk.cyan.bold('[local]'),
  remote: chalk.magenta.bold('[remote]'),
  dry: chalk.yellow.bold('[dry-run]'),
  info: chalk.blue.bold('[info]'),
  ok: chalk.green.bold('[ok]'),
  warn: chalk.yellow.bold('[warn]'),
  error: chalk.red.bold('[error]'),
};

export function logLocal(...args: unknown[]) {
  console.log(labels.local, ...args);
}

export function logRemote(...args: unknown[]) {
  console.log(labels.remote, ...args);
}

export function logInfo(...args: unknown[]) {
  console.log(labels.info, ...args);
}

export function logDry(...args: unknown[]) {
  console.log(labels.dry, ...args);
}

export function logOk(...args: unknown[]) {
  console.log(labels.ok, ...args);
}

export function logWarn(...args: unknown[]) {
  console.log(labels.warn, ...args);
}

export function logError(...args: unknown[]) {
  console.log(labels.error, ...args);
}
