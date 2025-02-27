import * as THREE from 'three';
import { VoxelModel } from '../utils/VoxelModel.js';
import { Weapon } from '../components/Weapon.js';

export class AlienShip extends THREE.Object3D {
    constructor(config) {
        super();
        
        this.config = Object.assign({
            type: 'standard', // 'standard', 'elite', 'boss'
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            speed: 30,
            health: 100,
            scene: null
        }, config);
        
        // Set properties based on ship type
        this.initShipProperties();
        
        // Set initial position and rotation
        this.position.copy(this.config.position);
        this.rotation.copy(this.config.rotation);
        
        // Create the ship
        this.createShip();
        
        // Set up physics properties
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.targetPosition = null;
        this.isAggressive = false;
        this.detectionRadius = 300;
        this.aggroRadius = 200;
        this.cooldownTimer = 0;
        
        // Add to scene
        if (this.config.scene) {
            this.config.scene.add(this);
        }
    }
    
    initShipProperties() {
        // Set properties based on ship type
        switch(this.config.type) {
            case 'elite':
                this.speed = 40;
                this.health = 150;
                this.damage = 20;
                this.shootingRange = 150;
                this.shootingInterval = 1.5;
                break;
            case 'boss':
                this.speed = 25;
                this.health = 500;
                this.damage = 40;
                this.shootingRange = 200;
                this.shootingInterval = 1.0;
                break;
            case 'standard':
            default:
                this.speed = this.config.speed;
                this.health = this.config.health;
                this.damage = 10;
                this.shootingRange = 100;
                this.shootingInterval = 2.0;
                break;
        }
        
        // Set maximum values
        this.maxHealth = this.health;
    }
    
    createShip() {
        // Create different ship designs based on type
        switch(this.config.type) {
            case 'elite':
                this.createEliteShip();
                break;
            case 'boss':
                this.createBossShip();
                break;
            case 'standard':
            default:
                this.createStandardShip();
                break;
        }
        
        // Initialize weapons
        this.initWeapons();
        
        // Add engine effects
        this.createEngineEffects();
    }
    
    createStandardShip() {
        // Create a standard alien ship
        const shipBlocks = [
            // Main body
            { position: [0, 0, 0], size: [6, 2, 8], color: 0x559933 },
            
            // Wings
            { position: [-4, 0, -1], size: [3, 1, 4], color: 0x559933 },
            { position: [4, 0, -1], size: [3, 1, 4], color: 0x559933 },
            
            // Cockpit
            { position: [0, 1, 2], size: [3, 1, 2], color: 0xaaffaa },
            
            // Engines
            { position: [-2, 0, -4], size: [1, 1, 2], color: 0xaaaa33 },
            { position: [2, 0, -4], size: [1, 1, 2], color: 0xaaaa33 },
            
            // Weapons
            { position: [-3, 0, 1], size: [1, 1, 3], color: 0xaaaa33 },
            { position: [3, 0, 1], size: [1, 1, 3], color: 0xaaaa33 }
        ];
        
        this.shipModel = new VoxelModel({
            design: shipBlocks
        });
        
        this.add(this.shipModel);
    }
    
    createEliteShip() {
        // Create a more powerful elite alien ship
        const shipBlocks = [
            // Main body
            { position: [0, 0, 0], size: [8, 3, 10], color: 0x9933aa },
            
            // Wings
            { position: [-6, 0, -2], size: [4, 2, 6], color: 0x9933aa },
            { position: [6, 0, -2], size: [4, 2, 6], color: 0x9933aa },
            
            // Cockpit
            { position: [0, 2, 3], size: [4, 2, 3], color: 0xffaaff },
            
            // Engines
            { position: [-3, 0, -5], size: [2, 2, 3], color: 0xaaaa33 },
            { position: [3, 0, -5], size: [2, 2, 3], color: 0xaaaa33 },
            
            // Weapons
            { position: [-4, 1, 2], size: [2, 1, 4], color: 0xaaaa33 },
            { position: [4, 1, 2], size: [2, 1, 4], color: 0xaaaa33 },
            { position: [0, -1, 4], size: [2, 2, 5], color: 0xaaaa33 }
        ];
        
        this.shipModel = new VoxelModel({
            design: shipBlocks
        });
        
        this.add(this.shipModel);
    }
    
