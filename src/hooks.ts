import { ssh, run } from './utils/shell.js';
import { logVerbose } from './state.js';

export interface HookDef {
  local?: string[];
  remote?: string[];
}

export interface HooksConfig {
  push?: { before?: HookDef; after?: HookDef };
  pull?: { before?: HookDef; after?: HookDef };
}

export async function runHook(def: HookDef | undefined, remote?: { user: string; host: string; port?: number; path: string }) {
  if (!def) return;
  for (const cmd of def.local ?? []) {
    logVerbose('hook local:', cmd);
    await run('sh', ['-lc', cmd]);
  }
  if (remote) {
    for (const cmd of def.remote ?? []) {
      logVerbose('hook remote:', cmd);
      const cd = remote.path ? `cd ${remote.path} && ` : '';
      await ssh(remote.user, remote.host, `${cd}${cmd}`, remote.port);
    }
  }
}
