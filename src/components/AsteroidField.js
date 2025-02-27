import * as THREE from 'three';
import { VoxelModel } from '../utils/VoxelModel.js';

export class AsteroidField extends THREE.Object3D {
    constructor(config) {
        super();
        
        this.config = Object.assign({
            position: new THREE.Vector3(0, 0, 0),
            radius: 1000,
            density: 0.2, // Asteroids per cubic unit (adjusted by radius)
            scene: null,
            physicsSystem: null
        }, config);
        
        this.position.copy(this.config.position);
        this.scene = this.config.scene;
        this.physicsSystem = this.config.physicsSystem;
        this.asteroids = [];
        
        // Add this object to the scene
        if (this.scene) {
            this.scene.add(this);
        }
        
        // Create asteroid field
        this.createAsteroidField();
    }
    
    createAsteroidField() {
        // Calculate number of asteroids based on radius and density
        const volume = (4/3) * Math.PI * Math.pow(this.config.radius, 3);
        const count = Math.floor(volume * this.config.density * 0.0001); // Scale down for performance
        
        // Create asteroid geometry variations
        const geometries = [
            this.createAsteroidGeometry(1),
            this.createAsteroidGeometry(2),
            this.createAsteroidGeometry(3),
            this.createAsteroidGeometry(4)
        ];
        
        // Create instanced mesh materials
        const materials = [
            new THREE.MeshLambertMaterial({ color: 0x888888 }), // Gray
            new THREE.MeshLambertMaterial({ color: 0xaa8866 }), // Brown
            new THREE.MeshLambertMaterial({ color: 0x777777 })  // Dark gray
        ];
        
        // Create instanced meshes for each geometry and material combination
        for (const geometry of geometries) {
            for (const material of materials) {
                // Number of instances for this combination
                const numInstances = Math.floor(count / (geometries.length * materials.length));
                
                // Create instanced mesh
                const instancedMesh = new THREE.InstancedMesh(
                    geometry,
                    material,
                    numInstances
                );
                
                // Set positions and rotations for each instance
                for (let i = 0; i < numInstances; i++) {
                    // Get random position within sphere
                    const position = this.getRandomPointInSphere(this.config.radius);
                    
                    // Random scale (size variation)
                    const scale = 0.5 + Math.random() * 1.5;
                    
                    // Random rotation
                    const rotation = new THREE.Euler(
                        Math.random() * Math.PI * 2,
                        Math.random() * Math.PI * 2,
                        Math.random() * Math.PI * 2
                    );
                    
                    // Create transformation matrix
                    const matrix = new THREE.Matrix4();
                    
                    // Apply transformations to matrix
                    matrix.makeRotationFromEuler(rotation);
                    matrix.scale(new THREE.Vector3(scale, scale, scale));
                    matrix.setPosition(position);
                    
                    // Set matrix for this instance
                    instancedMesh.setMatrixAt(i, matrix);
                    
                    // Physics collision objects for larger asteroids only
                    if (scale > 1.0 && this.physicsSystem && Math.random() > 0.7) {
                        // Create a physical representation for collision detection
                        const asteroidPhysics = {
                            position: position.clone(),
                            velocity: new THREE.Vector3(
                                (Math.random() - 0.5) * 2,
                                (Math.random() - 0.5) * 2,
                                (Math.random() - 0.5) * 2
                            ),
                            rotationAxis: new THREE.Vector3(
                                Math.random() - 0.5,
                                Math.random() - 0.5,
                                Math.random() - 0.5
                            ).normalize(),
                            rotationSpeed: Math.random() * 0.5,
                            scale: scale,
                            matrix: matrix,
                            index: i,
                            instancedMesh: instancedMesh,
                            collisionRadius: 3 * scale, // Simplified collision sphere
                            health: 20 * scale,
                            takeDamage: function(amount) {
                                this.health -= amount;
                                return this.health <= 0;
                            },
                            onDestroyed: function() {
                                // Make asteroid invisible by scaling to 0
                                const newMatrix = this.matrix.clone();
                                newMatrix.scale(new THREE.Vector3(0, 0, 0));
                                this.instancedMesh.setMatrixAt(this.index, newMatrix);
                                this.instancedMesh.instanceMatrix.needsUpdate = true;
                                
                                // Create explosion effect
                                const explosion = new THREE.PointLight(0xff7700, 1, 50);
                                explosion.position.copy(this.position);
                                scene.add(explosion);
                                
                                // Remove light after a short delay
                                setTimeout(() => {
                                    scene.remove(explosion);
                                }, 300);
                            }
                        };
                        
                        this.asteroids.push(asteroidPhysics);
                        
                        if (this.physicsSystem) {
                            this.physicsSystem.addObject(asteroidPhysics);
                            
                            // Set collision group
                            if (this.physicsSystem.collisionGroups) {
                                asteroidPhysics.collisionGroup = this.physicsSystem.collisionGroups.planet;
                            }
                        }
                    }
                }
                
                // Need to update the instance matrix buffer
                instancedMesh.instanceMatrix.needsUpdate = true;
                
                // Add to scene
                this.add(instancedMesh);
            }
        }
    }
    
