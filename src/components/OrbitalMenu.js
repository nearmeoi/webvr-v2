import * as THREE from 'three';

// Location data with real assets from Virtual Tour Development folder
export const LOCATIONS = [
    {
        id: 0,
        name: 'Fort Rotterdam',
        thumbnail: '/Virtual Tour Development/Fort Rotterdam/Thumbnail Fort Rotterdam.jpg',
        panorama: '/Virtual Tour Development/Fort Rotterdam/Pano1.jpg',
        audio: '/Virtual Tour Development/Fort Rotterdam/Fort Rotterdam - Made with Clipchamp.m4a',
        subLocations: null
    },
    {
        id: 1,
        name: 'Losari Beach',
        thumbnail: '/Virtual Tour Development/Losari Beach/Thumbnail Losari.jpg',
        panorama: '/Virtual Tour Development/Losari Beach/1.jpg',
        audio: '/Virtual Tour Development/Losari Beach/Pantai Losari - Made with Clipchamp.m4a',
        subLocations: null
    },
    {
        id: 2,
        name: 'Malino',
        thumbnail: '/Virtual Tour Development/Malino/Thumbnail Malino.jpg',
        panorama: '/Virtual Tour Development/Malino/1.jpg',
        audio: '/Virtual Tour Development/Malino/Malino - Made with Clipchamp.m4a',
        subLocations: null
    },
    {
        id: 3,
        name: 'Toraja',
        thumbnail: '/Virtual Tour Development/Toraja/Thumbnail Toraja.jpg',
        panorama: null, // Has sub-locations instead
        audio: null,
        subLocations: [
            {
                id: 0,
                name: 'Welcome',
                thumbnail: '/Virtual Tour Development/Toraja/1. Welcome/1.jpg',
                panorama: '/Virtual Tour Development/Toraja/1. Welcome/1.jpg',
                audio: '/Virtual Tour Development/Toraja/1. Welcome/Welcome - Made with Clipchamp.m4a'
            },
            {
                id: 1,
                name: 'Patung Yesus',
                thumbnail: '/Virtual Tour Development/Toraja/2. Patung Yesus/1.jpg',
                panorama: '/Virtual Tour Development/Toraja/2. Patung Yesus/1.jpg',
                audio: '/Virtual Tour Development/Toraja/2. Patung Yesus/Patung Yesus - Made with Clipchamp.m4a',
                scenes: [
                    {
                        id: '1',
                        path: '/Virtual Tour Development/Toraja/2. Patung Yesus/1.jpg',
                        links: [
                            { target: '2', label: 'Maju', angle: 270 }  // kiri
                        ]
                    },
                    {
                        id: '2',
                        path: '/Virtual Tour Development/Toraja/2. Patung Yesus/2.jpg',
                        links: [
                            { target: '1', label: 'Kembali', angle: 90 },  // kanan (balik)
                            { target: '3', label: 'Maju', angle: 270 }  // kiri
                        ]
                    },
                    {
                        id: '3',
                        path: '/Virtual Tour Development/Toraja/2. Patung Yesus/3.jpg',
                        links: [
                            { target: '2', label: 'Kembali', angle: 270 }  // kiri
                        ]
                    }
                ]
            },
            {
                id: 2,
                name: 'Rante Kalimbuang',
                thumbnail: '/Virtual Tour Development/Toraja/3. Objek Wisata Rante Kalimbuang Bori_/1.jpg',
                panorama: '/Virtual Tour Development/Toraja/3. Objek Wisata Rante Kalimbuang Bori_/1.jpg',
                audio: '/Virtual Tour Development/Toraja/3. Objek Wisata Rante Kalimbuang Bori_/Objek Wisata Rante Kalimbuang Bori_ - Made with Clipchamp.m4a'
            },
            {
                id: 3,
                name: 'Lolai',
                thumbnail: '/Virtual Tour Development/Toraja/4. Lolai - To_ Tombi, Negeri di atas awan/1.jpg',
                panorama: '/Virtual Tour Development/Toraja/4. Lolai - To_ Tombi, Negeri di atas awan/1.jpg',
                audio: '/Virtual Tour Development/Toraja/4. Lolai - To_ Tombi, Negeri di atas awan/Lolai - To_ Tombi, Negeri di atas awan - Made with Clipchamp.m4a',
                scenes: [
                    {
                        id: '1',
                        path: '/Virtual Tour Development/Toraja/4. Lolai - To_ Tombi, Negeri di atas awan/1.jpg',
                        links: [
                            { target: '2', label: 'Maju', angle: 270 }  // kiri
                        ]
                    },
                    {
                        id: '2',
                        path: '/Virtual Tour Development/Toraja/4. Lolai - To_ Tombi, Negeri di atas awan/2.jpg',
                        links: [
                            { target: '1', label: 'Kembali', angle: 90 },  // kanan (balik)
                            { target: '3', label: 'Maju', angle: 270 }  // kiri
                        ]
                    },
                    {
                        id: '3',
                        path: '/Virtual Tour Development/Toraja/4. Lolai - To_ Tombi, Negeri di atas awan/3.jpg',
                        links: [
                            { target: '2', label: 'Kembali', angle: 90 },  // kanan (balik)
                            { target: '4', label: 'Maju', angle: 270 }  // kiri
                        ]
                    },
                    {
                        id: '4',
                        path: '/Virtual Tour Development/Toraja/4. Lolai - To_ Tombi, Negeri di atas awan/4.jpg',
                        links: [
                            { target: '3', label: 'Kembali', angle: 90 }  // kanan
                        ]
                    }
                ]
            },
            {
                id: 4,
                name: 'Londa Graveyard',
                thumbnail: '/Virtual Tour Development/Toraja/5. Londa Ancient Graveyard/1.jpg',
                panorama: '/Virtual Tour Development/Toraja/5. Londa Ancient Graveyard/1.jpg',
                audio: '/Virtual Tour Development/Toraja/5. Londa Ancient Graveyard/Londa Ancient Graveyard - Made with Clipchamp.m4a'
            },
            {
                id: 5,
                name: "Kete' Kesu",
                thumbnail: '/Virtual Tour Development/Toraja/6. Kete_ Kesu/1.jpg',
                panorama: '/Virtual Tour Development/Toraja/6. Kete_ Kesu/1.jpg',
                audio: '/Virtual Tour Development/Toraja/6. Kete_ Kesu/Kete_ Kesu - Made with Clipchamp.m4a'
            },
            {
                id: 6,
                name: 'Kuburan Batu Lemo',
                thumbnail: '/Virtual Tour Development/Toraja/7. Kuburan Batu Lemo/1.jpg',
                panorama: '/Virtual Tour Development/Toraja/7. Kuburan Batu Lemo/1.jpg',
                audio: '/Virtual Tour Development/Toraja/7. Kuburan Batu Lemo/Kuburan Batu Lemo - Made with Clipchamp.m4a'
            }
        ]
    }
];

