import * as THREE from 'three';

/**
 * TutorialManager
 * Handles the first-time onboarding experience in VR/3D.
 * Steps:
 * 1. Look Left/Right (Head tracking)
 * 2. Gaze Selection (Dwell time)
 * 3. Navigation (Teleport/Click)
 */
export class TutorialManager {
    constructor(scene, camera, renderer, gazeController, onComplete) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.gazeController = gazeController; // Reusing existing controller for raycasting
        this.onComplete = onComplete;

        this.isActive = false;
        this.currentStep = 0; // 0: Init, 1: Look, 2: Gaze, 3: Teleport
        
        // Configuration
        this.lookThreshold = Math.PI / 3; // 60 degrees total rotation
        this.gazeDuration = 2000; // 2 seconds
        
        // State tracking
        this.accumulatedRotation = 0;
        this.lastCameraQuat = new THREE.Quaternion();
        this.gazeTimer = 0;
        this.isGazingAtTarget = false;

        // Visuals Group
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        // UI Elements
        this.hudMesh = null;
        this.targetOrb = null;
        this.skipBtn = null;

        // Bindings
        this.update = this.update.bind(this);
    }

    checkAndStart() {
        const isDone = localStorage.getItem('webvr_tutorial_completed');
        if (!isDone) {
            this.start();
        } else {
            console.log('Tutorial already completed.');
            if (this.onComplete) this.onComplete();
        }
    }

    start() {
        console.log('Starting VR Tutorial...');
        this.isActive = true;
        this.currentStep = 1;
        this.createVisuals();
        this.showStep(1);
        
        // Initialize rotation tracking
        this.lastCameraQuat.copy(this.camera.quaternion);
    }

    finish() {
        console.log('Tutorial Completed!');
        this.isActive = false;
        localStorage.setItem('webvr_tutorial_completed', 'true');
        
        // Fade out animation
        this.fadeOutAndRemove();
        
        if (this.onComplete) this.onComplete();
    }

    skip() {
        this.finish();
    }

    createVisuals() {
        // 1. HUD Text Panel (Floating in front of user)
        const hudCanvas = document.createElement('canvas');
        hudCanvas.width = 1024;
        hudCanvas.height = 256;
        this.hudCtx = hudCanvas.getContext('2d');
        this.hudTexture = new THREE.CanvasTexture(hudCanvas);
        
        const hudGeo = new THREE.PlaneGeometry(2, 0.5);
        const hudMat = new THREE.MeshBasicMaterial({ 
            map: this.hudTexture, 
            transparent: true,
            opacity: 0,
            depthTest: false // Always show on top
        });
        this.hudMesh = new THREE.Mesh(hudGeo, hudMat);
        this.hudMesh.renderOrder = 999;
        this.group.add(this.hudMesh);

        // 2. Gaze Target Orb (For Step 2)
        const orbGeo = new THREE.SphereGeometry(0.15, 32, 32);
        const orbMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8 });
        this.targetOrb = new THREE.Mesh(orbGeo, orbMat);
        this.targetOrb.position.set(0, 0, -2); // In front of camera
        this.targetOrb.visible = false;
        this.targetOrb.userData.isInteractable = true; // For GazeController
        
        // Custom gaze handlers for the orb
        this.targetOrb.onGazeStart = () => { this.isGazingAtTarget = true; };
        this.targetOrb.onGazeEnd = () => { 
            this.isGazingAtTarget = false; 
            this.gazeTimer = 0;
            this.updateOrbScale(1);
        };
        
        this.group.add(this.targetOrb);

        // 3. Skip Button (Floor UI)
        this.createSkipButton();
    }

    createSkipButton() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
        ctx.roundRect(10, 10, 236, 44, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Skip Tutorial', 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        this.skipBtn = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), mat);
        this.skipBtn.position.set(0, -0.8, -1.5); // Low down in front
        this.skipBtn.rotation.x = -Math.PI / 6; // Tilted up
        
        this.skipBtn.userData.isInteractable = true;
        this.skipBtn.onClick = () => this.skip();
        
        this.group.add(this.skipBtn);
    }

    updateHudText(text, subtext = '') {
        const ctx = this.hudCtx;
        const w = 1024, h = 256;
        
        ctx.clearRect(0, 0, w, h);
        
        // Background Pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(100, 20, w - 200, h - 40, 50);
        ctx.fill();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, w / 2, 110);
        
        if (subtext) {
            ctx.fillStyle = '#cccccc';
            ctx.font = '40px Arial';
            ctx.fillText(subtext, w / 2, 180);
        }
        
        this.hudTexture.needsUpdate = true;
    }

    showStep(stepIndex) {
        this.currentStep = stepIndex;
        // Fade in text
        if (this.hudMesh) this.hudMesh.material.opacity = 0;
        
        switch (stepIndex) {
            case 1:
                this.updateHudText('Selamat Datang!', 'Coba lihat ke KIRI dan ke KANAN');
                this.targetOrb.visible = false;
                break;
            case 2:
                this.updateHudText('Bagus!', 'Sekarang TATAP bola hijau ini');
                this.targetOrb.visible = true;
                // Position orb slightly random or just front
                this.targetOrb.position.set(0, 0, -2);
                break;
            case 3:
                this.updateHudText('Navigasi', 'Coba pilih salah satu lokasi di menu');
                this.targetOrb.visible = false;
                break;
        }
    }

    update(delta) {
        if (!this.isActive) return;

        // Smooth fade in/out for HUD
        if (this.hudMesh) {
            this.hudMesh.material.opacity = THREE.MathUtils.lerp(this.hudMesh.material.opacity, 1, delta * 2);
            
            // HUD Look-at logic (Lazy follow)
            // Position HUD in front of camera but smoothly
            const targetPos = new THREE.Vector3(0, 0, -2);
            targetPos.applyQuaternion(this.camera.quaternion);
            targetPos.add(this.camera.position);
            
            this.hudMesh.position.lerp(targetPos, delta * 5);
            this.hudMesh.quaternion.slerp(this.camera.quaternion, delta * 5);
        }
        
        // Skip Button follow (floor level)
        if (this.skipBtn) {
            const targetPos = new THREE.Vector3(0, -0.8, -1.5);
            targetPos.applyEuler(new THREE.Euler(0, this.camera.rotation.y, 0));
            targetPos.add(this.camera.position);
            this.skipBtn.position.lerp(targetPos, delta * 2);
            this.skipBtn.lookAt(this.camera.position);
        }

        // Logic per step
        switch (this.currentStep) {
            case 1: // Look Around
                const q1 = this.lastCameraQuat;
                const q2 = this.camera.quaternion;
                const angle = q1.angleTo(q2);
                this.accumulatedRotation += angle;
                this.lastCameraQuat.copy(q2);
                
                if (this.accumulatedRotation > this.lookThreshold) {
                    this.nextStep();
                }
                break;

            case 2: // Gaze Target
                if (this.isGazingAtTarget) {
                    this.gazeTimer += delta * 1000;
                    
                    // Visual feedback (Scale up or Pulse)
                    const progress = Math.min(this.gazeTimer / this.gazeDuration, 1);
                    this.updateOrbScale(1 + progress * 0.5); // Grow 50%
                    
                    if (this.gazeTimer >= this.gazeDuration) {
                        this.nextStep();
                    }
                }
                break;

            case 3: // Teleport (Waiting for external trigger)
                // Logic handled via triggerTeleport()
                break;
        }
    }
    
    updateOrbScale(scale) {
        if (this.targetOrb) {
            this.targetOrb.scale.setScalar(scale);
        }
    }

    nextStep() {
        this.currentStep++;
        if (this.currentStep > 3) {
            this.finish();
        } else {
            // Little delay between steps for smoothness
            setTimeout(() => this.showStep(this.currentStep), 500);
        }
    }

    triggerTeleport() {
        if (this.isActive && this.currentStep === 3) {
            this.finish();
        }
    }
    
    fadeOutAndRemove() {
        // Simple animation out
        const fadeOut = setInterval(() => {
            if (!this.hudMesh) { clearInterval(fadeOut); return; }
            
            this.hudMesh.material.opacity -= 0.05;
            if (this.skipBtn) this.skipBtn.material.opacity -= 0.05;
            
            if (this.hudMesh.material.opacity <= 0) {
                this.scene.remove(this.group);
                clearInterval(fadeOut);
            }
        }, 50);
    }
}
