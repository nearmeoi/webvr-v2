import * as THREE from 'three';
import { CanvasUI } from '../utils/CanvasUI.js';

export class CurvedInfoPanel {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.group.visible = false;

        this.textureLoader = new THREE.TextureLoader();
        this.currentTexture = null;
    }

    show(data, position, rotationY) {
        if (!data) return;

        // Position where the hotspot was, but slightly adjusted
        this.group.position.copy(position);
        this.group.rotation.y = rotationY; // Face towards center usually, or specific yaw

        // Create Panel content
        this.createPanel(data);
        this.group.visible = true;
    }

    createPanel(data) {
        this.disposeMesh();

        // Curved Geometry (Cylinder segment)
        const radius = 2;
        const thetaLength = Math.PI / 3; // 60 degrees arc
        const height = 1.2;

        const geometry = new THREE.CylinderGeometry(
            radius, radius, height,
            32, 1, true, // Open ended
            Math.PI + Math.PI / 2 - thetaLength / 2, // Start angle (centered back)
            thetaLength
        );
        geometry.scale(-1, 1, 1); // Flip inside out so texture is correct inside

        // Create Canvas Texture for content
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        // Styles
        const padding = 40;

        // Background (Glass effect)
        ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
        ctx.fillRect(0, 0, 1024, 768);

        // Border
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#00aaff';
        ctx.strokeRect(5, 5, 1014, 758);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(data.title || 'Informasi', padding, 100);

        // Divider
        ctx.beginPath();
        ctx.moveTo(padding, 130);
        ctx.lineTo(1024 - padding, 130);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Content Text (Split lines)
        ctx.font = '36px Roboto, sans-serif';
        ctx.fillStyle = '#eeeeee';
        this.wrapText(ctx, data.text || '', padding, 200, 1024 - (padding * 2), 50);

        // If image provided, we might need composite approach, but for now simple text + title is safer
        // Or render image on canvas if loaded... 
        // For simplicity and stability, let's stick to text on canvas first.
        // If 'image' is in data, we could load it separately, but that's async complex.
        // Let's rely on high quality text layout for now as per "Infografis" request.

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.BackSide // Because we scaled -1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.group.add(this.mesh);

        // Close Button (floating below)
        this.createCloseButton();
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            }
            else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }

    createCloseButton() {
        const btnGeo = new THREE.PlaneGeometry(0.4, 0.15);
        const canvas = CanvasUI.createButtonTexture('TUTUP', {
            width: 300, height: 100, radius: 20, fontSize: 40, backgroundColor: '#cc3333'
        });
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });

        this.closeBtn = new THREE.Mesh(btnGeo, mat);
        this.closeBtn.position.set(0, -0.8, -1.9); // Below the arc
        this.closeBtn.lookAt(0, 0, 0); // Face center

        this.closeBtn.userData.isInteractable = true;
        this.closeBtn.userData.activationTime = 0.8;
        this.closeBtn.onHoverIn = () => this.closeBtn.scale.set(1.1, 1.1, 1.1);
        this.closeBtn.onHoverOut = () => this.closeBtn.scale.set(1, 1, 1);
        this.closeBtn.onClick = () => this.hide();

        this.group.add(this.closeBtn);
    }

    hide() {
        this.group.visible = false;
        this.disposeMesh();
    }

    disposeMesh() {
        const safeDispose = (mesh) => {
            if (!mesh) return;
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (mesh.material.map) mesh.material.map.dispose();
                mesh.material.dispose();
            }
            this.group.remove(mesh);
        };
        safeDispose(this.mesh);
        safeDispose(this.closeBtn);
    }

    dispose() {
        this.disposeMesh();
        this.scene.remove(this.group);
    }
}
