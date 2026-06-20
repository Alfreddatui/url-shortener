import { describe, it, expect } from 'vitest';
import { KeyGenerationService } from '../kgs';

const kgs = new KeyGenerationService();

describe('KeyGenerationService.generate', () => {
  it('throws for id = 0', () => {
    expect(() => kgs.generate(0)).toThrow();
  });

  it('throws for a negative id', () => {
    expect(() => kgs.generate(-1)).toThrow();
  });

  it('returns "100001" for id = 1 (MIN_LENGTH_OFFSET ensures 6-char minimum)', () => {
    expect(kgs.generate(1)).toBe('100001');
  });

  it('produces at least 6 characters for small IDs', () => {
    [1, 10, 100, 1000, 100_000].forEach(id => {
      expect(kgs.generate(id).length).toBeGreaterThanOrEqual(6);
    });
  });

  it('produces only base62 characters', () => {
    [1, 42, 9_999, 2_147_483_647].forEach(id => {
      expect(kgs.generate(id)).toMatch(/^[0-9A-Za-z]+$/);
    });
  });
});

describe('KeyGenerationService.resolve', () => {
  it('decodes "100001" to 1', () => {
    expect(kgs.resolve('100001')).toBe(1);
  });

  it('throws for characters outside the base62 alphabet', () => {
    expect(() => kgs.resolve('!nvalid')).toThrow();
  });
});

describe('KeyGenerationService roundtrip', () => {
  it('resolve(generate(id)) === id for a wide range of IDs', () => {
    [1, 2, 62, 100, 999, 12_345, 999_999, 2_147_483_647].forEach(id => {
      expect(kgs.resolve(kgs.generate(id))).toBe(id);
    });
  });

  it('two different IDs never produce the same code', () => {
    const codes = [1, 2, 3, 1000, 9999].map(id => kgs.generate(id));
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});
