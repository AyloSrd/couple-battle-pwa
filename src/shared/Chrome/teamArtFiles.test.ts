import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { teamsWithArt } from './teamArtResolver';

// vitest runs from the project root (jsdom rewrites import.meta.url, so don't build the path from it)
const DIR = resolve(process.cwd(), 'src/assets/art') + '/';
const FILES = readdirSync(DIR).filter((f) => /^team-.*\.webp$/.test(f));

/** RIFF/WEBP: the chunk fourcc list and the canvas size, read straight from the bytes. */
function inspect(file: string): { chunks: string[]; width: number; height: number } {
  const buf = readFileSync(DIR + file);
  expect(buf.toString('latin1', 0, 4), file).toBe('RIFF');
  expect(buf.toString('latin1', 8, 12), file).toBe('WEBP');
  const chunks: string[] = [];
  let width = 0;
  let height = 0;
  for (let i = 12; i + 8 <= buf.length; ) {
    const tag = buf.toString('latin1', i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    chunks.push(tag);
    if (tag === 'VP8X') {
      width = 1 + buf.readUIntLE(i + 12, 3);
      height = 1 + buf.readUIntLE(i + 15, 3);
    }
    i += 8 + size + (size & 1);
  }
  return { chunks, width, height };
}

describe('shipped team art files', () => {
  it('every team with art has the full set: portrait 256 + 384, full 512, bust p1 + p2 (192) — and nothing else', () => {
    for (const id of teamsWithArt()) {
      const own = FILES.filter((f) => f.startsWith(`team-${id}-`)).sort();
      expect(own, id).toEqual(
        [`team-${id}-256.webp`, `team-${id}-384.webp`, `team-${id}-full-512.webp`, `team-${id}-p1-192.webp`, `team-${id}-p2-192.webp`].sort(),
      );
    }
    expect(FILES).toHaveLength(teamsWithArt().length * 5); // no orphan file for a team without a portrait
  });

  it('files have the delivered dimensions and carry no metadata (no EXIF / XMP / ICC, no content credentials)', () => {
    const SIZE: Record<string, [number, number]> = {
      '256': [256, 256],
      '384': [384, 384],
      'full-512': [512, 768],
      'p1-192': [192, 192],
      'p2-192': [192, 192],
    };
    for (const file of FILES) {
      const kind = /^team-[a-z0-9]+-(.+)\.webp$/.exec(file)?.[1] ?? '';
      const { chunks, width, height } = inspect(file);
      expect([width, height], file).toEqual(SIZE[kind]);
      expect(chunks.filter((c) => !['VP8X', 'VP8 ', 'VP8L', 'ALPH'].includes(c)), `${file} extra chunks`).toEqual([]);
    }
  });
});