export class OrbitalMenu {
    constructor(scene, camera, onSelect) {
        this.scene = scene;
        this.camera = camera;
        this.onSelect = onSelect;

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.thumbnails = [];
        this.radius = 1.5; // Meters from user
        this.itemCount = LOCATIONS.length;
        this.textureLoader = new THREE.TextureLoader();

        this.initMenu();
    }

    initMenu() {
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
            canvas.width = 512;
            canvas.height = 340;
            const ctx = canvas.getContext('2d');

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Glass Background
            roundRect(ctx, 10, 10, 492, 320, 30);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();

            // Subtle Gradient Overlay
            const gradient = ctx.createLinearGradient(0, 0, 0, 340);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
            ctx.fillStyle = gradient;
            ctx.fill();

            // Border (Glass edge)
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.stroke();

            // Draw thumbnail image
            if (img) {
                ctx.save();
                roundRect(ctx, 30, 30, 452, 220, 20);
                ctx.clip();
                // Cover fit
                const imgRatio = img.width / img.height;
                const boxRatio = 452 / 220;
                let sx = 0, sy = 0, sw = img.width, sh = img.height;
                if (imgRatio > boxRatio) {
                    sw = img.height * boxRatio;
                    sx = (img.width - sw) / 2;
                } else {
                    sh = img.width / boxRatio;
                    sy = (img.height - sh) / 2;
                }
                ctx.drawImage(img, sx, sy, sw, sh, 30, 30, 452, 220);
                ctx.restore();
            } else {
                // Fallback gradient
                ctx.save();
                roundRect(ctx, 30, 30, 452, 220, 20);
                ctx.clip();
                const hue = (location.id * 60) % 360;
                ctx.fillStyle = `hsl(${hue}, 40%, 40%)`;
                ctx.fillRect(30, 30, 452, 220);
                ctx.restore();
            }

            // Text label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = 6;
            ctx.fillText(location.name.toUpperCase(), 256, 290);

            return new THREE.CanvasTexture(canvas);
        };

        for (let i = 0; i < this.itemCount; i++) {
            const location = LOCATIONS[i];
            const geometry = new THREE.PlaneGeometry(0.6, 0.4);

            // Initial placeholder material
            const material = new THREE.MeshBasicMaterial({
                color: 0x333333,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.95
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
                // Use fallback
                const texture = createThumbnailTexture(location, null);
                mesh.material.map = texture;
                mesh.material.color.set(0xffffff);
                mesh.material.needsUpdate = true;
            };
            img.src = location.thumbnail;

            // Position in arc
            const totalAngle = Math.PI * 0.6; // Narrower for 4 items
            const startAngle = Math.PI - totalAngle / 2;
            const step = this.itemCount > 1 ? totalAngle / (this.itemCount - 1) : 0;
            const theta = startAngle + i * step;

            mesh.position.set(
                Math.sin(theta) * this.radius,
                1.6,
                Math.cos(theta) * this.radius
            );

            mesh.lookAt(0, 1.6, 0);

            // User Data for interaction
            mesh.userData.id = i;
            mesh.userData.locationData = location;
            mesh.userData.isInteractable = true;
            mesh.userData.originalScale = new THREE.Vector3(1, 1, 1);

            // Callbacks
            mesh.onHoverIn = () => {
                mesh.scale.set(1.2, 1.2, 1.2);
            };
            mesh.onHoverOut = () => {
                mesh.scale.copy(mesh.userData.originalScale);
            };
            mesh.onClick = () => {
                this.onSelect(i);
            };

            this.group.add(mesh);
            this.thumbnails.push(mesh);
        }
    }

    update(delta) {
        // Animation removed for stability
    }

    show() {
        this.group.visible = true;

        // Reset rotation to face the user
        if (this.camera) {
            // Get camera direction projected on XZ plane
            const vector = new THREE.Vector3();
            this.camera.getWorldDirection(vector);
            const angle = Math.atan2(vector.x, vector.z);

            // Rotate group to align with camera direction
            // Note: Menu items are at +Z relative to group center usually, or arranged in arc.
            // Our items are arranged around (0,0,0) facing center.
            // If user looks at angle A, we want the center of the arc to be at angle A.
            // The arc center is roughly at theta = PI (backwards).
            // Let's adjust offset based on layout.
            // Initial layout: center is at ~PI (back).
            // So if user looks at Angle, we want Group Angle to be matching.
            
            this.group.rotation.y = angle - Math.PI; 
        }
    }

    hide() {
        this.group.visible = false;
    }
}
