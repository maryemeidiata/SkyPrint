// Simple seeded random number generator
export function createSeededRng(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  let state = h;

  return function next(): number {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    state = state >>> 0;
    return state / 0xffffffff;
  };
}

export function seedFrom(date: string, time: string, city: string): string {
  return `${date}|${time}|${city}`;
}
