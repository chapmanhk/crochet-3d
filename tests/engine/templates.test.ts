import { describe, expect, it } from 'vitest';
import { createTemplateSnapshot, generateInstructions } from '@engine/index';

describe('templates', () => {
  it('creates a coaster template snapshot', () => {
    const snapshot = createTemplateSnapshot('coaster');
    expect(snapshot.stitches.length).toBeGreaterThan(12);
    expect(generateInstructions(snapshot.stitches, snapshot.foundationType)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Foundation: ch 12/)]),
    );
  });

  it('creates a swatch template with hdc row', () => {
    const snapshot = createTemplateSnapshot('swatch');
    const instructions = generateInstructions(snapshot.stitches, snapshot.foundationType);
    expect(instructions.some((line) => line.includes('hdc'))).toBe(true);
    expect(instructions.some((line) => line.includes('dc'))).toBe(true);
  });
});
