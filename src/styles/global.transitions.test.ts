import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'global.css'), 'utf8');

/** The text of the `@media (prefers-reduced-motion: reduce)` blocks (brace-matched). */
function reducedMotionBlocks(source: string): string[] {
  const blocks: string[] = [];
  const re = /@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') depth -= 1;
      i += 1;
    }
    blocks.push(source.slice(start, i - 1));
  }
  return blocks;
}

describe('global.css: the rules page view transitions', () => {
  it('names the two transition types and styles the old and new snapshots', () => {
    expect(css).toContain('rules-down');
    expect(css).toContain('rules-up');
    expect(css).toContain('::view-transition-old');
    expect(css).toContain('::view-transition-new');
  });

  it('keeps a reduced-motion block', () => {
    expect(css).toContain('prefers-reduced-motion');
    expect(reducedMotionBlocks(css).length).toBeGreaterThan(0);
  });

  it('each type styles both snapshots, and reduced motion switches all four off', () => {
    const selectors = ['rules-down', 'rules-up'].flatMap((type) => ['old', 'new'].map((snapshot) => `html:active-view-transition-type(${type})::view-transition-${snapshot}(root)`));
    const off = reducedMotionBlocks(css).filter((b) => b.includes('::view-transition')).join('\n');
    const on = css.replace(off, '');
    for (const selector of selectors) {
      expect(on, selector).toContain(selector);
      expect(off, selector).toContain(selector);
    }
  });

  it('turns the view-transition animations off under reduced motion', () => {
    const blocks = reducedMotionBlocks(css).filter((b) => b.includes('::view-transition'));
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toMatch(/animation(?:-name)?\s*:\s*none/);
    }
  });
});
