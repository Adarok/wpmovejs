/**
 * E2E Tests: Push Operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  runWpmovejs,
  createTestPlugin,
  pluginExists,
  deletePlugin,
  createTestTheme,
  themeExists,
  deleteTheme,
  createUploadFile,
  uploadFileExists,
  deleteUploadFile,
} from '../helpers/setup.js';

describe('Push Operations', () => {

  describe('push plugins', () => {
    const testPluginName = 'e2e-push-test-plugin';

    beforeEach(async () => {
      // Clean up before each test
      await deletePlugin('local', testPluginName);
      await deletePlugin('remote', testPluginName);
    });

    it('should push a plugin from local to remote', async () => {
      // Create test plugin locally
      await createTestPlugin('local', testPluginName);
      expect(await pluginExists('local', testPluginName)).toBe(true);
      expect(await pluginExists('remote', testPluginName)).toBe(false);

      // Run push command (subcommand first, then options)
      const result = await runWpmovejs(['push', '-e', 'remote', '-p']);

      // Debug: log output on failure
      if (result.exitCode !== 0) {
        console.log('STDOUT:', result.stdout);
        console.log('STDERR:', result.stderr);
      }

      expect(result.exitCode).toBe(0);

      // Verify plugin exists on remote
      expect(await pluginExists('remote', testPluginName)).toBe(true);
    }, 60000);

    it('should push specific plugin using --items', async () => {
      // Create multiple plugins locally
      await createTestPlugin('local', testPluginName);
      await createTestPlugin('local', 'other-plugin');

      // Run push with --items
      const result = await runWpmovejs(['push', '-e', 'remote', '-p', '--items', testPluginName]);
      expect(result.exitCode).toBe(0);

      // Only the specified plugin should be pushed
      expect(await pluginExists('remote', testPluginName)).toBe(true);
      expect(await pluginExists('remote', 'other-plugin')).toBe(false);

      // Cleanup
      await deletePlugin('local', 'other-plugin');
    }, 60000);
  });

  describe('push themes', () => {
    const testThemeName = 'e2e-push-test-theme';

    beforeEach(async () => {
      await deleteTheme('local', testThemeName);
      await deleteTheme('remote', testThemeName);
    });

    it('should push a theme from local to remote', async () => {
      // Create test theme locally
      await createTestTheme('local', testThemeName);
      expect(await themeExists('local', testThemeName)).toBe(true);
      expect(await themeExists('remote', testThemeName)).toBe(false);

      // Run push command
      const result = await runWpmovejs(['push', '-e', 'remote', '-t']);
      expect(result.exitCode).toBe(0);

      // Verify theme exists on remote
      expect(await themeExists('remote', testThemeName)).toBe(true);
    }, 60000);
  });

  describe('push uploads', () => {
    const testFile = 'e2e-test/test-file.txt';

    beforeEach(async () => {
      await deleteUploadFile('local', testFile);
      await deleteUploadFile('remote', testFile);
    });

    it('should push upload files from local to remote', async () => {
      // Create test upload locally
      await createUploadFile('local', testFile, 'Hello from e2e test');
      expect(await uploadFileExists('local', testFile)).toBe(true);
      expect(await uploadFileExists('remote', testFile)).toBe(false);

      // Run push command
      const result = await runWpmovejs(['push', '-e', 'remote', '-u']);
      expect(result.exitCode).toBe(0);

      // Verify file exists on remote
      expect(await uploadFileExists('remote', testFile)).toBe(true);
    }, 60000);
  });

  describe('dry run', () => {
    it('should not make changes with --dry-run', async () => {
      const testPluginName = 'e2e-dry-run-plugin';

      // Create test plugin locally
      await createTestPlugin('local', testPluginName);
      expect(await pluginExists('remote', testPluginName)).toBe(false);

      // Run push with dry-run
      const result = await runWpmovejs(['push', '-e', 'remote', '-p', '--dry-run']);
      expect(result.exitCode).toBe(0);

      // Plugin should NOT exist on remote
      expect(await pluginExists('remote', testPluginName)).toBe(false);

      // Cleanup
      await deletePlugin('local', testPluginName);
    }, 60000);
  });
});
