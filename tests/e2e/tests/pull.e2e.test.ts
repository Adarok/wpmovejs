/**
 * E2E Tests: Pull Operations
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

describe('Pull Operations', () => {

  describe('pull plugins', () => {
    const testPluginName = 'e2e-pull-test-plugin';

    beforeEach(async () => {
      await deletePlugin('local', testPluginName);
      await deletePlugin('remote', testPluginName);
    });

    it('should pull a plugin from remote to local', async () => {
      // Create test plugin on remote
      await createTestPlugin('remote', testPluginName);
      expect(await pluginExists('remote', testPluginName)).toBe(true);
      expect(await pluginExists('local', testPluginName)).toBe(false);

      // Run pull command
      const result = await runWpmovejs(['pull', '-e', 'remote', '-p']);
      expect(result.exitCode).toBe(0);

      // Verify plugin exists locally
      expect(await pluginExists('local', testPluginName)).toBe(true);
    }, 60000);

    it('should pull specific plugin using --items', async () => {
      // Create multiple plugins on remote
      await createTestPlugin('remote', testPluginName);
      await createTestPlugin('remote', 'other-remote-plugin');

      // Run pull with --items
      const result = await runWpmovejs(['pull', '-e', 'remote', '-p', '--items', testPluginName]);
      expect(result.exitCode).toBe(0);

      // Only the specified plugin should be pulled
      expect(await pluginExists('local', testPluginName)).toBe(true);
      expect(await pluginExists('local', 'other-remote-plugin')).toBe(false);

      // Cleanup
      await deletePlugin('remote', 'other-remote-plugin');
    }, 60000);
  });

  describe('pull themes', () => {
    const testThemeName = 'e2e-pull-test-theme';

    beforeEach(async () => {
      await deleteTheme('local', testThemeName);
      await deleteTheme('remote', testThemeName);
    });

    it('should pull a theme from remote to local', async () => {
      // Create test theme on remote
      await createTestTheme('remote', testThemeName);
      expect(await themeExists('remote', testThemeName)).toBe(true);
      expect(await themeExists('local', testThemeName)).toBe(false);

      // Run pull command
      const result = await runWpmovejs(['pull', '-e', 'remote', '-t']);
      expect(result.exitCode).toBe(0);

      // Verify theme exists locally
      expect(await themeExists('local', testThemeName)).toBe(true);
    }, 60000);
  });

  describe('pull uploads', () => {
    const testFile = 'e2e-pull-test/test-file.txt';

    beforeEach(async () => {
      await deleteUploadFile('local', testFile);
      await deleteUploadFile('remote', testFile);
    });

    it('should pull upload files from remote to local', async () => {
      // Create test upload on remote
      await createUploadFile('remote', testFile, 'Hello from remote');
      expect(await uploadFileExists('remote', testFile)).toBe(true);
      expect(await uploadFileExists('local', testFile)).toBe(false);

      // Run pull command
      const result = await runWpmovejs(['pull', '-e', 'remote', '-u']);
      expect(result.exitCode).toBe(0);

      // Verify file exists locally
      expect(await uploadFileExists('local', testFile)).toBe(true);
    }, 60000);
  });

  describe('dry run', () => {
    it('should not make changes with --dry-run', async () => {
      const testPluginName = 'e2e-pull-dry-run-plugin';

      // Create test plugin on remote
      await createTestPlugin('remote', testPluginName);
      expect(await pluginExists('local', testPluginName)).toBe(false);

      // Run pull with dry-run
      const result = await runWpmovejs(['pull', '-e', 'remote', '-p', '--dry-run']);
      expect(result.exitCode).toBe(0);

      // Plugin should NOT exist locally
      expect(await pluginExists('local', testPluginName)).toBe(false);

      // Cleanup
      await deletePlugin('remote', testPluginName);
    }, 60000);
  });
});
