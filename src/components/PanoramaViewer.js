import * as THREE from 'three';
import { LOCATIONS } from './OrbitalMenu.js';

export class PanoramaViewer {
    constructor(scene, onBack, camera) {
        this.scene = scene;
        this.onBack = onBack;
        this.camera = camera;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.group.visible = false; // Hidden initially
        this.currentAudio = null;
        this.isPlaying = false;
        this.isMuted = false;

        // 1. Sphere Pano (radius must be < camera far clip)
        const geometry = new THREE.SphereGeometry(50, 60, 40);
        geometry.scale(-1, 1, 1);
        this.material = new THREE.MeshBasicMaterial({ map: null });
        this.sphere = new THREE.Mesh(geometry, this.material);
        this.group.add(this.sphere);

        // 2. Control Dock (follows camera)
        this.controlDock = new THREE.Group();
        this.group.add(this.controlDock);

        this.createBackButton();
        this.createAudioControls();

        this.textureLoader = new THREE.TextureLoader();

        // Ensure GazeController can hit this
        this.group.userData.isInteractable = false; // Container not interactable
    }

    createBackButton() {
        const geometry = new THREE.PlaneGeometry(0.5, 0.2); // Sized to match texture ratio

        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        // Helper
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
        }

        // Glass button style
        ctx.clearRect(0, 0, 500, 200);
        roundRect(10, 10, 480, 180, 50); // Fully rounded "pill"
        ctx.fillStyle = 'rgba(200, 50, 50, 0.4)'; // Red-ish glass
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
        ctx.lineWidth = 10;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 60px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 5;
        ctx.fillText('BACK', 250, 100);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.backBtn = new THREE.Mesh(geometry, material);
        this.backBtn.position.set(0, -0.6, -1.8);
        this.backBtn.lookAt(0, 0, 0);

        // Interaction
        this.backBtn.userData.isInteractable = true;
        this.backBtn.onHoverIn = () => this.backBtn.scale.set(1.1, 1.1, 1.1);
        this.backBtn.onHoverOut = () => this.backBtn.scale.set(1, 1, 1);
        this.backBtn.onClick = () => {
            if (this.onBack) this.onBack();
        };

