import type { Env, Ssh } from '../config.js';

export function buildRsyncOpts(
  sourceEnv: Env,
  destEnv: Env,
  base: { ssh: Ssh; dryRun?: boolean; includes?: string[]; excludes?: string[]; delete?: boolean }
) {
  // Rule 3: The remote environment's excludes are always used when syncing between local and remote
  // Identify which env is the remote (has SSH config)
  const remoteEnv = sourceEnv.ssh ? sourceEnv : destEnv;
  const finalExcludes = [
    ...((remoteEnv.sync?.excludes ?? []) as string[]),
    ...((remoteEnv.exclude ?? []) as string[]),
    ...((base.excludes ?? []) as string[]),
  ];
  const finalIncludes = base.includes ?? destEnv.sync?.includes;
  return {
    ssh: base.ssh,
    dryRun: base.dryRun,
    includes: finalIncludes,
    excludes: finalExcludes,
    delete: destEnv.sync?.delete ?? base.delete,
  } as const;
}
