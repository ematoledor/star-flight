import * as THREE from 'three';
import { Planet } from '../entities/Planet.js';
import { StarField } from '../components/StarField.js';
import { Satellite } from '../entities/Satellite.js';
import { AlienShip } from '../entities/AlienShip.js';

export class GameWorld {
    constructor(scene, loadingManager) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        this.planets = [];
        this.satellites = [];
        this.alienShips = [];
        
        this.init();
    }
    
    init() {
        // Create star field background
        this.starField = new StarField(10000);
        this.scene.add(this.starField);
        
        // Create planets
        this.createPlanets();
        
        // Create satellites
        this.createSatellites();
        
        // Create alien ships
        this.createAlienShips();
    }
    
    createPlanets() {
        // Earth-like planet
        const earthPlanet = new Planet({
            radius: 100,
            position: new THREE.Vector3(0, -500, 0),
            textureType: 'earth',
            scene: this.scene
        });
        this.planets.push(earthPlanet);
        
        // Red planet (Mars-like)
        const redPlanet = new Planet({
            radius: 60,
            position: new THREE.Vector3(800, 200, -1200),
            textureType: 'mars',
            scene: this.scene
        });
        this.planets.push(redPlanet);
        
        // Gas giant (Jupiter-like)
        const gasGiant = new Planet({
            radius: 200,
            position: new THREE.Vector3(-1500, -300, -2000),
            textureType: 'jupiter',
            scene: this.scene
        });
        this.planets.push(gasGiant);
        
        // Ice planet
        const icePlanet = new Planet({
            radius: 80,
            position: new THREE.Vector3(2000, 500, -3000),
            textureType: 'ice',
            scene: this.scene
        });
        this.planets.push(icePlanet);
    }
    
    createSatellites() {
        // Space station
        const spaceStation = new Satellite({
            type: 'station',
            position: new THREE.Vector3(200, 100, -300),
            rotation: new THREE.Euler(0, Math.PI / 4, 0),
            scene: this.scene
        });
        this.satellites.push(spaceStation);
        
        // Communication satellite
        const commSatellite = new Satellite({
            type: 'comm',
            position: new THREE.Vector3(-150, 50, -200),
            rotation: new THREE.Euler(Math.PI / 6, 0, Math.PI / 3),
            scene: this.scene
        });
        this.satellites.push(commSatellite);
        
        // Add more satellites as needed
    }
    
    createAlienShips() {
        // Create some alien ships at different positions
        for (let i = 0; i < 10; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000
            );
            
            // Don't spawn ships too close to the player
            if (position.length() < 300) {
                position.normalize().multiplyScalar(300 + Math.random() * 200);
            }
            
            const alienShip = new AlienShip({
                type: Math.random() > 0.7 ? 'elite' : 'standard',
                position: position,
                scene: this.scene
            });
            
            this.alienShips.push(alienShip);
        }
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
        
        // Update star field
        this.starField.update(delta);
    }
} 