import * as THREE from 'three';
import { VoxelModel } from '../utils/VoxelModel.js';
import { Weapon } from '../components/Weapon.js';

export class Spacecraft extends THREE.Object3D {
    constructor(config) {
        super();
        
        // Extract configuration options
        this.scene = config.scene;
        this.camera = config.camera;
        this.physicsSystem = config.physicsSystem;
        
        // Spacecraft properties
        this.maxSpeed = 100;
        this.acceleration = 10;
        this.rotationSpeed = 1.5;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.health = 100;
        this.maxHealth = 100;
        this.ammo = 100;
        this.maxAmmo = 100;
        
        // Set initial position if provided
        if (config.position) {
            this.position.copy(config.position);
        }
        
        // Create spacecraft model
        this.createModel();
        
        // Add the spacecraft to the scene
        if (this.scene) {
            this.scene.add(this);
        } else {
            console.error("Scene is undefined in Spacecraft constructor");
        }
        
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
        
        // Add the pilot character
        this.createPilotCharacter();
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
        // Check if scene exists before initializing weapons
        if (!this.scene) {
            console.error("Scene is undefined in initWeapons");
            return;
        }
        
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
        // Check if camera exists before setting it up
        if (!this.camera) {
            console.error("Camera is undefined in setupCamera");
            return;
        }
        
        // Third-person camera setup
        this.cameraRig = new THREE.Object3D();
        this.add(this.cameraRig);
        
        // Store camera modes and positions
        this.cameraMode = 'third-person'; // 'first-person' or 'third-person'
        this.cameraPositions = {
            'third-person': new THREE.Vector3(0, 5, -15),
            'first-person': new THREE.Vector3(0, 1.5, 3),
            'cockpit': new THREE.Vector3(0, 1.5, 1.5),
            'external': new THREE.Vector3(0, 10, -25)
        };
        
        // Set initial camera position (third-person)
        this.cameraRig.position.copy(this.cameraPositions['third-person']);
        this.cameraRig.lookAt(this.position);
        
        // Allow the camera to be attached to this rig
        this.camera.position.copy(this.cameraRig.position);
        this.camera.lookAt(this.position);
        
        console.log(`Camera initialized in ${this.cameraMode} mode`);
    }
    
    update(delta) {
        try {
            // Update position based on velocity
            this.position.add(this.velocity.clone().multiplyScalar(delta));
            
            // Update camera position to follow the spacecraft
            if (this.camera && this.cameraRig) {
                try {
                    const worldPosition = new THREE.Vector3();
                    this.cameraRig.getWorldPosition(worldPosition);
                    this.camera.position.copy(worldPosition);
                    
                    // In first-person mode, look forward from the ship
                    // In third-person mode, look at the ship
                    if (this.cameraMode === 'first-person' || this.cameraMode === 'cockpit') {
                        // Get the forward direction of the spacecraft
                        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
                        const target = this.position.clone().add(forward.multiplyScalar(100));
                        this.camera.lookAt(target);
                    } else {
                        this.camera.lookAt(this.position);
                    }
                } catch (err) {
                    console.error("Error updating camera position:", err);
                }
            }
            
            // Update engine glow effects
            this.updateEngineEffects(delta);
            
            // Update weapons
            if (this.primaryWeapon) {
                this.primaryWeapon.update(delta, this);
            }
            
            if (this.secondaryWeapon) {
                this.secondaryWeapon.update(delta, this);
            }
            
            // Update pilot character animation if it exists
            if (this.pilotCharacter && this.pilotBobbing) {
                // Simple bobbing animation
                const bobbingHeight = 0.1;
                const bobbingSpeed = 2;
                this.pilotCharacter.position.y = 2.5 + Math.sin(Date.now() * 0.002 * bobbingSpeed + this.pilotBobbingOffset) * bobbingHeight;
                
                // Slight rotation
                this.pilotCharacter.rotation.y += delta * 0.2;
            }
        } catch (error) {
            console.error("Error in Spacecraft update:", error);
        }
    }
    
    // New method to switch camera views
    switchCameraMode(mode) {
        try {
            // Validate the requested mode
            if (!this.cameraPositions[mode]) {
                console.error(`Invalid camera mode: ${mode}`);
                return false;
            }
            
            // Store the previous mode
            const previousMode = this.cameraMode;
            this.cameraMode = mode;
            
            // Update camera position
            this.cameraRig.position.copy(this.cameraPositions[mode]);
            
            // Make spacecraft model visible/invisible based on camera mode
            if (this.voxelModel) {
                // In first-person or cockpit view, hide the spacecraft model
                this.voxelModel.visible = !(mode === 'first-person' || mode === 'cockpit');
            }
            
            console.log(`Camera switched from ${previousMode} to ${mode} mode`);
            return true;
        } catch (error) {
            console.error("Error switching camera mode:", error);
            return false;
        }
    }
    