    createBossShip() {
        // Create a massive boss alien ship
        const shipBlocks = [
            // Main body
            { position: [0, 0, 0], size: [12, 5, 20], color: 0xff3333 },
            
            // Wings
            { position: [-10, 0, -5], size: [8, 3, 10], color: 0xff3333 },
            { position: [10, 0, -5], size: [8, 3, 10], color: 0xff3333 },
            
            // Cockpit
            { position: [0, 3, 5], size: [6, 3, 5], color: 0xffaaaa },
            
            // Engines
            { position: [-5, 0, -10], size: [3, 3, 5], color: 0xffaa33 },
            { position: [5, 0, -10], size: [3, 3, 5], color: 0xffaa33 },
            { position: [0, 0, -10], size: [3, 3, 5], color: 0xffaa33 },
            
            // Weapons
            { position: [-7, 2, 5], size: [3, 2, 6], color: 0xff5533 },
            { position: [7, 2, 5], size: [3, 2, 6], color: 0xff5533 },
            { position: [-4, -2, 6], size: [2, 2, 8], color: 0xff5533 },
            { position: [4, -2, 6], size: [2, 2, 8], color: 0xff5533 },
            { position: [0, -3, 8], size: [4, 2, 10], color: 0xff5533 }
        ];
        
        this.shipModel = new VoxelModel({
            design: shipBlocks,
            scale: 1.5
        });
        
        this.add(this.shipModel);
    }
    
    initWeapons() {
        // Primary weapon color based on ship type
        let weaponColor;
        
        switch(this.config.type) {
            case 'elite':
                weaponColor = 0xff00ff;
                break;
            case 'boss':
                weaponColor = 0xff0000;
                break;
            case 'standard':
            default:
                weaponColor = 0x00ff00;
                break;
        }
        
        // Create appropriate weapon based on ship type
        this.weapon = new Weapon({
            type: 'laser',
            damage: this.damage,
            cooldown: this.shootingInterval,
            speed: 400,
            color: weaponColor,
            size: 0.5,
            scene: this.config.scene
        });
    }
    
