import { Command } from 'commander';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { version } from '../package.json';
import { registerCommands } from './commands/index.js';
import 'dotenv/config';
import { state } from './state.js';

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('wpmovejs')
    .description('Move/sync WordPress between environments (JS reimplementation of wordmove)')
    .version(version)
    .showHelpAfterError()
    .enablePositionalOptions()
    .option('-v, --verbose', 'enable verbose logging', false)
    .hook('preAction', (thisCmd) => {
      const opts = thisCmd.opts<{ verbose?: boolean }>();
      state.verbose = Boolean(opts.verbose);
    });

  registerCommands(program);

  return program;
}

async function main() {
  const program = buildProgram();
  if (process.argv.length <= 2) {
    program.outputHelp();
    return;
  }
  await program.parseAsync(process.argv);
}

// Only run if executed directly (robust to npm symlinked bin)
const isMain = (() => {
  try {
    const invoked = process.argv[1] ? fs.realpathSync(process.argv[1]) : '';
    const thisFile = fs.realpathSync(fileURLToPath(import.meta.url));
    return Boolean(invoked) && invoked === thisFile;
  } catch {
    return false;
  }
})();

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
