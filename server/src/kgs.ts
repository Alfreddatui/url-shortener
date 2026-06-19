const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = ALPHABET.length; // 62

export class KeyGenerationService {
  // Encodes a positive integer (auto-increment DB id) into a base62 string.
  generate(id: number): string {
    if (id <= 0) throw new Error(`id must be a positive integer, got ${id}`);
    let result = '';
    let n = id;
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
    return result;
  }
}

export const kgs = new KeyGenerationService();
