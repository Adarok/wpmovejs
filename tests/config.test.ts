import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { checkConfigPermissions } from '../src/config.js';

describe('checkConfigPermissions', () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wpmove-test-'));
    tempFile = path.join(tempDir, 'wpmove.yml');
    await fs.writeFile(tempFile, 'local:\n  wordpress_path: /var/www/html\n');
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('returns null for secure permissions (600)', async () => {
    await fs.chmod(tempFile, 0o600);
    const result = await checkConfigPermissions(tempFile);
    expect(result).toBeNull();
  });

  it('returns null for owner-only permissions (700)', async () => {
    await fs.chmod(tempFile, 0o700);
    const result = await checkConfigPermissions(tempFile);
    expect(result).toBeNull();
  });

  it('warns about group-readable permissions (640)', async () => {
    await fs.chmod(tempFile, 0o640);
    const result = await checkConfigPermissions(tempFile);
    expect(result).not.toBeNull();
    expect(result).toContain('insecure permissions');
    expect(result).toContain('640');
    expect(result).toContain('chmod 600');
  });

  it('warns about world-readable permissions (644)', async () => {
    await fs.chmod(tempFile, 0o644);
    const result = await checkConfigPermissions(tempFile);
    expect(result).not.toBeNull();
    expect(result).toContain('insecure permissions');
    expect(result).toContain('644');
  });

  it('warns about fully open permissions (777)', async () => {
    await fs.chmod(tempFile, 0o777);
    const result = await checkConfigPermissions(tempFile);
    expect(result).not.toBeNull();
    expect(result).toContain('insecure permissions');
    expect(result).toContain('777');
  });

  it('returns null for non-existent file', async () => {
    const result = await checkConfigPermissions('/nonexistent/path/wpmove.yml');
    expect(result).toBeNull();
  });
});
