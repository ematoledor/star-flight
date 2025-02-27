import * as THREE from 'three';
import { VoxelModel } from '../utils/VoxelModel.js';

export class Satellite extends THREE.Object3D {
    constructor(config) {
        super();
        
        this.config = Object.assign({
            type: 'station', // 'station', 'comm', 'science', 'military'
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            orbitTarget: null, // Optional object to orbit around
            orbitSpeed: 0.1,
            orbitDistance: 100,
            orbitAngle: 0,
            scene: null
        }, config);
        
        // Set properties
        this.position.copy(this.config.position);
        this.rotation.copy(this.config.rotation);
        this.orbitTarget = this.config.orbitTarget;
        this.orbitSpeed = this.config.orbitSpeed;
        this.orbitDistance = this.config.orbitDistance;
        this.orbitAngle = this.config.orbitAngle || Math.random() * Math.PI * 2;
        
        // Create the satellite
        this.createSatellite();
        
        // Add to scene
        if (this.config.scene) {
            this.config.scene.add(this);
        }
    }
    
    createSatellite() {
        // Create different satellite designs based on type
        switch (this.config.type) {
            case 'station':
                this.createSpaceStation();
                break;
            case 'comm':
                this.createCommSatellite();
                break;
            case 'science':
                this.createScienceSatellite();
                break;
            case 'military':
                this.createMilitarySatellite();
                break;
            default:
                this.createCommSatellite(); // Default
        }
        
        // Add lights to the satellite
        this.addLights();
    }
    
    createSpaceStation() {
        // Create a larger space station with multiple modules
        
        // Main hub
        const hubBlocks = [
            { position: [0, 0, 0], size: [8, 8, 8], color: 0xcccccc },
            
            // Docking port
            { position: [0, 0, 8], size: [4, 4, 4], color: 0x888888 },
            
            // Solar panel arrays
            { position: [12, 0, 0], size: [10, 1, 8], color: 0x3355cc },
            { position: [-12, 0, 0], size: [10, 1, 8], color: 0x3355cc },
            
            // Habitat rings
            { position: [0, 12, 0], size: [6, 2, 6], color: 0xcccccc },
            { position: [0, -12, 0], size: [6, 2, 6], color: 0xcccccc },
            
            // Communication dishes
            { position: [0, 8, -8], size: [4, 4, 1], color: 0xaaaaaa }
        ];
        
        this.satelliteModel = new VoxelModel({
            design: hubBlocks
        });
        
        this.add(this.satelliteModel);
    }
    
    createCommSatellite() {
        // Create a communication satellite with dish
        
        const commBlocks = [
            // Main body
            { position: [0, 0, 0], size: [4, 2, 6], color: 0x999999 },
            
            // Communication dish
            { position: [0, 0, 5], size: [8, 8, 1], color: 0xdddddd },
            
            // Solar panels
            { position: [6, 0, 0], size: [4, 1, 4], color: 0x3355cc },
            { position: [-6, 0, 0], size: [4, 1, 4], color: 0x3355cc },
            
            // Antenna
            { position: [0, 0, 7], size: [1, 1, 4], color: 0xaaaaaa }
        ];
        
        this.satelliteModel = new VoxelModel({
            design: commBlocks
        });
        
        this.add(this.satelliteModel);
    }
    
    createScienceSatellite() {
        // Create a scientific satellite with instruments
        
        const scienceBlocks = [
            // Main body
            { position: [0, 0, 0], size: [5, 5, 5], color: 0xb0b0b0 },
            
            // Instruments
            { position: [0, 4, 0], size: [3, 2, 3], color: 0x444444 },
            { position: [0, -4, 0], size: [3, 2, 3], color: 0x444444 },
            
            // Solar panels
            { position: [8, 0, 0], size: [6, 1, 5], color: 0x3355cc },
            { position: [-8, 0, 0], size: [6, 1, 5], color: 0x3355cc },
            
            // Antenna
            { position: [0, 0, 5], size: [1, 1, 6], color: 0x888888 }
        ];
        
        this.satelliteModel = new VoxelModel({
            design: scienceBlocks
        });
        
        this.add(this.satelliteModel);
    }
    
    createMilitarySatellite() {
        // Create a military satellite with weapons
        
        const militaryBlocks = [
            // Main body
            { position: [0, 0, 0], size: [6, 3, 10], color: 0x555555 },
            
            // Weapon systems
            { position: [3, 0, 4], size: [2, 2, 4], color: 0x333333 },
            { position: [-3, 0, 4], size: [2, 2, 4], color: 0x333333 },
            
            // Radar array
            { position: [0, 3, -3], size: [4, 2, 4], color: 0x777777 },
            
            // Solar panels
            { position: [8, 0, -2], size: [5, 1, 5], color: 0x3355cc },
            { position: [-8, 0, -2], size: [5, 1, 5], color: 0x3355cc },
            
            // Engine
            { position: [0, 0, -6], size: [4, 2, 2], color: 0xcc3333 }
        ];
        
        this.satelliteModel = new VoxelModel({
            design: militaryBlocks
        });
        
        this.add(this.satelliteModel);
    }
    
    addLights() {
        // Add some small blinking lights for visual effect
        
        const colors = [0xff0000, 0x00ff00, 0x0000ff];
        const numLights = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numLights; i++) {
            const lightGeometry = new THREE.SphereGeometry(0.5, 8, 8);
            const lightMaterial = new THREE.MeshBasicMaterial({
                color: colors[i % colors.length],
                transparent: true,
                opacity: 0.8
            });
            
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            
            // Place light at random position on the satellite
            const offset = 5;
            light.position.set(
                (Math.random() - 0.5) * offset,
                (Math.random() - 0.5) * offset,
                (Math.random() - 0.5) * offset
            );
            
            this.add(light);
            
            // Store reference for blinking animation
            light.userData = {
                blinkRate: 0.5 + Math.random(),
                blinkPhase: Math.random() * Math.PI * 2
            };
            
            if (!this.lights) this.lights = [];
            this.lights.push(light);
        }
    }
    
    update(delta) {
        // Handle orbital movement if orbiting something
        if (this.orbitTarget && this.orbitTarget.position) {
            this.updateOrbit(delta);
        }
        
        // Rotate the satellite slowly
        this.rotation.y += 0.1 * delta;
        
        // Update lights
        this.updateLights(delta);
    }
    
    updateOrbit(delta) {
        // Update orbit angle
        this.orbitAngle += this.orbitSpeed * delta;
        
        // Calculate new position
        const x = this.orbitTarget.position.x + Math.cos(this.orbitAngle) * this.orbitDistance;
        const z = this.orbitTarget.position.z + Math.sin(this.orbitAngle) * this.orbitDistance;
        const y = this.orbitTarget.position.y + Math.sin(this.orbitAngle * 0.5) * (this.orbitDistance * 0.2);
        
        // Update position
        this.position.set(x, y, z);
        
        // Make the satellite face the direction of travel
        this.lookAt(this.orbitTarget.position);
    }
    
    updateLights(delta) {
        if (!this.lights) return;
        
        // Update blinking lights
        this.lights.forEach(light => {
            const { blinkRate, blinkPhase } = light.userData;
            
            // Calculate blinking pattern
            const intensity = (Math.sin(Date.now() * 0.001 * blinkRate + blinkPhase) + 1) * 0.5;
            
            // Update light opacity
            if (light.material) {
                light.material.opacity = 0.3 + intensity * 0.7;
            }
        });
    }
} 