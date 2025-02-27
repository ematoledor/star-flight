import * as THREE from 'three';
import { VoxelModel } from '../utils/VoxelModel.js';
import { Weapon } from '../components/Weapon.js';

export class Spacecraft extends THREE.Object3D {
    constructor(scene, camera) {
        super();
        
        this.scene = scene;
        this.camera = camera;
        
        // Spacecraft properties
        this.maxSpeed = 100;
        this.acceleration = 10;
        this.rotationSpeed = 1.5;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.health = 100;
        this.maxHealth = 100;
        this.ammo = 100;
        this.maxAmmo = 100;
        
        // Create spacecraft model
        this.createModel();
        
        // Add the spacecraft to the scene
        this.scene.add(this);
        
        // Initialize weapons
        this.initWeapons();
        
        // Set up camera
        this.setupCamera();
    }
    
    createModel() {
        // Minecraft-style voxel ship
        this.voxelModel = new VoxelModel({
            // Ship design (simplified structure)
            design: [
                // Body (main hull)
                { position: [0, 0, 0], size: [5, 2, 8], color: 0x3366cc },
                
                // Wings
                { position: [-4, 0, 0], size: [3, 1, 4], color: 0x3366cc },
                { position: [4, 0, 0], size: [3, 1, 4], color: 0x3366cc },
                
                // Cockpit
                { position: [0, 1, 2], size: [3, 1, 2], color: 0x88ccff },
                
                // Engines (thrusters)
                { position: [-2, 0, -4], size: [1, 1, 2], color: 0xcc3333 },
                { position: [2, 0, -4], size: [1, 1, 2], color: 0xcc3333 },
                
                // Weapons
                { position: [-3, 0, 2], size: [1, 1, 3], color: 0x999999 },
                { position: [3, 0, 2], size: [1, 1, 3], color: 0x999999 }
            ]
        });
        
        this.add(this.voxelModel);
        
        // Add engine glow effects
        this.createEngineEffects();
    }
    
    createEngineEffects() {
        // Create engine glow materials
        const engineGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff7700,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        // Left engine glow
        const leftEngineGlow = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.8, 1),
            engineGlowMaterial
        );
        leftEngineGlow.position.set(-2, 0, -5);
        this.add(leftEngineGlow);
        this.leftEngineGlow = leftEngineGlow;
        
        // Right engine glow
        const rightEngineGlow = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.8, 1),
            engineGlowMaterial
        );
        rightEngineGlow.position.set(2, 0, -5);
        this.add(rightEngineGlow);
        this.rightEngineGlow = rightEngineGlow;
    }
    
    initWeapons() {
        // Primary weapon (laser)
        this.primaryWeapon = new Weapon({
            type: 'laser',
            damage: 10,
            cooldown: 0.2,
            speed: 500,
            color: 0xff0000,
            size: 0.5,
            scene: this.scene
        });
        
        // Secondary weapon (missile)
        this.secondaryWeapon = new Weapon({
            type: 'missile',
            damage: 30,
            cooldown: 1,
            speed: 300,
            color: 0xffaa00,
            size: 1,
            scene: this.scene
        });
    }
    
    setupCamera() {
        // Third-person camera setup
        this.cameraRig = new THREE.Object3D();
        this.add(this.cameraRig);
        
        this.cameraRig.position.set(0, 5, -15);
        this.cameraRig.lookAt(this.position);
        
        // Allow the camera to be attached to this rig
        this.camera.position.copy(this.cameraRig.position);
        this.camera.lookAt(this.position);
    }
    
    update(delta) {
        // Update position based on velocity
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // Update camera position to follow the spacecraft
        this.camera.position.copy(this.worldToLocal(this.cameraRig.position));
        this.camera.lookAt(this.position);
        
        // Update engine glow effects
        this.updateEngineEffects(delta);
        
        // Update weapons
        this.primaryWeapon.update(delta, this);
        this.secondaryWeapon.update(delta, this);
    }
    
    updateEngineEffects(delta) {
        // Make engine glow pulse based on velocity
        const speed = this.velocity.length();
        const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
        const enginePower = Math.min(1, speed / this.maxSpeed) * pulseIntensity;
        
        // Update engine glow opacity
        this.leftEngineGlow.material.opacity = 0.3 + enginePower * 0.7;
        this.rightEngineGlow.material.opacity = 0.3 + enginePower * 0.7;
        
        // Scale engine glow based on speed
        const engineScale = 0.8 + enginePower * 0.4;
        this.leftEngineGlow.scale.set(engineScale, engineScale, 1 + enginePower * 2);
        this.rightEngineGlow.scale.set(engineScale, engineScale, 1 + enginePower * 2);
    }
    
    accelerate(direction, delta) {
        // Add acceleration in the direction the spacecraft is facing
        const accelerationVector = new THREE.Vector3(0, 0, -1)
            .applyQuaternion(this.quaternion)
            .multiplyScalar(this.acceleration * direction * delta);
            
        this.velocity.add(accelerationVector);
        
        // Cap the velocity at max speed
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
    }
    
    strafe(direction, delta) {
        // Add acceleration for strafing left/right
        const accelerationVector = new THREE.Vector3(1, 0, 0)
            .applyQuaternion(this.quaternion)
            .multiplyScalar(this.acceleration * 0.7 * direction * delta);
            
        this.velocity.add(accelerationVector);
        
        // Cap the velocity at max speed
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
    }
    
    rotate(axis, amount, delta) {
        // Rotate the spacecraft on different axes
        // axis: 'x', 'y', or 'z'
        const rotation = new THREE.Euler();
        rotation[axis] = amount * this.rotationSpeed * delta;
        this.rotateOnAxis(new THREE.Vector3(
            axis === 'x' ? 1 : 0,
            axis === 'y' ? 1 : 0,
            axis === 'z' ? 1 : 0
        ), rotation[axis]);
    }
    
    brake(delta) {
        // Apply braking (deceleration)
        if (this.velocity.length() > 0.1) {
            this.velocity.multiplyScalar(1 - 2 * delta);
        } else {
            this.velocity.set(0, 0, 0);
        }
    }
    
    boost(delta) {
        // Apply temporary speed boost
        this.accelerate(3, delta);
    }
    
    firePrimary() {
        return this.primaryWeapon.fire(this);
    }
    
    fireSecondary() {
        if (this.ammo > 0) {
            const fired = this.secondaryWeapon.fire(this);
            if (fired) {
                this.ammo--;
                return true;
            }
        }
        return false;
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        // Visual feedback for taking damage
        this.flash(0xff0000, 0.5);
        
        return this.health <= 0; // Return true if destroyed
    }
    
    flash(color, duration = 0.3) {
        // Flash the spacecraft model as visual feedback
        const originalMaterials = [];
        
        // Store original materials and set flash material
        this.voxelModel.traverse(child => {
            if (child.isMesh) {
                originalMaterials.push({
                    mesh: child,
                    material: child.material
                });
                
                child.material = new THREE.MeshBasicMaterial({
                    color: color
                });
            }
        });
        
        // Reset materials after duration
        setTimeout(() => {
            originalMaterials.forEach(item => {
                item.mesh.material = item.material;
            });
        }, duration * 1000);
    }
    
    repairDamage(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    replenishAmmo(amount) {
        this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
    }
} 