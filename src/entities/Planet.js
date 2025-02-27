import * as THREE from 'three';
import { VoxelModel } from '../utils/VoxelModel.js';

export class Planet extends THREE.Object3D {
    constructor(config) {
        super();
        
        this.config = Object.assign({
            radius: 100,
            position: new THREE.Vector3(0, 0, 0),
            textureType: 'earth',
            gravityFactor: 1000,
            rotationSpeed: 0.01,
            scene: null
        }, config);
        
        // Set properties
        this.radius = this.config.radius;
        this.gravityFactor = this.config.gravityFactor;
        this.gravityRadius = this.radius * 10; // Effective gravity radius
        this.position.copy(this.config.position);
        this.rotationSpeed = this.config.rotationSpeed;
        
        // Create the planet
        this.createPlanet();
        
        // Add to scene
        if (this.config.scene) {
            this.config.scene.add(this);
        }
    }
    
    createPlanet() {
        // For Minecraft-style, we'll create a voxel sphere
        this.createVoxelPlanet();
        
        // Add atmosphere
        this.createAtmosphere();
    }
    
    createVoxelPlanet() {
        const planetSize = this.radius * 2;
        const resolution = 24; // Higher for more detailed planets, but more performance impact
        
        const blocks = [];
        const center = [0, 0, 0];
        
        // Generate a voxel sphere
        for (let x = -resolution/2; x < resolution/2; x++) {
            for (let y = -resolution/2; y < resolution/2; y++) {
                for (let z = -resolution/2; z < resolution/2; z++) {
                    // Calculate distance from center
                    const distance = Math.sqrt(x*x + y*y + z*z);
                    
                    // If inside the sphere
                    if (distance <= resolution/2) {
                        // Calculate block size and position
                        const blockSize = planetSize / resolution;
                        const position = [
                            x * blockSize,
                            y * blockSize,
                            z * blockSize
                        ];
                        
                        // Determine block color based on texture type and position
                        let color;
                        
                        switch (this.config.textureType) {
                            case 'earth':
                                // Simple earth-like coloring
                                const height = y / (resolution/2); // Normalize height (-1 to 1)
                                if (height > 0.8) {
                                    // Snow caps
                                    color = 0xffffff;
                                } else if (height > 0.2) {
                                    // Mountains
                                    color = 0x996633;
                                } else if (height > -0.2) {
                                    // Land
                                    color = 0x669933;
                                } else {
                                    // Water
                                    color = 0x3399cc;
                                }
                                break;
                                
                            case 'mars':
                                // Mars-like coloring
                                color = 0xcc6633;
                                break;
                                
                            case 'jupiter':
                                // Jupiter-like coloring with bands
                                const band = Math.sin((y / resolution) * Math.PI * 10);
                                if (band > 0.3) {
                                    color = 0xcc9966;
                                } else {
                                    color = 0xaa6633;
                                }
                                break;
                                
                            case 'ice':
                                // Ice planet coloring
                                const shade = 0.8 + Math.random() * 0.2;
                                const r = Math.floor(200 * shade);
                                const g = Math.floor(200 * shade);
                                const b = Math.floor(255 * shade);
                                color = (r << 16) | (g << 8) | b;
                                break;
                                
                            default:
                                // Random coloring
                                color = Math.random() > 0.5 ? 0x669933 : 0x3399cc;
                        }
                        
                        // Only add blocks that are on or near the surface
                        // This reduces the number of blocks and improves performance
                        if (distance > (resolution/2) - 1) {
                            blocks.push({
                                position: position,
                                size: [blockSize, blockSize, blockSize],
                                color: color
                            });
                        }
                    }
                }
            }
        }
        
        // Create the voxel model
        this.planetModel = new VoxelModel({
            design: blocks
        });
        
        this.add(this.planetModel);
    }
    
    createAtmosphere() {
        // Only add atmosphere for certain planet types
        if (['earth', 'ice'].includes(this.config.textureType)) {
            const atmosphereGeometry = new THREE.SphereGeometry(this.radius * 1.05, 32, 32);
            
            // Choose atmosphere color based on planet type
            let atmosphereColor;
            
            switch (this.config.textureType) {
                case 'earth':
                    atmosphereColor = 0x88aaff;
                    break;
                case 'ice':
                    atmosphereColor = 0xaaccff;
                    break;
                default:
                    atmosphereColor = 0x88aaff;
            }
            
            const atmosphereMaterial = new THREE.MeshBasicMaterial({
                color: atmosphereColor,
                transparent: true,
                opacity: 0.2,
                side: THREE.BackSide
            });
            
            this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            this.add(this.atmosphere);
        }
    }
    
    update(delta) {
        // Rotate the planet
        this.rotation.y += this.rotationSpeed * delta;
        
        // Optional: Add other animations or effects
    }
    
    getCollisionBounds() {
        // Create a bounding sphere for the planet
        return new THREE.Sphere(this.position, this.radius);
    }
} 