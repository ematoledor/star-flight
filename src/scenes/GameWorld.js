import * as THREE from 'three';
import { Planet } from '../entities/Planet.js';
import { AlienShip } from '../entities/AlienShip.js';
import { AsteroidField } from '../components/AsteroidField.js';
import { Nebula } from '../components/Nebula.js';
import { Mothership } from '../entities/Mothership.js';

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
    constructor(scene, loadingManager, physicsSystem) {
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
        this.currentSector = null;
        
        // Callbacks
        this.onEnemyDestroyed = null;
        
        // Initialize the world
        this.initialize();
        
        console.log("GameWorld initialized");
    }
    
    initialize() {
        try {
            // Generate background star field
            this.generateStarField();
            
            // Create sectors with progressive loading
            this.createSectors();
            
            // Create the main mothership carrier in the origin sector
            this.createMothership(new THREE.Vector3(0, 200, 0));
            
            // Populate initial sector (origin)
            this.populateSector({ 
                name: "Alpha Quadrant", 
                sector: {
                    position: new THREE.Vector3(0, 0, 0),
                    radius: 2000,
                    difficulty: 1
                }
            });
            
            // Mark origin as populated
            const originSector = this.sectors.find(s => s.name === "Alpha Quadrant");
            if (originSector) {
                originSector.isPopulated = true;
            }
        } catch (error) {
            console.error("Error in GameWorld initialization:", error);
        }
    }
    
    createSectors() {
        // Create a few sectors of space
        this.sectors = [
            { name: "Alpha Quadrant", position: new THREE.Vector3(0, 0, 0), difficulty: 1, radius: 1000 },
            { name: "Beta Quadrant", position: new THREE.Vector3(5000, 0, 0), difficulty: 2, radius: 1500 },
            { name: "Gamma Quadrant", position: new THREE.Vector3(0, 0, 5000), difficulty: 3, radius: 1800 },
            { name: "Delta Quadrant", position: new THREE.Vector3(5000, 0, 5000), difficulty: 4, radius: 2000 }
        ];
        
        // Set initial sector
        this.setActiveSector(this.sectors[0]);
        
        // Schedule loading of other sectors in the background
        setTimeout(() => this.loadRemainingSectorsInBackground(), 2000);
    }
    
    loadRemainingSectorsInBackground() {
        console.log("Loading remaining sectors in background...");
        
        // Create a function to load sectors one at a time with smaller operations
        const loadSector = (index) => {
            if (index >= this.sectors.length) {
                console.log("All sectors loaded");
                return;
            }
            
            console.log(`Creating sector: ${this.sectors[index].name}`);
            
            // Use requestAnimationFrame to avoid setTimeout violations
            requestAnimationFrame(() => {
                try {
                    this.populateSector(this.sectors[index]);
                    
                    // Schedule the next sector after a short delay
                    setTimeout(() => loadSector(index + 1), 500);
                } catch (error) {
                    console.error(`Error loading sector ${index}:`, error);
                    // Continue with next sector even if there's an error
                    setTimeout(() => loadSector(index + 1), 500);
                }
            });
        };
        
        // Start loading from the second sector (index 1)
        setTimeout(() => loadSector(1), 2000);
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
            
            // Add planets to the sector
            const numPlanets = 1 + Math.floor(Math.random() * 2); // 1-2 planets per sector
            
            for (let i = 0; i < numPlanets; i++) {
                // Create with lower initial detail
                try {
                    const planetPosition = this.getRandomPositionInSector(sector);
                    setTimeout(() => {
                        try {
                            const planet = this.createPlanet(planetPosition);
                            if (planet) {
                                this.planets.push(planet);
                            }
                        } catch (error) {
                            console.error("Error creating planet:", error);
                        }
                    }, i * 200); // Stagger planet creation
                } catch (error) {
                    console.error("Error preparing planet creation:", error);
                }
            }
            
            // Add asteroid fields
            const numAsteroidFields = Math.floor(Math.random() * 3); // 0-2 asteroid fields
            
            for (let i = 0; i < numAsteroidFields; i++) {
                setTimeout(() => {
                    try {
                        const asteroidField = this.createAsteroidField(sector);
                        if (asteroidField) {
                            this.asteroidFields.push(asteroidField);
                        }
                    } catch (error) {
                        console.error("Error creating asteroid field:", error);
                    }
                }, numPlanets * 200 + i * 300); // Start after planets are created
            }
            
            // Add some alien ships based on sector difficulty
            const numAliens = Math.min(3 + Math.floor(Math.random() * (sector.difficulty || 1) * 2), 10);
            
            // Verify the AlienShip class is loaded and method exists
            if (typeof this.createAlienShip === 'function') {
                for (let i = 0; i < numAliens; i++) {
                    setTimeout(() => {
                        try {
                            // Create alien ship with try-catch to handle errors
                            const alien = this.createAlienShip(sector);
                            if (alien) {
                                this.aliens.push(alien);
                            }
                        } catch (error) {
                            console.error("Error creating alien ship:", error);
                        }
                    }, numPlanets * 200 + numAsteroidFields * 300 + i * 100);
                }
            } else {
                console.warn("createAlienShip method not available - skipping alien creation");
            }
            
            // Add nebula
            if (Math.random() > 0.5) {
                setTimeout(() => {
                    try {
                        const nebula = this.createNebula(sector);
                        if (nebula) {
                            this.nebulae.push(nebula);
                        }
                    } catch (error) {
                        console.error("Error creating nebula:", error);
                    }
                }, numPlanets * 200 + numAsteroidFields * 300 + numAliens * 100);
            }
            
            // Mark sector as populated
            sector.isPopulated = true;
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
    
    generateStarField() {
        // Create a star field (simple particle system)
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        // Create background stars
        for (let i = 0; i < 10000; i++) {
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
            const hasMoons = Math.random() > 0.5;
            const moonCount = hasMoons ? Math.floor(Math.random() * 3) + 1 : 0;
            
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
                // Create planet
                const planet = new Planet({
                    scene: this.scene,
                    position: position,
                    radius: radius,
                    type: type,
                    hasRings: hasRings,
                    moonCount: moonCount,
                    loadingManager: this.loadingManager
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
                    loadingManager: this.loadingManager
                });
            }
            
            // Random position within sector
            const position = this.getRandomPositionInSector(sector);
            
            // Random field properties
            const radius = 200 + Math.random() * 400;
            const density = 0.5 + Math.random() * 1.0;
            
            // Create asteroid field
            const asteroidField = new AsteroidField({
                scene: this.scene,
                position: position,
                radius: radius,
                density: density,
                physicsSystem: this.physicsSystem,
                loadingManager: this.loadingManager
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
    
    update(delta) {
        // Update all planets
        for (const planet of this.planets) {
            planet.update(delta);
        }
        
        // Update all aliens
        for (const alien of this.aliens) {
            alien.update(delta);
        }
        
        // Update all asteroid fields
        for (const field of this.asteroidFields) {
            field.update(delta);
        }
        
        // Update all nebulae
        for (const nebula of this.nebulae) {
            nebula.update(delta);
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
} 