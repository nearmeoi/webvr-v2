import * as THREE from 'three';
import { CanvasUI } from '../utils/CanvasUI.js';
import { CONFIG } from '../config.js';

export class PhotoOverlay {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.group.visible = false;

        this.textureLoader = new THREE.TextureLoader();
        this.currentTexture = null;
    }

    show(data, onClose) {
        if (!data || !data.image) return;

        this.onCloseCallback = onClose;

        // Load image
        this.textureLoader.load(data.image, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            this.currentTexture = texture;
            this.createMesh(texture, data.caption);
            this.group.visible = true;

            // Should be fixed relative to world, or camera? 
            // For "Overlay" feel, attaching to camera is easier, 
            // but for "Portal" feel, fixed in world is better.
            // Request said "Overlay Foto 1980", let's put it in front of camera but fixed in world.

            const position = new THREE.Vector3(0, 0, -2); // 2 meters in front
            position.applyQuaternion(this.camera.quaternion);
            position.add(this.camera.position);

            this.group.position.copy(position);
            this.group.lookAt(this.camera.position);
        });
    }

    createMesh(texture, caption) {
        this.disposeMesh(); // Clean up previous

        // Aspect ratio correct plane
        const aspect = texture.image.width / texture.image.height;
        const height = 1.5; // 1.5 meters tall
        const width = height * aspect;

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        });

        this.mainMesh = new THREE.Mesh(geometry, material);
        this.group.add(this.mainMesh);

        // Add Close Button
        this.createCloseButton(width, height);

        // Add Caption if exists
        if (caption) {
            this.createCaption(caption, width, height);
        }
    }

    createCloseButton(width, height) {
        const btnSize = 0.3;
        const geometry = new THREE.CircleGeometry(btnSize / 2, 32);

        // Simple X texture
        const canvas = CanvasUI.createButtonTexture('X', {
            width: 128, height: 128, radius: 64, fontSize: 60,
            backgroundColor: '#ff3333'
        });
        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });

        this.closeBtn = new THREE.Mesh(geometry, material);
        // Position at top right
        this.closeBtn.position.set(width / 2, height / 2, 0.05);

        this.closeBtn.userData.isInteractable = true;
        this.closeBtn.userData.activationTime = 0.8; // Fast close
        this.closeBtn.onHoverIn = () => this.closeBtn.scale.set(1.2, 1.2, 1.2);
        this.closeBtn.onHoverOut = () => this.closeBtn.scale.set(1, 1, 1);
        this.closeBtn.onClick = () => this.hide();

        this.group.add(this.closeBtn);
    }

    createCaption(text, width, height) {
        // Caption background
        const bgGeo = new THREE.PlaneGeometry(width, 0.3);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.7, transparent: true });
        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        bgMesh.position.set(0, -height / 2 - 0.2, 0);
        this.group.add(bgMesh);

        // Text Texture
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 512, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const textGeo = new THREE.PlaneGeometry(width, 0.3 * (width / 1.8)); // Adjust aspect
        // Simpler: just match bg width
        const textMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(width, 0.3),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true })
        );
        textMesh.position.copy(bgMesh.position);
        textMesh.position.z += 0.01;
        this.group.add(textMesh);

        this.captionMesh = textMesh; // Track for disposal
        this.captionBg = bgMesh;
    }

    hide() {
        this.group.visible = false;
        this.disposeMesh();
        if (this.onCloseCallback) this.onCloseCallback();
    }

    disposeMesh() {
        // Dispose Geometry & Material to prevent leaks
        const safeDispose = (mesh) => {
            if (!mesh) return;
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (mesh.material.map) mesh.material.map.dispose();
                mesh.material.dispose();
            }
            this.group.remove(mesh);
        };

        safeDispose(this.mainMesh);
        safeDispose(this.closeBtn);
        safeDispose(this.captionMesh);
        safeDispose(this.captionBg);

        if (this.currentTexture) {
            this.currentTexture.dispose();
            this.currentTexture = null;
        }
    }

    dispose() {
        this.disposeMesh();
        this.scene.remove(this.group);
    }
}
