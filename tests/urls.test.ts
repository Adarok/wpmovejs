import { describe, it, expect } from 'vitest';
import { computeUrlPairs } from '../src/utils/urls.js';

const local = (urls?: string[], wordpress_path?: string) => ({ wordpress_path: wordpress_path ?? '.', wp_cli: 'wp', db: { host: '', name: '', user: '', password: '' }, urls });
const remote = (urls?: string[], wordpress_path?: string) => ({ ssh: { host: 'example.com', user: 'u', port: 22, path: '/var/www' }, wordpress_path, wp_cli: 'wp', db: { host: '', name: '', user: '', password: '' }, urls });

describe('computeUrlPairs', () => {
  it('pairs equal-length arrays', () => {
    const pairs = computeUrlPairs(local(['http://a']), remote(['https://b']));
    expect(pairs).toEqual([
      { search: 'http://a', replace: 'https://b' },
      { search: '.', replace: '/var/www' },
    ]);
  });
  it('falls back to first values when lengths differ', () => {
    const pairs = computeUrlPairs(local(['http://a', 'http://a2']), remote(['https://b']));
    expect(pairs).toEqual([
      { search: 'http://a', replace: 'https://b' },
      { search: 'http://a2', replace: 'https://b' },
      { search: '.', replace: '/var/www' },
    ]);
  });
  it('fallbacks to host when no urls present', () => {
    const pairs = computeUrlPairs(local([]), remote([]));
    expect(pairs[0].replace).toContain('https://example.com');
  });
  it('includes wordpress_path replacement when paths differ', () => {
    const pairs = computeUrlPairs(
      local(['http://localhost'], '/Users/dev/wordpress'),
      remote(['https://example.com'], '/var/www/html')
    );
    expect(pairs).toEqual([
      { search: 'http://localhost', replace: 'https://example.com' },
      { search: '/Users/dev/wordpress', replace: '/var/www/html' },
    ]);
  });
  it('normalizes trailing slashes in wordpress_path', () => {
    const pairs = computeUrlPairs(
      local(['http://localhost'], '/Users/dev/wordpress/'),
      remote(['https://example.com'], '/var/www/html/')
    );
    expect(pairs).toEqual([
      { search: 'http://localhost', replace: 'https://example.com' },
      { search: '/Users/dev/wordpress', replace: '/var/www/html' },
    ]);
  });
  it('skips wordpress_path replacement when paths are the same', () => {
    const pairs = computeUrlPairs(
      local(['http://localhost'], '/var/www'),
      remote(['https://example.com'], '/var/www')
    );
    expect(pairs).toEqual([
      { search: 'http://localhost', replace: 'https://example.com' },
    ]);
  });
  it('falls back to ssh.path when wordpress_path not specified', () => {
    const pairs = computeUrlPairs(
      local(['http://localhost'], '/Users/dev/wordpress'),
      remote(['https://example.com'])
    );
    expect(pairs).toEqual([
      { search: 'http://localhost', replace: 'https://example.com' },
      { search: '/Users/dev/wordpress', replace: '/var/www' },
    ]);
  });
});
