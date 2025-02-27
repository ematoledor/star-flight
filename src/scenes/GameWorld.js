import * as THREE from 'three';
import { Planet } from '../entities/Planet.js';
import { AlienShip } from '../entities/AlienShip.js';
import { AsteroidField } from '../components/AsteroidField.js';
import { Nebula } from '../components/Nebula.js';

export class GameWorld {
    constructor(scene, loadingManager, physicsSystem) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        this.physicsSystem = physicsSystem;
        
        // Game world state
        this.planets = [];
        this.aliens = [];
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
        // Generate background star field
        this.generateStarField();
        
        // Create sectors with progressive loading
        this.createSectors();
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
        
        // Create other sectors with slight delay to prioritize initial rendering
        for (let i = 1; i < this.sectors.length; i++) {
            setTimeout(() => {
                console.log(`Creating sector: ${this.sectors[i].name}`);
                this.populateSector(this.sectors[i]);
            }, i * 1000); // 1 second between each sector creation
        }
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
            const numAliens = 3 + Math.floor(Math.random() * (sector.difficulty || 1) * 2);
            
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
        let position;
        
        // Check if we received a position or a sector
        if (positionOrSector instanceof THREE.Vector3) {
            // We received a position directly
            position = positionOrSector;
        } else {
            // We received a sector, get random position within it
            position = this.getRandomPositionInSector(positionOrSector);
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
            this.physicsSystem.addObject(planet);
            if (this.physicsSystem.collisionGroups) {
                planet.collisionGroup = this.physicsSystem.collisionGroups.planet;
            }
        }
        
        return planet;
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
            // Validate sector
            if (!sector) {
                console.warn('Invalid sector provided to createAlienShip');
                // Use default position
                const defaultPosition = new THREE.Vector3(0, 0, 0);
                
                // Create alien with default parameters
                const alien = new AlienShip({
                    scene: this.scene,
                    position: defaultPosition,
                    type: 'scout',
                    physicsSystem: this.physicsSystem,
                    loadingManager: this.loadingManager
                });
                
                // Add to physics system
                if (this.physicsSystem) {
                    this.physicsSystem.addObject(alien);
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
            const alien = new AlienShip({
                scene: this.scene,
                position: position,
                type: enemyType,
                physicsSystem: this.physicsSystem,
                loadingManager: this.loadingManager
            });
            
            // Set enemy properties
            if (alien.setPatrolRadius) {
                alien.setPatrolRadius(200 + Math.random() * 300);
            }
            
            if (alien.setMaxSpeed) {
                alien.setMaxSpeed(1 + Math.random() * difficulty);
            }
            
            // Add to physics system if available
            if (this.physicsSystem) {
                this.physicsSystem.addObject(alien);
                if (this.physicsSystem.collisionGroups) {
                    alien.collisionGroup = this.physicsSystem.collisionGroups.alien;
                }
            }
            
            // Set callback for alien destruction
            alien.onDestroyed = (position) => {
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
                            this.aliens.push(newAlien);
                        } catch (error) {
                            console.error("Error respawning alien:", error);
                        }
                    }
                }, 30000 + Math.random() * 60000); // 30-90 seconds respawn time
            };
            
            return alien;
        } catch (error) {
            console.error('Error in createAlienShip:', error);
            // Return a default alien at origin to prevent game crashes
            try {
                return new AlienShip({
                    scene: this.scene,
                    position: new THREE.Vector3(0, 0, 0),
                    type: 'scout',
                    physicsSystem: this.physicsSystem,
                    loadingManager: this.loadingManager
                });
            } catch (fallbackError) {
                console.error('Could not create fallback alien ship:', fallbackError);
                return null;
            }
        }
    }
    
    getRandomPositionInSector(sector) {
        try {
            // Safety check for sector
            if (!sector) {
                console.warn('No sector provided to getRandomPositionInSector');
                return new THREE.Vector3(0, 0, 0);
            }
            
            // Safety check for sector position
            if (!sector.position) {
                console.warn('Sector has no position property');
                return new THREE.Vector3(0, 0, 0);
            }
            
            // Get random position within sector radius
            const radius = sector.radius || 1000; // Default radius if not specified
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = radius * Math.cbrt(Math.random()); // Cube root for more uniform distribution
            
            const x = sector.position.x + r * Math.sin(phi) * Math.cos(theta);
            const y = sector.position.y + r * Math.sin(phi) * Math.sin(theta);
            const z = sector.position.z + r * Math.cos(phi);
            
            return new THREE.Vector3(x, y, z);
        } catch (error) {
            console.error('Error in getRandomPositionInSector:', error);
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
} 