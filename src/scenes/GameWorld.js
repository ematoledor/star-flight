import * as THREE from 'three';
import { Planet } from '../entities/Planet.js';
import { StarField } from '../components/StarField.js';
import { Satellite } from '../entities/Satellite.js';
import { AlienShip } from '../entities/AlienShip.js';
import { AsteroidField } from '../components/AsteroidField.js';
import { Nebula } from '../components/Nebula.js';

export class GameWorld {
    constructor(scene, loadingManager, physicsSystem) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        this.physicsSystem = physicsSystem; // Store reference to physics system
        this.planets = [];
        this.satellites = [];
        this.alienShips = [];
        this.asteroidFields = [];
        this.nebulae = [];
        
        // Define space sectors
        this.sectors = {
            origin: { center: new THREE.Vector3(0, 0, 0), radius: 2000 },
            alpha: { center: new THREE.Vector3(5000, 0, -3000), radius: 3000 },
            beta: { center: new THREE.Vector3(-4000, 2000, -6000), radius: 2500 },
            gamma: { center: new THREE.Vector3(0, -3000, -8000), radius: 4000 },
            delta: { center: new THREE.Vector3(7000, 5000, -10000), radius: 5000 }
        };
        
        // Store universe bounds
        this.universeBounds = new THREE.Box3(
            new THREE.Vector3(-20000, -20000, -20000),
            new THREE.Vector3(20000, 20000, 20000)
        );
        
        this.onEnemyDestroyed = null; // Callback for when enemy is destroyed
        
