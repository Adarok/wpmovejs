import type { Env, Ssh } from '../config.js';

export function buildRsyncOpts(
  sourceEnv: Env,
  destEnv: Env,
  base: { ssh: Ssh; dryRun?: boolean; includes?: string[]; excludes?: string[]; delete?: boolean }
) {
  const envExcludes = [
    ...((sourceEnv.exclude ?? []) as string[]),
    ...((destEnv.exclude ?? []) as string[]),
  ];
  const finalExcludes = [
    ...((destEnv.sync?.excludes ?? []) as string[]),
    ...envExcludes,
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