        this.controlDock.add(this.backBtn);
    }

    createAudioControls() {
        // Play/Pause Button
        this.playBtnCanvas = document.createElement('canvas');
        this.playBtnCanvas.width = 200;
        this.playBtnCanvas.height = 200;
        this.updatePlayButton(false); // Start with play icon

        const playTexture = new THREE.CanvasTexture(this.playBtnCanvas);
        const playGeometry = new THREE.PlaneGeometry(0.18, 0.18);
        const playMaterial = new THREE.MeshBasicMaterial({
            map: playTexture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.playBtn = new THREE.Mesh(playGeometry, playMaterial);
        // Position at angle 55° to the right, radius 1.6
        const playAngle = Math.PI * 0.3; // ~55 degrees
        this.playBtn.position.set(
            Math.sin(playAngle) * 1.6,
            -0.6,
            -Math.cos(playAngle) * 1.6
        );
        this.playBtn.lookAt(0, -0.6, 0);
        this.playBtn.userData.isInteractable = true;
        this.playBtn.onHoverIn = () => this.playBtn.scale.set(1.2, 1.2, 1.2);
        this.playBtn.onHoverOut = () => this.playBtn.scale.set(1, 1, 1);
        this.playBtn.onClick = () => this.togglePlay();
        this.controlDock.add(this.playBtn);

        // Mute Button
        this.muteBtnCanvas = document.createElement('canvas');
        this.muteBtnCanvas.width = 200;
        this.muteBtnCanvas.height = 200;
        this.updateMuteButton(false); // Start unmuted

        const muteTexture = new THREE.CanvasTexture(this.muteBtnCanvas);
        const muteGeometry = new THREE.PlaneGeometry(0.18, 0.18);
        const muteMaterial = new THREE.MeshBasicMaterial({
            map: muteTexture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.muteBtn = new THREE.Mesh(muteGeometry, muteMaterial);
        // Position at angle 62° to the right, radius 1.6
        const muteAngle = Math.PI * 0.34; // ~62 degrees (7° gap from play)
        this.muteBtn.position.set(
            Math.sin(muteAngle) * 1.6,
            -0.6,
            -Math.cos(muteAngle) * 1.6
        );
        this.muteBtn.lookAt(0, -0.6, 0);
        this.muteBtn.userData.isInteractable = true;
        this.muteBtn.onHoverIn = () => this.muteBtn.scale.set(1.2, 1.2, 1.2);
        this.muteBtn.onHoverOut = () => this.muteBtn.scale.set(1, 1, 1);
        this.muteBtn.onClick = () => this.toggleMute();
        this.controlDock.add(this.muteBtn);
    }

    setAudioButtonsPosition(mode) {
        // mode: 'with-dock' (Toraja) or 'standalone' (other locations)
        const radius = 1.6;
        const y = -0.6;

        if (mode === 'with-dock') {
            // Far right to avoid dock thumbnails
            const playAngle = Math.PI * 0.3; // ~55°
            const muteAngle = Math.PI * 0.34; // ~62°

            this.playBtn.position.set(Math.sin(playAngle) * radius, y, -Math.cos(playAngle) * radius);
            this.muteBtn.position.set(Math.sin(muteAngle) * radius, y, -Math.cos(muteAngle) * radius);
        } else {
            // Close to Back button (standalone mode)
            const playAngle = Math.PI * 0.067; // ~12° right of center
            const muteAngle = Math.PI * 0.106; // ~19° right of center
            const yUp = -0.55; // Adjusted height

            this.playBtn.position.set(Math.sin(playAngle) * radius, yUp, -Math.cos(playAngle) * radius);
            this.muteBtn.position.set(Math.sin(muteAngle) * radius, yUp, -Math.cos(muteAngle) * radius);
        }

        this.playBtn.lookAt(0, y, 0);
        this.muteBtn.lookAt(0, y, 0);
    }

    updatePlayButton(isPlaying) {
        const ctx = this.playBtnCanvas.getContext('2d');
        ctx.clearRect(0, 0, 200, 200);

        // Background circle
        ctx.beginPath();
        ctx.arc(100, 100, 90, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(50, 150, 50, 0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = 'white';
        if (isPlaying) {
            // Pause icon (two bars)
            ctx.fillRect(70, 60, 20, 80);
            ctx.fillRect(110, 60, 20, 80);
        } else {
            // Play icon (triangle)
            ctx.beginPath();
            ctx.moveTo(75, 55);
            ctx.lineTo(75, 145);
            ctx.lineTo(145, 100);
            ctx.closePath();
            ctx.fill();
        }

        if (this.playBtn) {
            this.playBtn.material.map.needsUpdate = true;
        }
    }

    updateMuteButton(isMuted) {
        const ctx = this.muteBtnCanvas.getContext('2d');
        ctx.clearRect(0, 0, 200, 200);

        // Background circle
        ctx.beginPath();
        ctx.arc(100, 100, 90, 0, Math.PI * 2);
        ctx.fillStyle = isMuted ? 'rgba(150, 50, 50, 0.6)' : 'rgba(50, 100, 150, 0.6)';
        ctx.fill();
        ctx.strokeStyle = isMuted ? 'rgba(255, 100, 100, 0.8)' : 'rgba(100, 200, 255, 0.8)';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = 'white';
        // Speaker icon
        ctx.beginPath();
        ctx.moveTo(60, 80);
        ctx.lineTo(85, 80);
        ctx.lineTo(115, 55);
        ctx.lineTo(115, 145);
        ctx.lineTo(85, 120);
        ctx.lineTo(60, 120);
        ctx.closePath();
        ctx.fill();

        if (!isMuted) {
            // Sound waves
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(115, 100, 25, -0.6, 0.6);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(115, 100, 45, -0.6, 0.6);
            ctx.stroke();
        } else {
            // X mark
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(130, 70);
            ctx.lineTo(170, 130);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(170, 70);
            ctx.lineTo(130, 130);
            ctx.stroke();
        }

        if (this.muteBtn) {
            this.muteBtn.material.map.needsUpdate = true;
        }
    }

    togglePlay() {
        if (!this.currentAudio) return;

        if (this.isPlaying) {
            this.currentAudio.pause();
            this.isPlaying = false;
        } else {
            this.currentAudio.play().catch(e => console.log('Audio play error:', e));
            this.isPlaying = true;
        }
        this.updatePlayButton(this.isPlaying);
    }

    toggleMute() {
        if (!this.currentAudio) return;

        this.isMuted = !this.isMuted;
        this.currentAudio.muted = this.isMuted;
        this.updateMuteButton(this.isMuted);
    }

    load(index) {
        const location = LOCATIONS[index];
        if (!location) {
            console.error('Invalid location index:', index);
            return;
        }
        this.loadFromLocation(location);
    }

    loadFromLocation(location) {
        if (!location) {
            console.error('Invalid location');
            return;
        }

        this.currentLocation = location;

        // Stop any playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // Play audio if available (global per location)
        if (location.audio) {
            this.currentAudio = new Audio(location.audio);
            this.currentAudio.loop = false; // No loop, play once
            this.currentAudio.volume = 0.5;
            this.currentAudio.muted = this.isMuted;

            // Handle audio ended
            this.currentAudio.addEventListener('ended', () => {
                this.isPlaying = false;
                this.updatePlayButton(false);
            });

            // Auto-start
            this.currentAudio.play().then(() => {
                this.isPlaying = true;
                this.updatePlayButton(true);
            }).catch(err => {
                console.log('Audio autoplay blocked:', err);
                this.isPlaying = false;
                this.updatePlayButton(false);
            });
        } else {
            this.isPlaying = false;
            this.updatePlayButton(false);
        }

        // Check for multi-scene data
        if (location.scenes && location.scenes.length > 0) {
            this.loadScene(location.scenes[0]);
        } else if (location.panorama) {
            this.loadTexture(location.panorama);
            this.clearHotspots();
        }

        this.group.visible = true;
    }

    loadScene(sceneData) {
        console.log('Loading scene:', sceneData.id);
        this.loadTexture(sceneData.path);
        this.renderHotspots(sceneData.links);
    }

    loadTexture(path) {
        this.textureLoader.load(
            path,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                this.material.map = texture;
                this.material.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.error('Error loading panorama:', error);
                this.loadFallbackTexture('Error Loading');
            }
        );
    }

    createArrowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Draw Arrow only (no label)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.moveTo(128, 30);   // Top point
        ctx.lineTo(210, 140);  // Right corner
        ctx.lineTo(155, 140);
        ctx.lineTo(155, 230);  // Bottom
        ctx.lineTo(101, 230);
        ctx.lineTo(101, 140);
        ctx.lineTo(46, 140);   // Left corner
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 4;
        ctx.stroke();

        return new THREE.CanvasTexture(canvas);
    }

    createArrowMesh(linkData) {
        const texture = this.createArrowTexture();
        const geometry = new THREE.PlaneGeometry(0.8, 0.8);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false // Always show on top
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Angle-based positioning (0° = front, 90° = right, 180° = back, 270° = left)
        const radius = 4; // Distance from center
        const yPos = -2;  // Lower position to avoid dock collision
        const angleRad = (linkData.angle || 0) * (Math.PI / 180); // Convert degrees to radians

        // Calculate position on circle
        const x = Math.sin(angleRad) * radius;
        const z = -Math.cos(angleRad) * radius; // Negative because 0° should be "forward" (-Z)

        mesh.position.set(x, yPos, z);

        // Face the user (center)
        mesh.lookAt(0, yPos, 0);
        // Tilt to lay flat on floor
        mesh.rotateX(-Math.PI / 2.5);

        mesh.userData.isInteractable = true;
        mesh.onHoverIn = () => mesh.scale.set(1.3, 1.3, 1.3);
        mesh.onHoverOut = () => mesh.scale.set(1, 1, 1);
        mesh.onClick = () => {
            const nextScene = this.currentLocation.scenes.find(s => s.id === linkData.target);
            if (nextScene) {
                this.loadScene(nextScene);
            }
        };

        return mesh;
    }

    renderHotspots(links) {
        this.clearHotspots();
        if (!links) return;

        this.currentHotspots = [];
        links.forEach(link => {
            const arrow = this.createArrowMesh(link);
            this.group.add(arrow);
            this.currentHotspots.push(arrow);
        });
    }

    clearHotspots() {
        if (this.currentHotspots) {
            this.currentHotspots.forEach(mesh => {
                this.group.remove(mesh);
                if (mesh.material.map) mesh.material.map.dispose();
                mesh.material.dispose();
                mesh.geometry.dispose();
            });
        }
        this.currentHotspots = [];
    }

    loadFallbackTexture(name) {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(1, '#0a0a1e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2048, 1024);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, 1024, 512);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        this.material.map = texture;
        this.material.needsUpdate = true;
    }

    setBackButtonVisibility(visible) {
        if (this.backBtn) {
            this.backBtn.visible = visible;
        }
    }

    hide() {
        // Stop audio when hiding
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        this.group.visible = false;
    }

    update(delta) {
        // Skip camera-following in VR mode
        if (this.isVRMode) return;

        // Make control dock follow camera rotation (like SubMenu)
        if (this.camera && this.controlDock) {
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);

            // Check if looking down
            const pitch = Math.asin(cameraDirection.y);
            const targetAngle = Math.atan2(cameraDirection.x, cameraDirection.z) + Math.PI;

            // Only rotate when NOT looking down at controls
            if (pitch > -0.26) {
                let currentAngle = this.controlDock.rotation.y;
                let diff = targetAngle - currentAngle;

                // Normalize to [-PI, PI]
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                // Smooth easing
                this.controlDock.rotation.y += diff * 0.08;
            }
        }
    }

    setVRMode(isVR) {
        this.isVRMode = isVR;
    }
}
