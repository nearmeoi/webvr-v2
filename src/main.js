import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GazeController } from './components/GazeController.js';
import { OrbitalMenu, LOCATIONS } from './components/OrbitalMenu.js';
import { SubMenu } from './components/SubMenu.js';
import { PanoramaViewer } from './components/PanoramaViewer.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { GyroscopeControls } from './components/GyroscopeControls.js';
import { StereoEffect } from './components/StereoEffect.js';
import { CardboardButton } from './components/CardboardButton.js';
import { isIOS, isWebXRSupported, isMobile, isCardboardForced } from './utils/deviceDetection.js';

class App {
    constructor() {
        this.container = document.createElement('div');
        document.body.appendChild(this.container);

        this.scene = new THREE.Scene();

        // Detect iOS device OR forced Cardboard mode via URL (?cardboard=true)
        this.isIOSDevice = isIOS() || isCardboardForced();
        this.isMobileDevice = isMobile();

        if (this.isIOSDevice) {
            console.log('iOS/Cardboard mode enabled - using stereo rendering');
        }

        // --- IMPROVED BACKGROUND (Gradient) ---
        this.createGradientBackground();

        // Default FOV 60 (narrower than before), VR will use 50
        this.defaultFOV = 60;
        this.vrFOV = 50; // Narrower FOV for VR
        this.minFOV = 30; // Max zoom in
        this.maxFOV = 90; // Max zoom out

        this.camera = new THREE.PerspectiveCamera(this.defaultFOV, window.innerWidth / window.innerHeight, 0.1, 100);
        this.scene.add(this.camera);
        this.camera.position.set(0, 1.6, 0.1); // Offset for OrbitControls to work, raised to eye level

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Only enable WebXR if NOT iOS (iOS doesn't support WebXR)
        if (!this.isIOSDevice && isWebXRSupported()) {
            this.renderer.xr.enabled = true;
            document.body.appendChild(VRButton.createButton(this.renderer));
        }

        this.container.appendChild(this.renderer.domElement);

        // iOS Cardboard Mode - Stereo rendering for VR headsets like Google Cardboard
        this.stereoEffect = null;
        this.isCardboardMode = false;

        if (this.isIOSDevice) {
            this.stereoEffect = new StereoEffect(this.renderer);
            this.cardboardButton = new CardboardButton(
                () => this.enterCardboardMode(),
                () => this.exitCardboardMode()
            );
            this.createVignette();
        }

        // Controls (for desktop debugging and iOS fallback)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.enableZoom = false; // Disable default zoom, we'll handle FOV zoom
        this.controls.rotateSpeed = 0.5; // Slower rotation for more control
        this.controls.target.set(0, 1.6, 0); // Target eye level


        // Mouse wheel zoom (FOV-based zoom for panorama viewing)
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 2;
            this.camera.fov += e.deltaY > 0 ? zoomSpeed : -zoomSpeed;
            this.camera.fov = Math.max(this.minFOV, Math.min(this.maxFOV, this.camera.fov));
            this.camera.updateProjectionMatrix();
        }, { passive: false });

        // VR session handling for narrower FOV (only if WebXR is enabled)
        this.isVRMode = false;
        if (this.renderer.xr.enabled) {
            this.renderer.xr.addEventListener('sessionstart', () => {
                this.camera.fov = this.vrFOV;
                this.camera.updateProjectionMatrix();
                this.isVRMode = true;
                // Enable camera-following in VR
                if (this.subMenu) this.subMenu.setVRMode(true);
                this.panoramaViewer.setVRMode(true);
            });
            this.renderer.xr.addEventListener('sessionend', () => {
                this.camera.fov = this.defaultFOV;
                this.camera.updateProjectionMatrix();
                this.isVRMode = false;
                if (this.subMenu) this.subMenu.setVRMode(false);
                this.panoramaViewer.setVRMode(false);
            });
        }

        // Gyroscope controls for iOS (fallback for VR-like experience)
        this.gyroscopeControls = null;
        this.gyroscopeEnabled = false;

        // Lights
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
        this.scene.add(light);

        // State tracking
        this.currentState = 'welcome'; // Start at welcome
        this.currentSubMenuParent = null;

        // Components
        this.gazeController = new GazeController(this.camera, this.renderer);

