/**
 * Vitest Global Setup for E2E Tests
 *
 * Starts Docker containers once before all tests and stops them after
 */

import { execa, execaSync } from 'execa';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCKER_DIR = join(__dirname, '..', 'docker');

// SSH key paths for testing
const SSH_KEY_DIR = join(tmpdir(), 'wpmovejs-e2e-ssh');
const SSH_PRIVATE_KEY = join(SSH_KEY_DIR, 'id_ed25519');
const SSH_PUBLIC_KEY_PATH = join(SSH_KEY_DIR, 'id_ed25519.pub');

function generateSSHKeys(): string {
  if (!existsSync(SSH_KEY_DIR)) {
    mkdirSync(SSH_KEY_DIR, { recursive: true, mode: 0o700 });
  }

  if (existsSync(SSH_PRIVATE_KEY) && existsSync(SSH_PUBLIC_KEY_PATH)) {
    return readFileSync(SSH_PUBLIC_KEY_PATH, 'utf-8').trim();
  }

  if (existsSync(SSH_PRIVATE_KEY)) unlinkSync(SSH_PRIVATE_KEY);
  if (existsSync(SSH_PUBLIC_KEY_PATH)) unlinkSync(SSH_PUBLIC_KEY_PATH);

  execaSync('ssh-keygen', [
    '-t', 'ed25519',
    '-f', SSH_PRIVATE_KEY,
    '-N', '',
    '-C', 'wpmovejs-e2e-test',
  ]);

  return readFileSync(SSH_PUBLIC_KEY_PATH, 'utf-8').trim();
}

async function waitForContainer(containerName: string, timeoutMs = 180000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const { stdout } = await execa('docker', [
        'inspect',
        '--format', '{{.State.Health.Status}}',
        containerName,
      ]);

      if (stdout.trim() === 'healthy') {
        console.log(`✓ Container ${containerName} is healthy`);
        return;
      }
    } catch {
      // Container might not exist yet
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error(`Timeout waiting for container ${containerName} to be healthy`);
}

async function waitForWordPress(containerName: string, timeoutMs = 120000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      await execa('docker', [
        'exec', containerName,
        'wp', 'core', 'is-installed', '--allow-root',
      ]);

      console.log(`✓ WordPress is installed in ${containerName}`);
      return;
    } catch {
      // WordPress not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error(`Timeout waiting for WordPress in ${containerName}`);
}

export async function setup() {
  console.log('\n🚀 Starting E2E test environment...\n');

  const publicKey = generateSSHKeys();
  console.log('✓ SSH keys ready');

  // Store public key for tests to use
  process.env.SSH_PUBLIC_KEY = publicKey;

  const composeFile = join(DOCKER_DIR, 'docker-compose.yml');
    // Clean up any existing containers first
  console.log('Cleaning up any existing containers...');
  try {
    await execa('docker', ['compose', '-f', composeFile, '-p', 'wpmovejs-e2e', 'down', '-v'], {
      env: { ...process.env, SSH_PUBLIC_KEY: publicKey },
    });
  } catch {
    // Ignore errors if nothing to clean up
  }

  // Build images
  console.log('Building Docker images...');
  try {
    await execa('docker', ['compose', '-f', composeFile, '-p', 'wpmovejs-e2e', 'build'], {
      env: { ...process.env, SSH_PUBLIC_KEY: publicKey, SSH_KEY_DIR },
    });
    console.log('✓ Docker images built');
  } catch (error) {
    console.error('Failed to build Docker images:', error);
    throw error;
  }

  // Start containers
  console.log('Starting containers...');
  try {
    await execa('docker', ['compose', '-f', composeFile, '-p', 'wpmovejs-e2e', 'up', '-d'], {
      env: { ...process.env, SSH_PUBLIC_KEY: publicKey, SSH_KEY_DIR },
    });
    console.log('✓ Containers started');
  } catch (error) {
    console.error('Failed to start containers:', error);
    throw error;
  }

  // Wait for containers to be healthy
  console.log('Waiting for containers to be healthy...');
  await waitForContainer('wpmovejs-e2e-local');
  await waitForContainer('wpmovejs-e2e-remote');

  // Wait for WordPress installations
  console.log('Waiting for WordPress installations...');
  await waitForWordPress('wpmovejs-e2e-local');
  await waitForWordPress('wpmovejs-e2e-remote');

  // Verify SSH setup (the entrypoint sets up ~/.ssh/config with the key)
  console.log('Verifying SSH configuration...');
  try {
    await execa('docker', [
      'exec', 'wpmovejs-e2e-local',
      'bash', '-c',
      'test -f /var/www/.ssh/config && test -f /var/www/.ssh/id_ed25519',
    ]);
    console.log('✓ SSH configuration is ready');
  } catch {
    console.warn('⚠ SSH configuration may not be ready - tests might fail');
  }

  console.log('\n✅ E2E environment is ready!\n');
}

export async function teardown() {
  console.log('\n🧹 Stopping E2E test environment...\n');

  const composeFile = join(DOCKER_DIR, 'docker-compose.yml');

  try {
    await execa('docker', ['compose', '-f', composeFile, '-p', 'wpmovejs-e2e', 'down', '-v']);
    console.log('✓ E2E environment stopped');
  } catch (error) {
    console.error('Warning: Failed to stop e2e environment:', error);
  }
}