    // Cycle through camera modes
    cycleCameraMode() {
        const modes = Object.keys(this.cameraPositions);
        const currentIndex = modes.indexOf(this.cameraMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        return this.switchCameraMode(modes[nextIndex]);
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
        // Note: In THREE.js, the default forward direction is negative Z
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        
        // Apply the spacecraft's current rotation to the forward vector
        // This ensures we move in the direction the spacecraft is actually facing
        const accelerationVector = forwardDirection
            .clone() // Clone to avoid modifying the original vector
            .applyQuaternion(this.quaternion)
            .multiplyScalar(this.acceleration * direction * delta);
            
        this.velocity.add(accelerationVector);
        
        // Cap the velocity at max speed
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
        
        // Debug info
        console.log("Moving spacecraft forward in direction:", 
            forwardDirection.clone().applyQuaternion(this.quaternion));
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
    
    reset() {
        // Reset spacecraft to initial state
        this.velocity.set(0, 0, 0);
        this.position.set(0, 0, 0);
        this.quaternion.set(0, 0, 0, 1); // Reset rotation
        
        // Reset health, ammo, etc.
        this.health = this.maxHealth;
        this.ammo = this.maxAmmo;
        
        // Reset any other properties that need resetting
        console.log("Spacecraft reset to initial state");
    }
    
    // New method to create the pilot character
    createPilotCharacter() {
        try {
            console.log("Creating pilot character...");
            
            // Create a group for the pilot
            this.pilotCharacter = new THREE.Group();
            
            // Create the main body - a white blob-like shape
            const bodyGeometry = new THREE.SphereGeometry(0.8, 8, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xFFFFFF,
                roughness: 0.7,
                metalness: 0.2
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            // Make it slightly egg-shaped
            body.scale.set(1, 1.2, 0.9);
            this.pilotCharacter.add(body);
            
            // Add colorful spots
            const spotColors = [
                0xFF5555, // red
                0x55FF55, // green
                0x5555FF, // blue
                0xFFAA00, // orange
                0xAA00FF  // purple
            ];
            
            // Create 8 random spots
            for (let i = 0; i < 8; i++) {
                const spotSize = 0.15 + Math.random() * 0.2;
                const spotGeometry = new THREE.SphereGeometry(spotSize, 6, 6);
                const spotMaterial = new THREE.MeshStandardMaterial({
                    color: spotColors[Math.floor(Math.random() * spotColors.length)],
                    roughness: 0.6,
                    metalness: 0.1
                });
                
                const spot = new THREE.Mesh(spotGeometry, spotMaterial);
                
                // Position randomly on the body surface
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                const radius = 0.8;
                
                spot.position.x = radius * Math.sin(phi) * Math.cos(theta);
                spot.position.y = radius * Math.sin(phi) * Math.sin(theta) * 1.2; // Adjust for egg shape
                spot.position.z = radius * Math.cos(phi) * 0.9; // Adjust for egg shape
                
                this.pilotCharacter.add(spot);
            }
            
            // Add a face
            const faceGroup = new THREE.Group();
            
            // Eyes (two black spheres)
            const eyeGeometry = new THREE.SphereGeometry(0.15, 6, 6);
            const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
            
            const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            leftEye.position.set(-0.25, 0.2, 0.7);
            faceGroup.add(leftEye);
            
            const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            rightEye.position.set(0.25, 0.2, 0.7);
            faceGroup.add(rightEye);
            
            // Simple smile
            const smileGeometry = new THREE.TorusGeometry(0.2, 0.05, 8, 8, Math.PI);
            const smileMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const smile = new THREE.Mesh(smileGeometry, smileMaterial);
            smile.position.set(0, -0.1, 0.7);
            smile.rotation.x = Math.PI / 2;
            faceGroup.add(smile);
            
            // Add the face to the character
            this.pilotCharacter.add(faceGroup);
            
            // Add a green spiral pattern (simplified)
            const spiralGeometry = new THREE.TorusGeometry(0.4, 0.08, 8, 16, Math.PI * 1.5);
            const spiralMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x00FF00,
                roughness: 0.5,
                metalness: 0.3,
                emissive: 0x003300
            });
            const spiral = new THREE.Mesh(spiralGeometry, spiralMaterial);
            spiral.position.set(0, 0, -0.2);
            spiral.rotation.x = Math.PI / 2;
            this.pilotCharacter.add(spiral);
            
            // Position the pilot on top of the ship
            this.pilotCharacter.position.set(0, 2.5, 1);
            this.pilotCharacter.scale.set(0.8, 0.8, 0.8);
            
            // Add to the ship
            this.add(this.pilotCharacter);
            
            // Add a simple animation
            this.pilotBobbing = true;
            this.pilotBobbingOffset = Math.random() * Math.PI * 2; // Random start phase
            
            console.log("Pilot character created successfully");
        } catch (error) {
            console.error("Error creating pilot character:", error);
        }
    }
} 