    createAsteroidGeometry(variant) {
        // Create voxel-based asteroid geometries
        let design;
        
        switch (variant) {
            case 1: // Small round
                design = [
                    { position: [0, 0, 0], size: [2, 2, 2], color: 0x888888 },
                    { position: [0, 1, 0], size: [1, 1, 1], color: 0x888888 },
                    { position: [1, 0, 0], size: [1, 1, 1], color: 0x888888 },
                    { position: [-1, 0, 0], size: [1, 1, 1], color: 0x888888 },
                    { position: [0, 0, 1], size: [1, 1, 1], color: 0x888888 },
                    { position: [0, 0, -1], size: [1, 1, 1], color: 0x888888 }
                ];
                break;
                
            case 2: // Medium oblong
                design = [
                    { position: [0, 0, 0], size: [2, 2, 3], color: 0x888888 },
                    { position: [1, 0, 1], size: [1, 1, 1], color: 0x888888 },
                    { position: [-1, 0, 1], size: [1, 1, 1], color: 0x888888 },
                    { position: [0, 1, 1], size: [1, 1, 1], color: 0x888888 },
                    { position: [0, -1, -1], size: [1, 1, 1], color: 0x888888 },
                    { position: [1, 0, -2], size: [1, 1, 1], color: 0x888888 }
                ];
                break;
                
            case 3: // Large irregular
                design = [
                    { position: [0, 0, 0], size: [3, 2, 3], color: 0x888888 },
                    { position: [2, 0, 0], size: [1, 1, 2], color: 0x888888 },
                    { position: [-2, 0, 0], size: [1, 1, 2], color: 0x888888 },
                    { position: [0, 1, 1], size: [2, 1, 1], color: 0x888888 },
                    { position: [0, -1, -1], size: [2, 1, 1], color: 0x888888 },
                    { position: [1, 0, -2], size: [1, 1, 1], color: 0x888888 },
                    { position: [-1, 0, 2], size: [1, 1, 1], color: 0x888888 }
                ];
                break;
                
            case 4: // Small irregular
                design = [
                    { position: [0, 0, 0], size: [2, 1, 1], color: 0x888888 },
                    { position: [0, 1, 0], size: [1, 1, 1], color: 0x888888 },
                    { position: [1, 0, 1], size: [1, 1, 1], color: 0x888888 }
                ];
                break;
                
            default:
                design = [
                    { position: [0, 0, 0], size: [2, 2, 2], color: 0x888888 }
                ];
        }
        
        // Create a BufferGeometry by combining all the cubes in the design
        const geometry = new THREE.BufferGeometry();
        let positions = [];
        let normals = [];
        let uvs = [];
        
        // Function to add a cube's vertices
        const addCubeGeometry = (position, size) => {
            // Cube vertices
            const cubePositions = [
                // Front face
                -0.5, -0.5, 0.5,  0.5, -0.5, 0.5,  0.5, 0.5, 0.5,
                -0.5, -0.5, 0.5,  0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,
                // Back face
                -0.5, -0.5, -0.5,  -0.5, 0.5, -0.5,  0.5, 0.5, -0.5,
                -0.5, -0.5, -0.5,  0.5, 0.5, -0.5,  0.5, -0.5, -0.5,
                // Top face
                -0.5, 0.5, -0.5,  -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,
                -0.5, 0.5, -0.5,  0.5, 0.5, 0.5,  0.5, 0.5, -0.5,
                // Bottom face
                -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5, 0.5,
                -0.5, -0.5, -0.5,  0.5, -0.5, 0.5,  -0.5, -0.5, 0.5,
                // Right face
                0.5, -0.5, -0.5,  0.5, 0.5, -0.5,  0.5, 0.5, 0.5,
                0.5, -0.5, -0.5,  0.5, 0.5, 0.5,  0.5, -0.5, 0.5,
                // Left face
                -0.5, -0.5, -0.5,  -0.5, -0.5, 0.5,  -0.5, 0.5, 0.5,
                -0.5, -0.5, -0.5,  -0.5, 0.5, 0.5,  -0.5, 0.5, -0.5
            ];
            
            // Apply position and scale
            for (let i = 0; i < cubePositions.length; i += 3) {
                positions.push(
                    (cubePositions[i] * size[0]) + position[0],
                    (cubePositions[i+1] * size[1]) + position[1],
                    (cubePositions[i+2] * size[2]) + position[2]
                );
            }
            
            // Normals (simplified for asteroid)
            const cubeNormals = [
                // Front face (z = 1)
                0, 0, 1,  0, 0, 1,  0, 0, 1,
                0, 0, 1,  0, 0, 1,  0, 0, 1,
                // Back face (z = -1)
                0, 0, -1,  0, 0, -1,  0, 0, -1,
                0, 0, -1,  0, 0, -1,  0, 0, -1,
                // Top face (y = 1)
                0, 1, 0,  0, 1, 0,  0, 1, 0,
                0, 1, 0,  0, 1, 0,  0, 1, 0,
                // Bottom face (y = -1)
                0, -1, 0,  0, -1, 0,  0, -1, 0,
                0, -1, 0,  0, -1, 0,  0, -1, 0,
                // Right face (x = 1)
                1, 0, 0,  1, 0, 0,  1, 0, 0,
                1, 0, 0,  1, 0, 0,  1, 0, 0,
                // Left face (x = -1)
                -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
                -1, 0, 0,  -1, 0, 0,  -1, 0, 0
            ];
            
            normals = normals.concat(cubeNormals);
            
            // UVs (simplified)
            const cubeUVs = [];
            for (let i = 0; i < 6; i++) { // 6 faces
                cubeUVs.push(
                    0, 0,  1, 0,  1, 1,
                    0, 0,  1, 1,  0, 1
                );
            }
            
            uvs = uvs.concat(cubeUVs);
        };
        
        // Add all cubes in the design
        design.forEach(cube => {
            addCubeGeometry(cube.position, cube.size);
        });
        
        // Set attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        // Compute bounding sphere for culling
        geometry.computeBoundingSphere();
        
        return geometry;
    }
    
