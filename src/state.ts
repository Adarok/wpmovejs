import chalk from 'chalk';

export const state = {
  verbose: false,
};

export function logVerbose(...args: unknown[]) {
  if (state.verbose) console.log(chalk.gray('[verbose]'), ...args);
}
