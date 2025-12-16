import * as THREE from 'three';

/**
 * StereoEffect - Creates a stereoscopic (side-by-side) rendering effect
 * For use with VR headsets like Google Cardboard on iOS devices
 * Based on Three.js StereoEffect example
 */
export class StereoEffect {
    constructor(renderer) {
        this.renderer = renderer;

        // Stereo camera setup
        this.stereo = new THREE.StereoCamera();
        this.stereo.eyeSep = 0.064; // Average human IPD (interpupillary distance) in meters

        // Store original renderer settings
        this._size = new THREE.Vector2();
        this._rendererSize = new THREE.Vector2();

        this.enabled = false;
    }

    /**
     * Set the eye separation distance (IPD)
     * @param {number} eyeSep - Eye separation in meters (default 0.064)
     */
    setEyeSeparation(eyeSep) {
        this.stereo.eyeSep = eyeSep;
    }

    /**
     * Enable stereo rendering
     */
    enable() {
        this.enabled = true;
        // Force fullscreen-like experience
        this.renderer.setPixelRatio(1); // Lower for performance
    }

    /**
     * Disable stereo rendering
     */
    disable() {
        this.enabled = false;
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    /**
     * Get the current size
     */
    getSize() {
        this.renderer.getSize(this._rendererSize);
        return this._rendererSize;
    }

    /**
     * Set the size of the renderer
     */
    setSize(width, height) {
        this.renderer.setSize(width, height);
    }

    /**
     * Render the scene in stereo
     * @param {THREE.Scene} scene 
     * @param {THREE.Camera} camera 
     */
    render(scene, camera) {
        if (!this.enabled) {
            this.renderer.render(scene, camera);
            return;
        }

        // Get current renderer size
        this.renderer.getSize(this._size);

        // Ensure we're rendering at correct size
        if (this.renderer.autoClear) this.renderer.clear();
        this.renderer.setScissorTest(true);

        // Update stereo cameras from main camera
        this.stereo.update(camera);

        const halfWidth = this._size.width / 2;

        // Render left eye
        this.renderer.setScissor(0, 0, halfWidth, this._size.height);
        this.renderer.setViewport(0, 0, halfWidth, this._size.height);
        this.renderer.render(scene, this.stereo.cameraL);

        // Render right eye
        this.renderer.setScissor(halfWidth, 0, halfWidth, this._size.height);
        this.renderer.setViewport(halfWidth, 0, halfWidth, this._size.height);
        this.renderer.render(scene, this.stereo.cameraR);

        // Reset scissor test
        this.renderer.setScissorTest(false);
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.disable();
    }
}
