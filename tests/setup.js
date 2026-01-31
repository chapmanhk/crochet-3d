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

class MockVector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
}

class MockRaycaster {
    constructor() {
        this._intersections = [];
    }
    setFromCamera() {}
    intersectObjects() {
        return this._intersections;
    }
}

// Mock the 'three' module
vi.mock('three', () => ({
    Vector3: MockVector3,
    Vector2: MockVector2,
    Raycaster: MockRaycaster,
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
    },
    CanvasTexture: class MockCanvasTexture {
        constructor(canvas) {
            this.canvas = canvas;
            this.needsUpdate = false;
            this.wrapS = 1000;
            this.wrapT = 1000;
            this.repeat = {
                set: vi.fn()
            };
            this.colorSpace = 'srgb';
        }
        dispose() {}
    },
    RepeatWrapping: 1000,
    SRGBColorSpace: 'srgb'
}));

// Set up global THREE mock as well for any runtime checks
globalThis.THREE = {
    Vector3: MockVector3
};

// Mock canvas 2D context for YarnMaterial
const mockContext2D = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    createLinearGradient: () => ({
        addColorStop: vi.fn()
    }),
    createRadialGradient: () => ({
        addColorStop: vi.fn()
    }),
    getImageData: () => ({
        data: new Uint8ClampedArray(4 * 128 * 128)
    }),
    putImageData: vi.fn()
};

// Override createElement to return mock canvas with context
const originalCreateElement = document.createElement.bind(document);
document.createElement = (tagName, options) => {
    const element = originalCreateElement(tagName, options);
    if (tagName.toLowerCase() === 'canvas') {
        element.getContext = (type) => {
            if (type === '2d') {
                return mockContext2D;
            }
            return null;
        };
    }
    return element;
};
