/**
 * E2E Tests: Exclude Patterns
 *
 * Tests various exclude patterns: specific files, directories, globs, hidden files
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  runWpmovejs,
  createTestPlugin,
  pluginExists,
  deletePlugin,
  createPluginFile,
  pluginFileExists,
  pluginDirExists,
  createTestTheme,
  themeExists,
  deleteTheme,
  createThemeFile,
  themeFileExists,
} from '../helpers/setup.js';

describe('Exclude Patterns', () => {
  const testPluginName = 'e2e-exclude-test-plugin';
  const testThemeName = 'e2e-exclude-test-theme';

  beforeEach(async () => {
    // Clean up before each test
    await deletePlugin('local', testPluginName);
    await deletePlugin('remote', testPluginName);
    await deleteTheme('local', testThemeName);
    await deleteTheme('remote', testThemeName);
  });

  afterEach(async () => {
    // Clean up after each test
    await deletePlugin('local', testPluginName);
    await deletePlugin('remote', testPluginName);
    await deleteTheme('local', testThemeName);
    await deleteTheme('remote', testThemeName);
  });

  describe('exclude specific files', () => {
    it('should exclude a specific file by name from plugins push', async () => {
      // Create plugin with files
      await createTestPlugin('local', testPluginName);
      await createPluginFile('local', testPluginName, 'included.txt', 'This should be synced');
      await createPluginFile('local', testPluginName, 'exclude-me.txt', 'This should NOT be synced');

      // Push using config with excludes
      const result = await runWpmovejs(['push', '-e', 'remote', '-p'], 'wpmove-excludes.yml');
      expect(result.exitCode).toBe(0);

      // Plugin should exist on remote
      expect(await pluginExists('remote', testPluginName)).toBe(true);

      // included.txt SHOULD exist on remote
      expect(await pluginFileExists('remote', testPluginName, 'included.txt')).toBe(true);

      // exclude-me.txt should NOT exist on remote
      expect(await pluginFileExists('remote', testPluginName, 'exclude-me.txt')).toBe(false);
    }, 60000);

    it('should exclude a specific file by name from themes push', async () => {
      // Create theme with files
      await createTestTheme('local', testThemeName);
      await createThemeFile('local', testThemeName, 'functions.php', '<?php // functions');
      await createThemeFile('local', testThemeName, 'exclude-me.txt', 'This should NOT be synced');

      // Push using config with excludes
      const result = await runWpmovejs(['push', '-e', 'remote', '-t'], 'wpmove-excludes.yml');
      expect(result.exitCode).toBe(0);

      // Theme should exist on remote
      expect(await themeExists('remote', testThemeName)).toBe(true);

      // functions.php SHOULD exist on remote
      expect(await themeFileExists('remote', testThemeName, 'functions.php')).toBe(true);

      // exclude-me.txt should NOT exist on remote
      expect(await themeFileExists('remote', testThemeName, 'exclude-me.txt')).toBe(false);
    }, 60000);
  });

  describe('exclude entire directories', () => {
    it('should exclude an entire directory from push', async () => {
      // Create plugin with directory structure
      await createTestPlugin('local', testPluginName);
      await createPluginFile('local', testPluginName, 'main.php', '<?php // main');
      await createPluginFile('local', testPluginName, 'excluded-dir/file1.txt', 'Should not sync');
      await createPluginFile('local', testPluginName, 'excluded-dir/file2.txt', 'Should not sync');
      await createPluginFile('local', testPluginName, 'excluded-dir/subdir/nested.txt', 'Should not sync');
      await createPluginFile('local', testPluginName, 'included-dir/file.txt', 'Should sync');

      // Push using config with excludes
      const result = await runWpmovejs(['push', '-e', 'remote', '-p'], 'wpmove-excludes.yml');
      expect(result.exitCode).toBe(0);

      // Plugin should exist on remote
      expect(await pluginExists('remote', testPluginName)).toBe(true);

      // main.php SHOULD exist
      expect(await pluginFileExists('remote', testPluginName, 'main.php')).toBe(true);

      // included-dir SHOULD exist with its file
      expect(await pluginDirExists('remote', testPluginName, 'included-dir')).toBe(true);
      expect(await pluginFileExists('remote', testPluginName, 'included-dir/file.txt')).toBe(true);

      // excluded-dir should NOT exist (or be empty)
      expect(await pluginFileExists('remote', testPluginName, 'excluded-dir/file1.txt')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, 'excluded-dir/file2.txt')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, 'excluded-dir/subdir/nested.txt')).toBe(false);
    }, 60000);
  });

  describe('exclude glob patterns', () => {
    it('should exclude files matching extension glob (*.log)', async () => {
      // Create plugin with various files
      await createTestPlugin('local', testPluginName);
      await createPluginFile('local', testPluginName, 'debug.log', 'Log content');
      await createPluginFile('local', testPluginName, 'error.log', 'Error log');
      await createPluginFile('local', testPluginName, 'logs/app.log', 'App log');
      await createPluginFile('local', testPluginName, 'readme.txt', 'Readme content');
      await createPluginFile('local', testPluginName, 'changelog.md', 'Changelog');

      // Push using config with excludes
      const result = await runWpmovejs(['push', '-e', 'remote', '-p'], 'wpmove-excludes.yml');
      expect(result.exitCode).toBe(0);

      // Plugin should exist on remote
      expect(await pluginExists('remote', testPluginName)).toBe(true);

      // Non-log files SHOULD exist
      expect(await pluginFileExists('remote', testPluginName, 'readme.txt')).toBe(true);
      expect(await pluginFileExists('remote', testPluginName, 'changelog.md')).toBe(true);

      // .log files should NOT exist
      expect(await pluginFileExists('remote', testPluginName, 'debug.log')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, 'error.log')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, 'logs/app.log')).toBe(false);
    }, 60000);

    it('should exclude files matching nested path glob (**/cache/*)', async () => {
      // Create plugin with cache directories at various levels
      await createTestPlugin('local', testPluginName);
      await createPluginFile('local', testPluginName, 'cache/temp.dat', 'Cache data');
      await createPluginFile('local', testPluginName, 'assets/cache/compiled.css', 'Compiled CSS');
      await createPluginFile('local', testPluginName, 'deep/nested/cache/data.json', 'Cached JSON');
      await createPluginFile('local', testPluginName, 'assets/styles.css', 'Real styles');
      await createPluginFile('local', testPluginName, 'nocache/file.txt', 'Not in cache dir');

      // Push using config with excludes
      const result = await runWpmovejs(['push', '-e', 'remote', '-p'], 'wpmove-excludes.yml');
      expect(result.exitCode).toBe(0);

      // Plugin should exist on remote
      expect(await pluginExists('remote', testPluginName)).toBe(true);

      // Non-cache files SHOULD exist
      expect(await pluginFileExists('remote', testPluginName, 'assets/styles.css')).toBe(true);
      expect(await pluginFileExists('remote', testPluginName, 'nocache/file.txt')).toBe(true);

      // Files in cache directories should NOT exist
      expect(await pluginFileExists('remote', testPluginName, 'cache/temp.dat')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, 'assets/cache/compiled.css')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, 'deep/nested/cache/data.json')).toBe(false);
    }, 60000);
  });

  describe('exclude hidden files and directories', () => {
    it('should exclude hidden files (.hidden-file)', async () => {
      // Create plugin with hidden and visible files
      await createTestPlugin('local', testPluginName);
      await createPluginFile('local', testPluginName, '.hidden-file', 'Hidden content');
      await createPluginFile('local', testPluginName, 'visible-file.txt', 'Visible content');
      await createPluginFile('local', testPluginName, 'subdir/.hidden-file', 'Hidden in subdir');

      // Push using config with excludes
      const result = await runWpmovejs(['push', '-e', 'remote', '-p'], 'wpmove-excludes.yml');
      expect(result.exitCode).toBe(0);

      // Plugin should exist on remote
      expect(await pluginExists('remote', testPluginName)).toBe(true);

      // Visible file SHOULD exist
      expect(await pluginFileExists('remote', testPluginName, 'visible-file.txt')).toBe(true);

      // Hidden files should NOT exist
      expect(await pluginFileExists('remote', testPluginName, '.hidden-file')).toBe(false);
      // Note: subdir/.hidden-file might exist since exclude is just '.hidden-file' at root
    }, 60000);

    it('should exclude hidden directories (.hidden-dir/)', async () => {
      // Create plugin with hidden and visible directories
      await createTestPlugin('local', testPluginName);
      await createPluginFile('local', testPluginName, '.hidden-dir/secret.txt', 'Secret content');
      await createPluginFile('local', testPluginName, '.hidden-dir/nested/deep.txt', 'Deep secret');
      await createPluginFile('local', testPluginName, 'visible-dir/public.txt', 'Public content');

      // Push using config with excludes
      const result = await runWpmovejs(['push', '-e', 'remote', '-p'], 'wpmove-excludes.yml');
      expect(result.exitCode).toBe(0);

      // Plugin should exist on remote
      expect(await pluginExists('remote', testPluginName)).toBe(true);

      // Visible directory SHOULD exist
      expect(await pluginDirExists('remote', testPluginName, 'visible-dir')).toBe(true);
      expect(await pluginFileExists('remote', testPluginName, 'visible-dir/public.txt')).toBe(true);

      // Hidden directory should NOT exist
      expect(await pluginFileExists('remote', testPluginName, '.hidden-dir/secret.txt')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, '.hidden-dir/nested/deep.txt')).toBe(false);
    }, 60000);
  });

  describe('multiple exclude patterns together', () => {
    it('should apply multiple exclude patterns simultaneously', async () => {
      // Create plugin with files matching various exclude patterns
      await createTestPlugin('local', testPluginName);

      // Files that should be synced
      await createPluginFile('local', testPluginName, 'main.php', '<?php // main');
      await createPluginFile('local', testPluginName, 'readme.txt', 'Readme');
      await createPluginFile('local', testPluginName, 'assets/style.css', 'Styles');
      await createPluginFile('local', testPluginName, 'includes/helper.php', '<?php // helper');

      // Files that should be excluded
      await createPluginFile('local', testPluginName, 'exclude-me.txt', 'Excluded by name');
      await createPluginFile('local', testPluginName, 'excluded-dir/file.txt', 'Excluded dir');
      await createPluginFile('local', testPluginName, 'debug.log', 'Excluded by glob');
      await createPluginFile('local', testPluginName, 'data/cache/temp.dat', 'Excluded by nested glob');
      await createPluginFile('local', testPluginName, '.hidden-file', 'Excluded hidden file');
      await createPluginFile('local', testPluginName, '.hidden-dir/secret.txt', 'Excluded hidden dir');

      // Push using config with excludes
      const result = await runWpmovejs(['push', '-e', 'remote', '-p'], 'wpmove-excludes.yml');
      expect(result.exitCode).toBe(0);

      // Plugin should exist on remote
      expect(await pluginExists('remote', testPluginName)).toBe(true);

      // Included files SHOULD exist
      expect(await pluginFileExists('remote', testPluginName, 'main.php')).toBe(true);
      expect(await pluginFileExists('remote', testPluginName, 'readme.txt')).toBe(true);
      expect(await pluginFileExists('remote', testPluginName, 'assets/style.css')).toBe(true);
      expect(await pluginFileExists('remote', testPluginName, 'includes/helper.php')).toBe(true);

      // Excluded files should NOT exist
      expect(await pluginFileExists('remote', testPluginName, 'exclude-me.txt')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, 'excluded-dir/file.txt')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, 'debug.log')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, 'data/cache/temp.dat')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, '.hidden-file')).toBe(false);
      expect(await pluginFileExists('remote', testPluginName, '.hidden-dir/secret.txt')).toBe(false);
    }, 90000);
  });

  describe('exclude patterns on pull operations', () => {
    it('should apply exclude patterns when pulling plugins', async () => {
      // Create plugin on remote with various files
      await createTestPlugin('remote', testPluginName);
      await createPluginFile('remote', testPluginName, 'main.php', '<?php // main');
      await createPluginFile('remote', testPluginName, 'exclude-me.txt', 'Should be excluded');
      await createPluginFile('remote', testPluginName, 'debug.log', 'Should be excluded');
      await createPluginFile('remote', testPluginName, 'excluded-dir/data.txt', 'Should be excluded');

      // Pull using config with excludes
      const result = await runWpmovejs(['pull', '-e', 'remote', '-p'], 'wpmove-excludes.yml');
      expect(result.exitCode).toBe(0);

      // Plugin should exist locally
      expect(await pluginExists('local', testPluginName)).toBe(true);

      // main.php SHOULD exist locally
      expect(await pluginFileExists('local', testPluginName, 'main.php')).toBe(true);

      // Excluded files should NOT exist locally
      expect(await pluginFileExists('local', testPluginName, 'exclude-me.txt')).toBe(false);
      expect(await pluginFileExists('local', testPluginName, 'debug.log')).toBe(false);
      expect(await pluginFileExists('local', testPluginName, 'excluded-dir/data.txt')).toBe(false);
    }, 60000);
  });
});
