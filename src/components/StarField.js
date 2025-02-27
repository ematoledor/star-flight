import * as THREE from 'three';

export class StarField extends THREE.Object3D {
    constructor(numStars = 5000) {
        super();
        
        this.numStars = numStars;
        this.createStars();
    }
    
    createStars() {
        // Create star geometry
        const positions = new Float32Array(this.numStars * 3);
        const colors = new Float32Array(this.numStars * 3);
        const sizes = new Float32Array(this.numStars);
        
        const color = new THREE.Color();
        
        for (let i = 0; i < this.numStars; i++) {
            // Position stars randomly in a sphere
            const i3 = i * 3;
            const radius = 5000;
            const phi = Math.acos(-1 + (2 * Math.random()));
            const theta = Math.random() * Math.PI * 2;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);     // x
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta); // y
            positions[i3 + 2] = radius * Math.cos(phi);                   // z
            
            // Give stars slightly different colors
            const colorChoice = Math.random();
            if (colorChoice > 0.95) {
                // Red-ish star
                color.setRGB(1, 0.8 + Math.random() * 0.2, 0.8 + Math.random() * 0.2);
            } else if (colorChoice > 0.9) {
                // Blue-ish star
                color.setRGB(0.8 + Math.random() * 0.2, 0.8 + Math.random() * 0.2, 1);
            } else if (colorChoice > 0.85) {
                // Yellow-ish star
                color.setRGB(1, 1, 0.8 + Math.random() * 0.2);
            } else {
                // White-ish star
                const shade = 0.8 + Math.random() * 0.2;
                color.setRGB(shade, shade, shade);
            }
            
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            // Star size
            sizes[i] = 2 * Math.random();
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create star material
        const material = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        // Create star field
        this.stars = new THREE.Points(geometry, material);
        this.add(this.stars);
        
        // Create a few bright stars with lens flares
        this.createBrightStars();
    }
    
    createBrightStars() {
        // Create 5-10 brighter stars with lens flares or glow
        const numBrightStars = 8;
        
        for (let i = 0; i < numBrightStars; i++) {
            // Position for bright star
            const radius = 4000;
            const phi = Math.acos(-1 + (2 * Math.random()));
            const theta = Math.random() * Math.PI * 2;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            // Create a bright point for the star
            const starGeometry = new THREE.SphereGeometry(2, 8, 8);
            const starMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            
            const brightStar = new THREE.Mesh(starGeometry, starMaterial);
            brightStar.position.set(x, y, z);
            
            // Add glow effect
            const glowGeometry = new THREE.SphereGeometry(4, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0x88ccff : 0xffcc88,
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending
            });
            
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            brightStar.add(glow);
            
            this.add(brightStar);
        }
    }
    
    update(delta) {
        // Optional: Make stars twinkle or add some subtle motion
        if (Math.random() > 0.95) {
            const sizes = this.stars.geometry.attributes.size.array;
            const randomStar = Math.floor(Math.random() * this.numStars);
            sizes[randomStar] = Math.max(0.5, Math.min(3, sizes[randomStar] + (Math.random() - 0.5) * 0.5));
            this.stars.geometry.attributes.size.needsUpdate = true;
        }
    }
} 