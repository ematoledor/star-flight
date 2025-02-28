import * as THREE from 'three';

export class PhysicsSystem {
    constructor() {
        this.objects = [];
        this.gravity = 0; // Zero gravity in space
        this.planets = []; // Will store planets and their gravitational influence
        this.projectiles = []; // Track projectiles separately for optimized collision detection
        this.collisionGroups = {
            spacecraft: 1,
            alien: 2,
            planet: 4,
            satellite: 8,
            projectile: 16
        };
    }
    
    addObject(object) {
        if (!this.objects.includes(object)) {
            this.objects.push(object);
            return true;
        }
        return false;
    }
    
    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index !== -1) {
            this.objects.splice(index, 1);
            return true;
        }
        return false;
    }
    
    addPlanet(planet) {
        if (!this.planets.includes(planet)) {
            this.planets.push(planet);
            return true;
        }
        return false;
    }
    
    addProjectile(projectile) {
        if (!this.projectiles.includes(projectile)) {
            this.projectiles.push(projectile);
            return true;
        }
        return false;
    }
    
    removeProjectile(projectile) {
        const index = this.projectiles.indexOf(projectile);
        if (index !== -1) {
            this.projectiles.splice(index, 1);
            return true;
        }
        return false;
    }
    
    update(delta) {
        try {
            // Apply gravity to all objects
        this.objects.forEach(object => {
                try {
                    // Skip objects without position
                    if (!object || !object.position) return;
                    
                    // Apply gravity
                this.applyPlanetaryGravity(object, delta);
                    
                    // Check for collisions
                    this.checkCollisions(object);
                } catch (error) {
                    console.error('PhysicsSystem: Error updating object', error);
                }
            });
            
            // Check projectile collisions
            this.checkProjectileCollisions();
            
            // Remove expired projectiles
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                
                if (!projectile) {
                    // Remove null projectiles
                    this.projectiles.splice(i, 1);
                    continue;
                }
                
                // Check if projectile is expired
                if (projectile.hasHit || Date.now() - projectile.createdAt > projectile.lifespan) {
                    this.removeProjectile(projectile);
                }
            }
        } catch (error) {
            console.error('PhysicsSystem: Error in physics update loop', error);
        }
    }
    
    applyPlanetaryGravity(object, delta) {
        // For each planet, calculate gravitational pull based on distance
        this.planets.forEach(planet => {
            const direction = new THREE.Vector3();
            direction.subVectors(planet.position, object.position);
            
            const distance = direction.length();
            
            // Skip if too far away
            if (distance > planet.gravityRadius) {
                return;
            }
            
            // Normalize direction
            direction.normalize();
            
            // Calculate force based on distance (inverse square law)
            // F = G * (m1 * m2) / r^2
            // Simplified with G * m1 * m2 = planet.gravityFactor
            const forceMagnitude = planet.gravityFactor / (distance * distance);
            
            // Convert to acceleration (F = ma, so a = F/m)
            // We'll assume mass = 1 for simplicity
            const acceleration = direction.multiplyScalar(forceMagnitude * delta);
            
            // Apply to object's velocity
            object.velocity.add(acceleration);
        });
    }
    
    checkProjectileCollisions() {
        // Optimized collision detection for projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Skip if projectile doesn't have necessary properties
            if (!projectile.position || !projectile.config) {
                continue;
            }
            
            // Create a smaller bounding sphere for more accurate detection
            const projectileBounds = new THREE.Sphere(
                projectile.position.clone(),
                projectile.config.size * 0.8
            );
            
            // Check against all physical objects
            let hasCollided = false;
            
            for (const object of this.objects) {
                // Skip objects without position
                if (!object.position) {
                    continue;
                }
                
                // Skip friendly fire if that logic exists
                if (projectile.owner && projectile.owner === object) {
                    continue;
                }
                
                // Skip based on collision groups
                if (projectile.collisionGroup && 
                    object.collisionGroup && 
                    !(projectile.collisionGroup & object.collisionGroup)) {
                    continue;
                }
                
                // Get object bounds
                const objectBounds = this.getBoundingBox(object);
                
                // Skip objects without bounds
                if (!objectBounds) {
                    continue;
                }
                
                // Convert Box3 to Sphere for faster initial check
                const objectCenterPoint = new THREE.Vector3();
                objectBounds.getCenter(objectCenterPoint);
                
                const objectRadius = objectBounds.max.distanceTo(objectBounds.min) / 2;
                const objectSphere = new THREE.Sphere(objectCenterPoint, objectRadius);
                
                // Fast sphere-sphere check
                if (projectileBounds.intersectsSphere(objectSphere)) {
                    // More accurate box check
                    const projectileBox = new THREE.Box3().setFromCenterAndSize(
                        projectile.position,
                        new THREE.Vector3(
                            projectile.config.size * 2,
                            projectile.config.size * 2,
                            projectile.config.size * 2
                        )
                    );
                    
                    if (projectileBox.intersectsBox(objectBounds)) {
                        // Handle collision
                        this.handleProjectileImpact(projectile, object);
                        hasCollided = true;
                        break;
                    }
                }
            }
            
            if (hasCollided) {
                // Physics system doesn't remove projectiles, just signals that they've hit
                projectile.hasHit = true;
            }
        }
    }
    
    handleProjectileImpact(projectile, object) {
        // Calculate damage based on projectile properties
        let damage = projectile.config.damage;
        
        // Apply damage if the object can take damage
        if (object.takeDamage) {
            const destroyed = object.takeDamage(damage);
            
            // Trigger explosion effect
            if (projectile.explode) {
                projectile.explode();
            }
            
            // Handle object destruction
            if (destroyed) {
                // Trigger any destruction effects the object might have
                if (object.onDestroyed) {
                    object.onDestroyed();
                }
            }
        }
    }
    
    checkCollisions(object) {
        try {
            // Skip if object is null or undefined
            if (!object) {
                return;
            }
            
            // Skip objects without position
            if (!object.position || !this.isValidVector(object.position)) {
                return;
            }
            
        const objectBounds = this.getBoundingBox(object);
        
        // Skip objects without bounding boxes
        if (!objectBounds) {
            return;
        }
        
        // Check against other physics objects
        this.objects.forEach(otherObject => {
                try {
                    // Skip self or null objects
                    if (!otherObject || otherObject === object) {
                        return;
                    }
                    
                    // Skip objects without position
                    if (!otherObject.position || !this.isValidVector(otherObject.position)) {
                        return;
                    }
                    
                    // Skip based on collision groups if defined
                    if (object.collisionGroup && 
                        otherObject.collisionGroup && 
                        !(object.collisionGroup & otherObject.collisionGroup)) {
                return;
            }
            
            const otherBounds = this.getBoundingBox(otherObject);
            
            // Skip objects without bounding boxes
            if (!otherBounds) {
                return;
            }
            
                    try {
            // Check for overlap
            if (this.checkBoundsOverlap(objectBounds, otherBounds)) {
                            // Calculate penetration depth for better collision response
                            const penetration = this.calculatePenetration(objectBounds, otherBounds);
                            
                // Collision detected!
                            this.handleCollision(object, otherObject, penetration);
                        }
                    } catch (error) {
                        console.warn('PhysicsSystem: Error checking bounds overlap', error);
                    }
                } catch (error) {
                    console.warn('PhysicsSystem: Error in collision check with object', error);
                }
            });
        } catch (error) {
            console.warn('PhysicsSystem: Error in checkCollisions', error);
        }
    }
    
    calculatePenetration(bounds1, bounds2) {
        try {
            // Validate bounds
            if (!bounds1 || !bounds2) {
                return new THREE.Vector3();
            }
            
            // Additional validation to ensure required methods exist
            if (typeof bounds1.getCenter !== 'function' || typeof bounds2.getCenter !== 'function') {
                console.warn('PhysicsSystem: Invalid bounding boxes for penetration calculation');
                return new THREE.Vector3();
            }
            
            // Calculate the penetration vector to push objects apart
            const center1 = new THREE.Vector3();
            bounds1.getCenter(center1);
            
            const center2 = new THREE.Vector3();
            bounds2.getCenter(center2);
            
            // Safety check for both centers
            if (!this.isValidVector(center1) || !this.isValidVector(center2)) {
                return new THREE.Vector3();
            }
            
            // Direction from bounds2 to bounds1
            const direction = new THREE.Vector3().subVectors(center1, center2);
            
            // Avoid normalizing zero-length vectors
            if (direction.lengthSq() === 0) {
                return new THREE.Vector3(0, 0.1, 0); // Default slight upward push if centers overlap
            }
            
            direction.normalize();
            
            // Calculate size along each axis
            const size1 = new THREE.Vector3();
            const size2 = new THREE.Vector3();
            
            if (this.isValidVector(bounds1.max) && this.isValidVector(bounds1.min)) {
                size1.subVectors(bounds1.max, bounds1.min).multiplyScalar(0.5);
            } else {
                size1.set(1, 1, 1); // Default size
            }
            
            if (this.isValidVector(bounds2.max) && this.isValidVector(bounds2.min)) {
                size2.subVectors(bounds2.max, bounds2.min).multiplyScalar(0.5);
            } else {
                size2.set(1, 1, 1); // Default size
            }
            
            // Total distance between centers
            const totalDist = center1.distanceTo(center2);
            
            // Approximate the penetration depth (not perfect but works for our needs)
            const minDist = size1.length() + size2.length();
            const penetrationDepth = Math.max(0, minDist - totalDist);
            
            // Return penetration vector
            return direction.multiplyScalar(penetrationDepth);
        } catch (error) {
            console.warn('PhysicsSystem: Error calculating penetration', error);
            return new THREE.Vector3();
        }
    }
    
    // Helper function to validate vector coordinates
    isValidVector(vec) {
        if (!vec) return false;
        return !isNaN(vec.x) && !isNaN(vec.y) && !isNaN(vec.z) && 
               isFinite(vec.x) && isFinite(vec.y) && isFinite(vec.z);
    }
    
    getBoundingBox(object) {
        // Ensure we have a valid object
        if (!object) {
            console.warn('PhysicsSystem: Attempted to get bounding box of undefined object');
            return null;
        }
        
        // If object has a custom collision bounds, use that
        if (object.getCollisionBounds) {
            try {
                const bounds = object.getCollisionBounds();
                if (bounds) return bounds;
            } catch (error) {
                console.warn('PhysicsSystem: Error getting collision bounds', error);
            }
        }
        
        // If it has a bounding box already calculated, use that
        if (object.boundingBox) {
            return object.boundingBox;
        }
        
        // If it's a THREE.Object3D with geometry, calculate bounding box
        if (object.geometry) {
            try {
            if (!object.geometry.boundingBox) {
                object.geometry.computeBoundingBox();
            }
            
            const bbox = object.geometry.boundingBox.clone();
            bbox.applyMatrix4(object.matrixWorld);
            
            return bbox;
            } catch (error) {
                console.warn('PhysicsSystem: Error computing bounding box from geometry', error);
            }
        }
        
        // For other objects, we'll need to compute from children
        if (object.children && object.children.length > 0) {
            try {
            // Create a bounding box from all children
            const bbox = new THREE.Box3();
            
            // Initialize with first child that has a bounding box
            let initialized = false;
            
            // Iterate through children
            object.traverse(child => {
                    // Safety check for child and its geometry
                    if (!child || !child.geometry) return;
                    
                    try {
                    if (!child.geometry.boundingBox) {
                        child.geometry.computeBoundingBox();
                    }
                    
                    const childBox = child.geometry.boundingBox.clone();
                    childBox.applyMatrix4(child.matrixWorld);
                    
                    if (!initialized) {
                        bbox.copy(childBox);
                        initialized = true;
                    } else {
                        bbox.union(childBox);
                    }
                    } catch (error) {
                        console.warn('PhysicsSystem: Error processing child geometry', error);
                }
            });
            
            if (initialized) {
                return bbox;
                }
            } catch (error) {
                console.warn('PhysicsSystem: Error computing bounding box from children', error);
            }
        }
        
        // Default to a small sphere around object's position
        try {
            // Verify position exists before using it
            if (!object.position) {
                console.warn('PhysicsSystem: Object missing position property');
                return null;
            }
            
            const position = object.position;
        const radius = object.collisionRadius || 1;
        
        const bbox = new THREE.Box3();
        bbox.setFromCenterAndSize(
            position,
            new THREE.Vector3(radius * 2, radius * 2, radius * 2)
        );
        
        return bbox;
        } catch (error) {
            console.warn('PhysicsSystem: Error creating default bounding box', error);
            return null;
        }
    }
    
    checkBoundsOverlap(bounds1, bounds2) {
        try {
            // Add null checks to prevent errors
            if (!bounds1 || !bounds2) {
                return false;
            }
            
            // Make sure both bounds have the required methods
            if (typeof bounds1.intersectsBox !== 'function') {
                console.warn('PhysicsSystem: bounds1 missing intersectsBox method');
                return false;
            }
            
            if (typeof bounds2.intersectsBox !== 'function') {
                console.warn('PhysicsSystem: bounds2 missing intersectsBox method');
                return false;
            }
            
            // Additional validation for bounds properties
            if (!this.isValidVector(bounds1.min) || !this.isValidVector(bounds1.max) || 
                !this.isValidVector(bounds2.min) || !this.isValidVector(bounds2.max)) {
                return false;
            }
            
        return bounds1.intersectsBox(bounds2);
        } catch (error) {
            console.warn('PhysicsSystem: Error in checkBoundsOverlap', error);
            return false;
        }
    }
    
    handleCollision(object1, object2, penetration) {
        try {
            // Skip if either object is null
            if (!object1 || !object2) {
                return;
            }
            
            // Get object types and properties
            const isSpacecraft = (obj) => obj.constructor && obj.constructor.name === 'Spacecraft';
            const isPlanet = (obj) => obj.constructor && obj.constructor.name === 'Planet';
            const isMothership = (obj) => obj.constructor && obj.constructor.name === 'Mothership';
            
            // Handle spacecraft-planet collisions
            if ((isSpacecraft(object1) && isPlanet(object2)) || (isSpacecraft(object2) && isPlanet(object1))) {
                const spacecraft = isSpacecraft(object1) ? object1 : object2;
                const planet = isSpacecraft(object1) ? object2 : object1;
                
                // Calculate direction from planet to spacecraft
                const direction = new THREE.Vector3().subVectors(
                    spacecraft.position,
                    planet.position
                ).normalize();
                
                // Calculate bounce factor (0.5 = moderate bounce)
                const bounceFactor = 0.5;
                
                // Calculate reflection of velocity
                const dot = spacecraft.velocity.dot(direction);
                const reflection = new THREE.Vector3().copy(direction).multiplyScalar(2 * dot);
                
                // Apply bounce effect
                spacecraft.velocity.sub(reflection).multiplyScalar(bounceFactor);
                
                // Move spacecraft out of collision
                const pushDistance = planet.radius * 0.1; // Push out by 10% of planet radius
                spacecraft.position.add(direction.multiplyScalar(pushDistance));
                
                // Apply damage to spacecraft if collision is high velocity
                const impactSpeed = Math.abs(dot);
                if (impactSpeed > 20 && spacecraft.takeDamage) {
                    const damage = Math.floor(impactSpeed / 10);
                    spacecraft.takeDamage(damage);
                    
                    // Visual feedback
                    if (spacecraft.flash) {
                        spacecraft.flash(0xff0000, 0.3);
                    }
                }
                
                console.log("Spacecraft-Planet collision handled");
            }
            
            // Handle spacecraft-mothership collisions
            if ((isSpacecraft(object1) && isMothership(object2)) || (isSpacecraft(object2) && isMothership(object1))) {
                const spacecraft = isSpacecraft(object1) ? object1 : object2;
                const mothership = isSpacecraft(object1) ? object2 : object1;
                
                // Check if spacecraft is near docking bay
                if (mothership.isInDockingRange && mothership.isInDockingRange(spacecraft)) {
                    // Handle docking logic if needed
                    if (mothership.dockSpacecraft) {
                        mothership.dockSpacecraft(spacecraft);
                    }
                    return;
                }
                
                // Calculate direction from mothership to spacecraft
                const direction = new THREE.Vector3().subVectors(
                    spacecraft.position,
                    mothership.position
                ).normalize();
                
                // Calculate bounce factor (0.3 = softer bounce than planets)
                const bounceFactor = 0.3;
                
                // Calculate reflection of velocity
                const dot = spacecraft.velocity.dot(direction);
                const reflection = new THREE.Vector3().copy(direction).multiplyScalar(2 * dot);
                
                // Apply bounce effect
                spacecraft.velocity.sub(reflection).multiplyScalar(bounceFactor);
                
                // Move spacecraft out of collision
                const pushDistance = 10; // Fixed push distance
                spacecraft.position.add(direction.multiplyScalar(pushDistance));
                
                // Apply minor damage to spacecraft if collision is high velocity
                const impactSpeed = Math.abs(dot);
                if (impactSpeed > 30 && spacecraft.takeDamage) {
                    const damage = Math.floor(impactSpeed / 20);
                    spacecraft.takeDamage(damage);
                    
                    // Visual feedback
                    if (spacecraft.flash) {
                        spacecraft.flash(0xff0000, 0.3);
                    }
                }
                
                console.log("Spacecraft-Mothership collision handled");
            }
            
        } catch (error) {
            console.error("Error handling collision:", error);
        }
    }
    
    createCollisionEffect(position, intensity) {
        try {
            // Skip if position is invalid
            if (!position) {
                return;
            }
            
            // Skip if intensity is too low
            if (intensity < 5) {
                return;
            }
            
            // Create a simple particle effect for collision
            const particleCount = Math.min(20, Math.floor(intensity / 2));
            
            // Check if we have a scene reference
            if (!this.scene) {
                // Try to find scene from one of the physics objects
                for (const obj of this.objects) {
                    if (obj && obj.scene) {
                        this.scene = obj.scene;
                        break;
                    }
                }
                
                // If still no scene, we can't create visual effects
                if (!this.scene) {
                    return;
                }
            }
            
            // Create particles
            for (let i = 0; i < particleCount; i++) {
                // Create a small sphere for each particle
                const geometry = new THREE.SphereGeometry(0.5, 4, 4);
                const material = new THREE.MeshBasicMaterial({
                    color: 0xffaa00,
                    transparent: true,
                    opacity: 0.8
                });
                
                const particle = new THREE.Mesh(geometry, material);
                
                // Position at collision point
                particle.position.copy(position);
                
                // Add random velocity
                const velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * intensity * 0.5,
                    (Math.random() - 0.5) * intensity * 0.5,
                    (Math.random() - 0.5) * intensity * 0.5
                );
                
                // Add to scene
                this.scene.add(particle);
                
                // Animate and remove after a short time
                const startTime = Date.now();
                const duration = 500 + Math.random() * 500; // 0.5-1 second
                
                const animateParticle = () => {
                    const elapsed = Date.now() - startTime;
                    
                    if (elapsed < duration) {
                        // Move particle
                        particle.position.add(velocity);
                        
                        // Slow down
                        velocity.multiplyScalar(0.95);
                        
                        // Fade out
                        particle.material.opacity = 0.8 * (1 - elapsed / duration);
                        
                        // Continue animation
                        requestAnimationFrame(animateParticle);
                    } else {
                        // Remove particle
                        this.scene.remove(particle);
                        
                        // Dispose resources
                        particle.geometry.dispose();
                        particle.material.dispose();
                    }
                };
                
                // Start animation
                animateParticle();
            }
        } catch (error) {
            console.error("Error creating collision effect:", error);
        }
    }
} 