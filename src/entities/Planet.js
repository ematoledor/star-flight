import * as THREE from 'three';
import { VoxelModel } from '../utils/VoxelModel.js';

export class Planet extends THREE.Object3D {
    constructor(options) {
        super();
        
        // Required options
        this.scene = options.scene;
        this.position = options.position || new THREE.Vector3(0, 0, 0);
        
        // Optional parameters with defaults
        this.radius = options.radius || 100;
        this.type = options.type || 'terrestrial';
        this.textureType = options.textureType || this.type;
        this.rotationSpeed = options.rotationSpeed || 0.005;
        this.hasRings = options.hasRings || false;
        this.moonCount = options.moonCount || 0;
        this.gravityFactor = options.gravityFactor || this.radius * 10;
        this.loadingManager = options.loadingManager;
        
        // PERFORMANCE: Track low detail mode
        this.lowDetail = options.lowDetail || false;
        
        // Physics properties
        this.mass = this.radius * 100;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.collisionGroup = 0;
        
        // Mesh and geometry
        this.mesh = null;
        this.rings = null;
        this.moons = [];
        this.atmosphere = null;
        
        // PERFORMANCE: Track distance to camera for LOD
        this.distanceToCamera = 1000;
        this.lastLODUpdate = 0;
        this.currentLOD = 0; // 0 = highest detail, 3 = lowest
        
        // Create the planet mesh
        this.createPlanet();
    }
    
    createPlanet() {
        try {
            // PERFORMANCE: Adjust geometry detail based on planet size and detail level
            const segments = this.calculateSegments();
            
            // Create geometry with appropriate detail level
            const geometry = new THREE.SphereGeometry(this.radius, segments, segments);
            
            // Create material based on planet type
            const material = this.createMaterial();
            
            // Create mesh
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(this.position);
            
            // Set name if provided
            if (this.name) {
                this.mesh.name = this.name;
            }
            
            // Add to scene
            this.scene.add(this.mesh);
        
            // Create rings if needed
            if (this.hasRings) {
                this.createRings();
            }
            
            // Create atmosphere for terrestrial planets
            if (this.type === 'terrestrial' || this.type === 'earth' || this.type === 'ocean') {
        this.createAtmosphere();
    }
    
            // Create moons
            this.createMoons();
            
            // PERFORMANCE: Add frustum culling
            this.mesh.frustumCulled = true;
            
            return this.mesh;
        } catch (error) {
            console.error("Error creating planet:", error);
            return null;
        }
    }
    
    // PERFORMANCE: Calculate appropriate segment count based on size and detail level
    calculateSegments() {
        // Base segments on planet radius and detail level
        let baseSegments;
        
        if (this.radius < 50) {
            baseSegments = 16; // Small planets
        } else if (this.radius < 100) {
            baseSegments = 24; // Medium planets
        } else if (this.radius < 200) {
            baseSegments = 32; // Large planets
        } else {
            baseSegments = 48; // Huge planets (like the sun)
        }
        
        // Reduce segments based on low detail mode
        if (this.lowDetail) {
            baseSegments = Math.max(12, Math.floor(baseSegments / 2));
        }
        
        return baseSegments;
    }
    
