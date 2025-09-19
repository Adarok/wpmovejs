import { Command } from 'commander';
import { loadConfig, getEnv } from '../config.js';
import { run, shQuote } from '../utils/shell.js';

export default function sshCmd(): Command {
  const cmd = new Command('ssh')
    .description('Open an interactive SSH session to the remote environment')
    .option('-e, --environment <name>', 'remote environment name to connect to')
    .argument('[cmd...]', 'optional command to run on the remote host')
    .option('--no-cd', 'do not cd into configured remote path before starting the shell/command')
    .action(async (cmdParts: string[] = [], opts: { environment?: string; cd?: boolean }) => {
      const cfg = await loadConfig();
      const envName = opts.environment;
      if (!envName) throw new Error('Missing --environment/-e. Example: wpmovejs ssh -e staging');
      const remote = getEnv(cfg, envName);
      if (!remote.ssh) throw new Error(`Environment '${envName}' has no ssh config`);

      const userAtHost = `${remote.ssh.user}@${remote.ssh.host}`;
      const port = remote.ssh.port ?? 22;
      const hasCmd = Array.isArray(cmdParts) && cmdParts.length > 0;
      const shouldCd = opts.cd !== false && Boolean(remote.ssh.path);
      const cdPrefix = shouldCd ? `cd ${shQuote(remote.ssh.path!)} && ` : '';

      if (!hasCmd) {
        if (shouldCd) {
          // Allocate a PTY and start a login shell after cd into the configured path
          const remoteCmd = `${cdPrefix}exec ${'${SHELL:-bash}'} -l`;
          await run('ssh', ['-t', '-p', String(port), userAtHost, remoteCmd]);
        } else {
          // Plain interactive session with a fallback
          await run('ssh', ['-t', '-p', String(port), userAtHost, 'exec ${SHELL:-bash} -l']);
        }
        return;
      }

      const remoteCmd = cdPrefix + cmdParts.join(' ');
      await run('ssh', ['-t', '-p', String(port), userAtHost, remoteCmd]);
    });

  return cmd;
}
