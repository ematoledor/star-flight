import * as THREE from 'three';

export class CombatSystem {
    constructor(scene, physicsSystem) {
        this.scene = scene;
        this.physicsSystem = physicsSystem;
        this.playerShip = null;
        this.targets = [];
        this.currentTargetIndex = -1;
        this.currentTarget = null;
        this.maxTargetingDistance = 3000; // Maximum distance to auto-target
        this.weaponTypes = this.initializeWeaponTypes();
        this.effectsPool = this.initializeEffectsPool();
    }
    
    /**
     * Set the player's spacecraft reference
     * @param {Object} spacecraft - The player's spacecraft
     */
    setPlayerShip(spacecraft) {
        this.playerShip = spacecraft;
    }
    
    /**
     * Initialize predefined weapon types 
     * @returns {Object} Dictionary of weapon types
     */
    initializeWeaponTypes() {
        return {
            laser: {
                name: 'Laser Cannon',
                damage: 10,
                speed: 500,
                cooldown: 0.2,
                energyCost: 5,
                color: 0xff0000,
                size: 2.5,
                lifespan: 3.0,
                sound: 'laser',
                effectType: 'beam',
                projectileCount: 1
            },
            dualLaser: {
                name: 'Dual Laser',
                damage: 7,
                speed: 500,
                cooldown: 0.15,
                energyCost: 8,
                color: 0xff3300,
                size: 2,
                lifespan: 3.0,
                sound: 'dualLaser',
                effectType: 'beam',
                projectileCount: 2,
                spread: 0.1
            },
            plasma: {
                name: 'Plasma Cannon',
                damage: 25,
                speed: 300,
                cooldown: 0.5,
                energyCost: 15,
                color: 0x00ffff,
                size: 3,
                lifespan: 4.0,
                sound: 'plasma',
                effectType: 'energy',
                projectileCount: 1
            },
            missile: {
                name: 'Homing Missile',
                damage: 50,
                speed: 200,
                acceleration: 50,
                cooldown: 2.0,
                energyCost: 25,
                color: 0xffff00,
                size: 3,
                lifespan: 8.0,
                sound: 'missile',
                effectType: 'missile',
                homing: true,
                homingStrength: 0.1,
                blastRadius: 50
            },
            railgun: {
                name: 'Railgun',
                damage: 100,
                speed: 1000,
                cooldown: 3.0,
                energyCost: 50,
                color: 0x0088ff,
                size: 4,
                lifespan: 2.0,
                sound: 'railgun',
                effectType: 'beam',
                penetrating: true
            },
            ionCannon: {
                name: 'Ion Cannon',
                damage: 15,
                speed: 400,
                cooldown: 0.4,
                energyCost: 12,
                color: 0x8800ff,
                size: 3,
                lifespan: 3.5,
                sound: 'ion',
                effectType: 'energy',
                statusEffect: {
                    type: 'stun',
                    duration: 2.0
                }
            }
        };
    }
    
    /**
     * Initialize pool of reusable visual effects
     * @returns {Object} Pool of effects
     */
    initializeEffectsPool() {
        const pools = {
            explosions: [],
            impacts: [],
            trails: []
        };
        
        // Pre-create some explosion effects for reuse
        for (let i = 0; i < 20; i++) {
            pools.explosions.push(this.createExplosionEffect());
        }
        
        // Pre-create impact effects
        for (let i = 0; i < 30; i++) {
            pools.impacts.push(this.createImpactEffect());
        }
        
        return pools;
    }
    
    /**
     * Create reusable explosion effect
     * @returns {Object} Explosion effect object
     */
    createExplosionEffect() {
        // Create a particle system for explosion
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        // Set particle positions and colors
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            // Orange to red gradient
            colors[i * 3] = 1.0;  // R
            colors[i * 3 + 1] = 0.5 * Math.random();  // G
            colors[i * 3 + 2] = 0;  // B
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 4,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.visible = false;
        this.scene.add(particleSystem);
        
        // Add light for illumination
        const light = new THREE.PointLight(0xff7700, 1, 100);
        light.visible = false;
        this.scene.add(light);
        
        return {
            particleSystem: particleSystem,
            light: light,
            inUse: false,
            lifetime: 0,
            maxLifetime: 1.0,
            particleVelocities: []
        };
    }
    
