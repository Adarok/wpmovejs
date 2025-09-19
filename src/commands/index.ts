import type { Command } from 'commander';
import init from './init';
import doctor from './doctor';
import list from './list';
import push from './push';
import pull from './pull';

export function registerCommands(program: Command) {
  program.addCommand(init());
  program.addCommand(doctor());
  program.addCommand(list());
  program.addCommand(push());
  program.addCommand(pull());
}
