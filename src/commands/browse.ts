import { Command } from 'commander';
import { getEnv, loadConfig } from '../config.js';
import { logInfo, logOk, logWarn } from '../state.js';
import { execa } from 'execa';

async function openUrl(url: string) {
  const platform = process.platform;
  if (platform === 'darwin') {
    await execa('open', [url]);
    return;
  }
  if (platform === 'win32') {
    await execa('cmd', ['/c', 'start', '', url]);
    return;
  }
  // Linux and others: try xdg-open, then sensible-browser, then www-browser
  const candidates = [
    { cmd: 'xdg-open', args: [url] },
    { cmd: 'sensible-browser', args: [url] },
    { cmd: 'www-browser', args: [url] },
  ];
  let lastErr: any;
  for (const c of candidates) {
    try {
      await execa(c.cmd, c.args);
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('No suitable browser opener found');
}

export default function browse(): Command {
  const cmd = new Command('browse')
    .description('Open the environment URL in your default browser')
    .option('-e, --environment <name>', 'environment to browse (default: local)')
    .action(async (opts) => {
      const cfg = await loadConfig();
      const envName = opts.environment || 'local';
      const env = getEnv(cfg, envName);
      const urls = env.urls ?? [];
      if (!urls.length) {
        throw new Error(`Environment '${envName}' has no urls configured in wpmove.yml`);
      }
      const url = urls[0];
      logInfo(`Opening ${url}`);
      try {
        await openUrl(url);
        logOk('Browser opened');
      } catch (err: any) {
        logWarn(`Failed to open browser automatically: ${err?.message || err}`);
        console.log('You can open the URL manually:', url);
      }
    });
  return cmd;
}
