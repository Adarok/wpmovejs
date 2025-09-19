import fs from 'fs-extra';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import type { HooksConfig } from './hooks.js';

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
  path: z.string(),
});

const EnvSchema = z.object({
  wordpress_path: z.string().optional(),
  wp_cli: z.string().default('wp').optional(),
  ssh: SshSchema.optional(),
  db: DbSchema.optional(),
  urls: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  hooks: z
    .object({
      push: z.object({ before: z.object({ local: z.array(z.string()).optional(), remote: z.array(z.string()).optional() }).partial().optional(), after: z.object({ local: z.array(z.string()).optional(), remote: z.array(z.string()).optional() }).partial().optional() }).partial().optional(),
      pull: z.object({ before: z.object({ local: z.array(z.string()).optional(), remote: z.array(z.string()).optional() }).partial().optional(), after: z.object({ local: z.array(z.string()).optional(), remote: z.array(z.string()).optional() }).partial().optional() }).partial().optional(),
    })
    .partial()
    .optional(),
  sync: z
    .object({
      excludes: z.array(z.string()).optional(),
      includes: z.array(z.string()).optional(),
      delete: z.boolean().optional(),
    })
    .partial()
    .optional(),
  paths: z
    .object({
      wp_content: z.string().optional(),
      wp_config: z.string().optional(),
      plugins: z.string().optional(),
      mu_plugins: z.string().optional(),
      themes: z.string().optional(),
      uploads: z.string().optional(),
      languages: z.string().optional(),
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

export interface Env {
  wordpress_path?: string;
  wp_cli?: string;
  ssh?: Ssh;
  db?: Db;
  urls?: string[];
  exclude?: string[];
  hooks?: HooksConfig;
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

export type MoveConfig = Record<string, Env>;

export async function loadConfig(cwd = process.cwd()): Promise<MoveConfig> {
  const file = path.resolve(cwd, 'wpmove.yml');
  const exists = await fs.pathExists(file);
  if (!exists) {
    throw new Error(`Config file not found: ${file}`);
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
