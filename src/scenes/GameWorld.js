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
        console.log("Initializing game world...");
        
        // Clear existing objects if any
        this.clearWorld();
        
        // Generate background star field
        this.generateStarField();
        
        // Generate sectors with planets, aliens, asteroid fields, and nebulae
        this.generateSectors();
        
        // Set current sector to the first one (usually origin/Alpha sector)
        if (this.sectors.length > 0) {
            this.setCurrentSector(this.sectors[0]);
        }
    }
    
    clearWorld() {
        // Remove all existing planets
        for (const planet of this.planets) {
            this.scene.remove(planet.mesh);
            if (this.physicsSystem) {
                this.physicsSystem.removeObject(planet);
            }
        }
        
        // Remove all existing aliens
        for (const alien of this.aliens) {
            this.scene.remove(alien.mesh);
            if (this.physicsSystem) {
                this.physicsSystem.removeObject(alien);
            }
        }
        
        // Remove all existing asteroid fields
        for (const field of this.asteroidFields) {
            field.dispose();
        }
        
        // Remove all existing nebulae
        for (const nebula of this.nebulae) {
            nebula.dispose();
        }
        
        // Reset all arrays
        this.planets = [];
        this.aliens = [];
        this.asteroidFields = [];
        this.nebulae = [];
        this.sectors = [];
        this.currentSector = null;
    }
    
    generateStarField() {
        // Create a star field in the background
        const starCount = 2000;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            
            // Random position in a sphere
            const radius = 2000 + Math.random() * 8000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            starPositions[i3 + 2] = radius * Math.cos(phi);
            
            // Random star color (white, blue, yellow, red)
            const colorChoice = Math.random();
            if (colorChoice > 0.8) { // Blue stars
                starColors[i3] = 0.7 + Math.random() * 0.3;
                starColors[i3 + 1] = 0.7 + Math.random() * 0.3;
                starColors[i3 + 2] = 1.0;
            } else if (colorChoice > 0.6) { // Yellow stars
                starColors[i3] = 1.0;
                starColors[i3 + 1] = 0.9 + Math.random() * 0.1;
                starColors[i3 + 2] = 0.5 + Math.random() * 0.3;
            } else if (colorChoice > 0.4) { // Red stars
                starColors[i3] = 1.0;
                starColors[i3 + 1] = 0.3 + Math.random() * 0.5;
                starColors[i3 + 2] = 0.3 + Math.random() * 0.2;
            } else { // White stars
                starColors[i3] = 0.9 + Math.random() * 0.1;
                starColors[i3 + 1] = 0.9 + Math.random() * 0.1;
                starColors[i3 + 2] = 0.9 + Math.random() * 0.1;
            }
            
            // Random star size
            starSizes[i] = 0.5 + Math.random() * 2.5;
            
            // Make some stars brighter
            if (Math.random() > 0.97) {
                starSizes[i] *= 2.5;
                starColors[i3] = Math.min(1.0, starColors[i3] * 1.5);
                starColors[i3 + 1] = Math.min(1.0, starColors[i3 + 1] * 1.5);
                starColors[i3 + 2] = Math.min(1.0, starColors[i3 + 2] * 1.5);
            }
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        // Create the star points
        this.starField = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starField);
    }
    
    generateSectors() {
        // Define all sectors with their properties
        const sectorDefinitions = [
            {
                name: "Alpha Quadrant",
                position: new THREE.Vector3(0, 0, 0),
                radius: 1000,
                planetCount: 5,
                asteroidFieldCount: 2,
                nebulaCount: 1,
                dangerLevel: 1, // Low danger (starter area)
                description: "The Alpha Quadrant is a relatively safe region, ideal for new pilots."
            },
            {
                name: "Beta Quadrant",
                position: new THREE.Vector3(3000, 0, 0),
                radius: 1500,
                planetCount: 7,
                asteroidFieldCount: 4,
                nebulaCount: 2,
                dangerLevel: 2, // Medium danger
                description: "The Beta Quadrant has increased alien activity and valuable resources."
            },
            {
                name: "Gamma Quadrant",
                position: new THREE.Vector3(0, 3000, 0),
                radius: 1800,
                planetCount: 6,
                asteroidFieldCount: 5,
                nebulaCount: 3,
                dangerLevel: 3, // High danger
                description: "The Gamma Quadrant is known for its hostile forces and dense asteroid fields."
            },
            {
                name: "Delta Quadrant",
                position: new THREE.Vector3(-3000, -3000, 0),
                radius: 2000,
                planetCount: 8,
                asteroidFieldCount: 6,
                nebulaCount: 4,
                dangerLevel: 4, // Very high danger
                description: "The Delta Quadrant is extremely dangerous, but rich in rare resources."
            }
        ];
        
        // Create all sectors
        for (const sectorDef of sectorDefinitions) {
            const sector = this.createSector(sectorDef);
            this.sectors.push(sector);
        }
    }
    
    createSector(sectorDef) {
        console.log(`Creating sector: ${sectorDef.name}`);
        
        const sector = {
            name: sectorDef.name,
            position: sectorDef.position.clone(),
            radius: sectorDef.radius,
            description: sectorDef.description,
            dangerLevel: sectorDef.dangerLevel,
            planets: [],
            asteroidFields: [],
            nebulae: [],
            aliens: []
        };
        
        // Create planets
        for (let i = 0; i < sectorDef.planetCount; i++) {
            const planet = this.createPlanet(sector);
            sector.planets.push(planet);
            this.planets.push(planet);
        }
        
        // Create asteroid fields
        for (let i = 0; i < sectorDef.asteroidFieldCount; i++) {
            const asteroidField = this.createAsteroidField(sector);
            sector.asteroidFields.push(asteroidField);
            this.asteroidFields.push(asteroidField);
        }
        
        // Create nebulae
        for (let i = 0; i < sectorDef.nebulaCount; i++) {
            const nebula = this.createNebula(sector);
            sector.nebulae.push(nebula);
            this.nebulae.push(nebula);
        }
        
        // Create enemies based on danger level
        const enemyCount = Math.floor(sectorDef.dangerLevel * 2 + Math.random() * 3);
        for (let i = 0; i < enemyCount; i++) {
            const alien = this.createEnemy(sector);
            sector.aliens.push(alien);
            this.aliens.push(alien);
        }
        
        return sector;
    }
    
    createPlanet(sector) {
        // Random position within sector radius
        const position = this.getRandomPositionInSector(sector);
        
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
    }
    
    createNebula(sector) {
        // Random position within sector
        const position = this.getRandomPositionInSector(sector);
        
        // Random nebula properties
        const radius = 300 + Math.random() * 600;
        const density = 0.3 + Math.random() * 0.7;
        
        // Random color based on sector danger level
        let color;
        switch (sector.dangerLevel) {
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
    }
    
    createEnemy(sector) {
        // Random position within sector
        const position = this.getRandomPositionInSector(sector);
        
        // Enemy type based on danger level
        let enemyType;
        if (sector.dangerLevel === 1) {
            enemyType = 'scout';
        } else if (sector.dangerLevel === 2) {
            enemyType = Math.random() > 0.3 ? 'scout' : 'fighter';
        } else if (sector.dangerLevel === 3) {
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
        alien.setPatrolRadius(200 + Math.random() * 300);
        alien.setMaxSpeed(1 + Math.random() * sector.dangerLevel);
        
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
            
            // Remove from arrays
            const sectorIndex = this.sectors.findIndex(s => s === sector);
            if (sectorIndex !== -1) {
                const alienIndex = this.sectors[sectorIndex].aliens.indexOf(alien);
                if (alienIndex !== -1) {
                    this.sectors[sectorIndex].aliens.splice(alienIndex, 1);
                }
            }
            
            const globalAlienIndex = this.aliens.indexOf(alien);
            if (globalAlienIndex !== -1) {
                this.aliens.splice(globalAlienIndex, 1);
            }
            
            // Respawn a new enemy after a delay in the same sector
            setTimeout(() => {
                if (this.sectors.includes(sector)) {
                    const newAlien = this.createEnemy(sector);
                    sector.aliens.push(newAlien);
                    this.aliens.push(newAlien);
                }
            }, 30000 + Math.random() * 60000); // 30-90 seconds respawn time
        };
        
        return alien;
    }
    
    getRandomPositionInSector(sector) {
        // Get random position within sector radius
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = sector.radius * Math.cbrt(Math.random()); // Cube root for more uniform distribution
        
        const x = sector.position.x + r * Math.sin(phi) * Math.cos(theta);
        const y = sector.position.y + r * Math.sin(phi) * Math.sin(theta);
        const z = sector.position.z + r * Math.cos(phi);
        
        return new THREE.Vector3(x, y, z);
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
    
    setCurrentSector(sector) {
        if (sector !== this.currentSector) {
            this.currentSector = sector;
            console.log(`Entered sector: ${sector.name}`);
        }
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
} 