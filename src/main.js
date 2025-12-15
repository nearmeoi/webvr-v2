import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GazeController } from './components/GazeController.js';
import { OrbitalMenu, LOCATIONS } from './components/OrbitalMenu.js';
import { SubMenu } from './components/SubMenu.js';
import { PanoramaViewer } from './components/PanoramaViewer.js';

class App {
    constructor() {
        this.container = document.createElement('div');
        document.body.appendChild(this.container);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x101010);

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
        this.renderer.xr.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        document.body.appendChild(VRButton.createButton(this.renderer));

        // Controls (for desktop debugging)
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

        // VR session handling for narrower FOV
        this.isVRMode = false;
        this.renderer.xr.addEventListener('sessionstart', () => {
            this.camera.fov = this.vrFOV;
            this.camera.updateProjectionMatrix();
            this.isVRMode = true;
            // Disable camera-following in VR
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

        // Lights
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
        this.scene.add(light);

        // State tracking
        this.currentState = 'main-menu'; // 'main-menu', 'sub-menu', 'panorama'
        this.currentSubMenuParent = null;

        // Components
        this.gazeController = new GazeController(this.camera);

        // Main panorama viewer with dynamic back handler
        this.panoramaViewer = new PanoramaViewer(this.scene, () => {
            this.onPanoramaBack();
        }, this.camera);

        // Main orbital menu
        this.orbitalMenu = new OrbitalMenu(this.scene, this.camera, (index) => {
            this.onMainMenuSelect(index);
        });

        // Sub-menu (will be created dynamically)
        this.subMenu = null;

        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.renderer.setAnimationLoop(this.render.bind(this));
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

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        const delta = 0.016; // Fixed delta for simplicity or use clock

        // Update controls
        if (this.controls) this.controls.update();

        // Update gaze - check VISIBLE groups only
        const interactables = [];
        if (this.orbitalMenu.group.visible) interactables.push(this.orbitalMenu.group);
        if (this.subMenu && this.subMenu.group.visible) interactables.push(this.subMenu.group);
        if (this.panoramaViewer.group.visible) interactables.push(this.panoramaViewer.group);
        this.gazeController.update(this.scene, interactables, delta);

        // Update components
        this.orbitalMenu.update(delta);
        if (this.subMenu) this.subMenu.update(delta);
        this.panoramaViewer.update(delta);

        this.renderer.render(this.scene, this.camera);
    }
}

new App();
