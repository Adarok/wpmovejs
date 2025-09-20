import { describe, it, expect } from 'vitest';
import { resolveTargets } from '../src/utils/targets.js';

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
