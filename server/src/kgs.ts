const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = ALPHABET.length; // 62

// Adding this offset ensures all generated codes are at least 6 characters,
// avoiding single-char codes like "1" or "A" for early IDs.
const MIN_LENGTH_OFFSET = BASE ** 5; // 916,132,832 → encodes to "100000" (6 chars)

export class KeyGenerationService {
  // Encodes a positive integer (auto-increment DB id) into a base62 string.
  generate(id: number): string {
    if (id <= 0) throw new Error(`id must be a positive integer, got ${id}`);
    let result = '';
    let n = id + MIN_LENGTH_OFFSET;
    while (n > 0) {
      result = ALPHABET[n % BASE] + result;
      n = Math.floor(n / BASE);
    }
    return result;
  }

  // Decodes a base62 string back to its original integer.
  resolve(code: string): number {
    let result = 0;
    for (const char of code) {
      const index = ALPHABET.indexOf(char);
      if (index === -1) throw new Error(`Invalid character in short code: '${char}'`);
      result = result * BASE + index;
    }
    return result - MIN_LENGTH_OFFSET;
  }
}

export const kgs = new KeyGenerationService();
