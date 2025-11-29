/**
 * E2E Tests: Forbid Configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  runWpmovejs,
  createTestPlugin,
  pluginExists,
  deletePlugin,
  createUploadFile,
  uploadFileExists,
  deleteUploadFile,
} from '../helpers/setup.js';

describe('Forbid Configuration', () => {

  describe('forbid push', () => {
    const testPluginName = 'e2e-forbid-push-plugin';
    const testFile = 'e2e-forbid/test.txt';

    beforeEach(async () => {
      await deletePlugin('local', testPluginName);
      await deletePlugin('remote', testPluginName);
      await deleteUploadFile('local', testFile);
      await deleteUploadFile('remote', testFile);
    });

    it('should block forbidden push targets and warn user', async () => {
      // Create test upload locally (uploads push is forbidden in wpmove-forbid.yml)
      await createUploadFile('local', testFile, 'Should not be pushed');
      expect(await uploadFileExists('local', testFile)).toBe(true);

      // Try to push uploads using forbid config
      const result = await runWpmovejs(['push', '-e', 'remote', '-u'], 'wpmove-forbid.yml');

      // Command should complete but with warning
      expect(result.stdout + result.stderr).toContain('forbidden');

      // File should NOT exist on remote
      expect(await uploadFileExists('remote', testFile)).toBe(false);
    }, 60000);

    it('should allow non-forbidden push targets', async () => {
      // Create test plugin locally (plugins push is NOT forbidden)
      await createTestPlugin('local', testPluginName);
      expect(await pluginExists('local', testPluginName)).toBe(true);

      // Push plugins using forbid config (plugins should work)
      const result = await runWpmovejs(['push', '-e', 'remote', '-p'], 'wpmove-forbid.yml');
      expect(result.exitCode).toBe(0);

      // Plugin SHOULD exist on remote
      expect(await pluginExists('remote', testPluginName)).toBe(true);
    }, 60000);
  });

  describe('forbid pull', () => {
    it('should block forbidden pull targets and warn user', async () => {
      // Try to pull db using forbid config (db pull is forbidden in wpmove-forbid.yml)
      const result = await runWpmovejs(['pull', '-e', 'remote', '-d'], 'wpmove-forbid.yml');

      // Command should complete but with warning
      expect(result.stdout + result.stderr).toContain('forbidden');
    }, 60000);

    it('should allow non-forbidden pull targets', async () => {
      const testPluginName = 'e2e-forbid-pull-plugin';

      // Create test plugin on remote
      await createTestPlugin('remote', testPluginName);
      await deletePlugin('local', testPluginName);

      // Pull plugins using forbid config (plugins pull is NOT forbidden)
      const result = await runWpmovejs(['pull', '-e', 'remote', '-p'], 'wpmove-forbid.yml');
      expect(result.exitCode).toBe(0);

      // Plugin SHOULD exist locally
      expect(await pluginExists('local', testPluginName)).toBe(true);

      // Cleanup
      await deletePlugin('local', testPluginName);
      await deletePlugin('remote', testPluginName);
    }, 60000);
  });

  describe('mixed targets with forbid', () => {
    it('should push allowed targets while blocking forbidden ones', async () => {
      const testPluginName = 'e2e-forbid-mixed-plugin';
      const testFile = 'e2e-forbid-mixed/test.txt';

      // Create both plugin and upload locally
      await createTestPlugin('local', testPluginName);
      await createUploadFile('local', testFile, 'Should not be pushed');

      // Try to push both plugins and uploads (uploads is forbidden)
      const result = await runWpmovejs(['push', '-e', 'remote', '-p', '-u'], 'wpmove-forbid.yml');

      // Should warn about forbidden uploads
      expect(result.stdout + result.stderr).toContain('forbidden');

      // Plugin SHOULD exist on remote (allowed)
      expect(await pluginExists('remote', testPluginName)).toBe(true);

      // Upload should NOT exist on remote (forbidden)
      expect(await uploadFileExists('remote', testFile)).toBe(false);

      // Cleanup
      await deletePlugin('local', testPluginName);
      await deletePlugin('remote', testPluginName);
      await deleteUploadFile('local', testFile);
    }, 60000);
  });
});
