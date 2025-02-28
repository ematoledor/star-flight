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
                    // Create a glowing sun with emissive material
                    const sunMaterial = new THREE.MeshBasicMaterial({
                        color: 0xffff00,
                        emissive: 0xffaa00,
                        emissiveIntensity: 1
                    });
                    
                    // Add surface details to the sun
                    this.addSurfaceFeatures('sun');
                    
                    return sunMaterial;
                    
                case 'earth':
                    // Create Earth with blue oceans and green/brown landmasses
                    const earthMaterial = new THREE.MeshPhongMaterial({
                        color: 0x2233ff,
                        specular: 0x333333,
                        shininess: 15
                    });
                    
                    // Add surface details to Earth
                    this.addSurfaceFeatures('earth');
                    
                    return earthMaterial;
                    
                case 'mars':
                    // Create Mars with reddish surface and polar caps
                    const marsMaterial = new THREE.MeshPhongMaterial({
                        color: 0xaa3300,
                        specular: 0x222222,
                        shininess: 5
                    });
                    
                    // Add surface details to Mars
                    this.addSurfaceFeatures('mars');
                    
                    return marsMaterial;
                    
                case 'venus':
                    // Create Venus with yellowish clouds
                    const venusMaterial = new THREE.MeshPhongMaterial({
                        color: 0xddaa88,
                        specular: 0x222222,
                        shininess: 10
                    });
                    
                    // Add surface details to Venus
                    this.addSurfaceFeatures('venus');
                    
                    return venusMaterial;
                    
                case 'mercury':
                    // Create Mercury with cratered surface
                    const mercuryMaterial = new THREE.MeshPhongMaterial({
                        color: 0x888888,
                        specular: 0x222222,
                        shininess: 20
                    });
                    
                    // Add surface details to Mercury
                    this.addSurfaceFeatures('mercury');
                    
                    return mercuryMaterial;
                    
                case 'jupiter':
                    // Create Jupiter with banded clouds
                    const jupiterMaterial = new THREE.MeshPhongMaterial({
                        color: 0xddaa77,
                        specular: 0x222222,
                        shininess: 10
                    });
                    
                    // Add surface details to Jupiter
                    this.addSurfaceFeatures('jupiter');
                    
                    return jupiterMaterial;
                    
                case 'saturn':
                    // Create Saturn with banded clouds
                    const saturnMaterial = new THREE.MeshPhongMaterial({
                        color: 0xddcc88,
                        specular: 0x222222,
                        shininess: 10
                    });
                    
                    // Add surface details to Saturn
                    this.addSurfaceFeatures('saturn');
                    
                    return saturnMaterial;
                    
                case 'ice':
                    // Create ice planet with blue-white surface
                    const iceMaterial = new THREE.MeshPhongMaterial({
                        color: 0x88aadd,
                        specular: 0x333333,
                        shininess: 30
                    });
                    
                    // Add surface details to ice planet
                    this.addSurfaceFeatures('ice');
                    
                    return iceMaterial;
                    
                case 'moon':
                    // Create moon with cratered surface
                    const moonMaterial = new THREE.MeshPhongMaterial({
                        color: 0xaaaaaa,
                        specular: 0x111111,
                        shininess: 5
                    });
                    
                    // Add surface details to moon
                    this.addSurfaceFeatures('moon');
                    
                    return moonMaterial;
                    
                case 'gas-giant':
                    // Create gas giant with banded clouds
                    const gasGiantMaterial = new THREE.MeshPhongMaterial({
                        color: 0xddaa77,
                        specular: 0x222222,
                        shininess: 10
                    });
                    
                    // Add surface details to gas giant
                    this.addSurfaceFeatures('gas-giant');
                    
                    return gasGiantMaterial;
                    
                case 'terrestrial':
                default:
                    // Random color for generic planets
                    const color = new THREE.Color(
                        0.5 + Math.random() * 0.5,
                        0.5 + Math.random() * 0.5,
                        0.5 + Math.random() * 0.5
                    );
                    
                    const terrestrialMaterial = new THREE.MeshPhongMaterial({
                        color: color,
                        specular: 0x333333,
                        shininess: 15
                    });
                    
                    // Add surface details to terrestrial planet
                    this.addSurfaceFeatures('terrestrial');
                    
                    return terrestrialMaterial;
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
            
            // Update cloud bands if they exist
            this.updateCloudBands(delta);
            
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

    // Add this new method to create surface features
    addSurfaceFeatures(planetType) {
        try {
            // Skip if in low detail mode
            if (this.lowDetail) return;
            
            // Create a group to hold all surface features
            this.surfaceFeatures = new THREE.Group();
            
            switch (planetType) {
                case 'sun':
                    // Add solar flares and prominences
                    this.addSolarFeatures();
                    break;
                    
                case 'earth':
                    // Add continents and clouds
                    this.addContinents();
                    this.addClouds(0.1); // Thin cloud layer
                    break;
                    
                case 'mars':
                    // Add craters and canyons
                    this.addCraters(15);
                    this.addPolarCaps();
                    break;
                    
                case 'venus':
                    // Add thick cloud cover
                    this.addClouds(0.3); // Thick cloud layer
                    break;
                    
                case 'mercury':
                    // Add many craters
                    this.addCraters(25);
                    break;
                    
                case 'jupiter':
                case 'saturn':
                case 'gas-giant':
                    // Add cloud bands
                    this.addCloudBands();
                    break;
                    
                case 'ice':
                    // Add ice cracks and ridges
                    this.addIceFeatures();
                    break;
                    
                case 'moon':
                    // Add craters
                    this.addCraters(20);
                    break;
                    
                case 'terrestrial':
                default:
                    // Add random features
                    if (Math.random() > 0.5) this.addContinents();
                    if (Math.random() > 0.7) this.addClouds(0.1);
                    if (Math.random() > 0.6) this.addCraters(10);
                    break;
            }
        } catch (error) {
            console.error("Error adding surface features:", error);
        }
    }

    addSolarFeatures() {
        try {
            // Add solar flares
            const flareCount = 5 + Math.floor(Math.random() * 5);
            
            for (let i = 0; i < flareCount; i++) {
                // Create a solar flare
                const flareGeometry = new THREE.ConeGeometry(
                    this.radius * 0.1, 
                    this.radius * 0.5, 
                    8
                );
                
                const flareMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    transparent: true,
                    opacity: 0.7
                });
                
                const flare = new THREE.Mesh(flareGeometry, flareMaterial);
                
                // Position randomly on the surface
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                flare.position.x = this.radius * Math.sin(phi) * Math.cos(theta);
                flare.position.y = this.radius * Math.sin(phi) * Math.sin(theta);
                flare.position.z = this.radius * Math.cos(phi);
                
                // Point outward from the center
                flare.lookAt(flare.position.clone().multiplyScalar(2));
                
                // Add to the mesh
                this.mesh.add(flare);
            }
            
            // Add corona effect
            const coronaGeometry = new THREE.SphereGeometry(this.radius * 1.2, 32, 32);
            const coronaMaterial = new THREE.MeshBasicMaterial({
                color: 0xffdd00,
                transparent: true,
                opacity: 0.2,
                side: THREE.BackSide
            });
            
            const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
            this.mesh.add(corona);
        } catch (error) {
            console.error("Error adding solar features:", error);
        }
    }

    addContinents() {
        try {
            // Add 3-7 continent-like bumps
            const continentCount = 3 + Math.floor(Math.random() * 5);
            
            for (let i = 0; i < continentCount; i++) {
                // Create a continent
                const size = this.radius * (0.2 + Math.random() * 0.3);
                const height = this.radius * 0.05;
                
                const continentGeometry = new THREE.SphereGeometry(size, 16, 16);
                const continentMaterial = new THREE.MeshPhongMaterial({
                    color: 0x228833, // Green for land
                    shininess: 5
                });
                
                const continent = new THREE.Mesh(continentGeometry, continentMaterial);
                
                // Position randomly on the surface
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                const surfaceX = this.radius * Math.sin(phi) * Math.cos(theta);
                const surfaceY = this.radius * Math.sin(phi) * Math.sin(theta);
                const surfaceZ = this.radius * Math.cos(phi);
                
                // Position slightly above the surface
                continent.position.set(
                    surfaceX * 1.02,
                    surfaceY * 1.02,
                    surfaceZ * 1.02
                );
                
                // Add to the mesh
                this.mesh.add(continent);
            }
        } catch (error) {
            console.error("Error adding continents:", error);
        }
    }

    addClouds(density) {
        try {
            // Create cloud layer
            const cloudGeometry = new THREE.SphereGeometry(
                this.radius * 1.05, 
                Math.max(16, Math.floor(this.calculateSegments() * 0.75)), 
                Math.max(12, Math.floor(this.calculateSegments() * 0.5))
            );
            
            const cloudMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.5,
                alphaTest: 0.1
            });
            
            const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
            
            // Create cloud pattern by making parts of the sphere transparent
            const positions = cloudGeometry.attributes.position;
            const cloudPattern = new Float32Array(positions.count);
            
            for (let i = 0; i < positions.count; i++) {
                // Random cloud pattern
                cloudPattern[i] = Math.random() < density ? 1.0 : 0.0;
            }
            
            // Add the pattern as a custom attribute
            cloudGeometry.setAttribute('cloudPattern', new THREE.BufferAttribute(cloudPattern, 1));
            
            // Add to the mesh
            this.mesh.add(clouds);
            
            // Store for animation
            this.clouds = clouds;
        } catch (error) {
            console.error("Error adding clouds:", error);
        }
    }

    addCraters(count) {
        try {
            // Add craters
            for (let i = 0; i < count; i++) {
                // Create a crater (ring geometry)
                const craterSize = this.radius * (0.05 + Math.random() * 0.15);
                const craterGeometry = new THREE.RingGeometry(
                    craterSize * 0.7, 
                    craterSize, 
                    16
                );
                
                const craterMaterial = new THREE.MeshBasicMaterial({
                    color: 0x555555,
                    side: THREE.DoubleSide
                });
                
                const crater = new THREE.Mesh(craterGeometry, craterMaterial);
                
                // Position randomly on the surface
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                const surfaceX = this.radius * Math.sin(phi) * Math.cos(theta);
                const surfaceY = this.radius * Math.sin(phi) * Math.sin(theta);
                const surfaceZ = this.radius * Math.cos(phi);
                
                crater.position.set(
                    surfaceX * 1.01,
                    surfaceY * 1.01,
                    surfaceZ * 1.01
                );
                
                // Orient to face outward
                crater.lookAt(crater.position.clone().multiplyScalar(2));
                
                // Add to the mesh
                this.mesh.add(crater);
            }
        } catch (error) {
            console.error("Error adding craters:", error);
        }
    }

    addPolarCaps() {
        try {
            // Add north polar cap
            const northCapGeometry = new THREE.SphereGeometry(
                this.radius * 0.3, 
                16, 
                16, 
                0, 
                Math.PI * 2, 
                0, 
                Math.PI / 6
            );
            
            const polarCapMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff
            });
            
            const northCap = new THREE.Mesh(northCapGeometry, polarCapMaterial);
            northCap.position.y = this.radius * 0.9;
            
            // Add south polar cap
            const southCapGeometry = new THREE.SphereGeometry(
                this.radius * 0.3, 
                16, 
                16, 
                0, 
                Math.PI * 2, 
                Math.PI - Math.PI / 6, 
                Math.PI / 6
            );
            
            const southCap = new THREE.Mesh(southCapGeometry, polarCapMaterial);
            southCap.position.y = -this.radius * 0.9;
            
            // Add to the mesh
            this.mesh.add(northCap);
            this.mesh.add(southCap);
        } catch (error) {
            console.error("Error adding polar caps:", error);
        }
    }

    addCloudBands() {
        try {
            // Add 3-7 cloud bands
            const bandCount = 3 + Math.floor(Math.random() * 5);
            
            // Create bands with different colors
            const bandColors = [
                0xddaa77, // Base color
                0xccaa88, // Lighter
                0xbb9966, // Darker
                0xeebb88, // More orange
                0xddbb99  // More yellow
            ];
            
            for (let i = 0; i < bandCount; i++) {
                // Calculate band position (latitude)
                const latitude = (Math.random() * 2 - 1) * Math.PI / 2;
                const bandWidth = Math.PI / (8 + Math.random() * 8);
                
                // Create a band (partial sphere)
                const bandGeometry = new THREE.SphereGeometry(
                    this.radius * 1.01, 
                    32, 
                    16, 
                    0, 
                    Math.PI * 2, 
                    latitude - bandWidth/2, 
                    bandWidth
                );
                
                const bandMaterial = new THREE.MeshPhongMaterial({
                    color: bandColors[i % bandColors.length],
                    transparent: true,
                    opacity: 0.8
                });
                
                const band = new THREE.Mesh(bandGeometry, bandMaterial);
                
                // Add to the mesh
                this.mesh.add(band);
                
                // Store for animation if needed
                if (!this.cloudBands) this.cloudBands = [];
                this.cloudBands.push({
                    mesh: band,
                    rotationSpeed: (Math.random() * 2 - 1) * 0.0005 // Random speed and direction
                });
            }
            
            // Add the Great Red Spot for Jupiter
            if (this.textureType === 'jupiter') {
                const spotGeometry = new THREE.SphereGeometry(this.radius * 0.2, 16, 16);
                const spotMaterial = new THREE.MeshPhongMaterial({
                    color: 0xdd4422,
                    transparent: true,
                    opacity: 0.9
                });
                
                const spot = new THREE.Mesh(spotGeometry, spotMaterial);
                
                // Position the spot
                const spotTheta = Math.random() * Math.PI * 2;
                const spotPhi = (Math.random() * 0.4 - 0.2) + Math.PI / 2; // Near equator
                
                spot.position.x = this.radius * 1.02 * Math.sin(spotPhi) * Math.cos(spotTheta);
                spot.position.y = this.radius * 1.02 * Math.sin(spotPhi) * Math.sin(spotTheta);
                spot.position.z = this.radius * 1.02 * Math.cos(spotPhi);
                
                // Flatten the spot
                spot.scale.y = 0.3;
                
                // Add to the mesh
                this.mesh.add(spot);
            }
        } catch (error) {
            console.error("Error adding cloud bands:", error);
        }
    }

    addIceFeatures() {
        try {
            // Add ice cracks
            const crackCount = 5 + Math.random() * 10;
            
            for (let i = 0; i < crackCount; i++) {
                // Create a crack
                const crackLength = this.radius * (0.5 + Math.random() * 1.0);
                const crackWidth = this.radius * 0.02;
                
                const crackGeometry = new THREE.BoxGeometry(crackWidth, crackWidth, crackLength);
                const crackMaterial = new THREE.MeshBasicMaterial({
                    color: 0x66ccff,
                    transparent: true,
                    opacity: 0.7
                });
                
                const crack = new THREE.Mesh(crackGeometry, crackMaterial);
                
                // Position randomly on the surface
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                const surfaceX = this.radius * Math.sin(phi) * Math.cos(theta);
                const surfaceY = this.radius * Math.sin(phi) * Math.sin(theta);
                const surfaceZ = this.radius * Math.cos(phi);
                
                crack.position.set(
                    surfaceX * 1.01,
                    surfaceY * 1.01,
                    surfaceZ * 1.01
                );
                
                // Orient along the surface
                crack.lookAt(crack.position.clone().multiplyScalar(2));
                
                // Random rotation around the normal
                crack.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI * 2);
                
                // Add to the mesh
                this.mesh.add(crack);
            }
        } catch (error) {
            console.error("Error adding ice features:", error);
        }
    }

    // Add this new method to update cloud bands
    updateCloudBands(delta) {
        try {
            // Update cloud band rotation if they exist
            if (this.cloudBands) {
                this.cloudBands.forEach(band => {
                    band.mesh.rotation.y += band.rotationSpeed * delta;
                });
            }
            
            // Rotate clouds if they exist
            if (this.clouds) {
                this.clouds.rotation.y += 0.0001 * delta;
            }
        } catch (error) {
            console.error("Error updating cloud bands:", error);
        }
    }
} 