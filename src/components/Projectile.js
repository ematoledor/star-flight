import * as THREE from 'three';

export class Projectile extends THREE.Object3D {
    constructor(config) {
        super();
        
        this.config = Object.assign({
            type: 'laser',
            position: new THREE.Vector3(0, 0, 0),
            direction: new THREE.Vector3(0, 0, 1),
            speed: 500,
            color: 0xff0000,
            size: 0.5,
            damage: 10,
            lifespan: 2 // Seconds before auto-destruction
        }, config);
        
        this.age = 0;
        this.velocity = this.config.direction.clone().normalize().multiplyScalar(this.config.speed);
        this.position.copy(this.config.position);
        
        // Create visual representation based on type
        if (this.config.type === 'laser') {
            this.createLaserVisual();
        } else if (this.config.type === 'missile') {
            this.createMissileVisual();
        } else {
            this.createLaserVisual(); // Default
        }
    }
    
    createLaserVisual() {
        // Create a glowing line for the laser
        const laserGeometry = new THREE.CylinderGeometry(
            this.config.size / 4,
            this.config.size / 4,
            this.config.size * 4,
            8
        );
        
        // Rotate the cylinder to point along the Z axis
        laserGeometry.rotateX(Math.PI / 2);
        
        // Create emissive material for glow effect
        const laserMaterial = new THREE.MeshBasicMaterial({
            color: this.config.color,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial);
        this.add(laserMesh);
        
        // Add a point light for additional glow effect
        const light = new THREE.PointLight(this.config.color, 0.5, 5);
        light.position.set(0, 0, 0);
        this.add(light);
        
        // Store reference to mesh for animation
        this.visualMesh = laserMesh;
    }
    
    createMissileVisual() {
        // Create a voxel-style missile
        const bodyGeometry = new THREE.BoxGeometry(
            this.config.size,
            this.config.size,
            this.config.size * 2
        );
        
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: 0x999999
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.add(body);
        
        // Add fins
        const finGeometry = new THREE.BoxGeometry(
            this.config.size * 1.5,
            this.config.size / 4,
            this.config.size / 2
        );
        
        const finMaterial = new THREE.MeshLambertMaterial({
            color: 0x666666
        });
        
        const finTop = new THREE.Mesh(finGeometry, finMaterial);
        finTop.position.set(0, this.config.size / 2, -this.config.size / 2);
        this.add(finTop);
        
        const finBottom = new THREE.Mesh(finGeometry, finMaterial);
        finBottom.position.set(0, -this.config.size / 2, -this.config.size / 2);
        this.add(finBottom);
        
        // Add a thruster glow
        const thrusterGeometry = new THREE.CylinderGeometry(
            this.config.size / 3,
            this.config.size / 6,
            this.config.size,
            8
        );
        
        thrusterGeometry.rotateX(Math.PI); // Point backward
        
        const thrusterMaterial = new THREE.MeshBasicMaterial({
            color: 0xff7700,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
        thruster.position.set(0, 0, -this.config.size);
        this.add(thruster);
        
        // Add a point light for the thruster
        const light = new THREE.PointLight(0xff5500, 0.7, 5);
        light.position.set(0, 0, -this.config.size);
        this.add(light);
        
        // Store reference to thruster for animation
        this.thruster = thruster;
    }
    
    update(delta) {
        // Update age, return true if it should be destroyed
        this.age += delta;
        
        if (this.age >= this.config.lifespan) {
            return true; // Projectile should be destroyed
        }
        
        // Move projectile
        const movement = this.velocity.clone().multiplyScalar(delta);
        this.position.add(movement);
        
        // Update visuals based on type
        if (this.config.type === 'laser') {
            this.updateLaserVisual(delta);
        } else if (this.config.type === 'missile') {
            this.updateMissileVisual(delta);
        }
        
        // TODO: Add collision detection here
        
        return false; // Projectile stays alive
    }
    
    updateLaserVisual(delta) {
        if (this.visualMesh) {
            // Optional: Add some visual effects like pulsing
            const pulseFactor = 0.9 + 0.2 * Math.sin(this.age * 15);
            this.visualMesh.scale.set(pulseFactor, pulseFactor, 1);
        }
    }
    
    updateMissileVisual(delta) {
        if (this.thruster) {
            // Make the thruster flicker slightly
            const flickerFactor = 0.8 + 0.4 * Math.random();
            this.thruster.material.opacity = 0.7 * flickerFactor;
            
            // Random slight directional adjustments for more realistic missile flight
            if (Math.random() > 0.9) {
                const randomAdjustment = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1,
                    0
                );
                
                this.velocity.add(randomAdjustment).normalize().multiplyScalar(this.config.speed);
                
                // Update orientation to match velocity
                this.lookAt(this.position.clone().add(this.velocity));
            }
        }
    }
    
    explode() {
        // TODO: Create explosion effect when projectile hits something
        return true; // Indicate projectile is destroyed
    }
} 