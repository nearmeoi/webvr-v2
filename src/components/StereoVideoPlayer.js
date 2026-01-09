import * as THREE from 'three';

/**
 * StereoVideoPlayer - Displays side-by-side stereo video in VR/Cardboard mode
 * Video format: Left half = left eye, Right half = right eye
 * Provides 3D depth perception but NOT 360° view
 */
export class StereoVideoPlayer {
    constructor(scene, camera, renderer, onBack) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.onBack = onBack;

        this.group = new THREE.Group();
        this.group.position.set(0, 1.6, 0); // Eye level
        this.scene.add(this.group);
        this.group.visible = false;

        this.video = null;
        this.videoTexture = null;
        this.isPlaying = false;
        this.isStereoMode = false;

        // Video planes (one for each eye in stereo mode)
        this.leftPlane = null;
        this.rightPlane = null;
        this.monoPlane = null; // For non-stereo viewing

        this.createVideoPlanes();
        this.createControls();
        this.createLoadingIndicator();
        this.createFullscreenOverlay();
    }

    createFullscreenOverlay() {
        // HTML overlay for fullscreen video playback
        this.videoOverlay = document.createElement('div');
        Object.assign(this.videoOverlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            display: 'none',
            zIndex: '1000',
            justifyContent: 'center',
            alignItems: 'center'
        });

        // Video element for fullscreen
        this.fullscreenVideo = document.createElement('video');
        Object.assign(this.fullscreenVideo.style, {
            width: '100%',
            height: '100%',
            objectFit: 'contain'
        });
        this.fullscreenVideo.playsInline = true;
        this.fullscreenVideo.loop = true;
        this.fullscreenVideo.muted = false;
        this.fullscreenVideo.volume = 0.5;

        // Control bar
        this.controlBar = document.createElement('div');
        Object.assign(this.controlBar.style, {
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '15px',
            padding: '15px 25px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '30px',
            backdropFilter: 'blur(10px)'
        });

        // Back button
        this.htmlBackBtn = document.createElement('button');
        this.htmlBackBtn.textContent = '← BACK';
        Object.assign(this.htmlBackBtn.style, {
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: 'rgba(200, 50, 50, 0.6)',
            border: '2px solid rgba(255, 100, 100, 0.8)',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s'
        });
        this.htmlBackBtn.onmouseenter = () => {
            this.htmlBackBtn.style.transform = 'scale(1.1)';
            this.htmlBackBtn.style.backgroundColor = 'rgba(200, 50, 50, 0.8)';
        };
        this.htmlBackBtn.onmouseleave = () => {
            this.htmlBackBtn.style.transform = 'scale(1)';
            this.htmlBackBtn.style.backgroundColor = 'rgba(200, 50, 50, 0.6)';
        };
        this.htmlBackBtn.onclick = () => {
            this.hideFullscreen();
            this.stop();
            if (this.onBack) this.onBack();
        };

        // Play/Pause button
        this.htmlPlayBtn = document.createElement('button');
        this.htmlPlayBtn.textContent = '▶ PLAY';
        Object.assign(this.htmlPlayBtn.style, {
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: 'rgba(50, 150, 50, 0.6)',
            border: '2px solid rgba(100, 255, 100, 0.8)',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s'
        });
        this.htmlPlayBtn.onmouseenter = () => {
            this.htmlPlayBtn.style.transform = 'scale(1.1)';
        };
        this.htmlPlayBtn.onmouseleave = () => {
            this.htmlPlayBtn.style.transform = 'scale(1)';
        };
        this.htmlPlayBtn.onclick = () => this.togglePlay();

        this.controlBar.appendChild(this.htmlBackBtn);
        this.controlBar.appendChild(this.htmlPlayBtn);
        this.videoOverlay.appendChild(this.fullscreenVideo);
        this.videoOverlay.appendChild(this.controlBar);
        document.body.appendChild(this.videoOverlay);
    }

    showFullscreen() {
        this.videoOverlay.style.display = 'flex';
    }

    hideFullscreen() {
        this.videoOverlay.style.display = 'none';
    }

    createVideoPlanes() {
        // Video aspect ratio (assuming 16:9 per eye, so full video is 32:9)
        const planeWidth = 4;
        const planeHeight = 2.25; // 16:9 aspect
        const distance = 3; // Distance from viewer

        // Mono plane (for non-cardboard viewing - shows full side-by-side)
        const monoGeometry = new THREE.PlaneGeometry(planeWidth * 1.5, planeHeight * 1.5);
        const monoMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.FrontSide
        });
        this.monoPlane = new THREE.Mesh(monoGeometry, monoMaterial);
        this.monoPlane.position.set(0, 0, -distance);
        this.monoPlane.visible = false; // Hidden - using HTML overlay instead
        this.group.add(this.monoPlane);

        // Stereo planes - using UV mapping to show correct half of video to each eye
        // Left eye plane
        const leftGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        // Modify UVs to show only left half of video (0.0 to 0.5 on X)
        const leftUvs = leftGeometry.attributes.uv;
        for (let i = 0; i < leftUvs.count; i++) {
            leftUvs.setX(i, leftUvs.getX(i) * 0.5); // Scale X from [0,1] to [0,0.5]
        }

        const leftMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.FrontSide
        });
        this.leftPlane = new THREE.Mesh(leftGeometry, leftMaterial);
        this.leftPlane.position.set(0, 0, -distance);
        this.leftPlane.layers.set(1); // Left eye only
        this.leftPlane.visible = false;
        this.group.add(this.leftPlane);

        // Right eye plane
        const rightGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        // Modify UVs to show only right half of video (0.5 to 1.0 on X)
        const rightUvs = rightGeometry.attributes.uv;
        for (let i = 0; i < rightUvs.count; i++) {
            rightUvs.setX(i, 0.5 + rightUvs.getX(i) * 0.5); // Scale X from [0,1] to [0.5,1.0]
        }

        const rightMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.FrontSide
        });
        this.rightPlane = new THREE.Mesh(rightGeometry, rightMaterial);
        this.rightPlane.position.set(0, 0, -distance);
        this.rightPlane.layers.set(2); // Right eye only
        this.rightPlane.visible = false;
        this.group.add(this.rightPlane);

        // Background (dark sphere for immersion)
        const bgGeometry = new THREE.SphereGeometry(50, 32, 32);
        bgGeometry.scale(-1, 1, 1);
        const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.background = new THREE.Mesh(bgGeometry, bgMaterial);
        this.background.visible = false; // Hidden - using HTML overlay
        this.group.add(this.background);
    }

    createControls() {
        // Control dock
        this.controlDock = new THREE.Group();
        this.group.add(this.controlDock);

        // Back button
        this.createBackButton();

        // Play/Pause button
        this.createPlayButton();
    }

    createBackButton() {
        const geometry = new THREE.PlaneGeometry(0.4, 0.18);
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');

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

        ctx.clearRect(0, 0, 400, 180);
        roundRect(10, 10, 380, 160, 40);
        ctx.fillStyle = 'rgba(200, 50, 50, 0.4)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px sans-serif';
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
        this.backBtn.position.set(-0.3, -1.0, -1.6);
        this.backBtn.lookAt(-0.3, 0.6, 0);

        this.backBtn.userData.isInteractable = true;
        this.backBtn.userData.originalScale = new THREE.Vector3(1, 1, 1);
        this.backBtn.userData.targetScale = new THREE.Vector3(1, 1, 1);
        this.backBtn.userData.animProgress = 1;
        this.backBtn.onHoverIn = () => this.backBtn.userData.targetScale.set(1.1, 1.1, 1.1);
        this.backBtn.onHoverOut = () => this.backBtn.userData.targetScale.copy(this.backBtn.userData.originalScale);
        this.backBtn.onClick = () => {
            this.stop();
            if (this.onBack) this.onBack();
        };

        this.controlDock.add(this.backBtn);
    }

    createPlayButton() {
        this.playBtnCanvas = document.createElement('canvas');
        this.playBtnCanvas.width = 200;
        this.playBtnCanvas.height = 200;
        this.updatePlayButton(false);

        const texture = new THREE.CanvasTexture(this.playBtnCanvas);
        const geometry = new THREE.PlaneGeometry(0.18, 0.18);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.playBtn = new THREE.Mesh(geometry, material);
        this.playBtn.position.set(0.3, -1.0, -1.6);
        this.playBtn.lookAt(0.3, 0.6, 0);

        this.playBtn.userData.isInteractable = true;
        this.playBtn.userData.originalScale = new THREE.Vector3(1, 1, 1);
        this.playBtn.userData.targetScale = new THREE.Vector3(1, 1, 1);
        this.playBtn.userData.animProgress = 1;
        this.playBtn.onHoverIn = () => this.playBtn.userData.targetScale.set(1.2, 1.2, 1.2);
        this.playBtn.onHoverOut = () => this.playBtn.userData.targetScale.copy(this.playBtn.userData.originalScale);
        this.playBtn.onClick = () => this.togglePlay();

        this.controlDock.add(this.playBtn);
    }

    updatePlayButton(isPlaying) {
        const ctx = this.playBtnCanvas.getContext('2d');
        ctx.clearRect(0, 0, 200, 200);

        ctx.beginPath();
        ctx.arc(100, 100, 90, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(50, 150, 50, 0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = 'white';
        if (isPlaying) {
            // Pause icon
            ctx.fillRect(70, 60, 20, 80);
            ctx.fillRect(110, 60, 20, 80);
        } else {
            // Play icon
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

    createLoadingIndicator() {
        this.loadingGroup = new THREE.Group();
        this.loadingGroup.visible = false;

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        this.loadingCanvas = canvas;
        this.loadingCtx = canvas.getContext('2d');

        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.PlaneGeometry(0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        this.loadingSpinner = new THREE.Mesh(geometry, material);
        this.loadingSpinner.position.set(0, 0, -2);
        this.loadingGroup.add(this.loadingSpinner);
        this.group.add(this.loadingGroup);
        this.loadingRotation = 0;
    }

    updateLoadingSpinner() {
        if (!this.loadingGroup.visible) return;

        const ctx = this.loadingCtx;
        ctx.clearRect(0, 0, 256, 256);

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

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading Video...', 128, 180);

        this.loadingSpinner.material.map.needsUpdate = true;
    }

    load(videoPath, autoPlay = true) {
        // Show fullscreen overlay for desktop viewing
        this.showFullscreen();

        // Set video source and load
        this.fullscreenVideo.src = videoPath;
        this.fullscreenVideo.load();

        this.fullscreenVideo.onloadeddata = () => {
            if (autoPlay) {
                this.play();
            }
        };

        this.fullscreenVideo.onerror = (e) => {
            console.error('Video load error:', e);
        };

        // Keep group hidden for desktop (using HTML overlay)
        this.group.visible = false;
    }

    createVideoTexture() {
        if (this.videoTexture) {
            this.videoTexture.dispose();
        }

        this.videoTexture = new THREE.VideoTexture(this.video);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        this.videoTexture.colorSpace = THREE.SRGBColorSpace;

        // Apply texture to all planes
        this.monoPlane.material.map = this.videoTexture;
        this.monoPlane.material.color.set(0xffffff);
        this.monoPlane.material.needsUpdate = true;

        this.leftPlane.material.map = this.videoTexture;
        this.leftPlane.material.color.set(0xffffff);
        this.leftPlane.material.needsUpdate = true;

        this.rightPlane.material.map = this.videoTexture;
        this.rightPlane.material.color.set(0xffffff);
        this.rightPlane.material.needsUpdate = true;
    }

    play() {
        if (!this.fullscreenVideo) return;
        this.fullscreenVideo.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton(true);
            this.htmlPlayBtn.textContent = '⏸ PAUSE';
        }).catch(e => {
            console.log('Video autoplay blocked:', e);
            this.isPlaying = false;
            this.updatePlayButton(false);
            this.htmlPlayBtn.textContent = '▶ PLAY';
        });
    }

    pause() {
        if (!this.fullscreenVideo) return;
        this.fullscreenVideo.pause();
        this.isPlaying = false;
        this.updatePlayButton(false);
        this.htmlPlayBtn.textContent = '▶ PLAY';
    }

    stop() {
        if (this.fullscreenVideo) {
            this.fullscreenVideo.pause();
            this.fullscreenVideo.currentTime = 0;
        }
        this.isPlaying = false;
        this.updatePlayButton(false);
        if (this.htmlPlayBtn) this.htmlPlayBtn.textContent = '▶ PLAY';
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    setStereoMode(enabled) {
        this.isStereoMode = enabled;
        this.monoPlane.visible = !enabled;
        this.leftPlane.visible = enabled;
        this.rightPlane.visible = enabled;
    }

    showLoading() {
        if (this.loadingGroup) {
            this.loadingGroup.visible = true;
        }
    }

    hideLoading() {
        if (this.loadingGroup) {
            this.loadingGroup.visible = false;
        }
    }

    show() {
        this.showFullscreen();
    }

    hide() {
        this.stop();
        this.hideFullscreen();
        this.group.visible = false;
    }

    update(delta) {
        // Update video texture
        if (this.videoTexture && this.isPlaying) {
            this.videoTexture.needsUpdate = true;
        }

        // Update loading spinner
        this.updateLoadingSpinner();

        // Animate buttons
        const animSpeed = 6;
        const animateObject = (obj) => {
            if (!obj || !obj.userData.targetScale) return;
            const diff = obj.scale.distanceTo(obj.userData.targetScale);
            if (diff > 0.01 && obj.userData.animProgress >= 1) {
                obj.userData.animProgress = 0;
                obj.userData.startScale = obj.scale.clone();
            }
            if (obj.userData.animProgress < 1 && obj.userData.startScale) {
                obj.userData.animProgress = Math.min(1, obj.userData.animProgress + delta * animSpeed);
                const t = obj.userData.animProgress;
                const easeInOut = t * t * (3 - 2 * t);
                obj.scale.lerpVectors(obj.userData.startScale, obj.userData.targetScale, easeInOut);
            }
        };

        animateObject(this.backBtn);
        animateObject(this.playBtn);

        // NOTE: Controls stay fixed in place for focused video viewing
        // No camera-following rotation
    }

    dispose() {
        if (this.video) {
            this.video.pause();
            this.video.src = '';
        }
        if (this.videoTexture) {
            this.videoTexture.dispose();
        }
        this.scene.remove(this.group);
    }
}
