import * as THREE from 'three';
import { Planet } from '../entities/Planet.js';
import { AlienShip } from '../entities/AlienShip.js';
import { AsteroidField } from '../components/AsteroidField.js';
import { Nebula } from '../components/Nebula.js';
import { Mothership } from '../entities/Mothership.js';
import { SpaceAnomaly } from '../entities/SpaceAnomaly.js';

// Fallback classes in case of import failures
class FallbackAlienShip extends THREE.Object3D {
    constructor(config) {
        super();
        this.position.copy(config.position || new THREE.Vector3(0, 0, 0));
        if (config.scene) {
            config.scene.add(this);
        }
        this.setPatrolRadius = () => {};
        this.setMaxSpeed = () => {};
        this.onDestroyed = () => {};
        this.update = () => {};
    }
}

export class GameWorld {
    constructor(scene, loadingManager, physicsSystem, options = {}) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        this.physicsSystem = physicsSystem;
        
        // Game world state
        this.planets = [];
        this.aliens = [];
        this.motherships = [];
        this.asteroidFields = [];
        this.nebulae = [];
        this.sectors = [];
        this.anomalies = []; // Track space anomalies
        this.currentSector = null;
        
        // PERFORMANCE: Store options for adaptive loading
        this.options = {
            lowEndDevice: options.lowEndDevice || false,
            progressiveLoading: options.progressiveLoading || false,
            viewDistance: options.lowEndDevice ? 5000 : 10000,
            maxVisiblePlanets: options.lowEndDevice ? 5 : 8,
            maxVisibleAsteroids: options.lowEndDevice ? 50 : 200,
            maxVisibleAliens: options.lowEndDevice ? 3 : 10
        };
        
        // PERFORMANCE: Track player position for distance-based loading
        this.playerPosition = new THREE.Vector3(0, 0, 0);
        
        // PERFORMANCE: Object pools for reusing entities
        this.objectPools = {
            asteroids: [],
            particles: []
        };
        
        // Configuration
        this.config = {
            numSectors: 4,  // Limit the number of sectors for better performance
            sectorSize: 2000
        };
        
        // Callbacks
        this.onEnemyDestroyed = null;
        this.onSectorDiscovered = null;
        this.onPlanetDiscovered = null;
        this.onAnomalyDiscovered = null;
        
        // PERFORMANCE: Track loading state
        this.loadingState = {
            solarSystemCreated: false,
            starsCreated: false,
            mothershipsCreated: false
        };
        
        // Initialize with a delay to prevent blocking
        setTimeout(() => this.initialize(), 0);
        
