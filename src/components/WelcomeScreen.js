import * as THREE from 'three';

export class WelcomeScreen {
    constructor(scene, onStart) {
        this.scene = scene;
        this.onStart = onStart;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.createContent();

        // Rotate the welcome screen slightly to the right at startup
        // to avoid the Start button being directly in the center
        this.group.rotation.y = Math.PI * 0.1; // Rotate ~18 degrees to the right
    }

    createContent() {
        // 1. Title Text "Welcome to Virtual Tour"
        const titleCanvas = document.createElement('canvas');
        titleCanvas.width = 1024;
        titleCanvas.height = 256;
        const ctx = titleCanvas.getContext('2d');

        // Text styling
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow effect
        ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Welcome to Virtual Tour', 512, 128);

        const titleTexture = new THREE.CanvasTexture(titleCanvas);
        const titleGeo = new THREE.PlaneGeometry(2, 0.5); // Smaller size
        const titleMat = new THREE.MeshBasicMaterial({
            map: titleTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const titleMesh = new THREE.Mesh(titleGeo, titleMat);
        titleMesh.name = "Title";
        titleMesh.position.set(0, 1.8, -2.5); // Position
        titleMesh.raycast = () => { }; // Ignore raycasting
        this.group.add(titleMesh);

        // 2. Start Button - Simple White Circle
        const btnCanvas = document.createElement('canvas');
        btnCanvas.width = 256;
        btnCanvas.height = 256;
        const btnCtx = btnCanvas.getContext('2d');

        const centerX = 128;
        const centerY = 128;
        const radius = 100;

        // Draw white circle outline only
        btnCtx.beginPath();
        btnCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        btnCtx.strokeStyle = '#ffffff';
        btnCtx.lineWidth = 25;
        btnCtx.stroke();

        const btnTexture = new THREE.CanvasTexture(btnCanvas);
        const btnGeo = new THREE.PlaneGeometry(0.08, 0.08); // Smaller circle
        const btnMat = new THREE.MeshBasicMaterial({
            map: btnTexture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.startBtn = new THREE.Mesh(btnGeo, btnMat);
        this.startBtn.name = "StartButton";
        this.startBtn.position.set(0, 1.55, -2.2); // Further back, slightly higher

        // Interaction
        this.startBtn.userData.isInteractable = true;
        this.startBtn.userData.originalScale = new THREE.Vector3(1, 1, 1);
        this.startBtn.userData.targetScale = new THREE.Vector3(1, 1, 1);
        this.startBtn.userData.animProgress = 1;

        this.startBtn.onHoverIn = () => {
            this.startBtn.userData.targetScale.set(1.1, 1.1, 1.1);
            this.startBtn.material.color.set(0xffffff);
        };

        this.startBtn.onHoverOut = () => {
            this.startBtn.userData.targetScale.copy(this.startBtn.userData.originalScale);
            this.startBtn.material.color.set(0xffffff);
        };

        this.startBtn.onClick = () => {
            this.onStart();
        };

        this.group.add(this.startBtn);
    }

    update(delta) {
        // Smooth scale animation for start button with ease-in-out
        const btn = this.startBtn;
        if (btn && btn.userData.targetScale) {
            const animSpeed = 6;
            const diff = btn.scale.distanceTo(btn.userData.targetScale);

            if (diff > 0.01 && btn.userData.animProgress >= 1) {
                btn.userData.animProgress = 0;
                btn.userData.startScale = btn.scale.clone();
            }

            if (btn.userData.animProgress < 1 && btn.userData.startScale) {
                btn.userData.animProgress = Math.min(1, btn.userData.animProgress + delta * animSpeed);
                // Ease-in-out (smoothstep)
                const t = btn.userData.animProgress;
                const easeInOut = t * t * (3 - 2 * t);
                btn.scale.lerpVectors(btn.userData.startScale, btn.userData.targetScale, easeInOut);
            }
        }
    }

    show() {
        this.group.visible = true;
    }

    hide() {
        this.group.visible = false;
    }
}