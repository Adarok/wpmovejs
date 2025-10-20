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
import browse from './browse';
import migrate from './migrate';

export function registerCommands(program: Command) {
  program.addCommand(init().showHelpAfterError());
  program.addCommand(doctor().showHelpAfterError());
  program.addCommand(list().showHelpAfterError());
  program.addCommand(push().showHelpAfterError());
  program.addCommand(pull().showHelpAfterError());
  program.addCommand(ssh().showHelpAfterError());
  program.addCommand(shell().showHelpAfterError());
  program.addCommand(db().showHelpAfterError());
  program.addCommand(wp().showHelpAfterError());
  program.addCommand(migrate().showHelpAfterError());
  program.addCommand(browse().showHelpAfterError());
}
