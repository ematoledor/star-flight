import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GameWorld } from './scenes/GameWorld.js';
import { Spacecraft } from './entities/Spacecraft.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { UIManager } from './systems/UIManager.js';
import { LODManager } from './systems/LODManager.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { UpgradeSystem } from './systems/UpgradeSystem.js';
import { InputManager } from './systems/InputManager.js';

class Game {
    constructor() {
        this.initThree();
        this.setupLoadingManager();
        this.initGameSystems();
        
        // Start the game loop
        this.clock = new THREE.Clock();
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        console.log("Game initialized successfully");
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
        this.renderer.outputEncoding = THREE.sRGBEncoding;
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
        const galaxyGeometry = new THREE.PlaneGeometry(20000, 20000);
        const galaxyMaterial = new THREE.MeshBasicMaterial({
            map: new THREE.TextureLoader().load('assets/textures/galaxy.jpg'),
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
        
        // Get loading screen elements if they exist
        const progressBar = document.getElementById('loading-progress');
        const loadingScreen = document.getElementById('loading');
        
        if (progressBar && loadingScreen) {
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
    }
    
    initGameSystems() {
        // Initialize systems in the correct order
        console.log("Initializing game systems...");
        
        // 1. Initialize physics system first
        this.physicsSystem = new PhysicsSystem();
        console.log("Physics system initialized");
        
        // 2. Initialize LOD manager
        this.lodManager = new LODManager(this.camera, 10000);
        console.log("LOD manager initialized");
        
        // 3. Initialize combat system
        this.combatSystem = new CombatSystem(this.scene, this.physicsSystem);
        console.log("Combat system initialized");
        
        // 4. Initialize game world with all required systems
        this.gameWorld = new GameWorld(
            this.scene,
            this.loadingManager,
            this.physicsSystem
        );
        console.log("Game world initialized");
        
        // 5. Initialize player spacecraft
        this.spacecraft = new Spacecraft({
            scene: this.scene,
            camera: this.camera,
            physicsSystem: this.physicsSystem,
            position: new THREE.Vector3(0, 0, 0)
        });
        console.log("Player spacecraft initialized");
        
        // 6. Set up spacecraft in physics system
        this.physicsSystem.addObject(this.spacecraft);
        if (this.physicsSystem.collisionGroups) {
            this.spacecraft.collisionGroup = this.physicsSystem.collisionGroups.spacecraft;
        }
        
        // 7. Connect combat system to player
        this.combatSystem.setPlayerShip(this.spacecraft);
        
        // 8. Initialize UI manager
        this.uiManager = new UIManager(this.spacecraft, this.gameWorld);
        this.uiManager.initialize();
        console.log("UI manager initialized");
        
        // 9. Initialize upgrade system
        this.upgradeSystem = new UpgradeSystem(
            this.spacecraft,
            this.combatSystem,
            this.uiManager
        );
        
        // Add some starter credits for testing
        this.upgradeSystem.addCredits(2000);
        console.log("Upgrade system initialized");
        
        // 10. Setup input management
        this.inputManager = InputManager.getInstance();
        this.inputManager.registerKeyBinding('u', () => {
            this.upgradeSystem.toggleUpgradeMenu();
        });
        console.log("Input bindings initialized");
        
        // Connect systems together
        
        // Combat system callbacks
        this.spacecraft.onWeaponFired = (projectile) => {
            if (this.physicsSystem) {
                this.physicsSystem.addProjectile(projectile);
                projectile.owner = this.spacecraft; // For avoiding self-damage
                projectile.collisionGroup = this.physicsSystem.collisionGroups.projectile;
            }
        };
        
        // Game world callbacks
        this.gameWorld.onEnemyDestroyed = (enemyType, position) => {
            // Add credit rewards based on enemy type
            let creditReward = 0;
            switch(enemyType) {
                case 'scout':
                    creditReward = Math.floor(100 + Math.random() * 50);
                    break;
                case 'fighter':
                    creditReward = Math.floor(200 + Math.random() * 100);
                    break;
                case 'cruiser':
                    creditReward = Math.floor(500 + Math.random() * 200);
                    break;
                case 'asteroid':
                    creditReward = Math.floor(25 + Math.random() * 25);
                    break;
                default:
                    creditReward = Math.floor(50 + Math.random() * 50);
            }
            
            // Add credits to player
            this.upgradeSystem.addCredits(creditReward);
            
            // Create explosion effect at position
            if (position && this.combatSystem) {
                this.combatSystem.createExplosion(position, enemyType === 'asteroid' ? 10 : 20);
            }
        };
        
        // UI callbacks
        this.uiManager.onPlayerDeath = () => {
            this.handlePlayerDeath();
        };
        
        this.uiManager.onRestartGame = () => {
            this.restartGame();
        };
    }
    
    handlePlayerDeath() {
        console.log("Player died - handling death");
        
        // Reset player spacecraft
        setTimeout(() => {
            // Move to origin sector
            this.spacecraft.position.set(0, 0, 0);
            this.spacecraft.velocity.set(0, 0, 0);
            this.spacecraft.health = this.spacecraft.maxHealth;
            this.spacecraft.shield = this.spacecraft.maxShield;
            this.spacecraft.energy = this.spacecraft.maxEnergy;
            
            // Update UI
            this.uiManager.showRespawnMessage();
        }, 3000);
    }
    
    restartGame() {
        console.log("Restarting game");
        
        // Reset player spacecraft
        this.spacecraft.reset();
        
        // Reset game world (respawn enemies, etc)
        this.gameWorld.reset();
        
        // Reset combat system
        if (this.combatSystem.reset) {
            this.combatSystem.reset();
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock.getDelta();
        
        // Only update if UI is not paused
        if (!this.uiManager || !this.uiManager.isPaused()) {
            // Update game systems in the correct order
            
            // 1. Update physics
            if (this.physicsSystem) {
                this.physicsSystem.update(delta);
            }
            
            // 2. Update LOD manager
            if (this.lodManager) {
                this.lodManager.update(delta);
            }
            
            // 3. Update spacecraft
            if (this.spacecraft) {
                this.spacecraft.update(delta);
            }
            
            // 4. Update combat system
            if (this.combatSystem) {
                this.combatSystem.update(delta);
            }
            
            // 5. Update game world
            if (this.gameWorld) {
                this.gameWorld.update(delta);
            }
        }
        
        // Always update UI
        if (this.uiManager) {
            // Get current sector for UI
            const sectorInfo = this.gameWorld ? 
                this.gameWorld.getSectorAt(this.spacecraft.position) : 
                { name: 'unknown', sector: null };
                
            this.uiManager.update(delta, sectorInfo.sector);
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
    setTimeout(() => {
        try {
            const game = new Game();
            console.log("Game started successfully");
        } catch (error) {
            console.error("Error starting game:", error);
        }
    }, 1000); // Small delay to allow the loading screen to display
}); 