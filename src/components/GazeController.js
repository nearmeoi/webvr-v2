import * as THREE from 'three';

export class GazeController {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer; // For WebXR camera access
        this.raycaster = new THREE.Raycaster();
        this.center = new THREE.Vector2(0, 0); // Normalized center screen

        // Reticle (Simple dot cursor)
        // NOTE: In VR, reticle must be FAR from camera to minimize parallax
        // between left and right eye views. We use z=-10 and scale up accordingly.
        const reticleDistance = 10; // Far enough to minimize stereo parallax
        const reticleSize = 0.04; // Size at distance 10 to appear similar to 0.002 at 0.5

        const geometry = new THREE.CircleGeometry(reticleSize, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            opacity: 0.8,
            transparent: true,
            depthTest: false
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 0, -reticleDistance);
        this.camera.add(this.mesh);
        // Note: For VR, we usually attach reticle to controller or camera.
        // If attached to camera, we need to make sure it's rendered on top.
        this.mesh.renderOrder = 999;

        // Progress indicator (Inner circle filling up) - matched to ring size
        const progressGeo = new THREE.CircleGeometry(reticleSize * 1.5, 32);
        const progressMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.progressMesh = new THREE.Mesh(progressGeo, progressMat);
        this.progressMesh.scale.set(0, 0, 1);
        this.mesh.add(this.progressMesh);

        this.hoveredObject = null;
        this.hoverTime = 0;
        this.ACTIVATION_TIME = 1.5; // Seconds to trigger
    }

    update(scene, interactables, delta) {
        // In WebXR, raycaster usually set from controller or camera view
        // For gaze, we cast from camera position into camera direction

        // Use world position/direction for robust VR gaze
        const origin = new THREE.Vector3();
        const direction = new THREE.Vector3();

        // In WebXR mode, use the XR camera for accurate position/direction
        if (this.renderer && this.renderer.xr && this.renderer.xr.isPresenting) {
            const xrCamera = this.renderer.xr.getCamera();
            xrCamera.getWorldPosition(origin);
            xrCamera.getWorldDirection(direction);
        } else {
            this.camera.getWorldPosition(origin);
            this.camera.getWorldDirection(direction);
        }

        this.raycaster.set(origin, direction);

        const intersects = this.raycaster.intersectObjects(interactables, true); // Recursive check

        if (intersects.length > 0) {
            // Check for interactable objects (tagged with userData.isInteractable)
            let target = intersects[0].object;
            // Traverse up to find the interactable group/mesh if we hit a child
            while (target && !target.userData.isInteractable && target.parent) {
                target = target.parent;
            }

            if (target && target.userData.isInteractable) {
                if (this.hoveredObject !== target) {
                    if (this.hoveredObject) this.onHoverOut(this.hoveredObject);
                    this.hoveredObject = target;
                    this.onHoverIn(this.hoveredObject);
                    this.hoverTime = 0;
                }

                // Increment timer
                this.hoverTime += delta;
                const progress = Math.min(this.hoverTime / this.ACTIVATION_TIME, 1);
                this.progressMesh.scale.set(progress, progress, 1);

                if (this.hoverTime >= this.ACTIVATION_TIME) {
                    this.trigger(target, intersects[0]);
                    this.hoverTime = 0; // Reset or prevent multi-trigger
                    this.progressMesh.scale.set(0, 0, 1);
                }
            } else {
                this.clearHover();
            }
        } else {
            this.clearHover();
        }
    }

    clearHover() {
        if (this.hoveredObject) {
            this.onHoverOut(this.hoveredObject);
            this.hoveredObject = null;
        }
        this.hoverTime = 0;
        this.progressMesh.scale.set(0, 0, 1);
    }

    onHoverIn(object) {
        if (object.onHoverIn) object.onHoverIn();
    }

    onHoverOut(object) {
        if (object.onHoverOut) object.onHoverOut();
    }

    trigger(object, intersection) {
        if (object.onClick) object.onClick(intersection);
    }
}
