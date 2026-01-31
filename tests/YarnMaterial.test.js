/**
 * Tests for YarnMaterial
 */

import { describe, it, expect } from 'vitest';
import { YarnMaterial } from '../src/rendering/YarnMaterial.js';

describe('YarnMaterial', () => {
    it('caches materials by color and options', () => {
        const yarn = new YarnMaterial();
        const mat1 = yarn.getMaterial(0xff0000);
        const mat2 = yarn.getMaterial(0xff0000);

        expect(mat1).toBe(mat2);

        const matSelected = yarn.getMaterial(0xff0000, { selected: true });
        expect(matSelected).not.toBe(mat1);
    });

    it('caches simple materials separately', () => {
        const yarn = new YarnMaterial();
        const mat1 = yarn.getSimpleMaterial(0x00ff00);
        const mat2 = yarn.getSimpleMaterial(0x00ff00);

        expect(mat1).toBe(mat2);
        expect(mat1).not.toBe(yarn.getMaterial(0x00ff00));
    });

    it('exposes preset colors', () => {
        const colors = YarnMaterial.getPresetColors();
        expect(Array.isArray(colors)).toBe(true);
        expect(colors.length).toBeGreaterThan(5);
        expect(colors[0]).toHaveProperty('name');
        expect(colors[0]).toHaveProperty('color');
    });

    it('disposes cached materials and textures', () => {
        const yarn = new YarnMaterial();
        yarn.getMaterial(0xff0000);
        yarn.getSimpleMaterial(0x00ff00);

        yarn.dispose();

        expect(yarn.materialCache.size).toBe(0);
    });
});
