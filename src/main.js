import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GameWorld } from './scenes/GameWorld.js';
import { Spacecraft } from './entities/Spacecraft.js';
import { InputHandler } from './systems/InputHandler.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { UIManager } from './systems/UIManager.js';

class Game {
    constructor() {
        this.initThree();
        this.setupLoadingManager();
        this.initGameSystems();
        
        // Start the game loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    initThree() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
        this.camera.position.z = 15;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
        
        // Add post-processing for improved visuals
        this.setupPostProcessing();
        
        // Add basic lighting
        const ambientLight = new THREE.AmbientLight(0x202020);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);
        
        // Add distant stars and galaxy backdrop
        this.addDistantSpaceBackdrop();
        
        // Add temporary controls for development (will be replaced by spacecraft controls)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    }
    
    setupPostProcessing() {
        // Will be implemented in a future update with more advanced visual effects
        // For now, enable basic features in the renderer
        this.renderer.gammaOutput = true;
        this.renderer.gammaFactor = 2.2;
        this.renderer.shadowMap.enabled = true;
    }
    
    addDistantSpaceBackdrop() {
        // Create a large skybox with stars
        const skyboxGeometry = new THREE.SphereGeometry(10000, 32, 32);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.BackSide,
            fog: false
        });
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);
        
        // Add distant galaxy plane
        const galaxyTexture = new THREE.TextureLoader().load('assets/textures/galaxy.jpg');
        const galaxyGeometry = new THREE.PlaneGeometry(20000, 20000);
        const galaxyMaterial = new THREE.MeshBasicMaterial({
            map: galaxyTexture,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const galaxy = new THREE.Mesh(galaxyGeometry, galaxyMaterial);
        galaxy.position.z = -9000;
        galaxy.rotation.z = Math.random() * Math.PI;
        this.scene.add(galaxy);
    }
    
    setupLoadingManager() {
        this.loadingManager = new THREE.LoadingManager();
        
        const progressBar = document.getElementById('loading-progress');
        const loadingScreen = document.getElementById('loading');
        
        this.loadingManager.onProgress = (url, loaded, total) => {
            const progress = (loaded / total) * 100;
            progressBar.style.width = progress + '%';
        };
        
        this.loadingManager.onLoad = () => {
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        };
    }
    
    initGameSystems() {
        this.clock = new THREE.Clock();
        
        // Initialize physics system first
        this.physicsSystem = new PhysicsSystem();
        
        // Initialize game world with physics system
        this.gameWorld = new GameWorld(this.scene, this.loadingManager, this.physicsSystem);
        
        // Initialize player spacecraft
        this.spacecraft = new Spacecraft(this.scene, this.camera);
        
        // Add spacecraft to physics system
        this.physicsSystem.addObject(this.spacecraft);
        
        // Set collision group for spacecraft
        if (this.physicsSystem.collisionGroups) {
            this.spacecraft.collisionGroup = this.physicsSystem.collisionGroups.spacecraft;
        }
        
        // Register weapons for collision detection
        this.spacecraft.onWeaponFired = (projectile) => {
            if (this.physicsSystem) {
                this.physicsSystem.addProjectile(projectile);
                projectile.owner = this.spacecraft; // For avoiding self-damage
                projectile.collisionGroup = this.physicsSystem.collisionGroups.projectile;
            }
        };
        
        // Set callback for projectile hits
        this.spacecraft.onProjectileHit = (projectile, target) => {
            // Handle scoring and enemy destruction
            if (target.type === 'alien') {
                this.uiManager.updateScore(target.pointValue || 100);
            }
        };
        
        // Initialize input handler
        this.inputHandler = new InputHandler(this.spacecraft);
        
        // Initialize UI
        this.uiManager = new UIManager(this.spacecraft, this.gameWorld);
        
        // Set callback for UI events
        this.uiManager.onPlayerDeath = () => {
            this.handlePlayerDeath();
        };
    }
    
    handlePlayerDeath() {
        // Reset player spacecraft
        setTimeout(() => {
            // Move to origin sector
            this.spacecraft.position.set(0, 0, 0);
            this.spacecraft.velocity.set(0, 0, 0);
            this.spacecraft.health = this.spacecraft.maxHealth;
            this.spacecraft.ammo = this.spacecraft.maxAmmo;
            
            // Update UI
            this.uiManager.showRespawnMessage();
        }, 3000);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock.getDelta();
        
        // Update game systems
        this.inputHandler.update();
        this.spacecraft.update(delta);
        this.physicsSystem.update(delta);
        this.gameWorld.update(delta);
        
        // Get current sector for UI
        const currentSector = this.gameWorld.getSectorAt(this.spacecraft.position);
        
        // Update UI with sector info
        this.uiManager.update(delta, currentSector);
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
    setTimeout(() => {
        new Game();
    }, 1000); // Small delay to allow the loading screen to display
}); 