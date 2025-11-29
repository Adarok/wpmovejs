import fs from 'fs-extra';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import type { HooksConfig } from './hooks.js';
import { Target } from './utils/targets.js';

const DbSchema = z.object({
  host: z.string(),
  name: z.string(),
  user: z.string(),
  password: z.string().default(''),
  charset: z.string().default('utf8mb4').optional(),
});

const SshSchema = z.object({
  host: z.string(),
  user: z.string(),
  port: z.number().int().positive().default(22).optional(),
  path: z.string().refine((p: string) => p.startsWith('/'), {
    message: 'ssh.path must be an absolute path starting with /',
  }),
});

const ForbidTargetsSchema = z.object({
  db: z.boolean().optional(),
  wordpress: z.boolean().optional(),
  plugins: z.boolean().optional(),
  themes: z.boolean().optional(),
  uploads: z.boolean().optional(),
  mu_plugins: z.boolean().optional(),
  languages: z.boolean().optional(),
}).optional();

const ForbidSchema = z.object({
  push: ForbidTargetsSchema,
  pull: ForbidTargetsSchema,
}).partial().optional();

const EnvSchema = z.object({
  wordpress_path: z.string().refine((p: string) => p.startsWith('/'), {
    message: 'wordpress_path must be an absolute path starting with /',
  }).optional(),
  wp_cli: z.string().default('wp').optional(),
  ssh: SshSchema.optional(),
  db: DbSchema.optional(),
  urls: z.array(z.string().url('must be a valid URL')).optional(),
  exclude: z.array(z.string()).transform((a: string[]) => a.map((s: string) => s.trim())).optional(),
  hooks: z
    .object({
      push: z.object({ before: z.object({ local: z.array(z.string()).optional(), remote: z.array(z.string()).optional() }).partial().optional(), after: z.object({ local: z.array(z.string()).optional(), remote: z.array(z.string()).optional() }).partial().optional() }).partial().optional(),
      pull: z.object({ before: z.object({ local: z.array(z.string()).optional(), remote: z.array(z.string()).optional() }).partial().optional(), after: z.object({ local: z.array(z.string()).optional(), remote: z.array(z.string()).optional() }).partial().optional() }).partial().optional(),
    })
    .partial()
    .optional(),
  sync: z
    .object({
  excludes: z.array(z.string()).transform((a: string[]) => a.map((s: string) => s.trim())).optional(),
  includes: z.array(z.string()).transform((a: string[]) => a.map((s: string) => s.trim())).optional(),
      delete: z.boolean().optional(),
    })
    .partial()
    .optional(),
  forbid: ForbidSchema,
  paths: z
    .object({
      wp_content: z
        .string()
        .refine((p: string) => !p.startsWith('/') && !p.includes('..'), { message: 'must be relative and not contain ..' })
        .optional(),
      wp_config: z
        .string()
        .refine((p: string) => !p.startsWith('/') && !p.includes('..'), { message: 'must be relative and not contain ..' })
        .optional(),
      plugins: z
        .string()
        .refine((p: string) => !p.startsWith('/') && !p.includes('..'), { message: 'must be relative and not contain ..' })
        .optional(),
      mu_plugins: z
        .string()
        .refine((p: string) => !p.startsWith('/') && !p.includes('..'), { message: 'must be relative and not contain ..' })
        .optional(),
      themes: z
        .string()
        .refine((p: string) => !p.startsWith('/') && !p.includes('..'), { message: 'must be relative and not contain ..' })
        .optional(),
      uploads: z
        .string()
        .refine((p: string) => !p.startsWith('/') && !p.includes('..'), { message: 'must be relative and not contain ..' })
        .optional(),
      languages: z
        .string()
        .refine((p: string) => !p.startsWith('/') && !p.includes('..'), { message: 'must be relative and not contain ..' })
        .optional(),
    })
    .partial()
    .optional(),
});

const ConfigSchema = z.record(EnvSchema);

export interface Db {
  host: string;
  name: string;
  user: string;
  password?: string;
  charset?: string;
}

export interface Ssh {
  host: string;
  user: string;
  port?: number;
  path: string;
}

export interface ForbidTargets {
  db?: boolean;
  wordpress?: boolean;
  plugins?: boolean;
  themes?: boolean;
  uploads?: boolean;
  mu_plugins?: boolean;
  languages?: boolean;
}

