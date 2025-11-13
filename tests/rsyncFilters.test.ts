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
  it('excludePathsFor puts user excludes before hiding rules to protect files', () => {
    expect(excludePathsFor('wp-content/uploads/file.jpg', ['.git/'])).toEqual([
      '.git/',
      '/wp-content/uploads/*',
      '/wp-content/*',
      '/*',
    ]);
  });
});