        // Welcome Screen - also handles gyroscope permission request on iOS
        this.welcomeScreen = new WelcomeScreen(this.scene, async () => {
            // Request gyroscope permission on iOS when user taps Start
            if (this.isIOSDevice && !this.gyroscopeEnabled) {
                await this.initGyroscope();
            }
            this.onWelcomeStart();
        });

        // Main panorama viewer with dynamic back handler
        this.panoramaViewer = new PanoramaViewer(this.scene, () => {
            this.onPanoramaBack();
        }, this.camera, this.renderer);

        // Main orbital menu (Hidden initially)
        this.orbitalMenu = new OrbitalMenu(this.scene, this.camera, (index) => {
            this.onMainMenuSelect(index);
        });
        this.orbitalMenu.hide(); // Hide at start

        // Sub-menu (will be created dynamically)
        this.subMenu = null;

        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.renderer.setAnimationLoop(this.render.bind(this));
    }

    createVignette() {
        this.vignette = document.createElement('div');
        Object.assign(this.vignette.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'none',
            zIndex: '998' // Below VR button (999)
        });

        // Left Eye Vignette
        const leftEye = document.createElement('div');
        Object.assign(leftEye.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            width: '50%',
            height: '100%',
            background: 'radial-gradient(circle at center, transparent 50%, black 50.5%)'
        });

        // Right Eye Vignette
        const rightEye = document.createElement('div');
        Object.assign(rightEye.style, {
            position: 'absolute',
            right: '0',
            top: '0',
            width: '50%',
            height: '100%',
            background: 'radial-gradient(circle at center, transparent 50%, black 50.5%)'
        });

        this.vignette.appendChild(leftEye);
        this.vignette.appendChild(rightEye);
        document.body.appendChild(this.vignette);
    }

    createGradientBackground() {
        // Create a large sphere for the background
        const geometry = new THREE.SphereGeometry(80, 32, 32);
        geometry.scale(-1, 1, 1); // Invert normals

        // Generate Gradient Texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Radial Gradient: Dark Blue/Purple to Black
        // Center of gradient at bottom (0.5, 1.0) for "horizon" feel or center?
        // Let's do a top-down gradient.
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#4F657B'); // Top: Even Darker Muted Blue
        gradient.addColorStop(1, '#20355A'); // Bottom: Very Dark Deep Blue

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Removed "stars" (noise) for a simpler look

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const bgMesh = new THREE.Mesh(geometry, material);
        this.scene.add(bgMesh);
    }

    onWelcomeStart() {
        this.welcomeScreen.hide();
        this.currentState = 'main-menu';
        this.orbitalMenu.show();
    }

    onMainMenuSelect(index) {
        const location = LOCATIONS[index];
        console.log('Main menu selected:', location.name);

        if (location.subLocations && location.subLocations.length > 0) {
            // Toraja Mode: Auto-load Welcome + Persistent Overlay Menu
            this.orbitalMenu.hide();

            // Show sub menu as overlay
            this.showSubMenu(location);

            // Auto load first location (Welcome)
            this.panoramaViewer.loadFromLocation(location.subLocations[0]);

            // Hide standard "Back to Menu" button inside panorama
            // We use the SubMenu's back button instead
            this.panoramaViewer.setBackButtonVisibility(false);

            // Position audio buttons far right (avoid dock collision)
            this.panoramaViewer.setAudioButtonsPosition('with-dock');

            this.currentState = 'toraja-mode';
        } else {
            // Standard Mode: Zoom into panorama
            this.orbitalMenu.hide();
            this.currentState = 'panorama';
            this.currentSubMenuParent = null;
            this.panoramaViewer.loadFromLocation(location);

            // Ensure standard back button is visible
            this.panoramaViewer.setBackButtonVisibility(true);

            // Position audio buttons close to back (standalone mode)
            this.panoramaViewer.setAudioButtonsPosition('standalone');
        }
    }

    showSubMenu(parentLocation) {
        // Remove existing sub-menu if any
        if (this.subMenu) {
            this.scene.remove(this.subMenu.group);
            this.subMenu = null;
        }

        this.currentSubMenuParent = parentLocation;

        this.subMenu = new SubMenu(
            this.scene,
            this.camera,
            parentLocation,
            (subLocation) => {
                this.onSubMenuSelect(subLocation);
            },
            () => {
                this.onSubMenuBack();
            }
        );
        this.subMenu.show();
        // Highlight first item (Welcome) initially
        this.subMenu.setActive(0);

        // Sync VR mode state
        if (this.isVRMode) this.subMenu.setVRMode(true);
    }

    onSubMenuSelect(subLocation) {
        // Switch panorama scene only, keep menu visible
        console.log('Switching to scene:', subLocation.name);
        this.panoramaViewer.loadFromLocation(subLocation);
    }

    onSubMenuBack() {
        // Create clean exit from Toraja mode
        if (this.subMenu) this.subMenu.hide();
        this.panoramaViewer.hide();
        this.currentState = 'main-menu';
        this.currentSubMenuParent = null;
        this.orbitalMenu.show();
    }

    onPanoramaBack() {
        // Standard back button handler (only visible for non-Toraja items)
        this.panoramaViewer.hide();
        this.currentState = 'main-menu';
        this.orbitalMenu.show();
    }

    /**
     * Initialize gyroscope controls for iOS devices
     * Must be called after a user gesture (tap/click)
     */
    async initGyroscope() {
        if (this.gyroscopeEnabled) return;

        this.gyroscopeControls = new GyroscopeControls(this.camera, this.renderer.domElement);
        const success = await this.gyroscopeControls.enable();

        if (success) {
            this.gyroscopeEnabled = true;
            // Optionally disable OrbitControls when gyroscope is active
            // Or keep both enabled for hybrid control
            console.log('Gyroscope controls initialized for iOS');
        } else {
            console.log('Gyroscope initialization failed, falling back to touch controls');
        }
    }

    /**
     * Enter iOS Cardboard Mode (split-screen stereo VR)
     */
    async enterCardboardMode() {
        if (this.isCardboardMode) return;

        // Initialize gyroscope if not already done
        if (!this.gyroscopeEnabled) {
            await this.initGyroscope();
        }

        // Enable stereo effect
        if (this.stereoEffect) {
            this.stereoEffect.enable();
        }

        // Show Vignette
        if (this.vignette) {
            this.vignette.style.display = 'block';
        }

        // Disable OrbitControls in cardboard mode (gyroscope takes over)
        // ENABLED FOR TESTING: User request to allow dragging
        /*
        if (this.controls) {
            this.controls.enabled = false;
        }
        */

        // Set VR-like camera settings
        this.camera.fov = this.vrFOV;
        this.camera.updateProjectionMatrix();

        this.isCardboardMode = true;
        console.log('Entered Cardboard VR mode');
    }

    /**
     * Exit iOS Cardboard Mode
     */
    exitCardboardMode() {
        if (!this.isCardboardMode) return;

        // Disable stereo effect
        if (this.stereoEffect) {
            this.stereoEffect.disable();
        }

        // Hide Vignette
        if (this.vignette) {
            this.vignette.style.display = 'none';
        }

        // Re-enable OrbitControls
        if (this.controls) {
            this.controls.enabled = true;
        }

        // Reset camera
        this.camera.fov = this.defaultFOV;
        this.camera.updateProjectionMatrix();

        this.isCardboardMode = false;
        console.log('Exited Cardboard VR mode');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        const delta = 0.016; // Fixed delta for simplicity or use clock

        // Update controls
        if (this.controls) this.controls.update();

        // Update gyroscope controls if enabled (iOS)
        if (this.gyroscopeControls && this.gyroscopeEnabled) {
            this.gyroscopeControls.update();
        }

        // Update gaze - check VISIBLE groups only
        const interactables = [];
        // Add Welcome Screen to interactables if visible
        if (this.welcomeScreen && this.welcomeScreen.group.visible) {
            // Need to pass the mesh itself, usually group doesn't trigger intersect unless recursive=true
            // GazeController uses recursive=true, so passing group is fine
            interactables.push(this.welcomeScreen.group);
        }

        if (this.orbitalMenu.group.visible) interactables.push(this.orbitalMenu.group);
        if (this.subMenu && this.subMenu.group.visible) interactables.push(this.subMenu.group);
        if (this.panoramaViewer.group.visible) interactables.push(this.panoramaViewer.group);

        this.gazeController.update(this.scene, interactables, delta);

        // Update components
        if (this.welcomeScreen) this.welcomeScreen.update(delta);
        this.orbitalMenu.update(delta);
        if (this.subMenu) this.subMenu.update(delta);
        this.panoramaViewer.update(delta);
        // Render - use stereo effect if in Cardboard mode (iOS)
        // Render - use stereo effect if in Cardboard mode (iOS)
        if (this.isCardboardMode && this.stereoEffect) {
            this.stereoEffect.render(this.scene, this.camera);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

new App();