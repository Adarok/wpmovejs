import { Command } from 'commander';
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
  await program.parseAsync(process.argv);
}

// Only run if executed directly, not when imported in tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
