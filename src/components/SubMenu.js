import * as THREE from 'three';

export class SubMenu {
    constructor(scene, camera, parentLocation, onSelect, onBack) {
        this.scene = scene;
        this.camera = camera;
        this.parentLocation = parentLocation;
        this.subLocations = parentLocation.subLocations || [];
        this.onSelect = onSelect;
        this.onBack = onBack;

        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.group.visible = false;

        this.thumbnails = [];
        this.radius = 1.8; // Slightly larger radius for more items
        this.textureLoader = new THREE.TextureLoader();

        this.initMenu();
        this.createBackButton();
        // Title removed per user request
    }

    initMenu() {
        const itemCount = this.subLocations.length;

        // Helper for rounded rect path
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

        // Create thumbnail card with image
        const createThumbnailTexture = (location, img) => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 280;
            const ctx = canvas.getContext('2d');

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Glass Background with teal/cyan tint for sub-menu
            roundRect(ctx, 8, 8, 384, 264, 24);
            ctx.fillStyle = 'rgba(0, 150, 180, 0.15)';
            ctx.fill();

            // Gradient Overlay
            const gradient = ctx.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, 'rgba(0, 200, 200, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 100, 120, 0.05)');
            ctx.fillStyle = gradient;
            ctx.fill();

            // Border
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(0, 220, 220, 0.4)';
            ctx.stroke();

            // Draw thumbnail image
            if (img) {
                ctx.save();
                roundRect(ctx, 20, 20, 360, 180, 16);
                ctx.clip();
                const imgRatio = img.width / img.height;
                const boxRatio = 360 / 180;
                let sx = 0, sy = 0, sw = img.width, sh = img.height;
                if (imgRatio > boxRatio) {
                    sw = img.height * boxRatio;
                    sx = (img.width - sw) / 2;
                } else {
                    sh = img.width / boxRatio;
                    sy = (img.height - sh) / 2;
                }
                ctx.drawImage(img, sx, sy, sw, sh, 20, 20, 360, 180);
                ctx.restore();
            } else {
                ctx.save();
                roundRect(ctx, 20, 20, 360, 180, 16);
                ctx.clip();
                const hue = (location.id * 50 + 180) % 360;
                ctx.fillStyle = `hsl(${hue}, 50%, 35%)`;
                ctx.fillRect(20, 20, 360, 180);
                ctx.restore();
            }

            // Text label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 26px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 5;
            ctx.fillText(location.name.toUpperCase(), 200, 240);