    /**
     * Create reusable impact effect
     * @returns {Object} Impact effect object
     */
    createImpactEffect() {
        // Create a single-burst spark effect
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: null,  // Will be set when needed
                color: 0xffffff,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 1
            })
        );
        
        sprite.scale.set(10, 10, 1);
        sprite.visible = false;
        this.scene.add(sprite);
        
        return {
            sprite: sprite,
            inUse: false,
            lifetime: 0,
            maxLifetime: 0.3
        };
    }
    
    /**
     * Fire a weapon from the given object
     * @param {Object} source - The object firing the weapon
     * @param {string} weaponType - Type of weapon to fire
     * @param {THREE.Vector3} direction - Direction to fire in
     */
    fireWeapon(source, weaponType, direction) {
        if (!source || !weaponType) return;
        
        // Get weapon properties
        const weapon = this.weaponTypes[weaponType];
        if (!weapon) return;
        
        // Check if weapon is on cooldown
        if (source.weaponCooldowns && source.weaponCooldowns[weaponType] > 0) {
            return;
        }
        
        // Check energy cost
        if (source.energy !== undefined && source.energy < weapon.energyCost) {
            // Not enough energy
            if (source === this.playerShip) {
                // Player feedback for no energy
                console.log("Not enough energy!");
                // TODO: Add UI feedback
            }
            return;
        }
        
        // Set weapon on cooldown
        if (!source.weaponCooldowns) {
            source.weaponCooldowns = {};
        }
        source.weaponCooldowns[weaponType] = weapon.cooldown;
        
        // Deduct energy cost
        if (source.energy !== undefined) {
            source.energy -= weapon.energyCost;
        }
        
        // Normalize direction
        direction.normalize();
        
        // Handle multiple projectiles (e.g., spread weapons)
        const projectileCount = weapon.projectileCount || 1;
        
        for (let i = 0; i < projectileCount; i++) {
            // Create projectile with variation if it's a multi-projectile weapon
            let projectileDirection = direction.clone();
            
            if (projectileCount > 1 && weapon.spread) {
                // Apply spread angle
                const spreadAngle = (i / (projectileCount - 1) - 0.5) * weapon.spread;
                projectileDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
            }
            
            // Determine projectile position offset based on spread
            const offsetDistance = (projectileCount > 1) ? 5 : 0;
            const offsetDirection = new THREE.Vector3(0, 1, 0).cross(projectileDirection).normalize();
            const offset = offsetDirection.multiplyScalar((i / (projectileCount - 1) - 0.5) * offsetDistance * 2);
            
            // Create projectile
            const projectile = this.createProjectile(
                source,
                weapon,
                source.position.clone().add(projectileDirection.clone().multiplyScalar(10)).add(offset),
                projectileDirection
            );
            
            // Add to physics system
            if (this.physicsSystem) {
                this.physicsSystem.addProjectile(projectile);
                
                // Set collision group
                if (source === this.playerShip) {
                    projectile.collisionGroup = this.physicsSystem.collisionGroups.projectile;
                } else {
                    projectile.collisionGroup = this.physicsSystem.collisionGroups.alien;
                }
            }
            
            // For missiles, set target
            if (weapon.homing && this.currentTarget) {
                projectile.homingTarget = this.currentTarget;
            }
        }
        
        // Play sound effect if available
        if (weapon.sound && source.playSound) {
            source.playSound(weapon.sound);
        }
    }
    
    /**
     * Create a projectile
     * @param {Object} source - Object that fired the projectile
     * @param {Object} weapon - Weapon type configuration
     * @param {THREE.Vector3} position - Starting position
     * @param {THREE.Vector3} direction - Direction of travel
     * @returns {Object} The created projectile
     */
    createProjectile(source, weapon, position, direction) {
        // Create geometry based on weapon type
        let geometry, material;
        
        switch (weapon.effectType) {
            case 'beam':
                geometry = new THREE.CylinderGeometry(0.5, 0.5, weapon.size * 4, 8);
                geometry.rotateX(Math.PI / 2); // Orient correctly
                material = new THREE.MeshBasicMaterial({
                    color: weapon.color,
                    transparent: true,
                    opacity: 0.8
                });
                break;
                
            case 'energy':
                geometry = new THREE.SphereGeometry(weapon.size, 8, 8);
                material = new THREE.MeshBasicMaterial({
                    color: weapon.color,
                    transparent: true,
                    opacity: 0.7
                });
                break;
                
            case 'missile':
                geometry = new THREE.ConeGeometry(weapon.size / 2, weapon.size * 2, 8);
                geometry.rotateX(Math.PI / 2); // Orient correctly
                material = new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    emissive: 0x555555
                });
                break;
                
            default:
                geometry = new THREE.SphereGeometry(weapon.size, 8, 8);
                material = new THREE.MeshBasicMaterial({
                    color: weapon.color
                });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        
        // Create point light for glow
        const light = new THREE.PointLight(weapon.color, 1, weapon.size * 10);
        mesh.add(light);
        
        this.scene.add(mesh);
        
        // Create projectile object with physics properties
        const projectile = {
            mesh: mesh,
            position: mesh.position,
            velocity: direction.clone().multiplyScalar(weapon.speed),
            acceleration: weapon.acceleration || 0,
            lifespan: weapon.lifespan,
            damage: weapon.damage,
            owner: source,
            createdTime: Date.now(),
            weapon: weapon,
            
            // Physics properties
            collisionRadius: weapon.size,
            
            // Method to check if projectile has expired
            hasExpired: function() {
                return (Date.now() - this.createdTime) / 1000 > this.lifespan;
            },
            
            // Update method
            update: function(delta) {
                // If it's a homing projectile, adjust direction
                if (weapon.homing && this.homingTarget && this.homingTarget.position) {
                    const targetDir = new THREE.Vector3().subVectors(
                        this.homingTarget.position,
                        this.position
                    ).normalize();
                    
                    // Gradually steer towards target
                    this.velocity.lerp(
                        targetDir.multiplyScalar(this.velocity.length()),
                        weapon.homingStrength * delta
                    );
                    
                    // Apply acceleration for missiles
                    if (this.acceleration) {
                        this.velocity.add(
                            this.velocity.clone().normalize().multiplyScalar(this.acceleration * delta)
                        );
                    }
                    
                    // Orient mesh to velocity direction
                    if (this.mesh) {
                        const dir = this.velocity.clone().normalize();
                        this.mesh.lookAt(this.position.clone().add(dir));
                    }
                }
                
                // Update position
                this.position.add(this.velocity.clone().multiplyScalar(delta));
                
                // Add visual effect for missiles
                if (weapon.effectType === 'missile') {
                    // Add engine glow and particle trail
                    const trailPosition = this.position.clone().sub(
                        this.velocity.clone().normalize().multiplyScalar(weapon.size)
                    );
                    
                    // TODO: Add trail effect here
                }
            },
            
            // Handle impact
            onHit: function(target) {
                // Apply damage
                if (target.takeDamage) {
                    const destroyed = target.takeDamage(this.damage);
                    
                    // Callback to owner if target destroyed
                    if (destroyed && this.owner && this.owner.onTargetDestroyed) {
                        this.owner.onTargetDestroyed(target);
                    }
                }
                
                // Create impact effect
                // TODO: Implement this
            },
            
            // Handle removal
            dispose: function() {
                if (this.mesh) {
                    this.scene.remove(this.mesh);
                    // Clean up geometry and materials
                    if (this.mesh.geometry) this.mesh.geometry.dispose();
                    if (this.mesh.material) this.mesh.material.dispose();
                }
            }
        };
        
        // Add reference to scene for cleanup
        projectile.scene = this.scene;
        
        return projectile;
    }
    
    /**
     * Find potential targets around the player
     */
    updateTargets() {
        if (!this.playerShip) return;
        
        this.targets = [];
        
        // Get all potential targets (enemy ships)
        this.scene.traverse(object => {
            if (object.userData && object.userData.type === 'alien') {
                const distance = object.position.distanceTo(this.playerShip.position);
                
                if (distance < this.maxTargetingDistance) {
                    this.targets.push({
                        object: object,
                        distance: distance
                    });
                }
            }
        });
        
        // Sort by distance
        this.targets.sort((a, b) => a.distance - b.distance);
        
        // Update current target if needed
        if (this.currentTargetIndex >= 0 && this.currentTargetIndex < this.targets.length) {
            this.currentTarget = this.targets[this.currentTargetIndex].object;
        } else {
            this.currentTarget = null;
            this.currentTargetIndex = -1;
        }
    }
    
    /**
     * Cycle to the next available target
     * @returns {Object|null} The new target or null if none available
     */
    cycleTarget() {
        if (this.targets.length === 0) {
            this.currentTarget = null;
            this.currentTargetIndex = -1;
            return null;
        }
        
        this.currentTargetIndex = (this.currentTargetIndex + 1) % this.targets.length;
        this.currentTarget = this.targets[this.currentTargetIndex].object;
        
        return this.currentTarget;
    }
    
    /**
     * Get the current target information including distance and direction
     * @returns {Object|null} Target information or null if no target
     */
    getCurrentTargetInfo() {
        if (!this.currentTarget || !this.playerShip) return null;
        
        const distance = this.currentTarget.position.distanceTo(this.playerShip.position);
        const direction = new THREE.Vector3().subVectors(
            this.currentTarget.position,
            this.playerShip.position
        ).normalize();
        
        return {
            target: this.currentTarget,
            distance: distance,
            direction: direction,
            inRange: distance < this.playerShip.weaponRange
        };
    }
    
    /**
     * Update cooldowns and manage projectiles
     * @param {number} delta - Time elapsed since last frame
     */
    update(delta) {
        // Update target list periodically
        this.updateTargets();
        
        // Update weapon cooldowns for player
        if (this.playerShip && this.playerShip.weaponCooldowns) {
            for (const weaponType in this.playerShip.weaponCooldowns) {
                if (this.playerShip.weaponCooldowns[weaponType] > 0) {
                    this.playerShip.weaponCooldowns[weaponType] -= delta;
                }
            }
        }
        
        // Update active effects
        this.updateEffects(delta);
    }
    
    /**
     * Update visual effects
     * @param {number} delta - Time elapsed since last frame
     */
    updateEffects(delta) {
        // Update explosion effects
        this.effectsPool.explosions.forEach(explosion => {
            if (explosion.inUse) {
                explosion.lifetime += delta;
                
                if (explosion.lifetime >= explosion.maxLifetime) {
                    // Reset explosion
                    explosion.inUse = false;
                    explosion.particleSystem.visible = false;
                    explosion.light.visible = false;
                } else {
                    // Update particles
                    const progress = explosion.lifetime / explosion.maxLifetime;
                    const positions = explosion.particleSystem.geometry.attributes.position.array;
                    
                    for (let i = 0; i < positions.length / 3; i++) {
                        positions[i * 3] += explosion.particleVelocities[i * 3] * delta;
                        positions[i * 3 + 1] += explosion.particleVelocities[i * 3 + 1] * delta;
                        positions[i * 3 + 2] += explosion.particleVelocities[i * 3 + 2] * delta;
                    }
                    
                    explosion.particleSystem.geometry.attributes.position.needsUpdate = true;
                    
                    // Fade out the material
                    explosion.particleSystem.material.opacity = 1 - progress;
                    
                    // Fade out the light
                    explosion.light.intensity = 3 * (1 - progress);
                }
            }
        });
        
        // Update impact effects
        this.effectsPool.impacts.forEach(impact => {
            if (impact.inUse) {
                impact.lifetime += delta;
                
                if (impact.lifetime >= impact.maxLifetime) {
                    // Reset impact
                    impact.inUse = false;
                    impact.sprite.visible = false;
                } else {
                    // Scale up and fade out
                    const progress = impact.lifetime / impact.maxLifetime;
                    const scale = 10 + progress * 20;
                    impact.sprite.scale.set(scale, scale, 1);
                    impact.sprite.material.opacity = 1 - progress;
                }
            }
        });
    }
    
    /**
     * Create explosion effect at the given position
     * @param {THREE.Vector3} position - Position for explosion
     * @param {number} size - Size of explosion
     * @param {number} color - Color of explosion
     */
    createExplosion(position, size = 20, color = 0xff5500) {
        // Find available explosion from pool
        const explosion = this.effectsPool.explosions.find(e => !e.inUse);
        if (!explosion) return;
        
        // Set explosion properties
        explosion.inUse = true;
        explosion.lifetime = 0;
        
        // Position effect
        explosion.particleSystem.position.copy(position);
        explosion.light.position.copy(position);
        
        // Set light properties
        explosion.light.color.setHex(color);
        explosion.light.intensity = 3;
        explosion.light.distance = size * 10;
        
        // Make visible
        explosion.particleSystem.visible = true;
        explosion.light.visible = true;
        
        // Set particle velocities
        const positions = explosion.particleSystem.geometry.attributes.position.array;
        explosion.particleVelocities = [];
        
        for (let i = 0; i < positions.length / 3; i++) {
            // Reset particle position to center
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            // Random velocity in sphere
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2, 
                (Math.random() - 0.5) * 2
            ).normalize().multiplyScalar(size * (0.5 + Math.random() * 0.5));
            
            explosion.particleVelocities.push(velocity.x, velocity.y, velocity.z);
        }
        
        explosion.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * Create impact effect at the given position
     * @param {THREE.Vector3} position - Position for impact
     * @param {THREE.Vector3} normal - Surface normal for orientation
     * @param {number} color - Color of impact
     */
    createImpact(position, normal = new THREE.Vector3(0, 1, 0), color = 0xffff00) {
        // Find available impact from pool
        const impact = this.effectsPool.impacts.find(i => !i.inUse);
        if (!impact) return;
        
        // Set impact properties
        impact.inUse = true;
        impact.lifetime = 0;
        
        // Position effect
        impact.sprite.position.copy(position);
        
        // Orient to normal
        impact.sprite.lookAt(position.clone().add(normal));
        
        // Set material properties
        impact.sprite.material.color.setHex(color);
        impact.sprite.material.opacity = 1;
        
        // Reset scale
        impact.sprite.scale.set(10, 10, 1);
        
        // Make visible
        impact.sprite.visible = true;
    }
    
    /**
     * Reset the combat system to its initial state
     */
    reset() {
        // Clear targets
        this.targets = [];
        this.currentTargetIndex = -1;
        this.currentTarget = null;
        
        // Clear any active weapons or effects
        // Reset any other combat system state
        
        console.log("Combat system reset");
    }
} 