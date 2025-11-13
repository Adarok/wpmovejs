import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { ssh } from '../utils/shell.js';
import { loadConfig, getEnv } from '../config.js';
import { logInfo, logOk, logError } from '../state.js';
import { DEFAULT_WORDPRESS_EXCLUDES, ensureWpmoveExcluded } from '../constants.js';
import chalk from 'chalk';

export default function sniff(): Command {
  const cmd = new Command('sniff')
    .description('Sniff remote WordPress configuration and add it as a new environment')
    .requiredOption('-e, --environment <name>', 'name for the new environment')
    .requiredOption('-s, --ssh <user@host>', 'SSH connection string (user@host)')
    .requiredOption('-p, --path <path>', 'remote WordPress installation path')
    .option('--port <number>', 'SSH port (default: 22)', parseInt)
    .action(async (opts) => {
      const envName = opts.environment;
      const sshString = opts.ssh;
      const remotePath = opts.path;

      // Validate environment doesn't exist
      try {
        const cfg = await loadConfig();
        try {
          getEnv(cfg, envName);
          logError(`Environment '${envName}' already exists in wpmove.yml`);
          process.exit(1);
        } catch {
          // Good - environment doesn't exist
        }
      } catch (err: any) {
        logError(`Failed to load config: ${err.message}`);
        process.exit(1);
      }

      // Parse SSH string
      const sshMatch = sshString.match(/^([^@]+)@(.+)$/);
      if (!sshMatch) {
        logError(`Invalid SSH string format. Expected: user@host`);
        process.exit(1);
      }

      const [, user, host] = sshMatch;
      const port = opts.port;

      logInfo(`Connecting to ${chalk.cyan(sshString)} to read wp-config.php from ${chalk.cyan(remotePath)}`);

      // Read wp-config.php from remote
      const wpConfigPath = `${remotePath}/wp-config.php`;
      const readCommand = `cat ${wpConfigPath}`;

      let wpConfigContent: string;
      try {
        const result = await ssh(user, host, readCommand, port, { stdio: 'pipe' });
        wpConfigContent = result.stdout;
      } catch (err: any) {
        logError(`Failed to read wp-config.php: ${err.message}`);
        process.exit(1);
      }

      // Parse wp-config.php
      const dbConfig = parseWpConfig(wpConfigContent);
      if (!dbConfig) {
        logError('Failed to parse database configuration from wp-config.php');
        process.exit(1);
      }

      logInfo(`Found database: ${chalk.cyan(dbConfig.name)} on ${chalk.cyan(dbConfig.host)}`);

      // Try to detect site URL
      logInfo('Attempting to detect site URL...');
      let siteUrl: string | null = null;
      try {
        const urlCommand = `cd ${remotePath} && wp option get siteurl 2>/dev/null || wp option get home 2>/dev/null || echo ''`;
        const urlResult = await ssh(user, host, urlCommand, port, { stdio: 'pipe' });
        const detectedUrl = urlResult.stdout.trim();
        if (detectedUrl && detectedUrl.startsWith('http')) {
          siteUrl = detectedUrl;
          logInfo(`Detected site URL: ${chalk.cyan(siteUrl)}`);
        } else {
          logInfo('Could not detect site URL via wp-cli');
        }
      } catch {
        logInfo('Could not detect site URL (wp-cli may not be available)');
      }

      // Build the new environment configuration
      const newEnv: any = {
        ssh: {
          host,
          user,
          ...(port && port !== 22 ? { port } : {}),
          path: remotePath,
        },
        wordpress_path: remotePath,
        wp_cli: 'wp',
        db: {
          host: dbConfig.host,
          name: dbConfig.name,
          user: dbConfig.user,
          password: dbConfig.password,
          charset: dbConfig.charset || 'utf8mb4',
        },
        ...(siteUrl ? { urls: [siteUrl] } : {}),
        exclude: ensureWpmoveExcluded([...DEFAULT_WORDPRESS_EXCLUDES]),
        sync: {
          excludes: ['wp-content/cache/'],
          includes: [],
          delete: false,
        },
      };

      // Load and update config file
      const configPath = path.resolve(process.cwd(), 'wpmove.yml');
      const configContent = await fs.readFile(configPath, 'utf8');
      const config = parse(configContent);

      config[envName] = newEnv;

      // Write back to file
      await fs.writeFile(configPath, stringify(config), 'utf8');

      logOk(`Added environment '${chalk.cyan(envName)}' to wpmove.yml`);
      logInfo(`Database: ${chalk.gray(dbConfig.user)}@${chalk.gray(dbConfig.host)}/${chalk.gray(dbConfig.name)}`);
      if (siteUrl) {
        logInfo(`URL: ${chalk.gray(siteUrl)}`);
      } else {
        logInfo(`${chalk.yellow('⚠')} Please manually add the 'urls' field to the new environment`);
      }
    });

  return cmd;
}

interface DbConfig {
  host: string;
  name: string;
  user: string;
  password: string;
  charset?: string;
}

function parseWpConfig(content: string): DbConfig | null {
  const patterns = {
    name: /define\s*\(\s*['"]DB_NAME['"]\s*,\s*['"]([^'"]+)['"]/,
    user: /define\s*\(\s*['"]DB_USER['"]\s*,\s*['"]([^'"]+)['"]/,
    password: /define\s*\(\s*['"]DB_PASSWORD['"]\s*,\s*['"]([^'"]*)['"]/,
    host: /define\s*\(\s*['"]DB_HOST['"]\s*,\s*['"]([^'"]+)['"]/,
    charset: /define\s*\(\s*['"]DB_CHARSET['"]\s*,\s*['"]([^'"]+)['"]/,
  };

  const config: Partial<DbConfig> = {};

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      (config as any)[key] = match[1];
    }
  }

  // Required fields
  if (!config.name || !config.user || config.password === undefined || !config.host) {
    return null;
  }

  return {
    name: config.name,
    user: config.user,
    password: config.password,
    host: config.host,
    charset: config.charset,
  };
}
