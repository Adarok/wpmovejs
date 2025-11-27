import { describe, it, expect } from 'vitest';
import { includePathsFor, excludePathsFor } from '../src/utils/rsyncFilters.js';

describe('rsyncFilters', () => {
  it('includePathsFor builds leading/trailing chain plus recursive include', () => {
    expect(includePathsFor('wp-content/uploads')).toEqual([
      '/wp-content/',
      '/wp-content/uploads/',
      '/wp-content/uploads/***',
    ]);
  });

  it('includePathsFor with specific items includes only those items', () => {
    expect(includePathsFor('wp-content/plugins', ['akismet', 'jetpack'])).toEqual([
      '/wp-content/',
      '/wp-content/plugins/',
      '/wp-content/plugins/akismet/***',
      '/wp-content/plugins/jetpack/***',
    ]);
  });

  it('excludePathsFor puts user excludes before hiding rules to protect files', () => {
    expect(excludePathsFor('wp-content/uploads/file.jpg', ['.git/'])).toEqual([
      '.git/',
      '/wp-content/uploads/*',
      '/wp-content/*',
      '/*',
    ]);
  });

  it('excludePathsFor with specific items adds hiding rule for parent directory', () => {
    expect(excludePathsFor('wp-content/plugins', ['.git/'], ['akismet'])).toEqual([
      '.git/',
      '/wp-content/*',
      '/*',
      '/wp-content/plugins/*',
    ]);
  });
});
