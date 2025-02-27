import * as THREE from 'three';
import { VoxelModel } from '../utils/VoxelModel.js';

export class Mothership extends THREE.Object3D {
    constructor(config) {
        super();
        
        // Extract configuration
        this.scene = config.scene;
        this.physicsSystem = config.physicsSystem;
        this.position.copy(config.position || new THREE.Vector3(0, 0, 0));
        
        // Mothership properties
        this.name = "Carrier Mothership";
        this.radius = 300; // Large vessel
        this.dockingBayPosition = new THREE.Vector3(0, -50, 0); // Position relative to mothership
        this.dockingBayDirection = new THREE.Vector3(0, -1, 0); // Launch direction (downward)
        this.isDocked = false;
        this.dockedSpacecraft = null;
        
        // Create the mothership model
        this.createModel();
        
        // Add to scene
        if (this.scene) {
            this.scene.add(this);
        }
        
        // Add physics if available
        if (this.physicsSystem) {
            this.physicsSystem.addStaticObject(this, this.radius);
        }
    }
    
    createModel() {
        // Create a large carrier ship using voxels
        const modelConfig = {
            dimensions: [20, 5, 40], // Width, height, depth
            palette: [
                0x888888, // Gray for hull
                0x444444, // Dark gray for details
                0xCCCCCC, // Light gray for highlights
                0x0088FF, // Blue for engines/lights
                0xFF4400  // Orange for warning lights
            ],
            voxelSize: 10 // Large voxels for this massive ship
        };
        
        // Create the base voxel model
        this.model = new VoxelModel(modelConfig);
        
        // Main hull (base layer)
        for (let x = 0; x < 20; x++) {
            for (let z = 0; z < 40; z++) {
                // Create hull shape - wider in the middle, narrower at ends
                const widthFactor = 1 - Math.abs((z - 20) / 20);
                const width = Math.floor(8 * widthFactor + 4);
                
                if (x >= 10 - width/2 && x < 10 + width/2) {
                    this.model.setVoxel(x, 2, z, 0); // Main hull color
                }
            }
        }
        
        // Add upper structures
        for (let x = 5; x < 15; x++) {
            for (let z = 10; z < 30; z++) {
                if (z > 12 && z < 28 && x > 7 && x < 13) {
                    this.model.setVoxel(x, 3, z, 1); // Command structure
                    
                    // Add bridge superstructure
                    if (z > 18 && z < 22 && x > 8 && x < 12) {
                        this.model.setVoxel(x, 4, z, 2);
                    }
                }
            }
        }
        
        // Add landing/docking bay
        for (let x = 6; x < 14; x++) {
            for (let z = 15; z < 25; z++) {
                // Create landing bay opening
                this.model.setVoxel(x, 1, z, 4); // Orange for docking area
            }
        }
        
        // Engines at the back
        for (let x = 6; x < 14; x++) {
            for (let y = 1; y < 4; y++) {
                this.model.setVoxel(x, y, 39, 3); // Blue engine glow
            }
        }
        
        // Navigation lights
        this.model.setVoxel(0, 2, 0, 4); // Port navigation (red)
        this.model.setVoxel(19, 2, 0, 3); // Starboard navigation (green)
        
        // Add the model to the mothership
        this.model.build();
        this.add(this.model);
        
        // Add a dynamic point light for the docking bay
        this.dockingLight = new THREE.PointLight(0x0088ff, 1, 200);
        this.dockingLight.position.copy(this.dockingBayPosition);
        this.add(this.dockingLight);
        
        // Add a spotlight effect for the docking area
        this.dockingSpotlight = new THREE.SpotLight(0xffaa00, 2, 300, Math.PI / 6, 0.5);
        this.dockingSpotlight.position.set(0, 30, 0);
        this.dockingSpotlight.target.position.copy(this.dockingBayPosition);
        this.add(this.dockingSpotlight);
        this.add(this.dockingSpotlight.target);
    }
    
    update(delta) {
        // Animate docking bay lights for visual effect
        if (this.dockingLight) {
            this.dockingLight.intensity = 0.8 + Math.sin(Date.now() * 0.002) * 0.2;
        }
        
        // Handle any docked spacecraft
        if (this.isDocked && this.dockedSpacecraft) {
            // Keep the spacecraft positioned at the docking bay
            this.dockedSpacecraft.position.copy(this.position).add(this.dockingBayPosition);
            
            // Ensure spacecraft is oriented downward for launch
            this.dockedSpacecraft.rotation.set(0, 0, 0);
        }
    }
    
    dockSpacecraft(spacecraft) {
        if (spacecraft) {
            this.dockedSpacecraft = spacecraft;
            this.isDocked = true;
            
            // Position the spacecraft at the docking bay
            spacecraft.position.copy(this.position).add(this.dockingBayPosition);
            spacecraft.velocity.set(0, 0, 0); // Stop any movement
            spacecraft.rotation.set(0, 0, 0); // Reset rotation
            
            console.log('Spacecraft docked with mothership');
            
            return true;
        }
        return false;
    }
    
    launchSpacecraft() {
        if (this.isDocked && this.dockedSpacecraft) {
            // Set initial velocity in the docking bay direction
            const launchSpeed = 20; // Initial burst of speed
            this.dockedSpacecraft.velocity.copy(this.dockingBayDirection).multiplyScalar(launchSpeed);
            
            // Add a small offset to prevent immediate collision
            const launchOffset = this.dockingBayDirection.clone().multiplyScalar(20);
            this.dockedSpacecraft.position.add(launchOffset);
            
            // Mark as launched
            this.isDocked = false;
            const launchedSpacecraft = this.dockedSpacecraft;
            this.dockedSpacecraft = null;
            
            console.log('Spacecraft launched from mothership');
            
            return launchedSpacecraft;
        }
        return null;
    }
    
    // Check if a spacecraft is within docking range
    isInDockingRange(spacecraft) {
        if (!spacecraft) return false;
        
        // Calculate docking bay world position
        const dockingWorldPos = this.dockingBayPosition.clone().add(this.position);
        
        // Check distance to docking bay
        const distance = spacecraft.position.distanceTo(dockingWorldPos);
        return distance < 50; // Docking range
    }
} 