import { describe, it, expect } from 'vitest';
import { resolveTargets } from '../src/utils/targets.js';
import { filterForbiddenTargets, Env } from '../src/config.js';

describe('resolveTargets', () => {
  it('uses --only when provided', () => {
    expect(resolveTargets({ only: 'db,uploads' })).toEqual(['db', 'uploads']);
  });
  it('maps flags and defaults to db+uploads when none', () => {
    expect(resolveTargets({} as any)).toEqual(['db', 'uploads']);
    expect(resolveTargets({ all: true } as any)).toEqual([
      'wordpress','uploads','themes','plugins','mu-plugins','languages','db'
    ]);
    expect(resolveTargets({ uploads: true, plugins: true } as any)).toEqual(['uploads','plugins']);
  });
});

describe('filterForbiddenTargets', () => {
  it('returns all targets when no forbid config', () => {
    const env: Env = {};
    const result = filterForbiddenTargets(['db', 'uploads', 'plugins'], env, 'push');
    expect(result.allowed).toEqual(['db', 'uploads', 'plugins']);
    expect(result.forbidden).toEqual([]);
  });

  it('filters out forbidden push targets', () => {
    const env: Env = {
      forbid: {
        push: { db: true, uploads: true },
      },
    };
    const result = filterForbiddenTargets(['db', 'uploads', 'plugins', 'themes'], env, 'push');
    expect(result.allowed).toEqual(['plugins', 'themes']);
    expect(result.forbidden).toEqual(['db', 'uploads']);
  });

  it('filters out forbidden pull targets', () => {
    const env: Env = {
      forbid: {
        pull: { themes: true },
      },
    };
    const result = filterForbiddenTargets(['db', 'themes'], env, 'pull');
    expect(result.allowed).toEqual(['db']);
    expect(result.forbidden).toEqual(['themes']);
  });

  it('handles mu-plugins with underscore mapping', () => {
    const env: Env = {
      forbid: {
        push: { mu_plugins: true },
      },
    };
    const result = filterForbiddenTargets(['mu-plugins', 'plugins'], env, 'push');
    expect(result.allowed).toEqual(['plugins']);
    expect(result.forbidden).toEqual(['mu-plugins']);
  });

  it('does not filter when forbid is false', () => {
    const env: Env = {
      forbid: {
        push: { db: false },
      },
    };
    const result = filterForbiddenTargets(['db', 'uploads'], env, 'push');
    expect(result.allowed).toEqual(['db', 'uploads']);
    expect(result.forbidden).toEqual([]);
  });
});
