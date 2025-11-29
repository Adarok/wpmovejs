/**
 * E2E Test Helper Functions
 *
 * Provides utility functions for e2e tests.
 * Container lifecycle is managed by globalSetup.ts
 */

import { execa, type ExecaError } from 'execa';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

/**
 * Execute a command inside the local container
 */
export async function execInLocal(command: string, options?: { cwd?: string }): Promise<{ stdout: string; stderr: string }> {
  const cwd = options?.cwd ?? '/var/www/html';
  return execa('docker', [
    'exec',
    '-w', cwd,
    'wpmovejs-e2e-local',
    'bash', '-c', command,
  ]);
}

/**
 * Execute a command inside the remote container
 */
export async function execInRemote(command: string): Promise<{ stdout: string; stderr: string }> {
  return execa('docker', [
    'exec',
    '-w', '/var/www/html',
    'wpmovejs-e2e-remote',
    'bash', '-c', command,
  ]);
}

/**
 * Run wpmovejs command inside the local container
 */
export async function runWpmovejs(args: string[], configFile = 'wpmove.yml'): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const configPath = join(FIXTURES_DIR, configFile);

  try {
    // Copy config file to local container
    await execa('docker', ['cp', configPath, 'wpmovejs-e2e-local:/var/www/html/wpmove.yml']);

    // Run wpmovejs using Node.js
    const result = await execa('docker', [
      'exec',
      '-w', '/var/www/html',
      '-e', 'NODE_ENV=test',
      'wpmovejs-e2e-local',
      'node', '/opt/wpmovejs/dist/cli.js', ...args,
    ]);

    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (error) {
    const execaError = error as ExecaError;
    return {
      stdout: execaError.stdout ?? '',
      stderr: execaError.stderr ?? '',
      exitCode: execaError.exitCode ?? 1,
    };
  }
}

/**
 * Create a test plugin in a container
 */
export async function createTestPlugin(container: 'local' | 'remote', pluginName: string): Promise<void> {
  const exec = container === 'local' ? execInLocal : execInRemote;
  const pluginDir = `/var/www/html/wp-content/plugins/${pluginName}`;

  await exec(`mkdir -p ${pluginDir}`);
  await exec(`cat > ${pluginDir}/${pluginName}.php << 'EOF'
<?php
/**
 * Plugin Name: ${pluginName}
 * Description: Test plugin created for e2e testing
 * Version: 1.0.0
 */
add_action('init', function() {
    update_option('${pluginName}_installed', time());
});
EOF`);
}

/**
 * Check if a plugin exists in a container
 */
