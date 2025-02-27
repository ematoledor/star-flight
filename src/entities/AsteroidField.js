export class AsteroidField {
    constructor(options) {
        // Required options
        this.scene = options.scene;
        this.position = options.position || new THREE.Vector3(0, 0, 0);
        
        // Optional parameters with defaults
        this.radius = options.radius || 500;
        this.density = options.density || 0.5;
        this.physicsSystem = options.physicsSystem;
        this.loadingManager = options.loadingManager;
        
        // PERFORMANCE: Track low detail mode
        this.lowDetail = options.lowDetail || false;
        
        // Asteroid field properties
        this.asteroids = [];
        this.instancedMeshes = [];
        this.asteroidCount = 0;
        
        // PERFORMANCE: Track distance to camera for LOD
        this.distanceToCamera = 1000;
        this.lastLODUpdate = 0;
        this.currentLOD = 0; // 0 = highest detail, 3 = lowest
        this.isVisible = true;
        
        // Create the asteroid field
        this.createAsteroidField();
    }
    
    createAsteroidField() {
        try {
            console.log(`Creating asteroid field at ${this.position.x}, ${this.position.y}, ${this.position.z}`);
            
            // Calculate number of asteroids based on density and radius
            // PERFORMANCE: Reduce asteroid count for low-end devices
            const baseCount = Math.floor(this.radius * this.density);
            this.asteroidCount = this.lowDetail ? Math.min(baseCount, 50) : baseCount;
            
            console.log(`Creating ${this.asteroidCount} asteroids`);
            
            // PERFORMANCE: Use instanced rendering for better performance
            this.createInstancedAsteroids();
            
            return true;
        } catch (error) {
            console.error("Error creating asteroid field:", error);
            return false;
        }
    }
    
    // PERFORMANCE: Create asteroids using instanced rendering
    createInstancedAsteroids() {
        try {
            // Create a few different asteroid geometries to use as templates
            const geometries = [
                new THREE.IcosahedronGeometry(1, 0), // Low poly
                new THREE.IcosahedronGeometry(1, 1), // Medium poly
                new THREE.SphereGeometry(1, 4, 4)    // Very low poly sphere
            ];
            
            // Create materials with different colors
            const materials = [
                new THREE.MeshPhongMaterial({ color: 0x888888, flatShading: true }),
                new THREE.MeshPhongMaterial({ color: 0x777777, flatShading: true }),
                new THREE.MeshPhongMaterial({ color: 0x666666, flatShading: true })
            ];
            
            // PERFORMANCE: For low detail mode, use even simpler materials
            if (this.lowDetail) {
                materials.forEach(mat => {
                    mat.specular = undefined;
                    mat.shininess = 0;
                });
            }
            
            // Determine how many instances per template
            const instancesPerTemplate = Math.ceil(this.asteroidCount / geometries.length);
            
            // Create instanced meshes for each geometry type
            for (let i = 0; i < geometries.length; i++) {
                // Skip if we've already created enough asteroids
                if (i * instancesPerTemplate >= this.asteroidCount) break;
                
                // Calculate how many instances for this template
                const remainingCount = this.asteroidCount - (i * instancesPerTemplate);
                const instanceCount = Math.min(instancesPerTemplate, remainingCount);
                
                // Create instanced mesh
                const instancedMesh = new THREE.InstancedMesh(
                    geometries[i],
                    materials[i % materials.length],
                    instanceCount
                );
                
                instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                instancedMesh.castShadow = !this.lowDetail;
                instancedMesh.receiveShadow = !this.lowDetail;
                
                // Set up instances
                const dummy = new THREE.Object3D();
                const center = this.position.clone();
                
                for (let j = 0; j < instanceCount; j++) {
                    // Random position within the field radius
                    const distance = Math.random() * this.radius;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI;
                    
                    const x = center.x + distance * Math.sin(phi) * Math.cos(theta);
                    const y = center.y + distance * Math.sin(phi) * Math.sin(theta);
                    const z = center.z + distance * Math.cos(phi);
                    
                    // Random size
                    const scale = 5 + Math.random() * 15;
                    
                    // Random rotation
                    const rotX = Math.random() * Math.PI * 2;
                    const rotY = Math.random() * Math.PI * 2;
                    const rotZ = Math.random() * Math.PI * 2;
                    
                    // Set position, rotation, and scale
                    dummy.position.set(x, y, z);
                    dummy.rotation.set(rotX, rotY, rotZ);
                    dummy.scale.set(scale, scale, scale);
                    dummy.updateMatrix();
                    
                    // Apply to instanced mesh
                    instancedMesh.setMatrixAt(j, dummy.matrix);
                    
                    // Store asteroid data for physics/collision
                    this.asteroids.push({
                        position: new THREE.Vector3(x, y, z),
                        radius: scale,
                        velocity: new THREE.Vector3(
                            (Math.random() - 0.5) * 0.1,
                            (Math.random() - 0.5) * 0.1,
                            (Math.random() - 0.5) * 0.1
                        ),
                        rotation: new THREE.Vector3(
                            (Math.random() - 0.5) * 0.01,
                            (Math.random() - 0.5) * 0.01,
                            (Math.random() - 0.5) * 0.01
                        ),
                        instanceId: j,
                        meshIndex: i
                    });
                }
                
                // Update the instance matrices
                instancedMesh.instanceMatrix.needsUpdate = true;
                
                // Add to scene
                this.scene.add(instancedMesh);
                
                // Store reference
                this.instancedMeshes.push(instancedMesh);
            }
            
            console.log(`Created ${this.asteroids.length} asteroids using ${this.instancedMeshes.length} instanced meshes`);
            
            // Add to physics system if available
            if (this.physicsSystem) {
                this.addToPhysicsSystem();
            }
        } catch (error) {
            console.error("Error creating instanced asteroids:", error);
        }
    }
    
    addToPhysicsSystem() {
        try {
            if (!this.physicsSystem) return;
            
            // PERFORMANCE: Only add a subset of asteroids to physics system
            const maxPhysicsAsteroids = this.lowDetail ? 10 : 30;
            const step = Math.max(1, Math.floor(this.asteroids.length / maxPhysicsAsteroids));
            
            for (let i = 0; i < this.asteroids.length; i += step) {
                const asteroid = this.asteroids[i];
                
                this.physicsSystem.addObject({
                    position: asteroid.position,
                    radius: asteroid.radius,
                    mass: asteroid.radius * 10,
                    velocity: asteroid.velocity,
                    collisionGroup: this.physicsSystem.collisionGroups ? 
                        this.physicsSystem.collisionGroups.asteroid : 0,
                    onCollision: (other) => this.handleCollision(asteroid, other)
                });
            }
            
            console.log(`Added ${Math.floor(this.asteroids.length / step)} asteroids to physics system`);
        } catch (error) {
            console.error("Error adding asteroids to physics system:", error);
        }
    }
    
    handleCollision(asteroid, other) {
        // Handle collision effects
        if (other.collisionGroup === this.physicsSystem.collisionGroups.spacecraft) {
            // Player hit asteroid
            console.log("Spacecraft hit asteroid");
            
            // Create explosion effect
            this.createExplosion(asteroid.position);
            
            // Remove asteroid
            this.removeAsteroid(asteroid);
        } else if (other.collisionGroup === this.physicsSystem.collisionGroups.projectile) {
            // Projectile hit asteroid
            console.log("Projectile hit asteroid");
            
            // Create explosion effect
            this.createExplosion(asteroid.position);
            
            // Remove asteroid
            this.removeAsteroid(asteroid);
        }
    }
    
    createExplosion(position) {
        // PERFORMANCE: Skip explosion effects in low detail mode
        if (this.lowDetail) return;
        
        try {
            // Create particle effect for explosion
            const particleCount = 20;
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            
            for (let i = 0; i < particleCount; i++) {
                const x = position.x + (Math.random() - 0.5) * 10;
                const y = position.y + (Math.random() - 0.5) * 10;
                const z = position.z + (Math.random() - 0.5) * 10;
                vertices.push(x, y, z);
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            
            const material = new THREE.PointsMaterial({
                color: 0xff9900,
                size: 5,
                transparent: true,
                opacity: 1
            });
            
            const particles = new THREE.Points(geometry, material);
            this.scene.add(particles);
            
            // Animate explosion
            const startTime = performance.now();
            const duration = 1000; // 1 second
            
            const animateExplosion = () => {
                const elapsed = performance.now() - startTime;
                const progress = elapsed / duration;
                
                if (progress >= 1) {
                    // Remove particles when animation is complete
                    this.scene.remove(particles);
                    geometry.dispose();
                    material.dispose();
                    return;
                }
                
                // Expand particles
                const positions = geometry.attributes.position.array;
                
                for (let i = 0; i < positions.length; i += 3) {
                    const dx = positions[i] - position.x;
                    const dy = positions[i + 1] - position.y;
                    const dz = positions[i + 2] - position.z;
                    
                    positions[i] += dx * 0.05;
                    positions[i + 1] += dy * 0.05;
                    positions[i + 2] += dz * 0.05;
                }
                
                geometry.attributes.position.needsUpdate = true;
                
                // Fade out
                material.opacity = 1 - progress;
                
                // Continue animation
                requestAnimationFrame(animateExplosion);
            };
            
            animateExplosion();
        } catch (error) {
            console.error("Error creating explosion:", error);
        }
    }
    
    removeAsteroid(asteroid) {
        try {
            // Find the asteroid in our array
            const index = this.asteroids.findIndex(a => 
                a.position.equals(asteroid.position) && a.radius === asteroid.radius);
            
            if (index === -1) return;
            
            const removedAsteroid = this.asteroids[index];
            
            // Remove from physics system if available
            if (this.physicsSystem) {
                this.physicsSystem.removeObject(asteroid);
            }
            
            // Hide the instance by scaling it to zero
            const dummy = new THREE.Object3D();
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            
            const instancedMesh = this.instancedMeshes[removedAsteroid.meshIndex];
            instancedMesh.setMatrixAt(removedAsteroid.instanceId, dummy.matrix);
            instancedMesh.instanceMatrix.needsUpdate = true;
            
            // Remove from our array
            this.asteroids.splice(index, 1);
        } catch (error) {
            console.error("Error removing asteroid:", error);
        }
    }
    
    update(delta) {
        try {
            // PERFORMANCE: Update LOD based on distance to camera
            this.updateLOD();
            
            // Skip updates if not visible
            if (!this.isVisible) return;
            
            // PERFORMANCE: Only update a subset of asteroids each frame
            // to distribute the workload
            const updateCount = Math.min(this.asteroids.length, 10);
            const startIndex = Math.floor(Math.random() * (this.asteroids.length - updateCount));
            
            const dummy = new THREE.Object3D();
            
            for (let i = 0; i < updateCount; i++) {
                const index = (startIndex + i) % this.asteroids.length;
                const asteroid = this.asteroids[index];
                
                // Update position based on velocity
                asteroid.position.x += asteroid.velocity.x * delta;
                asteroid.position.y += asteroid.velocity.y * delta;
                asteroid.position.z += asteroid.velocity.z * delta;
                
                // Update rotation
                const instancedMesh = this.instancedMeshes[asteroid.meshIndex];
                
                // Get current matrix
                instancedMesh.getMatrixAt(asteroid.instanceId, dummy.matrix);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                
                // Update position and rotation
                dummy.position.copy(asteroid.position);
                dummy.rotateX(asteroid.rotation.x * delta);
                dummy.rotateY(asteroid.rotation.y * delta);
                dummy.rotateZ(asteroid.rotation.z * delta);
                
                // Apply updated matrix
                dummy.updateMatrix();
                instancedMesh.setMatrixAt(asteroid.instanceId, dummy.matrix);
                instancedMesh.instanceMatrix.needsUpdate = true;
            }
        } catch (error) {
            console.error("Error updating asteroid field:", error);
        }
    }
    
    // PERFORMANCE: Update level of detail based on distance to camera
    updateLOD() {
        try {
            // Only update LOD occasionally to save performance
            const now = performance.now();
            if (now - this.lastLODUpdate < 1000) { // Update once per second
                return;
            }
            
            this.lastLODUpdate = now;
            
            // Get camera from scene
            const camera = this.scene.getObjectByProperty('type', 'PerspectiveCamera') || 
                          this.scene.getObjectByProperty('type', 'OrthographicCamera');
            
            if (!camera) return;
            
            // Calculate distance to camera
            this.distanceToCamera = this.position.distanceTo(camera.position);
            
            // Determine visibility based on distance
            const wasVisible = this.isVisible;
            this.isVisible = this.distanceToCamera < (this.radius + 5000);
            
            // Toggle visibility if changed
            if (wasVisible !== this.isVisible) {
                this.toggleVisibility(this.isVisible);
            }
            
            // Determine appropriate LOD level
            let newLOD;
            
            if (this.distanceToCamera < 500) {
                newLOD = 0; // Highest detail
            } else if (this.distanceToCamera < 2000) {
                newLOD = 1; // Medium detail
            } else if (this.distanceToCamera < 5000) {
                newLOD = 2; // Low detail
            } else {
                newLOD = 3; // Lowest detail
            }
            
            // If LOD changed, update materials
            if (newLOD !== this.currentLOD) {
                this.currentLOD = newLOD;
                this.updateMaterialsForLOD();
            }
        } catch (error) {
            console.error("Error updating asteroid field LOD:", error);
        }
    }
    
    // PERFORMANCE: Toggle visibility of all instanced meshes
    toggleVisibility(visible) {
        for (const mesh of this.instancedMeshes) {
            mesh.visible = visible;
        }
    }
    
    // PERFORMANCE: Update materials based on current LOD level
    updateMaterialsForLOD() {
        try {
            // Skip if not visible
            if (!this.isVisible) return;
            
            // Update materials based on LOD
            for (const mesh of this.instancedMeshes) {
                // Skip if material is not available
                if (!mesh.material) continue;
                
                switch (this.currentLOD) {
                    case 0: // Highest detail
                        mesh.material.flatShading = true;
                        mesh.castShadow = !this.lowDetail;
                        mesh.receiveShadow = !this.lowDetail;
                        break;
                    case 1: // Medium detail
                        mesh.material.flatShading = true;
                        mesh.castShadow = false;
                        mesh.receiveShadow = false;
                        break;
                    case 2: // Low detail
                    case 3: // Lowest detail
                        mesh.material.flatShading = false;
                        mesh.castShadow = false;
                        mesh.receiveShadow = false;
                        break;
                }
            }
        } catch (error) {
            console.error("Error updating asteroid field materials for LOD:", error);
        }
    }
    
    // Clean up resources
    dispose() {
        try {
            // Remove all instanced meshes from scene
            for (const mesh of this.instancedMeshes) {
                this.scene.remove(mesh);
                
                // Dispose of geometry and material
                if (mesh.geometry) {
                    mesh.geometry.dispose();
                }
                
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(material => material.dispose());
                    } else {
                        mesh.material.dispose();
                    }
                }
            }
            
            // Clear arrays
            this.instancedMeshes = [];
            this.asteroids = [];
            
            console.log("Asteroid field disposed");
        } catch (error) {
            console.error("Error disposing asteroid field:", error);
        }
    }
} 