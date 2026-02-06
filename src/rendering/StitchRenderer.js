import * as THREE from 'three';
import { getStitchDefinition } from '../core/StitchTypes.js';
import { EventBus, Events, EventSubscriptions } from '../utils/EventBus.js';
import { yarnMaterialInstance } from './YarnMaterial.js';

/**
 * StitchRenderer - Creates and manages 3D meshes for stitches
 *
 * Handles:
 * - Generating geometry for chain and single crochet
 * - Material creation via YarnMaterial
 * - Mesh creation and updates
 * - Connection lines between stitches
 */

export class StitchRenderer {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;

        this.geometryCache = new Map();
        this.yarnMaterial = yarnMaterialInstance;

        this.meshMap = new Map();
        this.connectionMeshes = new Map();
        this.connectionGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);
        this.connectionUp = new THREE.Vector3(0, 1, 0);
        this.connectionTmpDir = new THREE.Vector3();
        this.connectionTmpMid = new THREE.Vector3();
        this.connectionRebuildPending = false;
        this.pattern = null;

        this.eventSubs = new EventSubscriptions();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventSubs.on(Events.STITCH_ADDED, ({ node, pattern }) => {
            if (pattern) this.pattern = pattern;
            if (node) this.createMeshForNode(node);
            this.requestConnectionRebuild();
        });

        this.eventSubs.on(Events.STITCH_REMOVED, ({ node, pattern }) => {
            if (pattern) this.pattern = pattern;
            if (node) this.removeMeshForNode(node);
            this.requestConnectionRebuild();
        });

        this.eventSubs.on(Events.PATTERN_CLEARED, () => {
            this.clearAllMeshes();
        });

        this.eventSubs.on(Events.PATTERN_LOADED, ({ pattern }) => {
            if (pattern) {
                this.pattern = pattern;
                this.renderPattern(pattern);
                this.requestConnectionRebuild();
            }
        });
    }

    getGeometry(type) {
        if (this.geometryCache.has(type)) {
            return this.geometryCache.get(type);
        }
        const geometry = this.createGeometry(type);
        this.geometryCache.set(type, geometry);
        return geometry;
    }

    createGeometry(type) {
        const def = getStitchDefinition(type);
        if (!def) return new THREE.SphereGeometry(0.2, 16, 16);

        const geomDef = def.geometry;

        if (geomDef.type === 'torus') {
            return this.createTorusGeometry(geomDef);
        } else if (geomDef.type === 'custom' && geomDef.shape === 'single_crochet') {
            return this.createSingleCrochetGeometry(geomDef);
        }

        return new THREE.SphereGeometry(0.2, 16, 16);
    }

    createTorusGeometry(geomDef) {
        const geometry = new THREE.TorusGeometry(
            geomDef.radius,
            geomDef.tube,
            geomDef.radialSegments,
            geomDef.tubularSegments
        );
        if (geomDef.rotationX) {
            geometry.rotateX(geomDef.rotationX);
        }
        return geometry;
    }

    createSingleCrochetGeometry(geomDef) {
        const shape = new THREE.Shape();
        const r = geomDef.baseRadius;
        const h = geomDef.height;

        shape.moveTo(-r, 0);
        shape.quadraticCurveTo(-r * 0.5, h * 0.3, 0, h);
        shape.quadraticCurveTo(r * 0.5, h * 0.3, r, 0);
        shape.quadraticCurveTo(r * 0.8, -h * 0.1, 0, -h * 0.15);
        shape.quadraticCurveTo(-r * 0.8, -h * 0.1, -r, 0);

        const extrudeSettings = {
            depth: r * 1.5,
            bevelEnabled: true,
            bevelThickness: r * 0.3,
            bevelSize: r * 0.2,
            bevelSegments: 3
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();
        geometry.rotateY(Math.PI / 2);
        return geometry;
    }

    getMaterial(color) {
        return this.yarnMaterial.getMaterial(color);
    }

    createMeshForNode(node) {
        if (!node || !node.id) return null;
        if (this.meshMap.has(node.id)) return this.meshMap.get(node.id);

        const geometry = this.getGeometry(node.type);
        const material = this.getMaterial(node.color);
        if (!geometry || !material) return null;

        const mesh = new THREE.Mesh(geometry, material);
        if (node.position) mesh.position.copy(node.position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.nodeId = node.id;
        mesh.userData.node = node;
        node.mesh = mesh;

        this.meshMap.set(node.id, mesh);
        this.sceneManager.addStitchMesh(mesh);
        return mesh;
    }

    removeMeshForNode(node) {
        const mesh = this.meshMap.get(node.id);
        if (!mesh) return;
        this.sceneManager.removeStitchMesh(mesh);
        this.meshMap.delete(node.id);
    }

    clearAllMeshes() {
        this.meshMap.forEach(mesh => {
            this.sceneManager.removeStitchMesh(mesh);
        });
        this.meshMap.clear();
        this.clearConnectionMeshes();
    }

    requestConnectionRebuild() {
        if (this.connectionRebuildPending) return;
        this.connectionRebuildPending = true;
        const schedule = typeof queueMicrotask === 'function'
            ? queueMicrotask
            : (cb) => Promise.resolve().then(cb);
        schedule(() => {
            this.connectionRebuildPending = false;
            this.rebuildConnectionMeshes();
        });
    }

    rebuildConnectionMeshes() {
        if (!this.pattern?.graph) return;

        this.clearConnectionMeshes();

        const nodes = this.pattern.graph.getAllNodes();
        nodes.forEach(node => {
            if (node.connections.right) {
                this.ensureConnectionMesh(node, node.connections.right);
            }
            node.connections.below.forEach(below => {
                this.ensureConnectionMesh(node, below);
            });
        });
    }

    ensureConnectionMesh(nodeA, nodeB) {
        if (!nodeA || !nodeB) return;
        const key = nodeA.id < nodeB.id
            ? `${nodeA.id}|${nodeB.id}`
            : `${nodeB.id}|${nodeA.id}`;
        if (this.connectionMeshes.has(key)) return;

        const material = this.getMaterial(nodeA.color);
        const mesh = new THREE.Mesh(this.connectionGeometry, material);
        mesh.userData.nodeA = nodeA;
        mesh.userData.nodeB = nodeB;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.updateConnectionMesh(mesh, nodeA.position, nodeB.position);
        this.connectionMeshes.set(key, mesh);
        this.sceneManager.addStitchMesh(mesh);
    }

    updateConnectionMesh(mesh, posA, posB) {
        const dir = this.connectionTmpDir.subVectors(posB, posA);
        const length = dir.length();
        if (!Number.isFinite(length) || length === 0) return;

        const midpoint = this.connectionTmpMid.addVectors(posA, posB).multiplyScalar(0.5);
        mesh.position.copy(midpoint);
        mesh.scale.set(1, length, 1);
        mesh.quaternion.setFromUnitVectors(this.connectionUp, dir.normalize());
    }

    clearConnectionMeshes() {
        this.connectionMeshes.forEach(mesh => {
            this.sceneManager.removeStitchMesh(mesh);
        });
        this.connectionMeshes.clear();
    }

    renderPattern(pattern) {
        this.clearAllMeshes();
        pattern.graph.getAllNodes().forEach(node => {
            this.createMeshForNode(node);
        });
    }

    getAllMeshes() {
        return Array.from(this.meshMap.values());
    }

    dispose() {
        this.eventSubs.dispose();
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
        this.clearAllMeshes();
        if (this.connectionGeometry) {
            this.connectionGeometry.dispose();
        }
    }
}
