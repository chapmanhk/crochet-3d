/**
 * Vitest Setup File
 *
 * This file runs before any test files.
 * Sets up global mocks needed for the test environment.
 */

import { vi } from 'vitest';

// Mock THREE.Vector3 for jsdom environment
class MockVector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }
    clone() {
        return new MockVector3(this.x, this.y, this.z);
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    normalize() {
        const len = this.length();
        if (len > 0) {
            this.x /= len;
            this.y /= len;
            this.z /= len;
        }
        return this;
    }
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

// Mock the 'three' module
vi.mock('three', () => ({
    Vector3: MockVector3,
    // Add minimal mocks for other THREE classes as needed
    Color: class MockColor {
        constructor(color) {
            this.color = color;
        }
        getHex() {
            return this.color;
        }
        setHex(hex) {
            this.color = hex;
            return this;
        }
    },
    MeshStandardMaterial: class MockMaterial {
        constructor(opts) {
            Object.assign(this, opts);
        }
        dispose() {}
    },
    SphereGeometry: class MockSphereGeometry {
        constructor() {}
        dispose() {}
    },
    CylinderGeometry: class MockCylinderGeometry {
        constructor() {}
        dispose() {}
    },
    Mesh: class MockMesh {
        constructor(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = new MockVector3();
            this.visible = true;
            this.userData = {};
        }
    }
}));

// Set up global THREE mock as well for any runtime checks
globalThis.THREE = {
    Vector3: MockVector3
};
