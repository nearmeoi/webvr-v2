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
        titleMesh.raycast = () => {}; // Ignore raycasting
        this.group.add(titleMesh);

        // 2. Start Button
        const btnCanvas = document.createElement('canvas');
        btnCanvas.width = 512;
        btnCanvas.height = 128;
        const btnCtx = btnCanvas.getContext('2d');

        // Glass Button Shape
        const roundRect = (ctx, x, y, w, h, r) => {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        };

        // Draw Button
        roundRect(btnCtx, 10, 10, 492, 108, 30);
        btnCtx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Glass fill
        btnCtx.fill();
        btnCtx.lineWidth = 4;
        btnCtx.strokeStyle = 'rgba(100, 200, 255, 0.5)'; // Cyan border
        btnCtx.stroke();

        // Button Text
        btnCtx.font = 'bold 50px sans-serif';
        btnCtx.textAlign = 'center';
        btnCtx.textBaseline = 'middle';
        btnCtx.fillStyle = '#ffffff';
        btnCtx.shadowColor = 'rgba(0,0,0,0.5)';
        btnCtx.shadowBlur = 5;
        btnCtx.fillText('START', 256, 64);

        const btnTexture = new THREE.CanvasTexture(btnCanvas);
        const btnGeo = new THREE.PlaneGeometry(0.8, 0.2); // Slightly smaller
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
        
        this.startBtn.onHoverIn = () => {
            this.startBtn.scale.set(1.1, 1.1, 1.1); // Subtle pop
            this.startBtn.material.color.set(0xffffff); // Reset to white (no tint)
        };
        
        this.startBtn.onHoverOut = () => {
            this.startBtn.scale.copy(this.startBtn.userData.originalScale);
            this.startBtn.material.color.set(0xffffff); // Ensure reset
        };
        
        this.startBtn.onClick = () => {
            this.onStart();
        };

        this.group.add(this.startBtn);
    }

    show() {
        this.group.visible = true;
    }

    hide() {
        this.group.visible = false;
    }
}