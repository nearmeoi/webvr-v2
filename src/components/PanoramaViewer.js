import * as THREE from 'three';
import { LOCATIONS } from './OrbitalMenu.js';

export class PanoramaViewer {
    constructor(scene, onBack, camera, renderer) {
        this.scene = scene;
        this.onBack = onBack;
        this.camera = camera;
        this.renderer = renderer; // For WebXR camera access
        this.group = new THREE.Group();
        this.group.position.set(0, 1.6, 0); // Center everything at eye level
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
        this.createLoadingIndicator();

        this.textureLoader = new THREE.TextureLoader();
        this.isLoading = false;

        // Ensure GazeController can hit this
        this.group.userData.isInteractable = false; // Container not interactable

        // TEMP DEBUG: Click to get angle (Restored for correction)
        window.addEventListener('click', (event) => {
            if (!this.group.visible) return;

            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);

            const intersects = raycaster.intersectObject(this.sphere);
            if (intersects.length > 0) {
                // Convert world point to LOCAL coordinates of the sphere
                const worldPoint = intersects[0].point;
                const localPoint = this.sphere.worldToLocal(worldPoint.clone());

                // Calculate angle from local coordinates (consistent regardless of camera rotation)
                // Since the sphere is scaled -1 on X (geometry.scale(-1,1,1)), we need to account for that
                let angleDeg = Math.atan2(localPoint.x, -localPoint.z) * (180 / Math.PI);

                if (angleDeg < 0) angleDeg += 360;
                angleDeg = Math.round(angleDeg);

                // Log to console for debugging
                console.log(`ANGLE: ${angleDeg}° (click same spot on panorama = same angle)`);
            }
        });
    }

    createBackButton() {
        const geometry = new THREE.PlaneGeometry(0.4, 0.18); // Wide but same height as audio

        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 180; // Matching aspect ratio roughly
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
        ctx.clearRect(0, 0, 400, 180);
        roundRect(10, 10, 380, 160, 40); // Rounded pill
        ctx.fillStyle = 'rgba(200, 50, 50, 0.4)'; // Red-ish glass
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px sans-serif'; // Smaller font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 5;
        ctx.fillText('BACK', 200, 90);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.backBtn = new THREE.Mesh(geometry, material);
        this.backBtn.position.set(0, -1.0, -1.6); // Moved to Z -1.6 to match radius
        this.backBtn.lookAt(0, 0.6, 0);

        // Interaction
        this.backBtn.userData.isInteractable = true;
        this.backBtn.userData.originalScale = new THREE.Vector3(1, 1, 1);
        this.backBtn.userData.targetScale = new THREE.Vector3(1, 1, 1);
        this.backBtn.userData.animProgress = 1;
        this.backBtn.onHoverIn = () => this.backBtn.userData.targetScale.set(1.1, 1.1, 1.1);
        this.backBtn.onHoverOut = () => this.backBtn.userData.targetScale.copy(this.backBtn.userData.originalScale);
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
            -1.0,
            -Math.cos(playAngle) * 1.6
        );
        this.playBtn.lookAt(0, 0.6, 0);
        this.playBtn.userData.isInteractable = true;
        this.playBtn.userData.originalScale = new THREE.Vector3(1, 1, 1);
        this.playBtn.userData.targetScale = new THREE.Vector3(1, 1, 1);
        this.playBtn.userData.animProgress = 1;
        this.playBtn.onHoverIn = () => this.playBtn.userData.targetScale.set(1.2, 1.2, 1.2);
        this.playBtn.onHoverOut = () => this.playBtn.userData.targetScale.copy(this.playBtn.userData.originalScale);
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
            -1.0,
            -Math.cos(muteAngle) * 1.6
        );
        this.muteBtn.lookAt(0, 0.6, 0);
        this.muteBtn.userData.isInteractable = true;
        this.muteBtn.userData.originalScale = new THREE.Vector3(1, 1, 1);
        this.muteBtn.userData.targetScale = new THREE.Vector3(1, 1, 1);
        this.muteBtn.userData.animProgress = 1;
        this.muteBtn.onHoverIn = () => this.muteBtn.userData.targetScale.set(1.2, 1.2, 1.2);
        this.muteBtn.onHoverOut = () => this.muteBtn.userData.targetScale.copy(this.muteBtn.userData.originalScale);
        this.muteBtn.onClick = () => this.toggleMute();
        this.controlDock.add(this.muteBtn);
    }

    setAudioButtonsPosition(mode) {
        // mode: 'with-dock' (Toraja) or 'standalone' (other locations)
        const radius = 1.6;
        let y;

        // SYNC_NOTE: Ensure yUp matches the Back button's local Y position in standalone mode!
        // Currently Back button is at local Y = -1.0 (World 0.6)
        const yUp = -1.0;

        let playAngle;
        let muteAngle;

        if (mode === 'with-dock') {
            // Far right to avoid dock thumbnails

            // SYNC_NOTE: This height must match the SubMenu dock height!
            // SubMenu dock is at World Y = 0.7.
            // Panorama Group is at World Y = 1.6.
            // So local Y = 0.7 - 1.6 = -0.9.
            y = -0.9;

            playAngle = Math.PI * 0.21; // ~38° (closer to dock)
            muteAngle = Math.PI * 0.25; // ~45°

            this.playBtn.position.set(Math.sin(playAngle) * radius, y, -Math.cos(playAngle) * radius);
            this.muteBtn.position.set(Math.sin(muteAngle) * radius, y, -Math.cos(muteAngle) * radius);

            // Look at world height 0.7 (same as buttons)
            this.playBtn.lookAt(0, 0.7, 0);
            this.muteBtn.lookAt(0, 0.7, 0);
        } else {
            // Close to Back button (standalone mode) - TIGHTER spacing
            playAngle = Math.PI * 0.075; // Shifted right (~13.5°)
            muteAngle = Math.PI * 0.115; // Shifted right (~20.7°)

            this.playBtn.position.set(Math.sin(playAngle) * radius, yUp, -Math.cos(playAngle) * radius);
            this.muteBtn.position.set(Math.sin(muteAngle) * radius, yUp, -Math.cos(muteAngle) * radius);

            // Look at world height 0.6 (same as buttons)
            this.playBtn.lookAt(0, 0.6, 0);
            this.muteBtn.lookAt(0, 0.6, 0);
        }
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
            // Lazy load other scenes in background
            this.preloadScenes(location.scenes.slice(1));
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

        // Preload linked scenes in background
        if (sceneData.links && this.currentLocation) {
            const linkedPaths = sceneData.links
                .map(link => {
                    const linkedScene = this.currentLocation?.scenes?.find(s => s.id === link.target);
                    return linkedScene?.path;
                })
                .filter(Boolean);
            this.preloadTextures(linkedPaths);
        }
    }

    loadTexture(path) {
        // Check cache first
        if (this.textureCache && this.textureCache.has(path)) {
            console.log('Using cached texture:', path);
            const cachedTexture = this.textureCache.get(path);
            this.material.map = cachedTexture;
            this.material.needsUpdate = true;
            this.hideLoading(); // Ensure loading is hidden immediately
            return;
        }

        // If already loading this specific texture as a main request, just show loading
        // If it was a background preload, we might want to "promote" it or just wait.
        // For simplicity, we'll just wait for the existing promise/callback if we could hooked into it, 
        // but Three.js TextureLoader doesn't return a promise we can easily attach to for the *same* request object usually.
        // multi-request handling: if we initiate a standard load, and one is pending, we can't easily jump onto the pending one's callback 
        // without a custom manager. 
        // EASIER FIX: just let it load. BUT, let's stop *Preloads* from spamming.

        // Show loading indicator
        this.showLoading();

        this.textureLoader.load(
            path,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                // Cache the texture
                if (!this.textureCache) this.textureCache = new Map();
                this.textureCache.set(path, texture);

                this.material.map = texture;
                this.material.needsUpdate = true;
                // Hide loading indicator
                this.hideLoading();
            },
            (xhr) => {
                // Progress
                // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('Error loading panorama:', error);
                this.loadFallbackTexture('Error Loading');
                this.hideLoading();
            }
        );
    }

    // Preload multiple textures in background (lazy loading)
    preloadTextures(paths) {
        if (!this.textureCache) this.textureCache = new Map();
        if (!this.pendingTextures) this.pendingTextures = new Set();

        paths.forEach(path => {
            // Skip if already cached OR matches current texture (optimization)
            if (!path || this.textureCache.has(path)) return;

            // Skip if already being loaded
            if (this.pendingTextures.has(path)) return;

            this.pendingTextures.add(path); // Mark as pending

            // Load in background without showing loading indicator
            this.textureLoader.load(
                path,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    this.textureCache.set(path, texture);
                    this.pendingTextures.delete(path); // Remove from pending
                    console.log('Preloaded texture:', path);
                },
                undefined,
                (error) => {
                    console.warn('Failed to preload:', path, error);
                    this.pendingTextures.delete(path); // Remove from pending on error too
                }
            );
        });
    }

    // Preload scenes array
    preloadScenes(scenes) {
        if (!scenes || scenes.length === 0) return;
        const paths = scenes.map(s => s.path).filter(Boolean);
        this.preloadTextures(paths);
    }

    createLoadingIndicator() {
        // Create a simple loading overlay
        this.loadingGroup = new THREE.Group();
        this.loadingGroup.visible = false;

        // Dark semi-transparent background sphere
        const bgGeometry = new THREE.SphereGeometry(49, 32, 32);
        bgGeometry.scale(-1, 1, 1);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            opacity: 0.7,
            transparent: true
        });
        this.loadingBg = new THREE.Mesh(bgGeometry, bgMaterial);
        this.loadingGroup.add(this.loadingBg);

        // Loading text/spinner canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        this.loadingCanvas = canvas;
        this.loadingCtx = canvas.getContext('2d');

        const texture = new THREE.CanvasTexture(canvas);
        const planeGeometry = new THREE.PlaneGeometry(0.5, 0.5);
        const planeMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        this.loadingSpinner = new THREE.Mesh(planeGeometry, planeMaterial);
        this.loadingSpinner.position.set(0, 0, -2);
        this.loadingSpinner.renderOrder = 1000;
        this.loadingGroup.add(this.loadingSpinner);

        this.group.add(this.loadingGroup);
        this.loadingRotation = 0;
    }

    updateLoadingSpinner() {
        if (!this.loadingGroup.visible) return;

        const ctx = this.loadingCtx;
        ctx.clearRect(0, 0, 256, 256);

        // Draw spinning circle
        this.loadingRotation += 0.1;
        ctx.save();
        ctx.translate(128, 100);
        ctx.rotate(this.loadingRotation);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.restore();

        // Draw "Loading..." text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading...', 128, 180);

        this.loadingSpinner.material.map.needsUpdate = true;
    }

    showLoading() {
        this.isLoading = true;
        if (this.loadingGroup) {
            this.loadingGroup.visible = true;
        }
    }

    hideLoading() {
        this.isLoading = false;
        if (this.loadingGroup) {
            this.loadingGroup.visible = false;
        }
    }

    createArrowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Outer glow (soft light blue halo)
        ctx.beginPath();
        ctx.arc(64, 64, 50, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(173, 216, 230, 0.2)'; // Light blue, low opacity
        ctx.fill();

        // Stroke (slightly darker blue outline)
        ctx.lineWidth = 4; // Increased linewidth for better visibility
        ctx.strokeStyle = 'rgba(70, 130, 180, 0.7)'; // SteelBlue, good opacity
        ctx.stroke();

        // Inner core (off-white/light blue)
        ctx.beginPath();
        ctx.arc(64, 64, 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(240, 248, 255, 0.95)'; // AliceBlue, high opacity
        ctx.fill();

        // Center dot (dark grey for bullseye effect and contrast)
        ctx.beginPath();
        ctx.arc(64, 64, 8, 0, Math.PI * 2); // Slightly larger center dot
        ctx.fillStyle = 'rgba(50, 50, 50, 0.8)'; // Dark grey, higher opacity
        ctx.fill();

        return new THREE.CanvasTexture(canvas);
    }
    createArrowMesh(linkData) {
        const texture = this.createArrowTexture();
        const geometry = new THREE.PlaneGeometry(0.3, 0.3); // Small size
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false // Always show on top
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Angle-based positioning
        const radius = 4.5; // Slightly further away
        const yPos = 0;  // Eye level (0 relative to group at 1.6)
        const angleRad = (linkData.angle || 0) * (Math.PI / 180);

        // Calculate position on circle
        const x = Math.sin(angleRad) * radius;
        const z = -Math.cos(angleRad) * radius;

        mesh.position.set(x, yPos, z);

        // Face the user (center)
        mesh.lookAt(0, 0, 0);
        // No rotateX needed, billboard facing user


        mesh.userData.isInteractable = true;
        mesh.userData.originalScale = new THREE.Vector3(1, 1, 1);
        mesh.userData.targetScale = new THREE.Vector3(1, 1, 1);
        mesh.userData.animProgress = 1;
        mesh.onHoverIn = () => mesh.userData.targetScale.set(1.3, 1.3, 1.3);
        mesh.onHoverOut = () => mesh.userData.targetScale.copy(mesh.userData.originalScale);
        mesh.onClick = () => {
            console.log('Clicked hotspot:', linkData.label, 'Target:', linkData.target);
            if (!this.currentLocation || !this.currentLocation.scenes) {
                console.error('No scenes data found for current location');
                return;
            }
            const nextScene = this.currentLocation.scenes.find(s => s.id === linkData.target);
            if (nextScene) {
                console.log('Transitioning to scene:', nextScene.id);
                this.loadScene(nextScene);
            } else {
                console.error('Target scene not found:', linkData.target);
                console.log('Available scenes:', this.currentLocation.scenes.map(s => s.id));
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
        const animSpeed = 6;

        // Helper function for smooth animation
        const animateObject = (obj) => {
            if (!obj || !obj.userData.targetScale) return;

            const diff = obj.scale.distanceTo(obj.userData.targetScale);

            if (diff > 0.01 && obj.userData.animProgress >= 1) {
                obj.userData.animProgress = 0;
                obj.userData.startScale = obj.scale.clone();
            }

            if (obj.userData.animProgress < 1 && obj.userData.startScale) {
                obj.userData.animProgress = Math.min(1, obj.userData.animProgress + delta * animSpeed);
                // Ease-in-out (smoothstep)
                const t = obj.userData.animProgress;
                const easeInOut = t * t * (3 - 2 * t);
                obj.scale.lerpVectors(obj.userData.startScale, obj.userData.targetScale, easeInOut);
            }
        };

        // Animate all buttons
        animateObject(this.backBtn);
        animateObject(this.playBtn);
        animateObject(this.muteBtn);

        // Animate hotspots
        if (this.currentHotspots) {
            this.currentHotspots.forEach(animateObject);
        }

        // Update loading spinner animation
        this.updateLoadingSpinner();

        // === VR FIX: Sync sphere center with camera position for proper stereo ===
        // In VR/stereo mode, the sphere MUST be centered exactly at the camera 
        // position to prevent "double vision" where left/right eyes see different content
        if (this.sphere) {
            const cameraWorldPos = new THREE.Vector3();

            // In WebXR mode, use the XR camera for accurate positioning
            if (this.renderer && this.renderer.xr && this.renderer.xr.isPresenting) {
                const xrCamera = this.renderer.xr.getCamera();
                xrCamera.getWorldPosition(cameraWorldPos);
            } else if (this.camera) {
                this.camera.getWorldPosition(cameraWorldPos);
            }

            // Move the panorama sphere to follow the camera's world position
            // This ensures both eyes see the panorama from the same center point
            this.sphere.position.set(
                cameraWorldPos.x - this.group.position.x,
                cameraWorldPos.y - this.group.position.y,
                cameraWorldPos.z - this.group.position.z
            );
        }

        // Make control dock follow camera rotation (like SubMenu)
        if (this.controlDock && this.camera) {
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);

            // Check if looking down
            const pitch = Math.asin(cameraDirection.y);
            const targetAngle = Math.atan2(cameraDirection.x, cameraDirection.z) + Math.PI;

            // Only rotate when NOT looking down at controls
            if (pitch > -0.45) { // -0.45 rad ≈ -26 degrees (lowered threshold)
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
