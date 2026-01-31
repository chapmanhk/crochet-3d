import * as THREE from 'three';

/**
 * YarnMaterial - Creates realistic yarn-like materials
 *
 * Provides materials that simulate yarn fiber appearance with:
 * - Soft, matte finish
 * - Subtle fiber texture via procedural normals
 * - Proper light scattering for fabric feel
 */

export class YarnMaterial {
    constructor() {
        // Cache materials by color
        this.materialCache = new Map();

        // Selection/highlight colors
        this.selectionColor = 0x00ff00;
        this.highlightColor = 0xffff00;
        this.rowHighlightColor = 0x2196F3;

        // Create procedural yarn texture
        this.yarnTexture = this.createYarnTexture();
        this.yarnNormalMap = this.createYarnNormalMap();
    }

    /**
     * Create a procedural yarn texture
     */
    createYarnTexture() {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base color (will be tinted)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Add fiber lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
        ctx.lineWidth = 0.5;

        for (let i = 0; i < 200; i++) {
            const x1 = Math.random() * size;
            const y1 = Math.random() * size;
            const angle = (Math.random() - 0.5) * 0.5 + Math.PI / 4;
            const length = 5 + Math.random() * 15;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(
                x1 + Math.cos(angle) * length,
                y1 + Math.sin(angle) * length
            );
            ctx.stroke();
        }

        // Add some noise for texture
        const imageData = ctx.getImageData(0, 0, size, size);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 10;
            imageData.data[i] += noise;
            imageData.data[i + 1] += noise;
            imageData.data[i + 2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);

        return texture;
    }

    /**
     * Create a normal map for yarn fiber detail
     */
    createYarnNormalMap() {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base normal (facing up = 0.5, 0.5, 1.0 in RGB)
        ctx.fillStyle = 'rgb(128, 128, 255)';
        ctx.fillRect(0, 0, size, size);

        // Add fiber ridges
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const angle = (Math.random() - 0.5) * 0.3 + Math.PI / 4;
            const length = 8 + Math.random() * 20;

            // Slight normal variation for fiber
            const nx = 128 + (Math.random() - 0.5) * 30;
            const ny = 128 + (Math.random() - 0.5) * 30;

            ctx.strokeStyle = `rgb(${nx}, ${ny}, 245)`;
            ctx.lineWidth = 1 + Math.random();

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + Math.cos(angle) * length,
                y + Math.sin(angle) * length
            );
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);

        return texture;
    }

    /**
     * Get or create a material for a given color
     */
    getMaterial(color, options = {}) {
        const selected = options.selected || false;
        const highlighted = options.highlighted || false;
        const rowHighlighted = options.rowHighlighted || false;
        const key = `${color}_${selected}_${highlighted}_${rowHighlighted}`;

        if (this.materialCache.has(key)) {
            return this.materialCache.get(key);
        }

        const material = this.createMaterial(color, options);
        this.materialCache.set(key, material);
        return material;
    }

    /**
     * Create a yarn material
     */
    createMaterial(color, options = {}) {
        let emissive = 0x000000;
        let emissiveIntensity = 0;

        if (options.selected) {
            emissive = this.selectionColor;
            emissiveIntensity = 0.3;
        } else if (options.highlighted) {
            emissive = this.highlightColor;
            emissiveIntensity = 0.2;
        } else if (options.rowHighlighted) {
            emissive = this.rowHighlightColor;
            emissiveIntensity = 0.15;
        }

        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.85,           // Yarn is quite rough/matte
            metalness: 0.0,            // No metalness for yarn
            emissive: emissive,
            emissiveIntensity: emissiveIntensity,

            // Use our procedural textures
            map: this.yarnTexture.clone(),
            normalMap: this.yarnNormalMap.clone(),
            normalScale: new THREE.Vector2(0.3, 0.3),

            // Slight bump for fiber detail
            bumpScale: 0.02
        });

        // Tint the texture with the yarn color
        material.map.needsUpdate = true;

        return material;
    }

    /**
     * Create a simple material without textures (for performance)
     */
    getSimpleMaterial(color, options = {}) {
        const rowHighlighted = options.rowHighlighted || false;
        const key = `simple_${color}_${options.selected}_${options.highlighted}_${rowHighlighted}`;

        if (this.materialCache.has(key)) {
            return this.materialCache.get(key);
        }

        let emissive = 0x000000;
        let emissiveIntensity = 0;

        if (options.selected) {
            emissive = this.selectionColor;
            emissiveIntensity = 0.3;
        } else if (options.highlighted) {
            emissive = this.highlightColor;
            emissiveIntensity = 0.2;
        } else if (options.rowHighlighted) {
            emissive = this.rowHighlightColor;
            emissiveIntensity = 0.15;
        }

        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8,
            metalness: 0.0,
            emissive: emissive,
            emissiveIntensity: emissiveIntensity
        });

        this.materialCache.set(key, material);
        return material;
    }

    /**
     * Get preset yarn colors
     */
    static getPresetColors() {
        return [
            { name: 'Brown', color: 0x8B4513 },
            { name: 'Cream', color: 0xFFFDD0 },
            { name: 'Red', color: 0xCC3333 },
            { name: 'Blue', color: 0x4169E1 },
            { name: 'Green', color: 0x228B22 },
            { name: 'Purple', color: 0x9370DB },
            { name: 'Pink', color: 0xFFB6C1 },
            { name: 'Yellow', color: 0xFFD700 },
            { name: 'Orange', color: 0xFF8C00 },
            { name: 'Gray', color: 0x808080 },
            { name: 'Black', color: 0x1a1a1a },
            { name: 'White', color: 0xFAFAFA }
        ];
    }

    /**
     * Dispose all cached materials
     */
    dispose() {
        this.materialCache.forEach(material => material.dispose());
        this.materialCache.clear();

        if (this.yarnTexture) this.yarnTexture.dispose();
        if (this.yarnNormalMap) this.yarnNormalMap.dispose();
    }
}

// Singleton instance
export const yarnMaterialInstance = new YarnMaterial();
