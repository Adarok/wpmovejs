import type { Command } from 'commander';
import init from './init';
import doctor from './doctor';
import list from './list';
import push from './push';
import pull from './pull';
import ssh from './ssh';
import shell from './shell';
import db from './db';
import wp from './wp';

export function registerCommands(program: Command) {
  program.addCommand(init());
  program.addCommand(doctor());
  program.addCommand(list());
  program.addCommand(push());
  program.addCommand(pull());
  program.addCommand(ssh());
  program.addCommand(shell());
  program.addCommand(db());
  program.addCommand(wp());
}