            return new THREE.CanvasTexture(canvas);
        };

        // Bottom Dock Layout
        // Arc is smaller and lower
        const totalAngle = Math.PI * 0.5; // 90 degrees arc for tighter packing
        const startAngle = Math.PI - totalAngle / 2;
        const step = itemCount > 1 ? totalAngle / (itemCount - 1) : 0;

        for (let i = 0; i < itemCount; i++) {
            const location = this.subLocations[i];
            // Smaller geometry for dock
            const geometry = new THREE.PlaneGeometry(0.3, 0.2);

            const material = new THREE.MeshBasicMaterial({
                color: 0x333333,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5 // Semi-transparent by default
            });
            const mesh = new THREE.Mesh(geometry, material);

            // Load thumbnail image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const texture = createThumbnailTexture(location, img);
                mesh.material.map = texture;
                mesh.material.color.set(0xffffff);
                mesh.material.needsUpdate = true;
            };
            img.onerror = () => {
                const texture = createThumbnailTexture(location, null);
                mesh.material.map = texture;
                mesh.material.color.set(0xffffff);
                mesh.material.needsUpdate = true;
            };
            img.src = location.thumbnail;

            // Position Lower (Bottom Dock)
            const theta = startAngle + (itemCount - 1 - i) * step;

            mesh.position.set(
                Math.sin(theta) * this.radius * 0.9, // Slightly closer
                -0.6, // Lowered to not block view
                Math.cos(theta) * this.radius * 0.9
            );

            mesh.lookAt(0, -0.6, 0);

            // User Data for interaction
            mesh.userData.id = i;
            mesh.userData.locationData = location;
            mesh.userData.isInteractable = true;
            mesh.userData.originalScale = new THREE.Vector3(1, 1, 1);
            mesh.userData.active = false;

            // Callbacks
            mesh.onHoverIn = () => {
                if (!mesh.userData.active) {
                    mesh.scale.set(1.2, 1.2, 1.2);
                    mesh.material.opacity = 1.0; // Full visibility on hover
                }
            };
            mesh.onHoverOut = () => {
                if (!mesh.userData.active) {
                    mesh.scale.copy(mesh.userData.originalScale);
                    mesh.material.opacity = 0.5; // Back to semi-transparent
                }
            };
            mesh.onClick = () => {
                this.setActive(i);
                this.onSelect(location);
            };

            this.group.add(mesh);
            this.thumbnails.push(mesh);
        }
    }

    setActive(index) {
        this.thumbnails.forEach((mesh, i) => {
            if (i === index) {
                mesh.userData.active = true;
                mesh.scale.set(1.2, 1.2, 1.2); // Same as hover
                mesh.material.opacity = 1.0;
                mesh.material.color.set(0xffffff); // No tint, just like hover
            } else {
                mesh.userData.active = false;
                mesh.scale.copy(mesh.userData.originalScale);
                mesh.material.opacity = 0.5;
                mesh.material.color.set(0xffffff);
            }
        });
    }

    createBackButton() {
        const geometry = new THREE.PlaneGeometry(0.4, 0.15);

        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');

        // Rounded rect helper
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

        ctx.clearRect(0, 0, 400, 150);
        roundRect(8, 8, 384, 134, 40);
        ctx.fillStyle = 'rgba(180, 80, 80, 0.4)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 120, 120, 0.7)';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText('← BACK', 200, 75);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.backBtn = new THREE.Mesh(geometry, material);
        this.backBtn.position.set(0, -0.85, -1.5);
        this.backBtn.lookAt(0, -0.85, 0);

        this.backBtn.userData.isInteractable = true;
        this.backBtn.onHoverIn = () => this.backBtn.scale.set(1.1, 1.1, 1.1);
        this.backBtn.onHoverOut = () => this.backBtn.scale.set(1, 1, 1);
        this.backBtn.onClick = () => {
            if (this.onBack) this.onBack();
        };

        this.group.add(this.backBtn);
    }

    createTitle() {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 600, 100);
        ctx.fillStyle = '#00dddd';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,220,220,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(`TORAJA`, 300, 50);

        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.PlaneGeometry(0.8, 0.13);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        const titleMesh = new THREE.Mesh(geometry, material);
        titleMesh.position.set(0, 0.65, -1.6);
        titleMesh.lookAt(0, 0.65, 0);

        this.group.add(titleMesh);
    }

    update(delta) {
        // Make dock follow camera's horizontal rotation (orbit only, not pitch)
        // BUT stop following when user looks DOWN toward the dock
        if (this.camera) {
            // Get camera's direction
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);

            // Check if looking down (negative Y component means looking down)
            const pitch = Math.asin(cameraDirection.y); // Radians, negative = looking down

            // Target angle based on camera direction
            const targetAngle = Math.atan2(cameraDirection.x, cameraDirection.z) + Math.PI;

            // If looking down more than ~15 degrees, stop rotating (let user select)
            if (pitch > -0.26) { // -0.26 rad ≈ -15 degrees
                // Smoothly rotate to target (ease out)
                // Normalize angles to avoid spinning the wrong way
                let currentAngle = this.group.rotation.y;
                let diff = targetAngle - currentAngle;

                // Normalize difference to [-PI, PI]
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                // Ease out cubic: faster at start, slower at end
                const easeSpeed = 0.08;
                this.group.rotation.y += diff * easeSpeed;
            }
            // Otherwise, dock stays in place so user can interact
        }
    }

    show() {
        this.group.visible = true;
    }

    hide() {
        this.group.visible = false;
    }
}
