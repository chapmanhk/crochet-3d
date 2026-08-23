import { describe, expect, it } from 'vitest';
import { SCENE_BACKGROUND } from '../../src/scene/CrochetScene';

describe('scene constants', () => {
  it('exports the flat illustrated background color', () => {
    expect(SCENE_BACKGROUND).toBe('#f7f0e6');
  });
});