    createMaterial() {
        try {
            // PERFORMANCE: Use simpler materials for low detail mode
            if (this.lowDetail) {
                return this.createSimpleMaterial();
            }
            
            // Create appropriate material based on planet type
            switch (this.textureType) {
                case 'sun':
                    return new THREE.MeshBasicMaterial({
                        color: 0xffff00,
                        emissive: 0xffaa00,
                        emissiveIntensity: 1
                    });
                    
                case 'earth':
                    // Use a basic material with a color for Earth
                    return new THREE.MeshPhongMaterial({
                        color: 0x2233ff,
                        specular: 0x333333,
                        shininess: 15
                    });
                    
                case 'mars':
                    return new THREE.MeshPhongMaterial({
                        color: 0xaa3300,
                        specular: 0x222222,
                        shininess: 5
                    });
                    
                case 'venus':
                    return new THREE.MeshPhongMaterial({
                        color: 0xddaa88,
                        specular: 0x222222,
                        shininess: 10
                    });
                    
                case 'mercury':
                    return new THREE.MeshPhongMaterial({
                        color: 0x888888,
                        specular: 0x222222,
                        shininess: 20
                    });
                    
                case 'jupiter':
                    return new THREE.MeshPhongMaterial({
                        color: 0xddaa77,
                        specular: 0x222222,
                        shininess: 10
                    });
                    
                case 'saturn':
                    return new THREE.MeshPhongMaterial({
                        color: 0xddcc88,
                        specular: 0x222222,
                        shininess: 10
                    });
                    
                case 'ice':
                    return new THREE.MeshPhongMaterial({
                        color: 0x88aadd,
                        specular: 0x333333,
                        shininess: 30
                    });
                    
                case 'moon':
                    return new THREE.MeshPhongMaterial({
                        color: 0xaaaaaa,
                        specular: 0x111111,
                        shininess: 5
                    });
                    
                case 'gas-giant':
                    return new THREE.MeshPhongMaterial({
                        color: 0xddaa77,
                        specular: 0x222222,
                        shininess: 10
                    });
                    
                case 'terrestrial':
                default:
                    // Random color for generic planets
                    const color = new THREE.Color(
                        0.5 + Math.random() * 0.5,
                        0.5 + Math.random() * 0.5,
                        0.5 + Math.random() * 0.5
                    );
                    
                    return new THREE.MeshPhongMaterial({
                        color: color,
                        specular: 0x333333,
                        shininess: 15
                    });
            }
        } catch (error) {
            console.error("Error creating planet material:", error);
                        
            // Fallback to a simple material
            return new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
        }
    }
    
    // PERFORMANCE: Create a simpler material for low detail mode
    createSimpleMaterial() {
        try {
            // Use basic materials without lighting calculations for better performance
            switch (this.textureType) {
                case 'sun':
                    return new THREE.MeshBasicMaterial({
                        color: 0xffff00
                    });
                    
                            case 'earth':
                    return new THREE.MeshBasicMaterial({
                        color: 0x2233ff
                    });
                                
                            case 'mars':
                    return new THREE.MeshBasicMaterial({
                        color: 0xaa3300
                    });
                    
                case 'venus':
                    return new THREE.MeshBasicMaterial({
                        color: 0xddaa88
                    });
                    
                case 'mercury':
                    return new THREE.MeshBasicMaterial({
                        color: 0x888888
                    });
                                
                            case 'jupiter':
                    return new THREE.MeshBasicMaterial({
                        color: 0xddaa77
                    });
                    
                case 'saturn':
                    return new THREE.MeshBasicMaterial({
                        color: 0xddcc88
                    });
                                
                            case 'ice':
                    return new THREE.MeshBasicMaterial({
                        color: 0x88aadd
                    });
                    
                case 'moon':
                    return new THREE.MeshBasicMaterial({
                        color: 0xaaaaaa
                    });
                                
                            default:
                    // Random color for generic planets
                    const color = new THREE.Color(
                        0.5 + Math.random() * 0.5,
                        0.5 + Math.random() * 0.5,
                        0.5 + Math.random() * 0.5
                    );
                    
                    return new THREE.MeshBasicMaterial({
                                color: color
                            });
                        }
        } catch (error) {
            console.error("Error creating simple material:", error);
            
            // Fallback to a very simple material
            return new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
            }
        }
        