        console.log("GameWorld constructor completed with options:", this.options);
    }
    
    async initialize() {
        try {
            console.log("Initializing game world...");
            
            // Generate star field first for immediate visual feedback
            await this.generateStarField();
            this.loadingState.starsCreated = true;
            
            // Create solar system
            if (this.options.progressiveLoading) {
                // For progressive loading, we'll create the solar system later
                console.log("Solar system will be created progressively");
            } else {
                await this.createSolarSystem();
                this.loadingState.solarSystemCreated = true;
            }
            
            // Create the main mothership carrier near Earth
            const earth = this.planets.find(planet => planet.name === "Earth");
            const mothershipPosition = earth ? 
                new THREE.Vector3(earth.position.x + 300, earth.position.y + 100, earth.position.z + 300) : 
                new THREE.Vector3(0, 200, 0);
            
            this.createMothership(mothershipPosition);
            this.loadingState.mothershipsCreated = true;
            
            // Create sectors with predefined data instead of dynamic generation
            this.sectors = [
                { name: "Solar System", position: new THREE.Vector3(0, 0, 0), difficulty: 1, radius: 3000, isPopulated: true },
                { name: "Alpha Centauri", position: new THREE.Vector3(5000, 0, 0), difficulty: 2, radius: 1500, isPopulated: false },
                { name: "Sirius System", position: new THREE.Vector3(0, 0, 5000), difficulty: 3, radius: 1800, isPopulated: false },
                { name: "Orion Nebula", position: new THREE.Vector3(5000, 0, 5000), difficulty: 4, radius: 2000, isPopulated: false }
            ];
            
            // Set initial sector
            this.setActiveSector(this.sectors[0]);
            
            // Create some wormholes and black holes
            this.createSpaceAnomalies();
            
            // Populate initial sector (origin)
            this.populateSector(this.sectors[0]);
            
            console.log("Game world initialization complete");
            return true;
        } catch (error) {
            console.error("Error initializing game world:", error);
            return false;
        }
    }
    
    // PERFORMANCE: Update player position for distance-based loading
    updatePlayerPosition(position) {
        if (position) {
            this.playerPosition.copy(position);
        }
    }
    
    // Simplified sector creation - no async to avoid loading issues
    createSector(index) {
        // Use predefined sector data instead of dynamic generation
        return this.sectors[index];
    }
    
    setActiveSector(sector) {
        this.currentSector = sector;
        console.log(`Entered sector: ${sector.name}`);
        
        // Create contents for this sector if it hasn't been populated yet
        if (!sector.isPopulated) {
            this.populateSector(sector);
        }
    }
    
    populateSector(sector) {
        try {
            if (!sector) {
                console.error("Cannot populate undefined sector");
                return;
            }
            
            console.log(`Populating sector: ${sector.name}`);
            
            // PERFORMANCE: Limit the number of objects based on device capability
            const planetCount = this.options.lowEndDevice ? 1 : 2;
            const asteroidFieldCount = this.options.lowEndDevice ? 1 : 2;
            const alienCount = this.options.lowEndDevice ? 1 : 3;
            
            // Add planets to the sector
            for (let i = 0; i < planetCount; i++) {
                const planetPosition = this.getRandomPositionInSector(sector);
                const planet = this.createPlanet(planetPosition);
                if (planet) {
                    this.planets.push(planet);
                }
            }
            
            // Add asteroid fields
            for (let i = 0; i < asteroidFieldCount; i++) {
                const asteroidField = this.createAsteroidField(sector);
                if (asteroidField) {
                    this.asteroidFields.push(asteroidField);
                }
            }
            
            // Add alien ships
            for (let i = 0; i < alienCount; i++) {
                const alien = this.createAlienShip(sector);
                if (alien) {
                    this.aliens.push(alien);
                }
            }
            
            // Mark sector as populated
            sector.isPopulated = true;
            
            console.log(`Sector ${sector.name} populated successfully`);
        } catch (error) {
            console.error("Error populating sector:", error);
        }
    }
    
    clearWorld() {
        // Remove all objects from the scene
        this.planets.forEach(planet => {
            if (planet.parent) {
                planet.parent.remove(planet);
            }
        });
        
        this.aliens.forEach(alien => {
            if (alien.parent) {
                alien.parent.remove(alien);
            }
        });
        
        this.asteroidFields.forEach(field => {
            if (field.parent) {
                field.parent.remove(field);
            }
        });
        
        this.nebulae.forEach(nebula => {
            if (nebula.parent) {
                nebula.parent.remove(nebula);
            }
        });
        
        // Clear arrays
        this.planets = [];
        this.aliens = [];
        this.asteroidFields = [];
        this.nebulae = [];
        this.sectors = [];
        this.currentSector = null;
    }
    
    async generateStarField() {
        // PERFORMANCE: Create a star field with fewer stars on low-end devices
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        // Create background stars
        const starCount = this.options.lowEndDevice ? 3000 : 10000;
        
        for (let i = 0; i < starCount; i++) {
            const x = (Math.random() - 0.5) * 20000;
            const y = (Math.random() - 0.5) * 20000;
            const z = (Math.random() - 0.5) * 20000;
            vertices.push(x, y, z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: false
        });
        
        this.starField = new THREE.Points(geometry, material);
        this.scene.add(this.starField);
    }
    
    createPlanet(positionOrSector) {
        try {
            let position;
            
            // Check if we received a position or a sector
            if (positionOrSector instanceof THREE.Vector3) {
                // We received a position directly
                // Clone it to avoid reference issues
                position = positionOrSector.clone();
            } else if (positionOrSector && typeof positionOrSector === 'object') {
                // We received a sector, get random position within it
                position = this.getRandomPositionInSector(positionOrSector);
            } else {
                // Invalid input, use default position
                console.warn("createPlanet: Invalid position or sector provided, using default position");
                position = new THREE.Vector3(0, 0, 0);
            }
            
            // Ensure position is valid
            if (!position || !(position instanceof THREE.Vector3)) {
                console.error("createPlanet: Failed to create valid position, using origin");
                position = new THREE.Vector3(0, 0, 0);
            }
            
            // Random size and features
            const radius = 50 + Math.random() * 150;
            const hasRings = Math.random() > 0.7;
            
            // PERFORMANCE: Reduce complexity on low-end devices
            const moonCount = this.options.lowEndDevice ? 0 : 
                (Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0);
            
            // Random planet type
            const planetTypes = [
                'terrestrial',
                'gas-giant',
                'ice-giant',
                'desert',
                'lava',
                'ocean'
            ];
            const type = planetTypes[Math.floor(Math.random() * planetTypes.length)];
            
            // Create planet with error handling
            try {
                // PERFORMANCE: Create planet with appropriate level of detail
                const planet = new Planet({
                    scene: this.scene,
                    position: position,
                    radius: radius,
                    type: type,
                    hasRings: hasRings,
                    moonCount: moonCount,
                    loadingManager: this.loadingManager,
                    lowDetail: this.options.lowEndDevice
                });
                
                // Add to physics system if available
                if (this.physicsSystem) {
                    try {
                        this.physicsSystem.addObject(planet);
                        if (this.physicsSystem.collisionGroups) {
                            planet.collisionGroup = this.physicsSystem.collisionGroups.planet;
                        }
                    } catch (physicsError) {
                        console.error("createPlanet: Error adding to physics system:", physicsError);
                        // Continue even if physics fails
                    }
                }
                
                return planet;
            } catch (planetCreationError) {
                console.error("createPlanet: Error creating planet:", planetCreationError);
                return null;
            }
        } catch (error) {
            console.error("createPlanet: Critical error:", error);
            return null;
        }
    }
    
    createAsteroidField(sector) {
        try {
            // Validate sector
            if (!sector) {
                console.warn('Invalid sector provided to createAsteroidField');
                // Use default position
                const defaultPosition = new THREE.Vector3(0, 0, 0);
                
                return new AsteroidField({
                    scene: this.scene,
                    position: defaultPosition,
                    radius: 200,
                    density: 0.5,
                    physicsSystem: this.physicsSystem,
                    loadingManager: this.loadingManager,
                    // PERFORMANCE: Pass low detail flag
                    lowDetail: this.options.lowEndDevice
                });
            }
            
            // Random position within sector
            const position = this.getRandomPositionInSector(sector);
            
            // Random field properties
            const radius = 200 + Math.random() * 400;
            
            // PERFORMANCE: Reduce density on low-end devices
            const density = this.options.lowEndDevice ? 
                (0.2 + Math.random() * 0.3) : // Lower density for low-end
                (0.5 + Math.random() * 1.0);  // Normal density
            
            // Create asteroid field
            const asteroidField = new AsteroidField({
                scene: this.scene,
                position: position,
                radius: radius,
                density: density,
                physicsSystem: this.physicsSystem,
                loadingManager: this.loadingManager,
                // PERFORMANCE: Pass low detail flag
                lowDetail: this.options.lowEndDevice
            });
            
            return asteroidField;
        } catch (error) {
            console.error('Error in createAsteroidField:', error);
            return null;
        }
    }
    
    createNebula(sector) {
        try {
            // Validate sector
            if (!sector) {
                console.warn('Invalid sector provided to createNebula');
                // Use default position
                const defaultPosition = new THREE.Vector3(0, 0, 0);
                
                return new Nebula({
                    scene: this.scene,
                    position: defaultPosition,
                    radius: 300,
                    density: 0.5,
                    color: new THREE.Color(0xaaaaff),
                    loadingManager: this.loadingManager
                });
            }
            
            // Random position within sector
            const position = this.getRandomPositionInSector(sector);
            
            // Random nebula properties
            const radius = 300 + Math.random() * 600;
            const density = 0.3 + Math.random() * 0.7;
            
            // Random color based on sector difficulty level
            let color;
            const difficulty = sector.difficulty || 1;
            
            switch (difficulty) {
                case 1:
                    color = new THREE.Color(0x8080ff); // Blue
                    break;
                case 2:
                    color = new THREE.Color(0x80ff80); // Green
                    break;
                case 3:
                    color = new THREE.Color(0xffcc44); // Orange
                    break;
                case 4:
                    color = new THREE.Color(0xff4040); // Red
                    break;
                default:
                    color = new THREE.Color(0xaaaaff); // Default blue
            }
            
            // Create nebula
            const nebula = new Nebula({
                scene: this.scene,
                position: position,
                radius: radius,
                density: density,
                color: color,
                loadingManager: this.loadingManager
            });
            
            return nebula;
        } catch (error) {
            console.error('Error in createNebula:', error);
            return null;
        }
    }
    
    createAlienShip(sector) {
        try {
            // Handle missing AlienShip class
            const ShipClass = typeof AlienShip === 'function' ? AlienShip : FallbackAlienShip;
            
            // Validate sector
            if (!sector) {
                console.warn('Invalid sector provided to createAlienShip');
                // Use default position
                const defaultPosition = new THREE.Vector3(0, 0, 0);
                
                // Create alien with default parameters
                const alien = new ShipClass({
                    scene: this.scene,
                    position: defaultPosition,
                    type: 'scout',
                    physicsSystem: this.physicsSystem,
                    loadingManager: this.loadingManager
                });
                
                // Add to physics system
                if (this.physicsSystem) {
                    try {
                        this.physicsSystem.addObject(alien);
                    } catch (physicsError) {
                        console.error('Error adding alien to physics system:', physicsError);
                    }
                }
                
                return alien;
            }
            
            // Random position within sector
            const position = this.getRandomPositionInSector(sector);
            
            // Enemy type based on sector difficulty
            let enemyType;
            const difficulty = sector.difficulty || 1;
            
            if (difficulty === 1) {
                enemyType = 'scout';
            } else if (difficulty === 2) {
                enemyType = Math.random() > 0.3 ? 'scout' : 'fighter';
            } else if (difficulty === 3) {
                enemyType = Math.random() > 0.6 ? 'fighter' : 'cruiser';
            } else {
                enemyType = Math.random() > 0.7 ? 'cruiser' : 'fighter';
            }
            
            // Create alien ship
            const alien = new ShipClass({
                scene: this.scene,
                position: position,
                type: enemyType,
                physicsSystem: this.physicsSystem,
                loadingManager: this.loadingManager
            });
            
            // Set enemy properties - use try/catch for each method call
            try {
                if (typeof alien.setPatrolRadius === 'function') {
                    alien.setPatrolRadius(200 + Math.random() * 300);
                }
            } catch (error) {
                console.warn('Error setting patrol radius:', error);
            }
            
            try {
                if (typeof alien.setMaxSpeed === 'function') {
                    alien.setMaxSpeed(1 + Math.random() * difficulty);
                }
            } catch (error) {
                console.warn('Error setting max speed:', error);
            }
            
            // Add to physics system if available
            if (this.physicsSystem) {
                try {
                    this.physicsSystem.addObject(alien);
                    if (this.physicsSystem.collisionGroups) {
                        alien.collisionGroup = this.physicsSystem.collisionGroups.alien;
                    }
                } catch (physicsError) {
                    console.error('Error adding alien to physics system:', physicsError);
                }
            }
            
            // Set callback for alien destruction
            try {
                alien.onDestroyed = (position) => {
                    try {
                        if (this.onEnemyDestroyed) {
                            this.onEnemyDestroyed(enemyType, position);
                        }
                        
                        // Remove from tracking arrays
                        const alienIndex = this.aliens.indexOf(alien);
                        if (alienIndex !== -1) {
                            this.aliens.splice(alienIndex, 1);
                        }
                        
                        // Respawn a new enemy after a delay in the same sector
                        setTimeout(() => {
                            if (this.sectors.includes(sector)) {
                                try {
                                    const newAlien = this.createAlienShip(sector);
                                    if (newAlien) {
                                        this.aliens.push(newAlien);
                                    }
                                } catch (respawnError) {
                                    console.error("Error respawning alien:", respawnError);
                                }
                            }
                        }, 30000 + Math.random() * 60000); // 30-90 seconds respawn time
                    } catch (callbackError) {
                        console.error('Error in alien destroyed callback:', callbackError);
                    }
                };
            } catch (onDestroyedError) {
                console.warn('Error setting onDestroyed callback:', onDestroyedError);
            }
            
            return alien;
        } catch (error) {
            console.error('Critical error in createAlienShip:', error);
            // Return a minimal fallback object that won't crash the game
            try {
                return new FallbackAlienShip({
                    scene: this.scene,
                    position: new THREE.Vector3(0, 0, 0)
                });
            } catch (fallbackError) {
                console.error('Could not create fallback alien ship:', fallbackError);
                return new THREE.Object3D(); // Ultimate fallback
            }
        }
    }
    
    getRandomPositionInSector(sector) {
        // Ultra-defensive programming to handle any possible error condition
        
        // First, return a safe default if sector is falsy
        if (!sector) {
            console.warn('getRandomPositionInSector: No sector provided, returning origin');
            return new THREE.Vector3(0, 0, 0);
        }
        
        try {
            // Create a default sector if needed
            if (typeof sector !== 'object') {
                console.warn('getRandomPositionInSector: Sector is not an object, returning origin');
                return new THREE.Vector3(0, 0, 0);
            }
            
            // Double check position validity using type checking and truthiness
            if (!sector.position) {
                // Instead of warning, create a position for the sector
                sector.position = new THREE.Vector3(0, 0, 0);
                console.log('getRandomPositionInSector: Added missing position to sector');
            }
            
            // Specific check for THREE.Vector3 instance
            if (!(sector.position instanceof THREE.Vector3)) {
                // Convert to Vector3 if it's not already
                if (typeof sector.position === 'object' && 
                    'x' in sector.position && 
                    'y' in sector.position && 
                    'z' in sector.position) {
                    
                    sector.position = new THREE.Vector3(
                        sector.position.x || 0,
                        sector.position.y || 0,
                        sector.position.z || 0
                    );
                    console.log('getRandomPositionInSector: Converted sector position to Vector3');
                } else {
                    // Create a new position
                    sector.position = new THREE.Vector3(0, 0, 0);
                    console.log('getRandomPositionInSector: Created new Vector3 for sector position');
                }
            }
            
            // Validate all components exist and are numbers
            if (typeof sector.position.x !== 'number' || isNaN(sector.position.x) ||
                typeof sector.position.y !== 'number' || isNaN(sector.position.y) ||
                typeof sector.position.z !== 'number' || isNaN(sector.position.z)) {
                
                // Fix invalid coordinates instead of returning
                sector.position.x = isNaN(sector.position.x) ? 0 : sector.position.x;
                sector.position.y = isNaN(sector.position.y) ? 0 : sector.position.y;
                sector.position.z = isNaN(sector.position.z) ? 0 : sector.position.z;
                console.log('getRandomPositionInSector: Fixed invalid coordinates in sector position');
            }
            
            // Safe radius with multiple fallbacks
            const radius = (sector.radius && typeof sector.radius === 'number' && !isNaN(sector.radius) && isFinite(sector.radius)) 
                ? sector.radius 
                : 1000;
            
            // Get random position with exception handling on each calculation
            try {
                // Safely generate random angles
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI; // Safer than using acos which could produce NaN
                
                // Safely generate random radius
                let r;
                try {
                    r = radius * Math.pow(Math.random(), 1/3); // Safer than cbrt which might not be available everywhere
                } catch (e) {
                    r = radius * Math.random(); // Ultimate fallback
                }
                
                // Calculate position components with defensive coding
                let x, y, z;
                try {
                    x = sector.position.x + r * Math.sin(phi) * Math.cos(theta);
                    y = sector.position.y + r * Math.sin(phi) * Math.sin(theta);
                    z = sector.position.z + r * Math.cos(phi);
                } catch (e) {
                    // If any calculation fails, use a simpler approach
                    console.warn('getRandomPositionInSector: Error in position calculation, using simpler fallback');
                    x = sector.position.x + (Math.random() - 0.5) * radius * 2;
                    y = sector.position.y + (Math.random() - 0.5) * radius * 2;
                    z = sector.position.z + (Math.random() - 0.5) * radius * 2;
                }
                
                // Final validation of all calculated values
                if (isNaN(x) || !isFinite(x) || isNaN(y) || !isFinite(y) || isNaN(z) || !isFinite(z)) {
                    console.warn('getRandomPositionInSector: Generated invalid coordinates, returning sector position');
                    return new THREE.Vector3(
                        sector.position.x, 
                        sector.position.y, 
                        sector.position.z
                    );
                }
                
                // Return validated position
                return new THREE.Vector3(x, y, z);
            } catch (innerError) {
                console.error('getRandomPositionInSector: Error calculating random position:', innerError);
                // Return sector position as fallback
                return new THREE.Vector3(
                    sector.position.x || 0, 
                    sector.position.y || 0, 
                    sector.position.z || 0
                );
            }
        } catch (outerError) {
            console.error('getRandomPositionInSector: Critical error:', outerError);
            // Ultimate fallback to origin
            return new THREE.Vector3(0, 0, 0);
        }
    }
    
    getSectorAt(position) {
        // Find which sector the position is in
        for (const sector of this.sectors) {
            const distance = position.distanceTo(sector.position);
            if (distance <= sector.radius) {
                // Position is in this sector
                return { name: sector.name, sector: sector };
            }
        }
        
        // Not in any sector
        return { name: "Deep Space", sector: null };
    }
    
    update(delta, playerPosition) {
        // PERFORMANCE: Update player position for distance-based loading
        if (playerPosition) {
            this.updatePlayerPosition(playerPosition);
        }
        
        // PERFORMANCE: Implement distance-based updates
        // Only update objects that are within the view distance
        const viewDistance = this.options.viewDistance;
        
        // Update all planets
        for (const planet of this.planets) {
            // PERFORMANCE: Skip distant planets
            if (playerPosition && planet.position.distanceTo(playerPosition) > viewDistance) {
                // Skip detailed updates for distant planets
                if (planet.updateRotation) {
                    // Only update rotation for distant planets
                    planet.updateRotation(delta);
                }
                continue;
            }
            
            planet.update(delta);
            
            // If planet has orbit target, update orbit
            if (planet.orbitTarget && typeof planet.update === 'function') {
                // Update orbit angle
                if (!planet.orbitAngle) planet.orbitAngle = 0;
                planet.orbitAngle += (planet.orbitSpeed || 0.1) * delta;
                
                // Calculate new position
                const orbitDistance = planet.orbitDistance || 150;
                const x = planet.orbitTarget.position.x + Math.cos(planet.orbitAngle) * orbitDistance;
                const z = planet.orbitTarget.position.z + Math.sin(planet.orbitAngle) * orbitDistance;
                
                // Update position
                planet.position.set(x, planet.orbitTarget.position.y, z);
            }
            
            // Trigger planet discovery if player is nearby
            if (playerPosition && 
                planet.position.distanceTo(playerPosition) < 500 && 
                this.onPlanetDiscovered) {
                this.onPlanetDiscovered({
                    name: planet.name || 'Unknown Planet',
                    position: planet.position
                });
            }
        }
        
        // Update all anomalies
        for (const anomaly of this.anomalies) {
            // PERFORMANCE: Skip distant anomalies
            if (playerPosition && anomaly.position.distanceTo(playerPosition) > viewDistance) {
                continue;
            }
            
            anomaly.update(delta);
            
            // Check for spacecraft interaction if player is nearby
            if (playerPosition && 
                anomaly.position.distanceTo(playerPosition) < anomaly.radius * 3) {
                // We'll handle the actual interaction in the Game class
            }
        }
        
        // Update all aliens
        for (const alien of this.aliens) {
            // PERFORMANCE: Skip distant aliens
            if (playerPosition && alien.position.distanceTo(playerPosition) > viewDistance) {
                continue;
            }
            
            alien.update(delta);
        }
        
        // Update all asteroid fields
        for (const field of this.asteroidFields) {
            // PERFORMANCE: Skip distant asteroid fields
            if (playerPosition && field.position.distanceTo(playerPosition) > viewDistance) {
                continue;
            }
            
            field.update(delta);
        }
        
        // Update all nebulae
        for (const nebula of this.nebulae) {
            // PERFORMANCE: Skip distant nebulae
            if (playerPosition && nebula.position.distanceTo(playerPosition) > viewDistance) {
                continue;
            }
            
            nebula.update(delta);
        }
        
        // Check if player has entered a new sector
        if (playerPosition) {
            const currentSectorInfo = this.getSectorAt(playerPosition);
            
            // If player entered a new sector, trigger discovery
            if (currentSectorInfo && 
                currentSectorInfo.name !== "Deep Space" && 
                this.onSectorDiscovered) {
                this.onSectorDiscovered(currentSectorInfo);
            }
        }
    }
    
    reset() {
        console.log("Resetting game world");
        this.initialize();
    }
    
    // Method to help with sector transitioning
    setCurrentSector(sector) {
        this.setActiveSector(sector);
    }
    
    // Add this new method to create the mothership
    createMothership(position) {
        try {
            const mothership = new Mothership({
                scene: this.scene,
                physicsSystem: this.physicsSystem,
                position: position || new THREE.Vector3(0, 200, 0)
            });
            
            this.motherships.push(mothership);
            console.log("Mothership carrier created at", position);
            
            return mothership;
        } catch (error) {
            console.error("Error creating mothership:", error);
            return null;
        }
    }
    
    // Add a method to get the nearest mothership
    getNearestMothership(position) {
        if (!position || this.motherships.length === 0) {
            return null;
        }
        
        let nearest = null;
        let minDistance = Infinity;
        
        for (const mothership of this.motherships) {
            const distance = mothership.position.distanceTo(position);
            if (distance < minDistance) {
                nearest = mothership;
                minDistance = distance;
            }
        }
        
        return nearest;
    }
    
    // Add a method to check if spacecraft is near a mothership docking bay
    isNearMothershipDockingBay(spacecraft) {
        if (!spacecraft) return false;
        
        for (const mothership of this.motherships) {
            if (mothership.isInDockingRange(spacecraft)) {
                return mothership;
            }
        }
        
        return false;
    }
    
    // Add getCurrentSector method to fix the error
    getCurrentSector() {
        try {
            // If spacecraft position is not provided, return the current sector
            if (this.currentSector) {
                return {
                    name: this.currentSector.name || "Unknown Sector",
                    difficulty: this.currentSector.difficulty || 1,
                    sector: this.currentSector
                };
            }
            
            // If no current sector is set, return a default
            return { name: "Deep Space", difficulty: 1, sector: null };
        } catch (error) {
            console.error("Error in getCurrentSector:", error);
            return { name: "Deep Space", difficulty: 1, sector: null };
        }
    }
    
    // PERFORMANCE: Add a method to create solar system with options
    async createSolarSystem(options = {}) {
        console.log("Creating Solar System with options:", options);
        
        // Merge options with defaults
        const createOptions = {
            lowDetail: options.lowDetail || this.options.lowEndDevice,
            progressiveLoading: options.progressiveLoading || this.options.progressiveLoading
        };
        
        // Create the Sun
        const sun = new Planet({
            scene: this.scene,
            position: new THREE.Vector3(0, 0, 0),
            radius: 300,
            textureType: 'sun',
            rotationSpeed: 0.005,
            gravityFactor: 5000,
            lowDetail: createOptions.lowDetail
        });
        
        sun.name = "Sun";
        this.planets.push(sun);
        
        // Add physics if available
        if (this.physicsSystem) {
            this.physicsSystem.addObject(sun);
            if (this.physicsSystem.collisionGroups) {
                sun.collisionGroup = this.physicsSystem.collisionGroups.planet;
            }
        }
        
        // Create planets in order from the Sun
        const planetData = [
            { name: "Mercury", distance: 600, radius: 30, textureType: 'mercury', rotationSpeed: 0.01 },
            { name: "Venus", distance: 800, radius: 60, textureType: 'venus', rotationSpeed: 0.008 },
            { name: "Earth", distance: 1000, radius: 70, textureType: 'earth', rotationSpeed: 0.01 },
            { name: "Mars", distance: 1300, radius: 50, textureType: 'mars', rotationSpeed: 0.009 },
            { name: "Jupiter", distance: 1800, radius: 150, textureType: 'jupiter', rotationSpeed: 0.02 },
            { name: "Saturn", distance: 2300, radius: 120, textureType: 'saturn', rotationSpeed: 0.018, hasRings: true },
            { name: "Uranus", distance: 2700, radius: 90, textureType: 'ice', rotationSpeed: 0.015 },
            { name: "Neptune", distance: 3000, radius: 85, textureType: 'ice', rotationSpeed: 0.014 }
        ];
        
        // PERFORMANCE: For progressive loading, create planets in batches
        if (createOptions.progressiveLoading) {
            // First batch: Create inner planets immediately (Mercury to Mars)
            await this.createPlanetBatch(planetData.slice(0, 4), createOptions);
            
            // Second batch: Create outer planets with a delay
            setTimeout(() => {
                this.createPlanetBatch(planetData.slice(4), createOptions)
                    .then(() => {
                        console.log("All planets created");
                        this.loadingState.solarSystemCreated = true;
                    });
            }, 1000);
        } else {
            // Create all planets at once
            await this.createPlanetBatch(planetData, createOptions);
            this.loadingState.solarSystemCreated = true;
        }
        
        // Add Earth's moon
        const earth = this.planets.find(planet => planet.name === "Earth");
        if (earth) {
            const moonPosition = new THREE.Vector3(
                earth.position.x + 100,
                earth.position.y,
                earth.position.z + 100
            );
            
            const moon = new Planet({
                scene: this.scene,
                position: moonPosition,
                radius: 20,
                textureType: 'moon',
                rotationSpeed: 0.005,
                gravityFactor: 200,
                lowDetail: createOptions.lowDetail
            });
            
            moon.name = "Moon";
            moon.orbitTarget = earth;
            moon.orbitDistance = 150;
            moon.orbitSpeed = 0.2;
            
            this.planets.push(moon);
            
            // Add physics if available
            if (this.physicsSystem) {
                this.physicsSystem.addObject(moon);
                if (this.physicsSystem.collisionGroups) {
                    moon.collisionGroup = this.physicsSystem.collisionGroups.planet;
                }
            }
            
            console.log("Created Earth's moon");
        }
        
        return true;
    }
    
    // PERFORMANCE: Helper method to create planets in batches
    async createPlanetBatch(planetDataArray, options) {
        for (const data of planetDataArray) {
            // Calculate position based on distance from sun
            const angle = Math.random() * Math.PI * 2; // Random angle around the sun
            const x = Math.cos(angle) * data.distance;
            const z = Math.sin(angle) * data.distance;
            const position = new THREE.Vector3(x, 0, z);
            
            const planet = new Planet({
                scene: this.scene,
                position: position,
                radius: data.radius,
                textureType: data.textureType,
                rotationSpeed: data.rotationSpeed,
                gravityFactor: data.radius * 10,
                hasRings: data.hasRings || false,
                lowDetail: options.lowDetail
            });
            
            planet.name = data.name;
            this.planets.push(planet);
            
            // Add physics if available
            if (this.physicsSystem) {
                this.physicsSystem.addObject(planet);
                if (this.physicsSystem.collisionGroups) {
                    planet.collisionGroup = this.physicsSystem.collisionGroups.planet;
                }
            }
            
            console.log(`Created planet: ${data.name}`);
            
            // PERFORMANCE: Add a small delay between planet creation to prevent frame drops
            if (options.progressiveLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }
    
    // Create wormholes and black holes
    createSpaceAnomalies() {
        console.log("Creating space anomalies...");
        
        // Create a wormhole near Jupiter
        const jupiter = this.planets.find(planet => planet.name === "Jupiter");
        if (jupiter) {
            const wormholePosition = new THREE.Vector3(
                jupiter.position.x + 500,
                jupiter.position.y,
                jupiter.position.z + 500
            );
            
            // This wormhole leads to Alpha Centauri
            const destination = new THREE.Vector3(5000, 0, 0);
            
            this.createWormhole(wormholePosition, destination);
        }
        
        // Create a black hole in the outer solar system
        const blackholePosition = new THREE.Vector3(2500, 0, -2500);
        this.createBlackhole(blackholePosition, 2);
        
        // Create another wormhole that leads to Orion Nebula
        const wormholePosition = new THREE.Vector3(-2000, 0, 2000);
        const destination = new THREE.Vector3(5000, 0, 5000);
        this.createWormhole(wormholePosition, destination);
    }
    
    // Create a wormhole
    createWormhole(position, destination) {
        try {
            const wormhole = new SpaceAnomaly({
                scene: this.scene,
                position: position,
                type: 'wormhole',
                radius: 80,
                destination: destination,
                physicsSystem: this.physicsSystem
            });
            
            wormhole.name = `Wormhole to ${this.getDestinationName(destination)}`;
            this.anomalies.push(wormhole);
            
            console.log(`Created wormhole at ${position.x}, ${position.y}, ${position.z}`);
            return wormhole;
        } catch (error) {
            console.error("Error creating wormhole:", error);
            return null;
        }
    }
    
    // Create a black hole
    createBlackhole(position, intensity = 1) {
        try {
            const blackhole = new SpaceAnomaly({
                scene: this.scene,
                position: position,
                type: 'blackhole',
                radius: 100,
                intensity: intensity,
                physicsSystem: this.physicsSystem
            });
            
            blackhole.name = `Black Hole (Intensity: ${intensity})`;
            this.anomalies.push(blackhole);
            
            console.log(`Created black hole at ${position.x}, ${position.y}, ${position.z}`);
            return blackhole;
        } catch (error) {
            console.error("Error creating black hole:", error);
            return null;
        }
    }
    
    // Helper method to get destination name
    getDestinationName(position) {
        for (const sector of this.sectors) {
            if (position.distanceTo(sector.position) < 100) {
                return sector.name;
            }
        }
        return "Unknown Location";
    }
    
    // Add this method to get nearby objects including anomalies
    getNearbyObjects(position, radius) {
        if (!position) return [];
        
        const nearbyObjects = [];
        
        // Check planets
        this.planets.forEach(planet => {
            if (planet.position.distanceTo(position) < radius) {
                nearbyObjects.push({
                    type: 'planet',
                    name: planet.name || 'Unknown Planet',
                    position: planet.position,
                    distance: planet.position.distanceTo(position),
                    object: planet
                });
            }
        });
        
        // Check anomalies
        this.anomalies.forEach(anomaly => {
            if (anomaly.position.distanceTo(position) < radius) {
                nearbyObjects.push({
                    type: 'anomaly',
                    name: anomaly.name || `${anomaly.anomalyType.charAt(0).toUpperCase() + anomaly.anomalyType.slice(1)}`,
                    position: anomaly.position,
                    distance: anomaly.position.distanceTo(position),
                    anomalyType: anomaly.anomalyType,
                    object: anomaly
                });
                
                // Trigger anomaly discovery callback
                if (this.onAnomalyDiscovered) {
                    this.onAnomalyDiscovered({
                        type: anomaly.anomalyType,
                        name: anomaly.name,
                        position: anomaly.position
                    });
                }
            }
        });
        
        // Check other objects (aliens, asteroids, etc.)
        // ... existing code for other objects
        
        return nearbyObjects;
    }
    
    // Add this method to check for anomaly interactions
    checkAnomalyInteractions(spacecraft) {
        if (!spacecraft) return null;
        
        for (const anomaly of this.anomalies) {
            if (anomaly.isSpacecraftInRange(spacecraft)) {
                return anomaly;
            }
        }
        
        return null;
    }
} 