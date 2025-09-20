import { describe, it, expect } from 'vitest';
import { computeUrlPairs } from '../src/utils/urls.js';

const local = (urls?: string[]) => ({ wordpress_path: '.', wp_cli: 'wp', db: { host: '', name: '', user: '', password: '' }, urls });
const remote = (urls?: string[]) => ({ ssh: { host: 'example.com', user: 'u', port: 22, path: '/var/www' }, wp_cli: 'wp', db: { host: '', name: '', user: '', password: '' }, urls });

describe('computeUrlPairs', () => {
  it('pairs equal-length arrays', () => {
    const pairs = computeUrlPairs(local(['http://a']), remote(['https://b']));
    expect(pairs).toEqual([{ search: 'http://a', replace: 'https://b' }]);
  });
  it('falls back to first values when lengths differ', () => {
    const pairs = computeUrlPairs(local(['http://a', 'http://a2']), remote(['https://b']));
    expect(pairs).toEqual([
      { search: 'http://a', replace: 'https://b' },
      { search: 'http://a2', replace: 'https://b' },
    ]);
  });
  it('fallbacks to host when no urls present', () => {
    const pairs = computeUrlPairs(local([]), remote([]));
    expect(pairs[0].replace).toContain('https://example.com');
  });
});