    createRings() {
        try {
            // PERFORMANCE: Skip rings in low detail mode for small planets
            if (this.lowDetail && this.radius < 100) {
                return;
            }
            
            // PERFORMANCE: Adjust ring detail based on detail level
            const segments = this.lowDetail ? 32 : 64;
            
            // Create ring geometry
            const innerRadius = this.radius * 1.2;
            const outerRadius = this.radius * 2;
            const thetaSegments = segments;
            
            const geometry = new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments);
            
            // Rotate ring geometry to be horizontal
            geometry.rotateX(Math.PI / 2);
            
            // Create material
            const material = new THREE.MeshBasicMaterial({
                color: 0xaaaaaa,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });
            
            // Create mesh
            this.rings = new THREE.Mesh(geometry, material);
            this.rings.position.copy(this.position);
            
            // Add to scene
            this.scene.add(this.rings);
        } catch (error) {
            console.error("Error creating planet rings:", error);
        }
    }
    
    createAtmosphere() {
        try {
            // PERFORMANCE: Skip atmosphere in low detail mode
            if (this.lowDetail) {
                return;
            }
            
            // Create atmosphere geometry slightly larger than planet
            const geometry = new THREE.SphereGeometry(this.radius * 1.05, 32, 32);
            
            // Create material
            let atmosphereColor;
            
            if (this.textureType === 'earth') {
                atmosphereColor = 0x88aaff; // Blue for Earth
            } else if (this.textureType === 'venus') {
                atmosphereColor = 0xddaa88; // Yellowish for Venus
            } else {
                atmosphereColor = 0xaaaaff; // Default blue-ish
            }
            
            const material = new THREE.MeshBasicMaterial({
                color: atmosphereColor,
                transparent: true,
                opacity: 0.2,
                side: THREE.BackSide
            });
            
            // Create mesh
            this.atmosphere = new THREE.Mesh(geometry, material);
            this.atmosphere.position.copy(this.position);
            
            // Add to scene
            this.scene.add(this.atmosphere);
        } catch (error) {
            console.error("Error creating planet atmosphere:", error);
        }
    }
    
    createMoons() {
        try {
            // PERFORMANCE: Skip moons in low detail mode
            if (this.lowDetail) {
                return;
            }
            
            // Create the specified number of moons
            for (let i = 0; i < this.moonCount; i++) {
                // Calculate moon size (smaller than planet)
                const moonRadius = this.radius * (0.1 + Math.random() * 0.2);
                
                // Calculate orbit distance
                const orbitDistance = this.radius * (2 + Math.random() * 3);
                
                // Calculate random position on orbit
                const angle = Math.random() * Math.PI * 2;
                const x = this.position.x + Math.cos(angle) * orbitDistance;
                const y = this.position.y + (Math.random() - 0.5) * orbitDistance * 0.3; // Slight inclination
                const z = this.position.z + Math.sin(angle) * orbitDistance;
                
                // Create moon geometry
                const geometry = new THREE.SphereGeometry(moonRadius, 16, 16);
                
                // Create material
                const material = new THREE.MeshPhongMaterial({
                    color: 0xaaaaaa,
                    specular: 0x111111,
                    shininess: 5
                });
                
                // Create mesh
                const moon = new THREE.Mesh(geometry, material);
                moon.position.set(x, y, z);
                
                // Store orbit data
                moon.userData = {
                    orbitCenter: this.position.clone(),
                    orbitDistance: orbitDistance,
                    orbitSpeed: 0.001 + Math.random() * 0.003,
                    orbitAngle: angle,
                    orbitInclination: Math.random() * 0.3
                };
                
                // Add to scene and track
                this.scene.add(moon);
                this.moons.push(moon);
            }
        } catch (error) {
            console.error("Error creating planet moons:", error);
        }
    }
    
    update(delta) {
        try {
            // Skip update if mesh doesn't exist
            if (!this.mesh) return;
            
            // Update rotation
            this.updateRotation(delta);
            
            // Update moons
            this.updateMoons(delta);
            
            // PERFORMANCE: Update LOD based on distance to camera
            this.updateLOD();
        } catch (error) {
            console.error("Error updating planet:", error);
        }
    }
    
    updateRotation(delta) {
        try {
            // Skip if mesh doesn't exist
            if (!this.mesh) return;
            
        // Rotate the planet
            this.mesh.rotation.y += this.rotationSpeed * delta;
        
            // Rotate rings if they exist
            if (this.rings) {
                this.rings.rotation.z += this.rotationSpeed * 0.3 * delta;
            }
        } catch (error) {
            console.error("Error updating planet rotation:", error);
        }
    }
    
    updateMoons(delta) {
        try {
            // Update each moon's position
            for (const moon of this.moons) {
                const userData = moon.userData;
                
                // Update orbit angle
                userData.orbitAngle += userData.orbitSpeed * delta;
                
                // Calculate new position
                const x = userData.orbitCenter.x + Math.cos(userData.orbitAngle) * userData.orbitDistance;
                const y = userData.orbitCenter.y + Math.sin(userData.orbitAngle * userData.orbitInclination) * userData.orbitDistance * 0.3;
                const z = userData.orbitCenter.z + Math.sin(userData.orbitAngle) * userData.orbitDistance;
                
                // Update position
                moon.position.set(x, y, z);
                
                // Rotate the moon
                moon.rotation.y += userData.orbitSpeed * 2 * delta;
            }
        } catch (error) {
            console.error("Error updating planet moons:", error);
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
            
            // If LOD changed, update geometry
            if (newLOD !== this.currentLOD) {
                this.currentLOD = newLOD;
                this.updateGeometryForLOD();
            }
        } catch (error) {
            console.error("Error updating planet LOD:", error);
        }
    }
    
    // PERFORMANCE: Update geometry based on current LOD level
    updateGeometryForLOD() {
        try {
            // Skip if mesh doesn't exist
            if (!this.mesh) return;
            
            // Skip for very distant objects to avoid unnecessary updates
            if (this.distanceToCamera > 10000) return;
            
            // Calculate segments based on LOD
            let segments;
            
            switch (this.currentLOD) {
                case 0: // Highest detail
                    segments = this.calculateSegments();
                    break;
                case 1: // Medium detail
                    segments = Math.max(16, Math.floor(this.calculateSegments() * 0.75));
                    break;
                case 2: // Low detail
                    segments = Math.max(12, Math.floor(this.calculateSegments() * 0.5));
                    break;
                case 3: // Lowest detail
                    segments = Math.max(8, Math.floor(this.calculateSegments() * 0.25));
                    break;
                default:
                    segments = 16;
            }
            
            // Only update if the planet is important (like Earth or the Sun)
            // or if it's relatively close to avoid unnecessary geometry updates
            const isImportantPlanet = this.name === 'Earth' || this.name === 'Sun' || this.name === 'Moon';
            
            if (isImportantPlanet || this.distanceToCamera < 3000) {
                // Store current rotation
                const rotation = this.mesh.rotation.clone();
                
                // Create new geometry
                const newGeometry = new THREE.SphereGeometry(this.radius, segments, segments);
                
                // Store old geometry for disposal
                const oldGeometry = this.mesh.geometry;
                
                // Update mesh with new geometry
                this.mesh.geometry = newGeometry;
                
                // Restore rotation
                this.mesh.rotation.copy(rotation);
                
                // Dispose of old geometry
                if (oldGeometry && typeof oldGeometry.dispose === 'function') {
                    oldGeometry.dispose();
                }
            }
        } catch (error) {
            console.error("Error updating planet geometry for LOD:", error);
        }
    }
    
    // Getters for position and other properties
    get position() {
        return this.mesh ? this.mesh.position : this._position;
    }
    
    set position(value) {
        this._position = value.clone();
        if (this.mesh) {
            this.mesh.position.copy(value);
        }
        if (this.rings) {
            this.rings.position.copy(value);
        }
        if (this.atmosphere) {
            this.atmosphere.position.copy(value);
        }
    }
    
    // Clean up resources
    dispose() {
        try {
            // Remove from scene
            if (this.mesh) {
                this.scene.remove(this.mesh);
                if (this.mesh.geometry) {
                    this.mesh.geometry.dispose();
                }
                if (this.mesh.material) {
                    if (Array.isArray(this.mesh.material)) {
                        this.mesh.material.forEach(material => material.dispose());
                    } else {
                        this.mesh.material.dispose();
                    }
                }
            }
            
            // Clean up rings
            if (this.rings) {
                this.scene.remove(this.rings);
                if (this.rings.geometry) {
                    this.rings.geometry.dispose();
                }
                if (this.rings.material) {
                    this.rings.material.dispose();
                }
            }
            
            // Clean up atmosphere
            if (this.atmosphere) {
                this.scene.remove(this.atmosphere);
                if (this.atmosphere.geometry) {
                    this.atmosphere.geometry.dispose();
                }
                if (this.atmosphere.material) {
                    this.atmosphere.material.dispose();
                }
            }
            
            // Clean up moons
            for (const moon of this.moons) {
                this.scene.remove(moon);
                if (moon.geometry) {
                    moon.geometry.dispose();
                }
                if (moon.material) {
                    moon.material.dispose();
                }
            }
            
            // Clear arrays
            this.moons = [];
        } catch (error) {
            console.error("Error disposing planet:", error);
        }
    }
} 