export interface Forbid {
  push?: ForbidTargets;
  pull?: ForbidTargets;
}

export interface Env {
  wordpress_path?: string;
  wp_cli?: string;
  ssh?: Ssh;
  db?: Db;
  urls?: string[];
  exclude?: string[];
  hooks?: HooksConfig;
  forbid?: Forbid;
  sync?: { excludes?: string[]; includes?: string[]; delete?: boolean };
  paths?: {
    wp_content?: string;
    wp_config?: string;
    plugins?: string;
    mu_plugins?: string;
    themes?: string;
    uploads?: string;
    languages?: string;
  };
}

export function resolvePaths(env: Env) {
  const p = env.paths ?? {};
  const wp_content = p.wp_content ?? 'wp-content';
  return {
    wp_content,
    wp_config: p.wp_config ?? 'wp-config.php',
    plugins: p.plugins ?? `${wp_content}/plugins`,
    mu_plugins: p.mu_plugins ?? `${wp_content}/mu-plugins`,
    themes: p.themes ?? `${wp_content}/themes`,
    uploads: p.uploads ?? `${wp_content}/uploads`,
    languages: p.languages ?? `${wp_content}/languages`,
  } as const;
}

/**
 * Filter out forbidden targets and return both the allowed targets and the list of forbidden ones.
 * The forbid configuration allows environments to block specific operations.
 */
export function filterForbiddenTargets(
  targets: Target[],
  env: Env,
  operation: 'push' | 'pull'
): { allowed: Target[]; forbidden: Target[] } {
  const forbidConfig = env.forbid?.[operation];
  if (!forbidConfig) {
    return { allowed: targets, forbidden: [] };
  }

  const forbidden: Target[] = [];
  const allowed = targets.filter((target) => {
    // Map target name to forbid config key (mu-plugins -> mu_plugins)
    const configKey = target.replaceAll('-', '_') as keyof ForbidTargets;
    if (forbidConfig[configKey] === true) {
      forbidden.push(target);
      return false;
    }
    return true;
  });

  return { allowed, forbidden };
}

/**
 * Handle forbidden targets by filtering them out and logging warnings.
 * Returns null if all targets are forbidden (caller should return early).
 * This is a convenience wrapper around filterForbiddenTargets for use in commands.
 */
export function handleForbiddenTargets(
  requestedTargets: Target[],
  env: Env,
  operation: 'push' | 'pull',
  envName: string,
  logWarn: (msg: string) => void
): Target[] | null {
  const { allowed, forbidden } = filterForbiddenTargets(requestedTargets, env, operation);

  if (forbidden.length > 0) {
    for (const target of forbidden) {
      logWarn(`${operation === 'push' ? 'Push' : 'Pull'} of '${target}' is forbidden by ${envName} environment configuration`);
    }
  }

  if (allowed.length === 0) {
    logWarn(`No targets to ${operation} (all requested targets are forbidden)`);
    return null;
  }

  return allowed;
}

export type MoveConfig = Record<string, Env>;

export async function loadConfig(cwd = process.cwd()): Promise<MoveConfig> {
  // Search upward for wpmove.yml, similar to how wordmove searches for Movefile
  let currentDir = path.resolve(cwd);
  let file: string | null = null;

  while (true) {
    const candidate = path.join(currentDir, 'wpmove.yml');
    if (await fs.pathExists(candidate)) {
      file = candidate;
      break;
    }

    // Check if we've reached the root or a WordPress installation (has wp-config.php)
    const parent = path.dirname(currentDir);
    const hasWpConfig = await fs.pathExists(path.join(currentDir, 'wp-config.php'));

    if (parent === currentDir || hasWpConfig) {
      // Reached filesystem root or WordPress root without finding config
      break;
    }

    currentDir = parent;
  }

  if (!file) {
    throw new Error(`Config file not found: searched upward from ${cwd} for wpmove.yml`);
  }

  const content = await fs.readFile(file, 'utf8');
  const data = parse(content) as unknown;
  const parsed = ConfigSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid wpmove.yml\n${issues}`);
  }
  return parsed.data;
}

export function getEnv(config: MoveConfig, name: string): Env {
  const env = config[name];
  if (!env) throw new Error(`Environment not found: ${name}`);
  return env;
}
