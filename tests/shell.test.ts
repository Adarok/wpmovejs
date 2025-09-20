import { describe, it, expect } from 'vitest';
import { shQuote } from '../src/utils/shell.js';

describe('shQuote', () => {
  it('quotes strings safely for POSIX shells', () => {
    expect(shQuote('abc')).toBe("'abc'");
    expect(shQuote("a'b")).toBe("'a'\"'\"'b'");
  });
});