    getRandomPointInSphere(radius) {
        // Generate random point within a sphere
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = radius * Math.cbrt(Math.random()); // Cube root for uniform distribution
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        return new THREE.Vector3(x, y, z);
    }
    
    update(delta) {
        // Update physics for physical asteroids
        this.asteroids.forEach(asteroid => {
            // Skip if asteroid was destroyed
            if (asteroid.health <= 0) {
                return;
            }
            
            // Update position
            asteroid.position.add(asteroid.velocity.clone().multiplyScalar(delta));
            
            // Rotation
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(
                asteroid.rotationAxis, 
                asteroid.rotationSpeed * delta
            );
            
            // Update matrix
            asteroid.matrix.multiply(rotationMatrix);
            
            // Update the position in the matrix
            asteroid.matrix.setPosition(asteroid.position);
            
            // Update the instanced mesh
            asteroid.instancedMesh.setMatrixAt(asteroid.index, asteroid.matrix);
            asteroid.instancedMesh.instanceMatrix.needsUpdate = true;
            
            // Simple bounds check to keep asteroids in field
            const distance = asteroid.position.length();
            if (distance > this.config.radius) {
                // Push back toward center
                const direction = asteroid.position.clone().normalize();
                asteroid.velocity.sub(direction.multiplyScalar(0.1));
            }
        });
    }
} 