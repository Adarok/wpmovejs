import { describe, it, expect } from 'vitest';
import { includePathsFor, excludePathsFor } from '../src/utils/rsyncFilters.js';

describe('rsyncFilters', () => {
  it('includePathsFor builds leading/trailing slash chain', () => {
    expect(includePathsFor('wp-content/uploads')).toEqual([
      '/wp-content/',
      '/wp-content/uploads/',
    ]);
  });
  it('excludePathsFor excludes parents and root wildcard plus user excludes', () => {
    expect(excludePathsFor('wp-content/uploads/file.jpg', ['.git/'])).toEqual([
      '/wp-content/uploads/*',
      '/wp-content/*',
      '/*',
      '.git/',
    ]);
  });
});
