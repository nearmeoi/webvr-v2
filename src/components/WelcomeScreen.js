import * as THREE from 'three';

export class WelcomeScreen {
    constructor(scene, camera, onStart) {
        this.scene = scene;
        this.camera = camera;
        this.onStart = onStart;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.createBackground();
        this.createContent();

        // Welcome screen is centered for VR alignment
        this.group.rotation.y = 0;

        // DEBUG: Listen for clicks to log coordinates
        // This helps find the correct position for buttons on the panorama
        window.addEventListener('click', (event) => {
            if (!this.group.visible) return;

            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObject(this.backgroundSphere);

            if (intersects.length > 0) {
                const hit = intersects[0];
                const p = hit.point;
                const uv = hit.uv;

                console.log(`[DEBUG CLICK] Position: x=${p.x.toFixed(3)}, y=${p.y.toFixed(3)}, z=${p.z.toFixed(3)}`);
                if (uv) console.log(`[DEBUG CLICK] UV: u=${uv.x.toFixed(3)}, v=${uv.y.toFixed(3)}`);

                // Calculate spherical coords for easier placement logic
                // Using standard spherical coordinates helper
                const spherical = new THREE.Spherical().setFromVector3(p);
                // Convert to degrees for readability
                const phiDeg = THREE.MathUtils.radToDeg(spherical.phi);
                const thetaDeg = THREE.MathUtils.radToDeg(spherical.theta);
                console.log(`[DEBUG CLICK] Spherical: Phi=${phiDeg.toFixed(1)}°, Theta=${thetaDeg.toFixed(1)}°`);
            }
        });
    }

    createBackground() {
        console.log("WelcomeScreen: Creating background...");
        // Create panorama sphere for welcome screen background
        const geometry = new THREE.SphereGeometry(50, 64, 32);
        geometry.scale(-1, 1, 1); // Invert for inside view

        const textureLoader = new THREE.TextureLoader();
        // Vite serves src/public at root, so we access it directly
        // Moved to root public for simplicity
        const path = '/welcome-screen.jpg';
        console.log("WelcomeScreen: Loading texture from", path);

        const texture = textureLoader.load(
            path,
            (tex) => {
                console.log("WelcomeScreen: Texture loaded successfully", tex);
            },
            undefined,
            (err) => {
                console.error("WelcomeScreen: Error loading texture", err);
            }
        );
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshBasicMaterial({
            map: texture
            // Default side (FrontSide) is correct because we inverted geometry
        });

        this.backgroundSphere = new THREE.Mesh(geometry, material);
        this.backgroundSphere.name = "WelcomeBackground";
        this.backgroundSphere.raycast = () => { }; // Ignore raycasting
        this.group.add(this.backgroundSphere);
    }

    createContent() {
        // --- 1. Main Glass Panel Container ---
        const panelCanvas = document.createElement('canvas');
        panelCanvas.width = 1024;
        panelCanvas.height = 600;
        const ctx = panelCanvas.getContext('2d');

        // Draw Panel Background (Dark Glass)
        const roundRect = (x, y, w, h, r) => {
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

        // Clear
        ctx.clearRect(0, 0, 1024, 600);

        // Panel Body
        roundRect(50, 50, 924, 500, 60);
        ctx.fillStyle = 'rgba(15, 15, 25, 0.75)'; // Darker, premium feel
        ctx.fill();

        // Inner Gradient Overlay
        const gradient = ctx.createLinearGradient(0, 50, 0, 550);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Panel Border
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        // --- Typography ---

        // Main Title
        ctx.font = 'bold 90px "Inter", sans-serif'; // Modern font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        // Add subtle shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        ctx.fillText('VIRTUAL TOUR', 512, 200);

        // Subtitle
        ctx.font = '40px "Inter", sans-serif';
        ctx.fillStyle = '#cccccc'; // Silver
        ctx.shadowBlur = 0;
        ctx.fillText('Explore South Sulawesi in 360°', 512, 280);

        // Create Panel Mesh
        const panelTexture = new THREE.CanvasTexture(panelCanvas);
        // Reduce anisotropy to prevent shimmering if needed, but higher is better for text clarity
        panelTexture.anisotropy = 16;

        const panelGeo = new THREE.PlaneGeometry(2.0, 1.2); // Aspect ratio match
        const panelMat = new THREE.MeshBasicMaterial({
            map: panelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.panelMesh = new THREE.Mesh(panelGeo, panelMat);
        this.panelMesh.position.set(0, 0, -2.5); // Slightly closer/further
        // Angle slight upwards if needed, but 0 is fine for "forward"
        this.group.add(this.panelMesh);


        // --- 2. Interactive Start Button (Pill Shape) ---
        // We render this separately so it can have its own hover interaction

        const btnCanvas = document.createElement('canvas');
        btnCanvas.width = 512;
        btnCanvas.height = 128; // Pill shape aspect
        const btnCtx = btnCanvas.getContext('2d');

        // Draw Pill
        // Helper specifically for button
        const btnRect = (x, y, w, h, r) => {
            btnCtx.beginPath();
            btnCtx.moveTo(x + r, y);
            btnCtx.lineTo(x + w - r, y);
            btnCtx.quadraticCurveTo(x + w, y, x + w, y + r);
            btnCtx.lineTo(x + w, y + h - r);
            btnCtx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            btnCtx.lineTo(x + r, y + h);
            btnCtx.quadraticCurveTo(x, y + h, x, y + h - r);
            btnCtx.lineTo(x, y + r);
            btnCtx.quadraticCurveTo(x, y, x + r, y);
            btnCtx.closePath();
        };

        // Button Style State: Normal
        btnRect(10, 10, 492, 108, 54);
        btnCtx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Very subtle glass
        btnCtx.fill();

        // Button Border
        btnCtx.lineWidth = 6;
        btnCtx.strokeStyle = '#ffffff';
        btnCtx.stroke();

        // Button Text
        btnCtx.font = 'bold 45px "Inter", sans-serif';
        btnCtx.fillStyle = '#ffffff';
        btnCtx.textAlign = 'center';
        btnCtx.textBaseline = 'middle';
        btnCtx.fillText('ENTER EXPERIENCE', 256, 64);

        const btnTexture = new THREE.CanvasTexture(btnCanvas);
        const btnGeo = new THREE.PlaneGeometry(0.8, 0.2); // Match aspect (4:1)

        const btnMat = new THREE.MeshBasicMaterial({
            map: btnTexture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.startBtn = new THREE.Mesh(btnGeo, btnMat);
        this.startBtn.name = "StartButton";
        // Position relative to panel (but in world space)
        // Panel is at Z=-2.5. Button slightly in front Z=-2.4
        // Panel center Y=0 (relative to group Y=0? no, group Y=0).
        // Let's position explicitly.
        this.startBtn.position.set(0, -0.2, -2.4);

        // Interaction
        this.startBtn.userData.isInteractable = true;
        this.startBtn.userData.originalScale = new THREE.Vector3(1, 1, 1);
        this.startBtn.userData.targetScale = new THREE.Vector3(1, 1, 1);
        this.startBtn.userData.animProgress = 1;

        this.startBtn.onHoverIn = () => {
            this.startBtn.userData.targetScale.set(1.1, 1.1, 1.1);
            // We can't change canvas content easily without redraw, but we can change color tint
            this.startBtn.material.color.set(0xddddff); // Bluish tint on hover
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