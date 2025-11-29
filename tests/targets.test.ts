import { describe, it, expect, vi } from 'vitest';
import { resolveTargets } from '../src/utils/targets.js';
import { filterForbiddenTargets, handleForbiddenTargets, Env } from '../src/config.js';

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

describe('handleForbiddenTargets', () => {
  it('returns targets when no forbid config', () => {
    const env: Env = {};
    const logWarn = vi.fn();
    const result = handleForbiddenTargets(['db', 'uploads'], env, 'push', 'staging', logWarn);
    expect(result).toEqual(['db', 'uploads']);
    expect(logWarn).not.toHaveBeenCalled();
  });

  it('logs warnings for forbidden targets and returns allowed', () => {
    const env: Env = {
      forbid: {
        push: { db: true },
      },
    };
    const logWarn = vi.fn();
    const result = handleForbiddenTargets(['db', 'uploads', 'plugins'], env, 'push', 'production', logWarn);
    expect(result).toEqual(['uploads', 'plugins']);
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith("Push of 'db' is forbidden by production environment configuration");
  });

  it('returns null and logs when all targets are forbidden', () => {
    const env: Env = {
      forbid: {
        pull: { db: true, uploads: true },
      },
    };
    const logWarn = vi.fn();
    const result = handleForbiddenTargets(['db', 'uploads'], env, 'pull', 'staging', logWarn);
    expect(result).toBeNull();
    expect(logWarn).toHaveBeenCalledTimes(3); // 2 individual warnings + 1 "no targets" warning
    expect(logWarn).toHaveBeenCalledWith("Pull of 'db' is forbidden by staging environment configuration");
    expect(logWarn).toHaveBeenCalledWith("Pull of 'uploads' is forbidden by staging environment configuration");
    expect(logWarn).toHaveBeenCalledWith('No targets to pull (all requested targets are forbidden)');
  });

  it('uses correct operation name in log messages', () => {
    const env: Env = {
      forbid: {
        pull: { themes: true },
      },
    };
    const logWarn = vi.fn();
    handleForbiddenTargets(['themes'], env, 'pull', 'staging', logWarn);
    expect(logWarn).toHaveBeenCalledWith("Pull of 'themes' is forbidden by staging environment configuration");
  });
});
