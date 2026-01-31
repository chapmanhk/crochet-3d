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
    addVectors(a, b) {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
        this.z = a.z + b.z;
        return this;
    }
    subVectors(a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        this.z = a.z - b.z;
        return this;
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

class MockGroup {
    constructor() {
        this.children = [];
        this.name = '';
        this.visible = true;
    }
    add(obj) {
        this.children.push(obj);
    }
    remove(obj) {
        this.children = this.children.filter(child => child !== obj);
    }
}

class MockScene extends MockGroup {
    constructor() {
        super();
        this.background = null;
    }
}

class MockPerspectiveCamera {
    constructor(fov, aspect, near, far) {
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.position = new MockVector3();
        this.updateProjectionMatrix = vi.fn();
        this.lookAt = vi.fn();
    }
}

class MockWebGLRenderer {
    constructor() {
        this.domElement = document.createElement('canvas');
        this.shadowMap = { enabled: false, type: null };
        this.toneMapping = null;
        this.toneMappingExposure = 1;
        this.setSize = vi.fn();
        this.setPixelRatio = vi.fn();
        this.render = vi.fn();
        this.dispose = vi.fn();
    }
}

class MockDirectionalLight {
    constructor(color, intensity) {
        this.color = color;
        this.intensity = intensity;
        this.position = new MockVector3();
        this.castShadow = false;
        this.shadow = {
            mapSize: { width: 0, height: 0 },
            camera: {
                near: 0,
                far: 0,
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            }
        };
    }
}

class MockAmbientLight {
    constructor(color, intensity) {
        this.color = color;
        this.intensity = intensity;
    }
}

class MockHemisphereLight {
    constructor(color, groundColor, intensity) {
        this.color = color;
        this.groundColor = groundColor;
        this.intensity = intensity;
        this.position = new MockVector3();
    }
}

class MockGridHelper {
    constructor() {
        this.position = new MockVector3();
    }
}

class MockAxesHelper {
    constructor() {
        this.position = new MockVector3();
    }
}

class MockTorusGeometry {
    constructor() {}
    rotateX() { return this; }
    dispose() {}
}

class MockExtrudeGeometry {
    constructor() {}
    rotateY() { return this; }
    center() { return this; }
    dispose() {}
}

class MockShape {
    moveTo() {}
    quadraticCurveTo() {}
    lineTo() {}
}

class MockOrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = new MockVector3();
        this.enableDamping = false;
        this.dampingFactor = 0;
        this.screenSpacePanning = false;
        this.minDistance = 0;
        this.maxDistance = 0;
        this.maxPolarAngle = 0;
        this.update = vi.fn();
        this._listeners = {};
    }
    addEventListener(type, callback) {
        if (!this._listeners[type]) {
            this._listeners[type] = [];
        }
        this._listeners[type].push(callback);
    }
    dispose() {}
}

// Mock the 'three' module
vi.mock('three', () => ({
    Vector3: MockVector3,
    Vector2: MockVector2,
    Raycaster: MockRaycaster,
    Scene: MockScene,
    Group: MockGroup,
    PerspectiveCamera: MockPerspectiveCamera,
    WebGLRenderer: MockWebGLRenderer,
    DirectionalLight: MockDirectionalLight,
    AmbientLight: MockAmbientLight,
    HemisphereLight: MockHemisphereLight,
    GridHelper: MockGridHelper,
    AxesHelper: MockAxesHelper,
    TorusGeometry: MockTorusGeometry,
    ExtrudeGeometry: MockExtrudeGeometry,
    Shape: MockShape,
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
            this.scale = {
                x: 1,
                y: 1,
                z: 1,
                set: (x, y, z) => {
                    this.scale.x = x;
                    this.scale.y = y;
                    this.scale.z = z;
                },
                setScalar: (s) => {
                    this.scale.x = s;
                    this.scale.y = s;
                    this.scale.z = s;
                }
            };
            this.quaternion = {
                setFromUnitVectors: vi.fn()
            };
            this.visible = true;
            this.userData = {};
            this.castShadow = false;
            this.receiveShadow = false;
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
        clone() {
            return new MockCanvasTexture(this.canvas);
        }
        dispose() {}
    },
    RepeatWrapping: 1000,
    SRGBColorSpace: 'srgb',
    PCFSoftShadowMap: 2,
    ACESFilmicToneMapping: 1
}));

vi.mock('three-stdlib', () => ({
    OrbitControls: MockOrbitControls
}));

// Set up global THREE mock as well for any runtime checks
globalThis.THREE = {
    Vector3: MockVector3,
    Vector2: MockVector2,
    Raycaster: MockRaycaster
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
