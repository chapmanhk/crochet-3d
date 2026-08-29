import { describe, expect, it } from 'vitest';
import {
  createTemplateSnapshot,
  generateInstructions,
  getTemplateById,
  PATTERN_TEMPLATES,
} from '@engine/index';

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

  it('creates a large swatch template for scale testing', () => {
    const snapshot = createTemplateSnapshot('large-swatch');
    expect(snapshot.stitches.length).toBe(120);
    expect(generateInstructions(snapshot.stitches, snapshot.foundationType)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Foundation: ch 20/)]),
    );
  });

  it('registers the large swatch template for the templates dialog', () => {
    expect(PATTERN_TEMPLATES.some((template) => template.id === 'large-swatch')).toBe(true);
    expect(getTemplateById('large-swatch')).toMatchObject({
      id: 'large-swatch',
      name: 'Large swatch',
    });
  });
});