    createEngineEffects() {
        // Create engine glow materials
        const engineGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0x77ff00,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        // Engine positions depend on ship type
        let enginePositions = [];
        
        switch(this.config.type) {
            case 'elite':
                enginePositions = [
                    { x: -3, y: 0, z: -6 },
                    { x: 3, y: 0, z: -6 }
                ];
                break;
            case 'boss':
                enginePositions = [
                    { x: -5, y: 0, z: -12 },
                    { x: 0, y: 0, z: -12 },
                    { x: 5, y: 0, z: -12 }
                ];
                break;
            case 'standard':
            default:
                enginePositions = [
                    { x: -2, y: 0, z: -5 },
                    { x: 2, y: 0, z: -5 }
                ];
                break;
        }
        
        // Create engine glows
        this.engineGlows = [];
        
        enginePositions.forEach(pos => {
            const engineGlow = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1.5),
                engineGlowMaterial.clone()
            );
            engineGlow.position.set(pos.x, pos.y, pos.z);
            this.add(engineGlow);
            this.engineGlows.push(engineGlow);
        });
    }
    
    update(delta, playerShip = null) {
        // Update cooldown timer
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= delta;
        }
        
        // Update AI behavior
        if (playerShip) {
            this.updateAI(delta, playerShip);
        } else {
            // Random movement if no player is specified
            this.updateRandomMovement(delta);
        }
        
        // Update position based on velocity
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // Update engine effects
        this.updateEngineEffects(delta);
        
        // Update weapons
        if (this.weapon) {
            this.weapon.update(delta, this);
        }
    }
    
    updateAI(delta, playerShip) {
        // Calculate distance to player
        const distanceToPlayer = this.position.distanceTo(playerShip.position);
        
        // If player is within detection radius
        if (distanceToPlayer < this.detectionRadius) {
            // Look at player
            this.lookAt(playerShip.position);
            
            // Set aggressive if player is within aggro radius
            this.isAggressive = distanceToPlayer < this.aggroRadius;
            
            if (this.isAggressive) {
                // Move towards player if too far
                if (distanceToPlayer > this.shootingRange) {
                    // Calculate direction to player
                    const direction = new THREE.Vector3()
                        .subVectors(playerShip.position, this.position)
                        .normalize();
                    
                    // Set velocity towards player
                    this.velocity.copy(direction.multiplyScalar(this.speed));
                } else {
                    // Slow down and orbit if in shooting range
                    this.velocity.multiplyScalar(0.9);
                    
                    // Add some random movement to make it harder to hit
                    this.velocity.x += (Math.random() - 0.5) * 5;
                    this.velocity.y += (Math.random() - 0.5) * 5;
                    this.velocity.z += (Math.random() - 0.5) * 5;
                    
                    // Shoot at player if cooldown is ready
                    if (this.cooldownTimer <= 0) {
                        this.fireAtTarget(playerShip.position);
                    }
                }
            } else {
                // Just track the player but don't approach
                this.velocity.multiplyScalar(0.95);
            }
        } else {
            // Player out of range, continue random movement
            this.isAggressive = false;
            this.updateRandomMovement(delta);
        }
    }
    
    updateRandomMovement(delta) {
        // If no target position or we've reached it, pick a new random destination
        if (!this.targetPosition || this.position.distanceTo(this.targetPosition) < 10) {
            this.selectRandomTarget();
        }
        
        // Move towards target position
        if (this.targetPosition) {
            const direction = new THREE.Vector3()
                .subVectors(this.targetPosition, this.position)
                .normalize();
            
            // Set velocity (slower than when chasing player)
            this.velocity.copy(direction.multiplyScalar(this.speed * 0.5));
            
            // Look in the direction of movement
            this.lookAt(this.targetPosition);
        }
    }
    
    selectRandomTarget() {
        // Pick a random point within a reasonable range
        const range = 500;
        this.targetPosition = new THREE.Vector3(
            this.position.x + (Math.random() - 0.5) * range,
            this.position.y + (Math.random() - 0.5) * range,
            this.position.z + (Math.random() - 0.5) * range
        );
    }
    
    updateEngineEffects(delta) {
        // Make engines pulse
        const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
        const enginePower = 0.5 + 0.5 * (this.velocity.length() / this.speed) * pulseIntensity;
        
        // Update all engine glows
        this.engineGlows.forEach(glow => {
            glow.material.opacity = 0.4 + enginePower * 0.6;
            const glowScale = 0.8 + enginePower * 0.4;
            glow.scale.set(glowScale, glowScale, 1 + enginePower * 1.5);
        });
    }
    
    fireAtTarget(targetPosition) {
        if (this.weapon && this.cooldownTimer <= 0) {
            // Look at target
            this.lookAt(targetPosition);
            
            // Reset cooldown timer
            this.cooldownTimer = this.shootingInterval;
            
            // Fire weapon
            return this.weapon.fire(this);
        }
        
        return false;
    }
    
    takeDamage(amount) {
        // Reduce health
        this.health = Math.max(0, this.health - amount);
        
        // Visual feedback
        this.flash(0xff0000, 0.3);
        
        // Check if destroyed
        if (this.health <= 0) {
            this.explode();
            return true;
        }
        
        // Become aggressive when hit
        this.isAggressive = true;
        
        return false;
    }
    
    flash(color, duration = 0.3) {
        // Flash the ship model as visual feedback
        const originalMaterials = [];
        
        // Store original materials and set flash material
        this.shipModel.traverse(child => {
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
    
    explode() {
        // Create explosion effect
        if (this.config.scene) {
            // Create explosion particles
            const numParticles = 20 + Math.floor(Math.random() * 30);
            const explosionColor = this.config.type === 'boss' ? 0xff5500 : 0x88ff44;
            
            for (let i = 0; i < numParticles; i++) {
                const size = 0.5 + Math.random() * 1.5;
                const geometry = new THREE.BoxGeometry(size, size, size);
                const material = new THREE.MeshBasicMaterial({
                    color: explosionColor,
                    transparent: true,
                    opacity: 0.8
                });
                
                const particle = new THREE.Mesh(geometry, material);
                
                // Position particle at ship's position with slight random offset
                particle.position.copy(this.position);
                particle.position.x += (Math.random() - 0.5) * 5;
                particle.position.y += (Math.random() - 0.5) * 5;
                particle.position.z += (Math.random() - 0.5) * 5;
                
                // Give particle random velocity
                const velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 50,
                    (Math.random() - 0.5) * 50,
                    (Math.random() - 0.5) * 50
                );
                
                this.config.scene.add(particle);
                
                // Animate particle
                const startTime = Date.now();
                const duration = 1000 + Math.random() * 1000;
                
                const animateParticle = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = elapsed / duration;
                    
                    if (progress >= 1) {
                        this.config.scene.remove(particle);
                        return;
                    }
                    
                    // Move particle
                    particle.position.add(velocity.clone().multiplyScalar(0.016)); // Approx for delta
                    
                    // Shrink and fade particle
                    const scale = 1 - progress;
                    particle.scale.set(scale, scale, scale);
                    particle.material.opacity = 0.8 * (1 - progress);
                    
                    // Slow down velocity over time
                    velocity.multiplyScalar(0.98);
                    
                    requestAnimationFrame(animateParticle);
                };
                
                animateParticle();
            }
        }
        
        // Remove the ship
        if (this.parent) {
            this.parent.remove(this);
        }
    }
    
    onCollision(otherObject) {
        // Handle collision with other objects
        if (otherObject.name === 'projectile') {
            // Take damage from projectiles
            this.takeDamage(otherObject.damage || 10);
        } else if (otherObject.name === 'player') {
            // Collided with player
            this.takeDamage(50);
        }
    }
} 