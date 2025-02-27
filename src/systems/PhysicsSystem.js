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
                    
                    // Check for overlap
                    if (this.checkBoundsOverlap(objectBounds, otherBounds)) {
                        // Calculate penetration depth for better collision response
                        const penetration = this.calculatePenetration(objectBounds, otherBounds);
                        
                        // Collision detected!
                        this.handleCollision(object, otherObject, penetration);
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
            
            // Calculate the penetration vector to push objects apart
            const center1 = new THREE.Vector3();
            bounds1.getCenter(center1);
            
            const center2 = new THREE.Vector3();
            bounds2.getCenter(center2);
            
            // Direction from bounds2 to bounds1
            const direction = new THREE.Vector3().subVectors(center1, center2).normalize();
            
            // Calculate size along each axis
            const size1 = new THREE.Vector3().subVectors(bounds1.max, bounds1.min).multiplyScalar(0.5);
            const size2 = new THREE.Vector3().subVectors(bounds2.max, bounds2.min).multiplyScalar(0.5);
            
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
        // Add null checks to prevent errors
        if (!bounds1 || !bounds2) {
            return false;
        }
        
        // Make sure both bounds have the required methods
        if (typeof bounds1.intersectsBox !== 'function') {
            console.warn('PhysicsSystem: bounds1 missing intersectsBox method');
            return false;
        }
        
        return bounds1.intersectsBox(bounds2);
    }
    
    handleCollision(object1, object2, penetration) {
        try {
            // Validate objects
            if (!object1 || !object2) {
                return;
            }
            
            // Let the objects handle their own collision responses if they can
            if (object1.onCollision) {
                try {
                    object1.onCollision(object2);
                } catch (error) {
                    console.warn('PhysicsSystem: Error in object1.onCollision callback', error);
                }
            }
            
            if (object2.onCollision) {
                try {
                    object2.onCollision(object1);
                } catch (error) {
                    console.warn('PhysicsSystem: Error in object2.onCollision callback', error);
                }
            }
            
            // Calculate damage based on collision severity
            try {
                const collisionSpeed = object1.velocity && object2.velocity ? 
                    new THREE.Vector3().subVectors(object1.velocity, object2.velocity).length() : 
                    (object1.velocity ? object1.velocity.length() : 
                     (object2.velocity ? object2.velocity.length() : 0));
                
                // Only apply damage for significant collisions
                if (collisionSpeed > 20) {
                    // Calculate damage based on collision speed
                    const damageMultiplier = 0.1;  // Adjust based on gameplay testing
                    const damage = collisionSpeed * damageMultiplier;
                    
                    // Apply damage to both objects if they can take damage
                    if (object1.takeDamage) {
                        object1.takeDamage(damage);
                    }
                    
                    if (object2.takeDamage) {
                        object2.takeDamage(damage);
                    }
                }
            } catch (error) {
                console.warn('PhysicsSystem: Error calculating collision damage', error);
            }
            
            // Handle physical collision response
            if (object1.velocity && object2.velocity) {
                // Full elastic collision with mass consideration
                const mass1 = object1.mass || 1;
                const mass2 = object2.mass || 1;
                
                // Calculate velocity changes for both objects
                const v1 = object1.velocity.clone();
                const v2 = object2.velocity.clone();
                
                // Collision normal
                const normal = penetration.clone().normalize();
                
                // Relative velocity along normal
                const relativeVelocity = new THREE.Vector3().subVectors(v2, v1);
                const velocityAlongNormal = relativeVelocity.dot(normal);
                
                // Don't resolve if velocities are separating
                if (velocityAlongNormal > 0) {
                    return;
                }
                
                // Calculate impulse scalar
                const restitution = 0.3; // Bounciness factor
                const impulseMagnitude = -(1 + restitution) * velocityAlongNormal / 
                                       (1/mass1 + 1/mass2);
                
                // Apply impulse
                const impulse = normal.multiplyScalar(impulseMagnitude);
                
                // Update velocities
                object1.velocity.sub(impulse.clone().multiplyScalar(1/mass1));
                object2.velocity.add(impulse.clone().multiplyScalar(1/mass2));
                
                // Move objects out of collision
                if (penetration.length() > 0.1) {
                    const pushFactor1 = mass2 / (mass1 + mass2);
                    const pushFactor2 = mass1 / (mass1 + mass2);
                    
                    object1.position.add(penetration.clone().multiplyScalar(pushFactor1));
                    object2.position.sub(penetration.clone().multiplyScalar(pushFactor2));
                }
            }
            // If only one object has velocity, make it bounce
            else if (object1.velocity) {
                // Reflect the velocity based on collision normal
                const normal = penetration.clone().normalize();
                const dot = object1.velocity.dot(normal);
                
                // Only bounce if moving toward the object
                if (dot < 0) {
                    // v' = v - 2(v·n)n - reflection formula
                    object1.velocity.sub(normal.multiplyScalar(2 * dot));
                    
                    // Reduce velocity to simulate energy loss
                    object1.velocity.multiplyScalar(0.7);
                    
                    // Move object out of collision
                    object1.position.add(penetration);
                }
            }
            else if (object2.velocity) {
                // Same logic but for object2
                const normal = penetration.clone().normalize().negate();
                const dot = object2.velocity.dot(normal);
                
                // Only bounce if moving toward the object
                if (dot < 0) {
                    object2.velocity.sub(normal.multiplyScalar(2 * dot));
                    object2.velocity.multiplyScalar(0.7);
                    object2.position.add(penetration.clone().negate());
                }
            }
        } catch (error) {
            console.warn('PhysicsSystem: Error in handleCollision', error);
        }
    }
} 