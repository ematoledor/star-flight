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
                        emissiveIntensity: 1.5
                    });
                    
                    // Add surface details to the sun
                    this.addSurfaceFeatures('sun');
                    
                    // Add a point light to make the sun illuminate other objects
                    this.addLightSource(0xffffaa, this.radius * 20, 2);
                    
                    return sunMaterial;
                    
                case 'earth':
                    // Create Earth with blue oceans and green/brown landmasses
                    const earthMaterial = new THREE.MeshPhongMaterial({
                        color: 0x2233ff,
                        specular: 0x333333,
                        shininess: 15,
                        emissive: 0x001122,
                        emissiveIntensity: 0.2
                    });
                    
                    // Add surface details to Earth
                    this.addSurfaceFeatures('earth');
                    
                    // Add a subtle light to Earth
                    this.addLightSource(0x6688ff, this.radius * 5, 0.3);
                    
                    return earthMaterial;
                    
                case 'mars':
                    // Create Mars with reddish surface and polar caps
                    const marsMaterial = new THREE.MeshPhongMaterial({
                        color: 0xaa3300,
                        specular: 0x222222,
                        shininess: 5,
                        emissive: 0x551100,
                        emissiveIntensity: 0.2
                    });
                    
                    // Add surface details to Mars
                    this.addSurfaceFeatures('mars');
                    
                    // Add a subtle light to Mars
                    this.addLightSource(0xaa5522, this.radius * 5, 0.3);
                    
                    return marsMaterial;
                    
                case 'venus':
                    // Create Venus with yellowish clouds
                    const venusMaterial = new THREE.MeshPhongMaterial({
                        color: 0xddaa88,
                        specular: 0x222222,
                        shininess: 10,
                        emissive: 0x553311,
                        emissiveIntensity: 0.3
                    });
                    
                    // Add surface details to Venus
                    this.addSurfaceFeatures('venus');
                    
                    // Add a subtle light to Venus
                    this.addLightSource(0xddaa88, this.radius * 5, 0.4);
                    
                    return venusMaterial;
                    
                case 'mercury':
                    // Create Mercury with cratered surface
                    const mercuryMaterial = new THREE.MeshPhongMaterial({
                        color: 0x888888,
                        specular: 0x222222,
                        shininess: 20,
                        emissive: 0x333333,
                        emissiveIntensity: 0.2
                    });
                    
                    // Add surface details to Mercury
                    this.addSurfaceFeatures('mercury');
                    
                    // Add a subtle light to Mercury
                    this.addLightSource(0x888888, this.radius * 4, 0.2);
                    
                    return mercuryMaterial;
                    
                case 'jupiter':
                    // Create Jupiter with banded clouds
                    const jupiterMaterial = new THREE.MeshPhongMaterial({
                        color: 0xddaa77,
                        specular: 0x222222,
                        shininess: 10,
                        emissive: 0x553311,
                        emissiveIntensity: 0.3
                    });
                    
                    // Add surface details to Jupiter
                    this.addSurfaceFeatures('jupiter');
                    
                    // Add a subtle light to Jupiter
                    this.addLightSource(0xddaa77, this.radius * 8, 0.5);
                    
                    return jupiterMaterial;
                    
                case 'saturn':
                    // Create Saturn with banded clouds
                    const saturnMaterial = new THREE.MeshPhongMaterial({
                        color: 0xddcc88,
                        specular: 0x222222,
                        shininess: 10,
                        emissive: 0x554422,
                        emissiveIntensity: 0.3
                    });
                    
                    // Add surface details to Saturn
                    this.addSurfaceFeatures('saturn');
                    
                    // Add a subtle light to Saturn
                    this.addLightSource(0xddcc88, this.radius * 8, 0.5);
                    
                    return saturnMaterial;
                    
                case 'ice':
                    // Create ice planet with blue-white surface
                    const iceMaterial = new THREE.MeshPhongMaterial({
                        color: 0x88aadd,
                        specular: 0x333333,
                        shininess: 30,
                        emissive: 0x223344,
                        emissiveIntensity: 0.3
                    });
                    
                    // Add surface details to ice planet
                    this.addSurfaceFeatures('ice');
                    
                    // Add a subtle light to the ice planet
                    this.addLightSource(0x88aadd, this.radius * 5, 0.4);
                    
                    return iceMaterial;
                    
                case 'moon':
                    // Create moon with cratered surface
                    const moonMaterial = new THREE.MeshPhongMaterial({
                        color: 0xaaaaaa,
                        specular: 0x111111,
                        shininess: 5,
                        emissive: 0x222222,
                        emissiveIntensity: 0.1
                    });
                    
                    // Add surface details to moon
                    this.addSurfaceFeatures('moon');
                    
                    // Add a very subtle light to the moon
                    this.addLightSource(0xaaaaaa, this.radius * 3, 0.2);
                    
                    return moonMaterial;
                    
                case 'gas-giant':
                    // Create gas giant with banded clouds
                    const gasGiantMaterial = new THREE.MeshPhongMaterial({
                        color: 0xddaa77,
                        specular: 0x222222,
                        shininess: 10,
                        emissive: 0x553311,
                        emissiveIntensity: 0.3
                    });
                    
                    // Add surface details to gas giant
                    this.addSurfaceFeatures('gas-giant');
                    
                    // Add a subtle light to the gas giant
                    this.addLightSource(0xddaa77, this.radius * 8, 0.5);
                    
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
                        shininess: 15,
                        emissive: color.clone().multiplyScalar(0.2),
                        emissiveIntensity: 0.2
                    });
                    
                    // Add surface details to terrestrial planet
                    this.addSurfaceFeatures('terrestrial');
                    
                    // Add a subtle light to the terrestrial planet
                    this.addLightSource(color, this.radius * 5, 0.3);
                    
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
            
            // Update corona layers for sun
            this.updateCoronaLayers(delta);
            
            // Update storms for gas giants
            this.updateStorms(delta);
            
            // Update ocean glow for Earth-like planets
            this.updateOceanGlow(delta);
            
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
                    // Add solar flares and prominences with enhanced glow
                    this.addSolarFeatures();
                    
                    // Add a pulsing corona effect
                    this.addPulsingCorona();
                    break;
                    
                case 'earth':
                    // Add continents and clouds with more detail
                    this.addContinents(0.7); // Higher density
                    this.addClouds(0.2); // Thicker cloud layer
                    this.addOceanGlow(); // Add subtle ocean glow
                    break;
                    
                case 'mars':
                    // Add craters, canyons and enhanced polar caps
                    this.addCraters(20);
                    this.addPolarCaps();
                    this.addCanyons(); // Add Valles Marineris-like canyons
                    break;
                    
                case 'venus':
                    // Add thick cloud cover with swirling patterns
                    this.addClouds(0.4); // Very thick cloud layer
                    this.addVolcanicFeatures(); // Add volcanic features
                    break;
                    
                case 'mercury':
                    // Add many craters and surface cracks
                    this.addCraters(30);
                    this.addSurfaceCracks();
                    break;
                    
                case 'jupiter':
                case 'saturn':
                case 'gas-giant':
                    // Add cloud bands with dynamic swirling patterns
                    this.addCloudBands();
                    this.addStorms(); // Add storm systems
                    break;
                    
                case 'ice':
                    // Add ice cracks, ridges and crystalline structures
                    this.addIceFeatures();
                    this.addCrystallineStructures();
                    break;
                    
                case 'moon':
                    // Add craters and subtle surface details
                    this.addCraters(25);
                    this.addLunarMaria(); // Add dark maria regions
                    break;
                    
                case 'terrestrial':
                default:
                    // Add random features with more variety
                    if (Math.random() > 0.4) this.addContinents(0.5 + Math.random() * 0.3);
                    if (Math.random() > 0.5) this.addClouds(0.1 + Math.random() * 0.2);
                    if (Math.random() > 0.4) this.addCraters(5 + Math.floor(Math.random() * 15));
                    if (Math.random() > 0.7) this.addVolcanicFeatures();
                    break;
            }
            
            // Add a subtle ambient occlusion effect to enhance depth perception
            this.addAmbientOcclusion();
        } catch (error) {
            console.error("Error adding surface features:", error);
        }
    }

    // Add a pulsing corona effect for the sun
    addPulsingCorona() {
        try {
            // Create multiple corona layers with different sizes and opacities
            for (let i = 0; i < 3; i++) {
                const size = 1.3 + (i * 0.3); // Increasing sizes
                const coronaGeometry = new THREE.SphereGeometry(this.radius * size, 32, 32);
                const coronaMaterial = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(0xffdd00).lerp(new THREE.Color(0xff5500), i * 0.2),
                    transparent: true,
                    opacity: 0.3 - (i * 0.08),
                    side: THREE.BackSide,
                    blending: THREE.AdditiveBlending
                });
                
                const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
                this.mesh.add(corona);
                
                // Store for animation
                if (!this.coronaLayers) this.coronaLayers = [];
                this.coronaLayers.push({
                    mesh: corona,
                    baseSize: size,
                    pulseSpeed: 0.0005 + (Math.random() * 0.0005),
                    pulsePhase: Math.random() * Math.PI * 2
                });
            }
        } catch (error) {
            console.error("Error adding pulsing corona:", error);
        }
    }

    // Add canyons to Mars-like planets
    addCanyons() {
        try {
            // Create a large canyon (like Valles Marineris)
            const canyonWidth = this.radius * 0.1;
            const canyonLength = this.radius * 1.2;
            const canyonDepth = this.radius * 0.05;
            
            const canyonGeometry = new THREE.BoxGeometry(canyonWidth, canyonDepth, canyonLength);
            const canyonMaterial = new THREE.MeshStandardMaterial({
                color: 0x551100,
                roughness: 0.9,
                metalness: 0.1,
                emissive: 0x220500,
                emissiveIntensity: 0.2
            });
            
            const canyon = new THREE.Mesh(canyonGeometry, canyonMaterial);
            
            // Position on the surface
            const phi = Math.PI / 2; // Equator
            const theta = Math.random() * Math.PI * 2;
            
            canyon.position.x = this.radius * 1.01 * Math.sin(phi) * Math.cos(theta);
            canyon.position.y = this.radius * 1.01 * Math.sin(phi) * Math.sin(theta);
            canyon.position.z = this.radius * 1.01 * Math.cos(phi);
            
            // Orient along the surface
            canyon.lookAt(canyon.position.clone().multiplyScalar(2));
            
            // Random rotation around the normal
            canyon.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI * 2);
            
            // Add to the mesh
            this.mesh.add(canyon);
        } catch (error) {
            console.error("Error adding canyons:", error);
        }
    }

    // Add volcanic features
    addVolcanicFeatures() {
        try {
            // Add 2-5 volcanoes
            const volcanoCount = 2 + Math.floor(Math.random() * 4);
            
            for (let i = 0; i < volcanoCount; i++) {
                // Create a volcano cone
                const volcanoGeometry = new THREE.ConeGeometry(
                    this.radius * 0.15, 
                    this.radius * 0.2, 
                    16
                );
                
                const volcanoMaterial = new THREE.MeshStandardMaterial({
                    color: 0x554433,
                    roughness: 0.8,
                    metalness: 0.1
                });
                
                const volcano = new THREE.Mesh(volcanoGeometry, volcanoMaterial);
                
                // Position randomly on the surface
                const theta = Math.random() * Math.PI * 2;
                const phi = (Math.random() * 0.8) + 0.1; // Avoid poles
                
                volcano.position.x = this.radius * 0.95 * Math.sin(phi) * Math.cos(theta);
                volcano.position.y = this.radius * 0.95 * Math.sin(phi) * Math.sin(theta);
                volcano.position.z = this.radius * 0.95 * Math.cos(phi);
                
                // Orient to point outward from center
                volcano.lookAt(new THREE.Vector3(0, 0, 0));
                
                // Add lava at the top
                const lavaGeometry = new THREE.CircleGeometry(this.radius * 0.05, 16);
                const lavaMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff3300,
                    emissive: 0xff2200,
                    emissiveIntensity: 1
                });
                
                const lava = new THREE.Mesh(lavaGeometry, lavaMaterial);
                lava.position.y = this.radius * 0.1;
                lava.rotation.x = -Math.PI / 2;
                
                volcano.add(lava);
                
                // Add a point light for the lava
                const lavaLight = new THREE.PointLight(0xff5500, 1, this.radius * 2);
                lavaLight.position.copy(lava.position);
                volcano.add(lavaLight);
                
                // Add to the mesh
                this.mesh.add(volcano);
            }
        } catch (error) {
            console.error("Error adding volcanic features:", error);
        }
    }

    // Add surface cracks (for Mercury and similar planets)
    addSurfaceCracks() {
        try {
            // Add 10-20 surface cracks
            const crackCount = 10 + Math.floor(Math.random() * 11);
            
            for (let i = 0; i < crackCount; i++) {
                // Create a crack
                const crackLength = this.radius * (0.3 + Math.random() * 0.7);
                const crackWidth = this.radius * 0.01;
                const crackDepth = this.radius * 0.01;
                
                const crackGeometry = new THREE.BoxGeometry(crackWidth, crackDepth, crackLength);
                const crackMaterial = new THREE.MeshStandardMaterial({
                    color: 0x333333,
                    roughness: 0.9,
                    metalness: 0.1
                });
                
                const crack = new THREE.Mesh(crackGeometry, crackMaterial);
                
                // Position randomly on the surface
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                crack.position.x = this.radius * 1.01 * Math.sin(phi) * Math.cos(theta);
                crack.position.y = this.radius * 1.01 * Math.sin(phi) * Math.sin(theta);
                crack.position.z = this.radius * 1.01 * Math.cos(phi);
                
                // Orient along the surface
                crack.lookAt(crack.position.clone().multiplyScalar(2));
                
                // Random rotation around the normal
                crack.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI * 2);
                
                // Add to the mesh
                this.mesh.add(crack);
            }
        } catch (error) {
            console.error("Error adding surface cracks:", error);
        }
    }

    // Add storm systems to gas giants
    addStorms() {
        try {
            // Add 2-4 storm systems
            const stormCount = 2 + Math.floor(Math.random() * 3);
            
            for (let i = 0; i < stormCount; i++) {
                // Create a storm (oval shape)
                const stormSize = this.radius * (0.1 + Math.random() * 0.2);
                const stormGeometry = new THREE.SphereGeometry(stormSize, 16, 16);
                
                // Different colors for different storms
                const stormColors = [
                    0xff3300, // Red storm
                    0xffaa00, // Orange storm
                    0xffffff, // White storm
                    0x88aaff  // Blue storm
                ];
                
                const stormMaterial = new THREE.MeshStandardMaterial({
                    color: stormColors[i % stormColors.length],
                    roughness: 0.7,
                    metalness: 0.2,
                    transparent: true,
                    opacity: 0.9
                });
                
                const storm = new THREE.Mesh(stormGeometry, stormMaterial);
                
                // Flatten the storm
                storm.scale.y = 0.3;
                
                // Position on the planet (mostly near equator)
                const theta = Math.random() * Math.PI * 2;
                const phi = (Math.PI / 2) + (Math.random() * 0.6 - 0.3); // Near equator
                
                storm.position.x = this.radius * 1.02 * Math.sin(phi) * Math.cos(theta);
                storm.position.y = this.radius * 1.02 * Math.sin(phi) * Math.sin(theta);
                storm.position.z = this.radius * 1.02 * Math.cos(phi);
                
                // Orient to face outward
                storm.lookAt(storm.position.clone().multiplyScalar(2));
                
                // Add to the mesh
                this.mesh.add(storm);
                
                // Store for animation if needed
                if (!this.storms) this.storms = [];
                this.storms.push({
                    mesh: storm,
                    rotationSpeed: (Math.random() * 2 - 1) * 0.001 // Random speed and direction
                });
            }
        } catch (error) {
            console.error("Error adding storms:", error);
        }
    }

    // Add crystalline structures to ice planets
    addCrystallineStructures() {
        try {
            // Add 5-10 crystal formations
            const crystalCount = 5 + Math.floor(Math.random() * 6);
            
            for (let i = 0; i < crystalCount; i++) {
                // Create a crystal group
                const crystalGroup = new THREE.Group();
                
                // Add 3-6 crystal spikes per formation
                const spikeCount = 3 + Math.floor(Math.random() * 4);
                
                for (let j = 0; j < spikeCount; j++) {
                    const height = this.radius * (0.1 + Math.random() * 0.15);
                    const width = height * 0.2;
                    
                    const crystalGeometry = new THREE.ConeGeometry(width, height, 5);
                    const crystalMaterial = new THREE.MeshStandardMaterial({
                        color: 0xaaddff,
                        roughness: 0.2,
                        metalness: 0.8,
                        transparent: true,
                        opacity: 0.8,
                        emissive: 0x2244aa,
                        emissiveIntensity: 0.3
                    });
                    
                    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
                    
                    // Position within the group
                    const angle = (j / spikeCount) * Math.PI * 2;
                    crystal.position.x = Math.sin(angle) * width * 2;
                    crystal.position.z = Math.cos(angle) * width * 2;
                    
                    // Random height and tilt
                    crystal.position.y = Math.random() * width;
                    crystal.rotation.x = (Math.random() * 0.5 - 0.25) * Math.PI;
                    crystal.rotation.z = (Math.random() * 0.5 - 0.25) * Math.PI;
                    
                    crystalGroup.add(crystal);
                }
                
                // Position the crystal group on the planet surface
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                crystalGroup.position.x = this.radius * 1.01 * Math.sin(phi) * Math.cos(theta);
                crystalGroup.position.y = this.radius * 1.01 * Math.sin(phi) * Math.sin(theta);
                crystalGroup.position.z = this.radius * 1.01 * Math.cos(phi);
                
                // Orient to face outward
                crystalGroup.lookAt(crystalGroup.position.clone().multiplyScalar(2));
                
                // Add to the mesh
                this.mesh.add(crystalGroup);
                
                // Add a subtle light to the crystal formation
                const crystalLight = new THREE.PointLight(0x88aaff, 0.5, this.radius * 0.5);
                crystalLight.position.set(0, height * 0.5, 0);
                crystalGroup.add(crystalLight);
            }
        } catch (error) {
            console.error("Error adding crystalline structures:", error);
        }
    }

    // Add lunar maria (dark patches) to moons
    addLunarMaria() {
        try {
            // Add 3-7 maria
            const mariaCount = 3 + Math.floor(Math.random() * 5);
            
            for (let i = 0; i < mariaCount; i++) {
                // Create a maria (dark patch)
                const size = this.radius * (0.2 + Math.random() * 0.3);
                
                const mariaGeometry = new THREE.CircleGeometry(size, 24);
                const mariaMaterial = new THREE.MeshStandardMaterial({
                    color: 0x333333,
                    roughness: 0.9,
                    metalness: 0.1,
                    side: THREE.DoubleSide
                });
                
                const maria = new THREE.Mesh(mariaGeometry, mariaMaterial);
                
                // Position randomly on the surface
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                maria.position.x = this.radius * 1.01 * Math.sin(phi) * Math.cos(theta);
                maria.position.y = this.radius * 1.01 * Math.sin(phi) * Math.sin(theta);
                maria.position.z = this.radius * 1.01 * Math.cos(phi);
                
                // Orient to face outward
                maria.lookAt(maria.position.clone().multiplyScalar(2));
                
                // Add to the mesh
                this.mesh.add(maria);
            }
        } catch (error) {
            console.error("Error adding lunar maria:", error);
        }
    }

    // Add ocean glow to Earth-like planets
    addOceanGlow() {
        try {
            // Create a slightly larger sphere for the ocean glow
            const oceanGeometry = new THREE.SphereGeometry(this.radius * 1.01, 32, 32);
            const oceanMaterial = new THREE.MeshStandardMaterial({
                color: 0x0066aa,
                roughness: 0.5,
                metalness: 0.8,
                transparent: true,
                opacity: 0.3,
                emissive: 0x003366,
                emissiveIntensity: 0.2
            });
            
            const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
            
            // Add to the mesh
            this.mesh.add(ocean);
            
            // Store for animation if needed
            this.ocean = ocean;
        } catch (error) {
            console.error("Error adding ocean glow:", error);
        }
    }

    // Add ambient occlusion effect to enhance depth perception
    addAmbientOcclusion() {
        try {
            // Skip for certain planet types
            if (this.textureType === 'sun') return;
            
            // Create a slightly larger sphere with a dark material
            const aoGeometry = new THREE.SphereGeometry(this.radius * 1.01, 16, 16);
            const aoMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.2,
                side: THREE.BackSide,
                blending: THREE.MultiplyBlending
            });
            
            const ao = new THREE.Mesh(aoGeometry, aoMaterial);
            
            // Add to the mesh
            this.mesh.add(ao);
        } catch (error) {
            console.error("Error adding ambient occlusion:", error);
        }
    }

    // Add this new method to create surface features
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

    addContinents(density) {
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

    // Add this new method to create a light source for the planet
    addLightSource(color, distance, intensity) {
        try {
            // Skip for low detail mode
            if (this.lowDetail) return;
            
            // Create a point light
            const light = new THREE.PointLight(color, intensity, distance);
            
            // Position at the center of the planet
            light.position.set(0, 0, 0);
            
            // Add to the mesh
            this.mesh.add(light);
            
            // Store for later reference
            this.light = light;
            
            console.log(`Added light source to ${this.name || 'planet'}`);
        } catch (error) {
            console.error("Error adding light source to planet:", error);
        }
    }

    // Add this new method to update corona layers
    updateCoronaLayers(delta) {
        try {
            // Skip if no corona layers
            if (!this.coronaLayers) return;
            
            // Update each corona layer
            this.coronaLayers.forEach(layer => {
                // Calculate pulse factor
                const time = Date.now() * layer.pulseSpeed;
                const pulseFactor = 1 + 0.1 * Math.sin(time + layer.pulsePhase);
                
                // Apply to scale
                layer.mesh.scale.set(pulseFactor, pulseFactor, pulseFactor);
                
                // Slowly rotate
                layer.mesh.rotation.y += 0.0001 * delta;
                layer.mesh.rotation.z += 0.00005 * delta;
            });
        } catch (error) {
            console.error("Error updating corona layers:", error);
        }
    }
    
    // Add this new method to update storms
    updateStorms(delta) {
        try {
            // Skip if no storms
            if (!this.storms) return;
            
            // Update each storm
            this.storms.forEach(storm => {
                // Rotate the storm
                storm.mesh.rotation.z += storm.rotationSpeed * delta;
                
                // Pulse the storm slightly
                const time = Date.now() * 0.001;
                const pulseFactor = 1 + 0.05 * Math.sin(time);
                storm.mesh.scale.x = pulseFactor;
                storm.mesh.scale.z = pulseFactor;
            });
        } catch (error) {
            console.error("Error updating storms:", error);
        }
    }
    
    // Add this new method to update ocean glow
    updateOceanGlow(delta) {
        try {
            // Skip if no ocean
            if (!this.ocean) return;
            
            // Subtle pulsing effect
            const time = Date.now() * 0.0005;
            const pulseFactor = 1 + 0.02 * Math.sin(time);
            
            this.ocean.scale.set(pulseFactor, pulseFactor, pulseFactor);
            
            // Slowly rotate the ocean layer independently
            this.ocean.rotation.y += 0.00005 * delta;
        } catch (error) {
            console.error("Error updating ocean glow:", error);
        }
    }
} 