        this.init();
    }
    
    init() {
        // Create star field background
        this.starField = new StarField(20000);
        this.scene.add(this.starField);
        
        // Create planets procedurally
        this.createPlanets();
        
        // Create satellites
        this.createSatellites();
        
        // Create alien ships
        this.createAlienShips();
        
        // Create asteroid fields
        this.createAsteroidFields();
        
        // Create nebulae
        this.createNebulae();
        
        // Initialize the world
        this.initialize();
    }
    
    createPlanets() {
        // Clear any existing planets
        this.planets.forEach(planet => {
            this.scene.remove(planet);
            if (this.physicsSystem) {
                this.physicsSystem.removeObject(planet);
            }
        });
        this.planets = [];
        
        // Planet types and their properties
        const planetTypes = [
            { type: 'earth', minRadius: 80, maxRadius: 150, textures: ['earth'] },
            { type: 'desert', minRadius: 60, maxRadius: 100, textures: ['mars', 'desert'] },
            { type: 'gas', minRadius: 180, maxRadius: 300, textures: ['jupiter', 'saturn', 'gas'] },
            { type: 'ice', minRadius: 70, maxRadius: 120, textures: ['ice', 'pluto'] },
            { type: 'lava', minRadius: 50, maxRadius: 90, textures: ['lava', 'volcanic'] },
            { type: 'rocky', minRadius: 40, maxRadius: 80, textures: ['moon', 'mercury', 'rocky'] }
        ];
        
        // Generate planets in each sector
        Object.entries(this.sectors).forEach(([sectorName, sector]) => {
            const numPlanets = 1 + Math.floor(Math.random() * 3); // 1-3 planets per sector
            
            for (let i = 0; i < numPlanets; i++) {
                // Choose random planet type
                const planetType = planetTypes[Math.floor(Math.random() * planetTypes.length)];
                
                // Generate random position within sector
                const position = this.getRandomPositionInSector(sector);
                
                // Random radius within range for this planet type
                const radius = planetType.minRadius + Math.random() * (planetType.maxRadius - planetType.minRadius);
                
                // Random texture from this planet type's options
                const textureType = planetType.textures[Math.floor(Math.random() * planetType.textures.length)];
                
                // Random rotation speed
                const rotationSpeed = 0.05 + Math.random() * 0.2;
                
                // Random axis tilt
                const axisTilt = Math.random() * Math.PI * 0.3;
                
                // Create the planet
                const planet = new Planet({
                    radius: radius,
                    position: position,
                    textureType: textureType,
                    rotationSpeed: rotationSpeed,
                    axisTilt: axisTilt,
                    scene: this.scene,
                    type: planetType.type,
                    gravityFactor: radius * 15, // Gravity based on size
                    gravityRadius: radius * 10, // Area of influence
                    hasAtmosphere: Math.random() > 0.3, // 70% chance of atmosphere
                    atmosphereColor: this.getRandomAtmosphereColor(planetType.type)
                });
                
                // Add to scene and lists
                this.planets.push(planet);
                
                // Add to physics system
                if (this.physicsSystem) {
                    this.physicsSystem.addObject(planet);
                    this.physicsSystem.addPlanet(planet); // For gravity calculations
                }
                
                // Add moons for some planets (not for small ones)
                if (radius > 80 && Math.random() > 0.4) {
                    const numMoons = 1 + Math.floor(Math.random() * 3); // 1-3 moons
                    
                    for (let j = 0; j < numMoons; j++) {
                        const moonSize = radius * (0.1 + Math.random() * 0.2);
                        const moonDistance = radius * (3 + Math.random() * 2);
                        const moonAngle = Math.random() * Math.PI * 2;
                        const moonHeight = (Math.random() - 0.5) * radius;
                        
                        const moonPosition = new THREE.Vector3(
                            position.x + Math.cos(moonAngle) * moonDistance,
                            position.y + moonHeight,
                            position.z + Math.sin(moonAngle) * moonDistance
                        );
                        
                        const moon = new Planet({
                            radius: moonSize,
                            position: moonPosition,
                            textureType: 'moon',
                            rotationSpeed: 0.1 + Math.random() * 0.3,
                            scene: this.scene,
                            type: 'moon',
                            parentPlanet: planet,
                            orbitSpeed: 0.1 + Math.random() * 0.4,
                            orbitRadius: moonDistance,
                            orbitCenterY: position.y + moonHeight
                        });
                        
                        // Add to scene and lists
                        this.planets.push(moon);
                        
                        // Add to physics system
                        if (this.physicsSystem) {
                            this.physicsSystem.addObject(moon);
                        }
                    }
                }
                
                // Add rings for some gas giants
                if (planetType.type === 'gas' && Math.random() > 0.6) {
                    planet.addRings({
                        innerRadius: radius * 1.2,
                        outerRadius: radius * 2,
                        color: this.getRandomRingColor()
                    });
                }
            }
        });
    }
    
    getRandomPositionInSector(sector) {
        // Generate random position within the sector's sphere
        const radius = sector.radius * Math.random();
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = sector.center.x + radius * Math.sin(phi) * Math.cos(theta);
        const y = sector.center.y + radius * Math.sin(phi) * Math.sin(theta);
        const z = sector.center.z + radius * Math.cos(phi);
        
        return new THREE.Vector3(x, y, z);
    }
    
    getRandomAtmosphereColor(planetType) {
        // Return appropriate atmosphere colors based on planet type
        switch(planetType) {
            case 'earth':
                return new THREE.Color(0x88aaff); // Blue
            case 'desert':
                return new THREE.Color(0xddaa77); // Dusty orange
            case 'gas':
                return new THREE.Color(0xddddff); // Light blue/white
            case 'ice':
                return new THREE.Color(0xaaddff); // Pale blue
            case 'lava':
                return new THREE.Color(0xff5500); // Orange-red
            case 'rocky':
                return new THREE.Color(0x999999); // Gray
            default:
                return new THREE.Color(0xaaaaff); // Default blue-ish
        }
    }
    
    getRandomRingColor() {
        // Random ring colors for gas giants
        const colors = [
            0xdddddd, // White
            0xccbbaa, // Tan
            0xaaaacc, // Light blue
            0xddccaa, // Light brown
            0xccddee  // Pale blue
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    createSatellites() {
        // Clear existing satellites
        this.satellites.forEach(satellite => {
            this.scene.remove(satellite);
            if (this.physicsSystem) {
                this.physicsSystem.removeObject(satellite);
            }
        });
        this.satellites = [];
        
        // Satellite types
        const satelliteTypes = ['station', 'comm', 'science', 'military', 'cargo'];
        
        // Add satellites near planets and in key locations
        this.planets.forEach(planet => {
            // Skip moons
            if (planet.config && planet.config.type === 'moon') {
                return;
            }
            
            // 50% chance of satellites for each main planet
            if (Math.random() > 0.5) {
                const numSatellites = 1 + Math.floor(Math.random() * 2); // 1-2 satellites
                
                for (let i = 0; i < numSatellites; i++) {
                    const type = satelliteTypes[Math.floor(Math.random() * satelliteTypes.length)];
                    
                    // Position satellite in orbit around planet
                    const orbitRadius = planet.config.radius * (2 + Math.random() * 2);
                    const angle = Math.random() * Math.PI * 2;
                    const height = (Math.random() - 0.5) * planet.config.radius * 0.5;
                    
                    const position = new THREE.Vector3(
                        planet.position.x + Math.cos(angle) * orbitRadius,
                        planet.position.y + height,
                        planet.position.z + Math.sin(angle) * orbitRadius
                    );
                    
                    // Random rotation
                    const rotation = new THREE.Euler(
                        Math.random() * Math.PI * 2,
                        Math.random() * Math.PI * 2,
                        Math.random() * Math.PI * 2
                    );
                    
                    const satellite = new Satellite({
                        type: type,
                        position: position,
                        rotation: rotation,
                        scene: this.scene,
                        orbitTarget: planet,
                        orbitSpeed: 0.05 + Math.random() * 0.1,
                        orbitRadius: orbitRadius,
                        orbitHeight: height
                    });
                    
                    this.satellites.push(satellite);
                    
                    // Add to physics system
                    if (this.physicsSystem) {
                        this.physicsSystem.addObject(satellite);
                    }
                }
            }
        });
        
        // Add additional standalone space stations in key sectors
        const numStations = 2 + Math.floor(Math.random() * 3); // 2-4 stations
        
        for (let i = 0; i < numStations; i++) {
            // Choose a sector randomly, but favor the origin sector
            const sectorKeys = Object.keys(this.sectors);
            const selectedSector = (i === 0) ? 
                this.sectors.origin : // First station always in origin sector
                this.sectors[sectorKeys[Math.floor(Math.random() * sectorKeys.length)]];
            
            const position = this.getRandomPositionInSector(selectedSector);
            
            // Random rotation
            const rotation = new THREE.Euler(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            const station = new Satellite({
                type: Math.random() > 0.7 ? 'military' : 'station',
                position: position,
                rotation: rotation,
                scene: this.scene,
                scale: 1 + Math.random() * 2 // Larger stations
            });
            
            this.satellites.push(station);
            
            // Add to physics system
            if (this.physicsSystem) {
                this.physicsSystem.addObject(station);
            }
        }
    }
    
    createAsteroidFields() {
        // Create 2-4 asteroid fields
        const numFields = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numFields; i++) {
            // Choose a sector
            const sectorKeys = Object.keys(this.sectors);
            const selectedSector = this.sectors[sectorKeys[Math.floor(Math.random() * sectorKeys.length)]];
            
            // Generate position within sector
            const position = this.getRandomPositionInSector(selectedSector);
            
            // Create asteroid field
            const asteroidField = new AsteroidField({
                position: position,
                radius: 500 + Math.random() * 1000,
                density: 0.1 + Math.random() * 0.4,
                scene: this.scene,
                physicsSystem: this.physicsSystem
            });
            
            this.asteroidFields.push(asteroidField);
        }
    }
    
    createNebulae() {
        // Create 1-3 nebulae
        const numNebulae = 1 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numNebulae; i++) {
            // Choose a sector
            const sectorKeys = Object.keys(this.sectors);
            const selectedSector = this.sectors[sectorKeys[Math.floor(Math.random() * sectorKeys.length)]];
            
            // Generate position within sector
            const position = this.getRandomPositionInSector(selectedSector);
            
            // Random nebula color
            const colors = [
                0xff5555, // Red
                0x55ff55, // Green
                0x5555ff, // Blue
                0xff55ff, // Purple
                0x55ffff, // Cyan
                0xffaa55  // Orange
            ];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Create nebula
            const nebula = new Nebula({
                position: position,
                radius: 1000 + Math.random() * 2000,
                color: color,
                scene: this.scene
            });
            
            this.nebulae.push(nebula);
        }
    }
    
    // Update existing alien ships creation method
    createAlienShips() {
        // Clear existing ships
        this.alienShips.forEach(ship => {
            this.scene.remove(ship);
            if (this.physicsSystem) {
                this.physicsSystem.removeObject(ship);
            }
        });
        this.alienShips = [];
        
        // Add new ships with distribution based on sectors
        Object.entries(this.sectors).forEach(([sectorName, sector]) => {
            // Different density of ships per sector based on "danger level"
            let numShips = 0;
            
            switch(sectorName) {
                case 'origin':
                    numShips = 1 + Math.floor(Math.random() * 2); // 1-2 ships (safer)
                    break;
                case 'alpha':
                    numShips = 2 + Math.floor(Math.random() * 3); // 2-4 ships
                    break;
                case 'beta':
                    numShips = 3 + Math.floor(Math.random() * 4); // 3-6 ships
                    break;
                case 'gamma':
                    numShips = 4 + Math.floor(Math.random() * 5); // 4-8 ships
                    break;
                case 'delta':
                    numShips = 5 + Math.floor(Math.random() * 6); // 5-10 ships (dangerous)
                    break;
                default:
                    numShips = 2 + Math.floor(Math.random() * 3);
            }
            
            for (let i = 0; i < numShips; i++) {
                // Choose ship type based on sector danger
                let type = 'standard';
                const dangerRoll = Math.random();
                
                if (sectorName === 'delta' && dangerRoll > 0.7) {
                    type = 'boss'; // 30% chance of boss in delta sector
                } else if ((sectorName === 'gamma' || sectorName === 'delta') && dangerRoll > 0.6) {
                    type = 'elite'; // 40% chance of elite in dangerous sectors
                } else if (dangerRoll > 0.8) {
                    type = 'elite'; // 20% chance in other sectors
                }
                
                // Generate position 
                const position = this.getRandomPositionInSector(sector);
                
                // Don't spawn ships too close to the player starting position
                if (sectorName === 'origin' && position.length() < 300) {
                    position.normalize().multiplyScalar(300 + Math.random() * 200);
                }
                
                const alienShip = new AlienShip({
                    type: type,
                    position: position,
                    scene: this.scene,
                    sectorName: sectorName
                });
                
                this.alienShips.push(alienShip);
                
                // Add to physics system
                if (this.physicsSystem) {
                    this.physicsSystem.addObject(alienShip);
                    alienShip.collisionGroup = this.physicsSystem.collisionGroups.alien;
                }
            }
        });
    }
    
    update(delta) {
        // Update planets
        this.planets.forEach(planet => {
            planet.update(delta);
        });
        
        // Update satellites
        this.satellites.forEach(satellite => {
            satellite.update(delta);
        });
        
        // Update alien ships
        this.alienShips.forEach(ship => {
            ship.update(delta);
        });
        
        // Update asteroid fields
        this.asteroidFields.forEach(field => {
            field.update(delta);
        });
        
        // Update nebulae
        this.nebulae.forEach(nebula => {
            nebula.update(delta);
        });
        
        // Update star field
        this.starField.update(delta);
    }
    
    // Get the current sector based on position
    getSectorAt(position) {
        for (const [name, sector] of Object.entries(this.sectors)) {
            const distance = position.distanceTo(sector.center);
            if (distance <= sector.radius) {
                return { name, sector };
            }
        }
        return { name: 'unknown', sector: null };
    }
    
    /**
     * Initialize the game world
     */
    initialize() {
        // Generate the star field
        this.generateStarField();
        
        // Generate sectors
        this.generateSectors();
        
        // Set current sector
        this.setCurrentSector(0);
    }
    
    /**
     * Generate game sectors
     */
    generateSectors() {
        // Example sector generation
        const sectors = [
            {
                name: 'Alpha Quadrant',
                position: new THREE.Vector3(0, 0, 0),
                radius: 5000,
                planetCount: 3,
                asteroidFieldCount: 2,
                nebulaCount: 1,
                dangerLevel: 1
            },
            {
                name: 'Beta Quadrant',
                position: new THREE.Vector3(10000, 0, 0),
                radius: 6000,
                planetCount: 2,
                asteroidFieldCount: 3,
                nebulaCount: 1,
                dangerLevel: 2
            },
            {
                name: 'Gamma Quadrant',
                position: new THREE.Vector3(0, 0, 10000),
                radius: 5500,
                planetCount: 1,
                asteroidFieldCount: 4,
                nebulaCount: 2,
                dangerLevel: 3
            },
            {
                name: 'Delta Quadrant',
                position: new THREE.Vector3(10000, 0, 10000),
                radius: 7000,
                planetCount: 4,
                asteroidFieldCount: 1,
                nebulaCount: 3,
                dangerLevel: 4
            }
        ];
        
        // Create each sector
        sectors.forEach(sectorData => {
            const sector = this.createSector(sectorData);
            this.sectors.push(sector);
        });
    }
    
    /**
     * Create a single sector
     * @param {Object} sectorData - Data for the sector
     */
    createSector(sectorData) {
        const sector = {
            name: sectorData.name,
            position: sectorData.position,
            radius: sectorData.radius,
            planets: [],
            asteroidFields: [],
            nebulae: [],
            enemies: [],
            dangerLevel: sectorData.dangerLevel || 1
        };
        
        // Create planets
        for (let i = 0; i < sectorData.planetCount; i++) {
            const planet = this.createPlanet({
                sectorPosition: sectorData.position,
                sectorRadius: sectorData.radius
            });
            sector.planets.push(planet);
        }
        
        // Create asteroid fields
        for (let i = 0; i < sectorData.asteroidFieldCount; i++) {
            const asteroidField = this.createAsteroidField({
                sectorPosition: sectorData.position,
                sectorRadius: sectorData.radius
            });
            sector.asteroidFields.push(asteroidField);
            this.asteroidFields.push(asteroidField);
        }
        
        // Create nebulae
        for (let i = 0; i < sectorData.nebulaCount; i++) {
            const nebula = this.createNebula({
                sectorPosition: sectorData.position,
                sectorRadius: sectorData.radius,
                dangerLevel: sectorData.dangerLevel
            });
            sector.nebulae.push(nebula);
            this.nebulae.push(nebula);
        }
        
        // Create enemies based on danger level
        const enemyCount = Math.floor(3 * sectorData.dangerLevel);
        for (let i = 0; i < enemyCount; i++) {
            const enemy = this.createEnemy({
                sectorPosition: sectorData.position,
                sectorRadius: sectorData.radius,
                dangerLevel: sectorData.dangerLevel
            });
            sector.enemies.push(enemy);
        }
        
        return sector;
    }
    
    /**
     * Create an asteroid field
     * @param {Object} options - Options for the asteroid field
     */
    createAsteroidField(options) {
        const { sectorPosition, sectorRadius } = options;
        
        // Calculate random position within sector
        const position = this.getRandomPositionInSphere(sectorPosition, sectorRadius * 0.8);
        
        // Create asteroid field
        const asteroidField = new AsteroidField({
            position: position,
            radius: 500 + Math.random() * 1000, // 500-1500 unit radius
            density: 0.00002 + Math.random() * 0.00003, // Density factor
            scene: this.scene,
            physicsSystem: this.physicsSystem
        });
        
        return asteroidField;
    }
    
    /**
     * Create a nebula
     * @param {Object} options - Options for the nebula
     */
    createNebula(options) {
        const { sectorPosition, sectorRadius, dangerLevel } = options;
        
        // Calculate random position within sector
        const position = this.getRandomPositionInSphere(sectorPosition, sectorRadius * 0.7);
        
        // Generate random color based on danger level
        let color;
        switch (dangerLevel) {
            case 1:
                color = new THREE.Color(0x3366ff); // Blue - safe
                break;
            case 2:
                color = new THREE.Color(0x66ccff); // Cyan - low danger
                break;
            case 3:
                color = new THREE.Color(0xff6633); // Orange - medium danger
                break;
            case 4:
                color = new THREE.Color(0xff3366); // Red - high danger
                break;
            default:
                color = new THREE.Color(0x9966ff); // Purple - default
        }
        
        // Create nebula
        const nebula = new Nebula({
            position: position,
            radius: 800 + Math.random() * 1200, // 800-2000 unit radius
            color: color,
            scene: this.scene,
            density: 0.0001 + Math.random() * 0.0002,
            particleSize: 15 + Math.random() * 15
        });
        
        return nebula;
    }
    
    /**
     * Set the current active sector
     * @param {number} index - Index of the sector to set as current
     */
    setCurrentSector(index) {
        if (index < 0 || index >= this.sectors.length) {
            console.error('Invalid sector index');
            return;
        }
        
        // Set current sector
        this.currentSector = this.sectors[index];
        
        // Optional: Trigger any events or UI updates
        console.log(`Entered sector: ${this.currentSector.name}`);
    }
    
    /**
     * Get a random position within a sphere
     * @param {THREE.Vector3} center - Center of the sphere
     * @param {number} radius - Radius of the sphere
     * @returns {THREE.Vector3} Random position
     */
    getRandomPositionInSphere(center, radius) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * Math.cbrt(Math.random()); // Cube root for uniform distribution
        
        const x = center.x + r * Math.sin(phi) * Math.cos(theta);
        const y = center.y + r * Math.sin(phi) * Math.sin(theta);
        const z = center.z + r * Math.cos(phi);
        
        return new THREE.Vector3(x, y, z);
    }
    
    /**
     * Reset the game world
     */
    reset() {
        // Remove all asteroids, enemies, etc.
        this.asteroidFields.forEach(field => {
            field.dispose();
        });
        
        this.nebulae.forEach(nebula => {
            nebula.dispose();
        });
        
        // Clear arrays
        this.asteroidFields = [];
        this.nebulae = [];
        
        // Regenerate
        this.initialize();
    }
} 