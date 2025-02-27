import * as THREE from 'three';

export class PhysicsSystem {
    constructor() {
        this.objects = [];
        this.gravity = 0; // Zero gravity in space
        this.planets = []; // Will store planets and their gravitational influence
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
    
    update(delta) {
        // Update physics for all registered objects
        this.objects.forEach(object => {
            if (object.velocity) {
                // Apply planet gravity if any
                this.applyPlanetaryGravity(object, delta);
                
                // Apply any global forces here
                
                // Check for collisions
                this.checkCollisions(object);
            }
        });
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
    
    checkCollisions(object) {
        const objectBounds = this.getBoundingBox(object);
        
        // Skip objects without bounding boxes
        if (!objectBounds) {
            return;
        }
        
        // Check against other physics objects
        this.objects.forEach(otherObject => {
            // Skip self
            if (otherObject === object) {
                return;
            }
            
            const otherBounds = this.getBoundingBox(otherObject);
            
            // Skip objects without bounding boxes
            if (!otherBounds) {
                return;
            }
            
            // Check for overlap
            if (this.checkBoundsOverlap(objectBounds, otherBounds)) {
                // Collision detected!
                this.handleCollision(object, otherObject);
            }
        });
    }
    
    getBoundingBox(object) {
        // If object has a custom collision bounds, use that
        if (object.getCollisionBounds) {
            return object.getCollisionBounds();
        }
        
        // If it has a bounding box already calculated, use that
        if (object.boundingBox) {
            return object.boundingBox;
        }
        
        // If it's a THREE.Object3D with geometry, calculate bounding box
        if (object.geometry) {
            if (!object.geometry.boundingBox) {
                object.geometry.computeBoundingBox();
            }
            
            const bbox = object.geometry.boundingBox.clone();
            bbox.applyMatrix4(object.matrixWorld);
            
            return bbox;
        }
        
        // For other objects, we'll need to compute from children
        if (object.children && object.children.length > 0) {
            // Create a bounding box from all children
            const bbox = new THREE.Box3();
            
            // Initialize with first child that has a bounding box
            let initialized = false;
            
            // Iterate through children
            object.traverse(child => {
                if (child.geometry) {
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
                }
            });
            
            if (initialized) {
                return bbox;
            }
        }
        
        // Default to a small sphere around object's position
        const position = object.position || new THREE.Vector3(0, 0, 0);
        const radius = object.collisionRadius || 1;
        
        const bbox = new THREE.Box3();
        bbox.setFromCenterAndSize(
            position,
            new THREE.Vector3(radius * 2, radius * 2, radius * 2)
        );
        
        return bbox;
    }
    
    checkBoundsOverlap(bounds1, bounds2) {
        return bounds1.intersectsBox(bounds2);
    }
    
    handleCollision(object1, object2) {
        // Let the objects handle their own collision responses if they can
        if (object1.onCollision) {
            object1.onCollision(object2);
        }
        
        if (object2.onCollision) {
            object2.onCollision(object1);
        }
        
        // Default collision handling (simple bounce)
        if (object1.velocity && object2.velocity) {
            // Simplified elastic collision
            // Swap velocities (more complex simulations would consider mass, etc.)
            const temp = object1.velocity.clone();
            object1.velocity.copy(object2.velocity);
            object2.velocity.copy(temp);
            
            // Add some "bounce" by pushing objects apart slightly
            const pushDirection = new THREE.Vector3();
            pushDirection.subVectors(object1.position, object2.position);
            pushDirection.normalize();
            
            const pushAmount = 0.1; // Small push to prevent sticking
            object1.position.add(pushDirection.clone().multiplyScalar(pushAmount));
            object2.position.add(pushDirection.clone().multiplyScalar(-pushAmount));
        }
        // If only one object has velocity, make it bounce
        else if (object1.velocity) {
            // Reflect the velocity based on collision normal
            // For simplicity, assume normal is direction from object2 to object1
            const normal = new THREE.Vector3();
            normal.subVectors(object1.position, object2.position).normalize();
            
            // v' = v - 2(v·n)n - reflection formula
            const dot = object1.velocity.dot(normal);
            object1.velocity.sub(normal.multiplyScalar(2 * dot));
            
            // Reduce velocity slightly to simulate energy loss
            object1.velocity.multiplyScalar(0.8);
            
            // Move object out of collision
            const pushAmount = 0.1;
            object1.position.add(normal.clone().multiplyScalar(pushAmount));
        }
        else if (object2.velocity) {
            // Same logic but for object2
            const normal = new THREE.Vector3();
            normal.subVectors(object2.position, object1.position).normalize();
            
            const dot = object2.velocity.dot(normal);
            object2.velocity.sub(normal.multiplyScalar(2 * dot));
            
            object2.velocity.multiplyScalar(0.8);
            
            const pushAmount = 0.1;
            object2.position.add(normal.clone().multiplyScalar(pushAmount));
        }
    }
} 