export async function pluginExists(container: 'local' | 'remote', pluginName: string): Promise<boolean> {
  const exec = container === 'local' ? execInLocal : execInRemote;

  try {
    await exec(`test -d /var/www/html/wp-content/plugins/${pluginName}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a plugin from a container
 */
export async function deletePlugin(container: 'local' | 'remote', pluginName: string): Promise<void> {
  const exec = container === 'local' ? execInLocal : execInRemote;
  try {
    await exec(`rm -rf /var/www/html/wp-content/plugins/${pluginName}`);
  } catch {
    // Ignore errors if plugin doesn't exist
  }
}

/**
 * Create a test theme in a container
 */
export async function createTestTheme(container: 'local' | 'remote', themeName: string): Promise<void> {
  const exec = container === 'local' ? execInLocal : execInRemote;
  const themeDir = `/var/www/html/wp-content/themes/${themeName}`;

  await exec(`mkdir -p ${themeDir}`);
  await exec(`cat > ${themeDir}/style.css << 'EOF'
/*
Theme Name: ${themeName}
Description: Test theme created for e2e testing
Version: 1.0.0
*/
EOF`);
  await exec(`cat > ${themeDir}/index.php << 'EOF'
<?php
// Silence is golden
get_header();
EOF`);
}

/**
 * Check if a theme exists in a container
 */
export async function themeExists(container: 'local' | 'remote', themeName: string): Promise<boolean> {
  const exec = container === 'local' ? execInLocal : execInRemote;

  try {
    await exec(`test -d /var/www/html/wp-content/themes/${themeName}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a theme from a container
 */
export async function deleteTheme(container: 'local' | 'remote', themeName: string): Promise<void> {
  const exec = container === 'local' ? execInLocal : execInRemote;
  try {
    await exec(`rm -rf /var/www/html/wp-content/themes/${themeName}`);
  } catch {
    // Ignore errors if theme doesn't exist
  }
}

/**
 * Get a WordPress option value from a container
 */
export async function getOption(container: 'local' | 'remote', optionName: string): Promise<string | null> {
  try {
    const containerName = container === 'local' ? 'wpmovejs-e2e-local' : 'wpmovejs-e2e-remote';
    const { stdout } = await execa('docker', [
      'exec', containerName,
      'wp', 'option', 'get', optionName, '--allow-root',
    ]);
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Set a WordPress option value in a container
 */
export async function setOption(container: 'local' | 'remote', optionName: string, value: string): Promise<void> {
  const containerName = container === 'local' ? 'wpmovejs-e2e-local' : 'wpmovejs-e2e-remote';
  await execa('docker', [
    'exec', containerName,
    'wp', 'option', 'update', optionName, value, '--allow-root',
  ]);
}

/**
 * Create an upload file in a container
 */
export async function createUploadFile(container: 'local' | 'remote', relativePath: string, content: string): Promise<void> {
  const exec = container === 'local' ? execInLocal : execInRemote;
  const fullPath = `/var/www/html/wp-content/uploads/${relativePath}`;
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));

  await exec(`mkdir -p ${dir}`);
  await exec(`cat > ${fullPath} << 'CONTENT_EOF'
${content}
CONTENT_EOF`);
}

/**
 * Check if an upload file exists in a container
 */
export async function uploadFileExists(container: 'local' | 'remote', relativePath: string): Promise<boolean> {
  const exec = container === 'local' ? execInLocal : execInRemote;

  try {
    await exec(`test -f /var/www/html/wp-content/uploads/${relativePath}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete an upload file from a container
 */
export async function deleteUploadFile(container: 'local' | 'remote', relativePath: string): Promise<void> {
  const exec = container === 'local' ? execInLocal : execInRemote;
  try {
    await exec(`rm -f /var/www/html/wp-content/uploads/${relativePath}`);
  } catch {
    // Ignore errors
  }
}

/**
 * Create a file inside a plugin directory
 */
export async function createPluginFile(container: 'local' | 'remote', pluginName: string, relativePath: string, content: string): Promise<void> {
  const exec = container === 'local' ? execInLocal : execInRemote;
  const fullPath = `/var/www/html/wp-content/plugins/${pluginName}/${relativePath}`;
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));

  await exec(`mkdir -p ${dir}`);
  await exec(`cat > ${fullPath} << 'CONTENT_EOF'
${content}
CONTENT_EOF`);
}

/**
 * Check if a file exists inside a plugin directory
 */
export async function pluginFileExists(container: 'local' | 'remote', pluginName: string, relativePath: string): Promise<boolean> {
  const exec = container === 'local' ? execInLocal : execInRemote;

  try {
    await exec(`test -f /var/www/html/wp-content/plugins/${pluginName}/${relativePath}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists inside a plugin directory
 */
export async function pluginDirExists(container: 'local' | 'remote', pluginName: string, relativePath: string): Promise<boolean> {
  const exec = container === 'local' ? execInLocal : execInRemote;

  try {
    await exec(`test -d /var/www/html/wp-content/plugins/${pluginName}/${relativePath}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a file inside a theme directory
 */
export async function createThemeFile(container: 'local' | 'remote', themeName: string, relativePath: string, content: string): Promise<void> {
  const exec = container === 'local' ? execInLocal : execInRemote;
  const fullPath = `/var/www/html/wp-content/themes/${themeName}/${relativePath}`;
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));

  await exec(`mkdir -p ${dir}`);
  await exec(`cat > ${fullPath} << 'CONTENT_EOF'
${content}
CONTENT_EOF`);
}

/**
 * Check if a file exists inside a theme directory
 */
export async function themeFileExists(container: 'local' | 'remote', themeName: string, relativePath: string): Promise<boolean> {
  const exec = container === 'local' ? execInLocal : execInRemote;

  try {
    await exec(`test -f /var/www/html/wp-content/themes/${themeName}/${relativePath}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists inside a theme directory
 */
export async function themeDirExists(container: 'local' | 'remote', themeName: string, relativePath: string): Promise<boolean> {
  const exec = container === 'local' ? execInLocal : execInRemote;

  try {
    await exec(`test -d /var/www/html/wp-content/themes/${themeName}/${relativePath}`);
    return true;
  } catch {
    return false;
  }
}
