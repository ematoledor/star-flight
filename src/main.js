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
        // Game properties
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.spacecraft = null;
        this.gameWorld = null;
        this.physicsSystem = null;
        this.lodManager = null;
        this.combatSystem = null;
        this.uiManager = null;
        this.upgradeSystem = null;
        this.inputManager = null;
        
        // Debug mode
        this.debugMode = false;
        
        // Exploration tracking
        this.discoveredSectors = new Set();
        this.discoveredPlanets = new Set();
        this.discoveredAnomalies = new Set();
        this.explorationScore = 0;
        
        // Performance monitoring
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.lastTime = performance.now();
        this.fpsElement = null;
        
        // Docking system tracking
        this.lastDockingPromptTime = null;
        
        // Loading manager for assets
        this.loadingManager = new THREE.LoadingManager();
        this.loadingManager.onProgress = (url, loaded, total) => {
            const progress = (loaded / total) * 100;
            this.updateLoadingProgress(progress);
        };
        
        // Bind methods
        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        
        // Initialize the game
        this.init();
    }
    
    initThree() {
        try {
            // Create scene
            this.scene = new THREE.Scene();
            if (!this.scene) {
                throw new Error("Failed to create THREE.Scene");
            }
            this.scene.background = new THREE.Color(0x000000);
            
            // Create camera
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
            this.camera.position.z = 15;
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            this.renderer.shadowMap.enabled = true;
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
            
            console.log("Three.js initialized successfully");
        } catch (error) {
            console.error("Error initializing Three.js:", error);
            throw error; // Re-throw to halt initialization
        }
    }
    
    setupPostProcessing() {
        // Will be implemented in a future update with more advanced visual effects
        // For now, enable basic features in the renderer
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
    }
    
    addDistantSpaceBackdrop() {
        // Create a simple in-memory galaxy texture
        const galaxyCanvas = document.createElement('canvas');
        galaxyCanvas.width = 1024;
        galaxyCanvas.height = 1024;
        const ctx = galaxyCanvas.getContext('2d');
        
        // Draw black background
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, galaxyCanvas.width, galaxyCanvas.height);
        
        // Draw stars
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * galaxyCanvas.width;
            const y = Math.random() * galaxyCanvas.height;
            const radius = Math.random() * 1.5;
            const brightness = Math.random();
            
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw galaxy spiral
        const centerX = galaxyCanvas.width / 2;
        const centerY = galaxyCanvas.height / 2;
        
        // Draw galaxy center glow
        const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 300);
        grd.addColorStop(0, 'rgba(100, 120, 255, 0.8)');
        grd.addColorStop(0.5, 'rgba(50, 50, 150, 0.4)');
        grd.addColorStop(1, 'rgba(20, 20, 80, 0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 300, 0, Math.PI * 2);
        ctx.fill();
        
        // Create spiral arms
        for (let arm = 0; arm < 3; arm++) {
            const armOffset = arm * (Math.PI * 2 / 3);
            for (let i = 0; i < 500; i++) {
                const distance = 40 + i * 1.5;
                const angle = i * 0.03 + armOffset;
                
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                
                if (x >= 0 && x < galaxyCanvas.width && y >= 0 && y < galaxyCanvas.height) {
                    const brightness = Math.random() * 0.5 + 0.3;
                    const size = Math.random() * 4 + 1;
                    
                    // Random color tint for variety
                    const r = 180 + Math.random() * 75;
                    const g = 180 + Math.random() * 75;
                    const b = 200 + Math.random() * 55;
                    
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness})`;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Create skybox
        const skyboxGeometry = new THREE.SphereGeometry(10000, 32, 32);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.BackSide,
            fog: false
        });
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);
        
        // Create texture from canvas
        const galaxyTexture = new THREE.CanvasTexture(galaxyCanvas);
        
        // Add distant galaxy plane
        const galaxyGeometry = new THREE.PlaneGeometry(20000, 20000);
        
        this.galaxyMaterial = new THREE.MeshBasicMaterial({
            map: galaxyTexture,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        const galaxy = new THREE.Mesh(galaxyGeometry, this.galaxyMaterial);
        galaxy.position.z = -9000;
        galaxy.rotation.z = Math.random() * Math.PI;
        this.scene.add(galaxy);
        
        console.log("Space backdrop created with in-memory galaxy texture");
    }
    
    setupLoadingManager() {
        this.loadingManager = new THREE.LoadingManager();
        
        // Get loading screen elements if they exist
        const progressBar = document.getElementById('loading-progress');
        const loadingScreen = document.getElementById('loading');
        
        if (progressBar && loadingScreen) {
            // Track loading start time for analytics
            const loadingStartTime = performance.now();
            
            // Set initial message
            const loadingMessage = document.querySelector('#loading p');
            if (loadingMessage) {
                loadingMessage.textContent = 'Preparing game assets...';
            }
            
            // Use a more responsive progress update
            this.loadingManager.onProgress = (url, loaded, total) => {
                // Calculate progress percentage
                const progress = (loaded / total) * 100;
                progressBar.style.width = progress + '%';
                
                // Update message based on progress
                if (loadingMessage) {
                    if (progress < 30) {
                        loadingMessage.textContent = 'Loading textures and models...';
                    } else if (progress < 60) {
                        loadingMessage.textContent = 'Building game world...';
                    } else if (progress < 90) {
                        loadingMessage.textContent = 'Initializing physics...';
                    } else {
                        loadingMessage.textContent = 'Almost ready!';
                    }
                }
            };
            
            // Add error handling
            this.loadingManager.onError = (url) => {
                console.error('Error loading asset:', url);
                // Continue loading other assets
                if (loadingMessage) {
                    loadingMessage.textContent = 'Some assets failed to load, but we can continue...';
                }
            };
            
            this.loadingManager.onLoad = () => {
                const loadTime = performance.now() - loadingStartTime;
                console.log(`Game assets loaded in ${loadTime.toFixed(2)}ms`);
                
                // Hide loading screen more quickly
                setTimeout(() => {
                    // Fade out the loading screen
                    loadingScreen.style.opacity = '0';
                    loadingScreen.style.transition = 'opacity 0.3s ease';
                    
                    // Then hide it
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 300);
                }, 200); // Reduced delay
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
        
        // 3. Initialize combat system (less emphasis, but still available)
        this.combatSystem = new CombatSystem(this.scene, this.physicsSystem);
        console.log("Combat system initialized");
        
        // 4. Initialize game world with all required systems
        try {
            this.gameWorld = new GameWorld(
                this.scene,
                this.loadingManager,
                this.physicsSystem
            );
            console.log("Game world initialized");
        } catch (error) {
            console.error("Error initializing game world:", error);
            // Create a minimal game world as fallback
            this.gameWorld = {
                update: () => {},
                reset: () => {},
                getNearestMothership: () => null,
                isNearMothershipDockingBay: () => false
            };
        }
        
        // 5. Initialize player spacecraft
        try {
            if (!this.scene) {
                console.error("Scene is null or undefined when creating spacecraft");
            }
            
            this.spacecraft = new Spacecraft({
                scene: this.scene,
                camera: this.camera,
                physicsSystem: this.physicsSystem,
                position: new THREE.Vector3(0, 0, 0) // Initial position will be updated by mothership
            });
            console.log("Player spacecraft initialized");
            
            // 6. Set up spacecraft in physics system
            if (this.physicsSystem) {
                this.physicsSystem.addObject(this.spacecraft);
                if (this.physicsSystem.collisionGroups) {
                    this.spacecraft.collisionGroup = this.physicsSystem.collisionGroups.spacecraft;
                }
            }
            
            // 7. Connect combat system to player
            if (this.combatSystem) {
                this.combatSystem.setPlayerShip(this.spacecraft);
            }
            
            // 8. Dock the spacecraft in the mothership initially
            this.dockWithMothership();
        } catch (error) {
            console.error("Error initializing spacecraft:", error);
        }
        
        // 9. Initialize UI manager
        try {
            this.uiManager = new UIManager(this.spacecraft, this.gameWorld);
            console.log("UI manager initialized");
            
            // Add exploration-focused notification
            if (this.uiManager.showNotification) {
                this.uiManager.showNotification('WELCOME EXPLORER - PRESS L TO LAUNCH AND BEGIN YOUR JOURNEY', 'info');
            }
        } catch (error) {
            console.error("Error initializing UI manager:", error);
        }
        
        // 10. Initialize upgrade system
        this.upgradeSystem = new UpgradeSystem(
            this.spacecraft,
            this.combatSystem,
            this.uiManager
        );
        
        // Add some starter credits for testing
        this.upgradeSystem.addCredits(2000);
        console.log("Upgrade system initialized");
        
        // 11. Setup input management
        this.inputManager = InputManager.getInstance();
        
        // Register upgrade menu key
        this.inputManager.registerKeyBinding('u', () => {
            this.upgradeSystem.toggleUpgradeMenu();
        });
        
        // Register pause key (ESC)
        this.inputManager.registerKeyBinding('Escape', () => {
            if (this.uiManager) {
                this.uiManager.togglePause();
            }
        });
        
        // Register launch/dock key (L)
        this.inputManager.registerKeyBinding('l', () => {
            this.toggleLaunchDock();
        });
        
        // Register debug key (D)
        this.inputManager.registerKeyBinding('d', () => {
            this.toggleDebugMode();
        });
        
        // Register scan key (S) for exploration
        this.inputManager.registerKeyBinding('s', () => {
            this.scanSurroundings();
        });
        
        // Register map key (M)
        this.inputManager.registerKeyBinding('m', () => {
            this.toggleGalacticMap();
        });
        
        console.log("Input bindings initialized");
        
        // Connect systems together
        
        // Combat system callbacks (reduced emphasis)
        this.spacecraft.onWeaponFired = (projectile) => {
            if (this.physicsSystem) {
                this.physicsSystem.addProjectile(projectile);
                projectile.owner = this.spacecraft; // For avoiding self-damage
                projectile.collisionGroup = this.physicsSystem.collisionGroups.projectile;
            }
        };
        
        // Game world callbacks - focus on exploration
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
        
        // Add exploration callbacks
        if (this.gameWorld) {
            // Track sector discovery
            this.gameWorld.onSectorDiscovered = (sectorInfo) => {
                if (!this.discoveredSectors.has(sectorInfo.name)) {
                    this.discoveredSectors.add(sectorInfo.name);
                    this.explorationScore += 100;
                    
                    if (this.uiManager && this.uiManager.showNotification) {
                        this.uiManager.showNotification(`NEW SECTOR DISCOVERED: ${sectorInfo.name}`, 'success');
                    }
                }
            };
            
            // Track planet discovery
            this.gameWorld.onPlanetDiscovered = (planetInfo) => {
                const planetId = `${planetInfo.name}-${planetInfo.position.x}-${planetInfo.position.y}-${planetInfo.position.z}`;
                if (!this.discoveredPlanets.has(planetId)) {
                    this.discoveredPlanets.add(planetId);
                    this.explorationScore += 250;
                    
                    if (this.uiManager && this.uiManager.showNotification) {
                        this.uiManager.showNotification(`NEW PLANET DISCOVERED: ${planetInfo.name}`, 'success');
                    }
                }
            };
            
            // Track anomaly discovery
            this.gameWorld.onAnomalyDiscovered = (anomalyInfo) => {
                const anomalyId = `${anomalyInfo.type}-${anomalyInfo.position.x}-${anomalyInfo.position.y}-${anomalyInfo.position.z}`;
                if (!this.discoveredAnomalies.has(anomalyId)) {
                    this.discoveredAnomalies.add(anomalyId);
                    this.explorationScore += 500;
                    
                    if (this.uiManager && this.uiManager.showNotification) {
                        this.uiManager.showNotification(`ANOMALY DISCOVERED: ${anomalyInfo.type}`, 'success');
                    }
                }
            };
        }
        
        // UI callbacks
        this.uiManager.onPlayerDeath = () => {
            this.handlePlayerDeath();
        };
        
        this.uiManager.onRestartGame = () => {
            this.restartGame();
        };
    }
    
    // Add this new method to dock with a mothership
    dockWithMothership() {
        try {
            // Find the nearest mothership
            const mothership = this.gameWorld.getNearestMothership(this.spacecraft.position);
            
            if (mothership) {
                // Dock the spacecraft
                mothership.dockSpacecraft(this.spacecraft);
                
                // Update camera to look at the mothership
                this.camera.position.copy(mothership.position).add(new THREE.Vector3(0, 100, 300));
                this.camera.lookAt(mothership.position);
                
                // Disable first-person controls temporarily
                this.spacecraft.controlsEnabled = false;
                
                // Show docking notification
                if (this.uiManager && this.uiManager.showNotification) {
                    this.uiManager.showNotification('DOCKED WITH MOTHERSHIP - PRESS L TO LAUNCH', 'info');
                }
                
                return true;
            }
        } catch (error) {
            console.error("Error docking with mothership:", error);
        }
        return false;
    }
    
    // Update the launch method to be more exploration-focused
    launchFromMothership() {
        try {
            // Find the nearest mothership
            const mothership = this.gameWorld.getNearestMothership(this.spacecraft.position);
            
            if (mothership && mothership.isDocked) {
                // Launch the spacecraft
                mothership.launchSpacecraft();
                
                // Enable first-person controls
                this.spacecraft.controlsEnabled = true;
                
                // Reset camera to follow the spacecraft
                this.camera.position.set(0, 10, 30);
                this.camera.lookAt(new THREE.Vector3(0, 0, -100));
                
                console.log('Camera reset to:', this.camera.position);
                console.log('Camera looking at: forward direction');
                
                // Show launch notification with exploration focus
                if (this.uiManager && this.uiManager.showNotification) {
                    this.uiManager.showNotification('SPACECRAFT LAUNCHED - PRESS S TO SCAN SURROUNDINGS, M FOR MAP', 'success');
                }
                
                return true;
            } else {
                console.warn('Cannot launch: No mothership found or not docked');
            }
        } catch (error) {
            console.error("Error launching from mothership:", error);
        }
        return false;
    }
    
    // Method to toggle between launch and dock
    toggleLaunchDock() {
        // Check if we're currently docked first
        const mothership = this.gameWorld.getNearestMothership(this.spacecraft.position);
        if (mothership && mothership.isDocked) {
            // If docked, launch
            this.launchFromMothership();
        } else {
            // If not docked, check if we're close enough to dock
            const nearbyMothership = this.gameWorld.isNearMothershipDockingBay(this.spacecraft);
            if (nearbyMothership) {
                // If near a docking bay, dock
                nearbyMothership.dockSpacecraft(this.spacecraft);
                
                // Show docking notification
                if (this.uiManager && this.uiManager.showNotification) {
                    this.uiManager.showNotification('DOCKED WITH MOTHERSHIP - PRESS L TO LAUNCH', 'info');
                }
            } else if (mothership) {
                // Not close enough to dock
                const distance = this.spacecraft.position.distanceTo(mothership.position);
                const direction = mothership.position.clone().sub(this.spacecraft.position).normalize();
                
                // Show a navigation hint
                if (this.uiManager && this.uiManager.showNotification) {
                    this.uiManager.showNotification(`MOTHERSHIP ${distance.toFixed(0)}m AWAY - GET CLOSER TO DOCK`, 'warning');
                }
            }
        }
    }
    
    handlePlayerDeath() {
        console.log("Player died - handling death");
        
        // Reset player spacecraft
        setTimeout(() => {
            // Dock with mothership
            this.dockWithMothership();
            
            // Restore health
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
        try {
            // Schedule next frame first (should happen even if an error occurs)
            requestAnimationFrame(this.animate.bind(this));
            
            // Calculate delta time
            const now = performance.now();
            const delta = (now - this.lastTime) / 1000; // Convert to seconds
            this.lastTime = now;
            
            // Skip if paused
            try {
                if (this.uiManager?.isPaused) {
                    return;
                }
            } catch (error) {
                console.warn('Error checking pause state:', error);
            }
            
            // Debug camera position and scene objects
            if (this.frameCount % 60 === 0) { // Log once per second at 60fps
                console.log('Camera position:', this.camera.position);
                console.log('Camera rotation:', this.camera.rotation);
                
                // Count visible objects in scene
                let visibleObjects = 0;
                if (this.scene) {
                    this.scene.traverse(object => {
                        if (object.visible && object instanceof THREE.Mesh) {
                            visibleObjects++;
                        }
                    });
                    console.log(`Visible objects in scene: ${visibleObjects}`);
                }
                
                // Log spacecraft position if available
                if (this.spacecraft) {
                    console.log('Spacecraft position:', this.spacecraft.position);
                    console.log('Spacecraft visible:', this.spacecraft.visible);
                }
            }
            
            // Update game systems
            try {
                // Update physics
                if (this.physicsSystem) {
                    this.physicsSystem.update(delta);
                }
                
                // Update LOD manager
                if (this.lodManager) {
                    this.lodManager.update(this.camera.position);
                }
                
                // Update motherships
                if (this.gameWorld && this.gameWorld.motherships) {
                    this.gameWorld.motherships.forEach(mothership => {
                        if (mothership && mothership.update) {
                            mothership.update(delta);
                        }
                    });
                }
                
                // Update player spacecraft
                if (this.spacecraft) {
                    this.spacecraft.update(delta);
                    
                    // Check for mothership docking proximity when player is not docked
                    if (this.gameWorld && this.gameWorld.isNearMothershipDockingBay) {
                        try {
                            const nearbyMothership = this.gameWorld.isNearMothershipDockingBay(this.spacecraft);
                            
                            // Show docking prompt if near a mothership and not already docked
                            if (nearbyMothership && !nearbyMothership.isDocked && this.uiManager && 
                                this.uiManager.showNotification && !this.lastDockingPromptTime) {
                                
                                this.uiManager.showNotification('NEAR DOCKING BAY - PRESS L TO DOCK', 'info', { priority: 2 });
                                this.lastDockingPromptTime = now;
                            }
                            
                            // Reset docking prompt timer
                            if (this.lastDockingPromptTime && (now - this.lastDockingPromptTime > 10000)) {
                                this.lastDockingPromptTime = null;
                            }
                        } catch (error) {
                            console.warn('Error checking docking proximity:', error);
                        }
                    }
                }
                
                // Update combat system
                if (this.combatSystem) {
                    this.combatSystem.update(delta);
                }
                
                // Update game world
                if (this.gameWorld) {
                    this.gameWorld.update(delta, this.spacecraft ? this.spacecraft.position : null);
                }
            } catch (error) {
                console.error('Error updating game systems:', error);
            }
            
            // Update UI
            try {
                if (this.uiManager) {
                    // Get current sector info safely
                    let sectorInfo = { name: "Deep Space", difficulty: 1, sector: null };
                    
                    if (this.gameWorld && this.spacecraft) {
                        try {
                            // First check if getCurrentSector method exists
                            if (typeof this.gameWorld.getCurrentSector === 'function') {
                                sectorInfo = this.gameWorld.getCurrentSector();
                            } 
                            // Fallback to getSectorAt if getCurrentSector doesn't exist
                            else if (typeof this.gameWorld.getSectorAt === 'function') {
                                sectorInfo = this.gameWorld.getSectorAt(this.spacecraft.position);
                            }
                        } catch (error) {
                            console.warn('Error getting current sector:', error);
                        }
                    }
                    
                    // Update UI with current sector info and combat system
                    this.uiManager.update(delta, sectorInfo);
                }
            } catch (error) {
                console.error('Error updating UI:', error);
            }
            
            // Render scene
            try {
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            } catch (error) {
                console.error('Error rendering scene:', error);
            }
            
            // Update FPS counter
            this.frameCount++;
            if (now - this.lastFpsUpdate > 1000) {
                this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
                this.frameCount = 0;
                this.lastFpsUpdate = now;
                
                if (this.fpsElement) {
                    this.fpsElement.textContent = `FPS: ${this.fps}`;
                }
            }
        } catch (error) {
            console.error('Critical error in animation loop:', error);
            // The animation will continue because we scheduled the next frame first
        }
    }
    
    init() {
        try {
            console.log("Initializing game...");
            
            // Create FPS counter element
            this.createFpsCounter();
            
            // Setup loading screen references
            this.setupLoadingScreenReferences();
            
            // Manually update loading progress since we don't have actual assets loading
            this.updateLoadingProgress(10);
            
            // Initialize Three.js core components
            this.initThree();
            
            this.updateLoadingProgress(30);
            
            // Initialize game systems
            this.initGameSystems();
            
            this.updateLoadingProgress(80);
            
            // Add event listeners
            window.addEventListener('resize', this.onWindowResize);
            
            // Start the animation loop
            this.animate();
            
            // Complete loading
            this.updateLoadingProgress(100);
            
            // Force remove any remaining loading screens
            this.forceRemoveAllLoadingScreens();
            
            console.log("Game initialized successfully");
        } catch (error) {
            console.error("Error initializing game:", error);
            this.showErrorMessage("Failed to initialize game. Please reload the page.");
        }
    }
    
    createFpsCounter() {
        this.fpsElement = document.createElement('div');
        this.fpsElement.id = 'fps-counter';
        this.fpsElement.style.position = 'absolute';
        this.fpsElement.style.top = '10px';
        this.fpsElement.style.right = '10px';
        this.fpsElement.style.color = '#00ff66';
        this.fpsElement.style.fontFamily = 'monospace';
        this.fpsElement.style.fontSize = '14px';
        this.fpsElement.style.textShadow = '1px 1px 0 #000';
        this.fpsElement.style.zIndex = '1000';
        this.fpsElement.textContent = 'FPS: --';
        document.body.appendChild(this.fpsElement);
    }
    
    setupLoadingScreenReferences() {
        // Get references to the existing HTML loading elements
        this.loadingScreen = document.getElementById('loading');
        this.loadingBar = document.getElementById('loading-bar');
        this.loadingText = document.getElementById('loading-text');
        
        // If elements don't exist in HTML, create them (fallback)
        if (!this.loadingScreen) {
            console.warn("Loading screen elements not found in HTML, creating dynamically");
            this.createFallbackLoadingScreen();
        }
        
        console.log("Loading screen references initialized");
    }
    
    createFallbackLoadingScreen() {
        // Only create if not already present in the DOM
        if (document.getElementById('loading')) return;
        
        // Create loading screen container
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading';
        loadingScreen.style.position = 'fixed';
        loadingScreen.style.width = '100%';
        loadingScreen.style.height = '100%';
        loadingScreen.style.top = '0';
        loadingScreen.style.left = '0';
        loadingScreen.style.background = '#000820';
        loadingScreen.style.display = 'flex';
        loadingScreen.style.flexDirection = 'column';
        loadingScreen.style.alignItems = 'center';
        loadingScreen.style.justifyContent = 'center';
        loadingScreen.style.zIndex = '1000';
        loadingScreen.style.fontFamily = 'Orbitron, sans-serif';
        loadingScreen.style.color = '#8af7ff';
        
        // Create title
        const title = document.createElement('h1');
        title.textContent = 'STAR FLIGHT';
        title.style.fontSize = '48px';
        title.style.marginBottom = '30px';
        title.style.textShadow = '0 0 10px #8af7ff';
        
        // Create loading bar container
        const loadingBarContainer = document.createElement('div');
        loadingBarContainer.style.width = '80%';
        loadingBarContainer.style.maxWidth = '500px';
        loadingBarContainer.style.height = '20px';
        loadingBarContainer.style.background = 'rgba(0, 20, 40, 0.8)';
        loadingBarContainer.style.borderRadius = '10px';
        loadingBarContainer.style.overflow = 'hidden';
        loadingBarContainer.style.border = '1px solid #8af7ff';
        loadingBarContainer.style.boxShadow = '0 0 10px rgba(138, 247, 255, 0.5)';
        
        // Create loading bar
        const loadingBar = document.createElement('div');
        loadingBar.id = 'loading-bar';
        loadingBar.style.width = '0%';
        loadingBar.style.height = '100%';
        loadingBar.style.background = 'linear-gradient(to right, #0066ff, #8af7ff)';
        loadingBar.style.transition = 'width 0.3s ease-in-out';
        
        // Create loading text
        const loadingText = document.createElement('div');
        loadingText.id = 'loading-text';
        loadingText.textContent = 'Loading: 0%';
        loadingText.style.marginTop = '10px';
        loadingText.style.fontSize = '16px';
        
        // Create subtitle
        const subtitle = document.createElement('div');
        subtitle.textContent = 'Preparing for takeoff...';
        subtitle.style.marginTop = '30px';
        subtitle.style.fontSize = '18px';
        subtitle.style.opacity = '0.8';
        
        // Append elements
        loadingBarContainer.appendChild(loadingBar);
        loadingScreen.appendChild(title);
        loadingScreen.appendChild(loadingBarContainer);
        loadingScreen.appendChild(loadingText);
        loadingScreen.appendChild(subtitle);
        document.body.appendChild(loadingScreen);
        
        // Store references
        this.loadingScreen = loadingScreen;
        this.loadingBar = loadingBar;
        this.loadingText = loadingText;
    }
    
    updateLoadingProgress(progress) {
        if (this.loadingBar && this.loadingText) {
            this.loadingBar.style.width = `${progress}%`;
            this.loadingText.textContent = `Loading: ${Math.round(progress)}%`;
            
            // Update loading message based on progress
            const subtitle = this.loadingScreen.querySelector('div:last-child');
            if (subtitle) {
                if (progress < 30) {
                    subtitle.textContent = 'Initializing game systems...';
                } else if (progress < 60) {
                    subtitle.textContent = 'Building game world...';
                } else if (progress < 90) {
                    subtitle.textContent = 'Preparing for takeoff...';
                } else {
                    subtitle.textContent = 'Ready for launch!';
                }
            }
            
            // Hide loading screen when complete
            if (progress >= 100) {
                setTimeout(() => {
                    if (this.loadingScreen) {
                        this.loadingScreen.style.opacity = '0';
                        this.loadingScreen.style.transition = 'opacity 0.5s ease-in-out';
                        
                        setTimeout(() => {
                            if (this.loadingScreen) {
                                this.loadingScreen.style.display = 'none';
                                
                                // Also try removing from DOM
                                if (this.loadingScreen.parentNode) {
                                    this.loadingScreen.parentNode.removeChild(this.loadingScreen);
                                }
                                
                                console.log("Loading screen removed");
                            }
                        }, 500);
                    }
                }, 200);
            }
        }
    }
    
    showErrorMessage(message) {
        const errorMessage = document.createElement('div');
        errorMessage.style.position = 'fixed';
        errorMessage.style.top = '50%';
        errorMessage.style.left = '50%';
        errorMessage.style.transform = 'translate(-50%, -50%)';
        errorMessage.style.background = 'rgba(255, 0, 0, 0.8)';
        errorMessage.style.color = 'white';
        errorMessage.style.padding = '20px';
        errorMessage.style.borderRadius = '5px';
        errorMessage.style.fontFamily = 'Arial, sans-serif';
        errorMessage.style.zIndex = '1001';
        errorMessage.style.maxWidth = '80%';
        errorMessage.style.textAlign = 'center';
        errorMessage.textContent = message;
        
        const reloadButton = document.createElement('button');
        reloadButton.textContent = 'Reload Page';
        reloadButton.style.marginTop = '15px';
        reloadButton.style.padding = '8px 16px';
        reloadButton.style.background = '#fff';
        reloadButton.style.color = '#f00';
        reloadButton.style.border = 'none';
        reloadButton.style.borderRadius = '4px';
        reloadButton.style.cursor = 'pointer';
        reloadButton.addEventListener('click', () => window.location.reload());
        
        errorMessage.appendChild(document.createElement('br'));
        errorMessage.appendChild(reloadButton);
        document.body.appendChild(errorMessage);
    }
    
    // Add debug mode toggle
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log(`Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
        
        if (this.debugMode) {
            // Move camera to a position where we can see more of the scene
            this.camera.position.set(0, 500, 500);
            this.camera.lookAt(new THREE.Vector3(0, 0, 0));
            
            // Enable orbit controls for debugging
            if (this.controls) {
                this.controls.enabled = true;
            }
            
            // Add debug helpers to the scene
            this.addDebugHelpers();
            
            // Show debug notification
            if (this.uiManager && this.uiManager.showNotification) {
                this.uiManager.showNotification('DEBUG MODE ENABLED - Press D to toggle', 'info');
            }
        } else {
            // Return to normal view if spacecraft exists
            if (this.spacecraft) {
                this.camera.position.copy(this.spacecraft.position);
                this.camera.position.y += 10;
                this.camera.position.z += 30;
                this.camera.lookAt(new THREE.Vector3(
                    this.spacecraft.position.x,
                    this.spacecraft.position.y,
                    this.spacecraft.position.z - 100
                ));
            }
            
            // Disable orbit controls if not in debug mode
            if (this.controls) {
                this.controls.enabled = false;
            }
            
            // Remove debug helpers
            this.removeDebugHelpers();
            
            // Show debug notification
            if (this.uiManager && this.uiManager.showNotification) {
                this.uiManager.showNotification('DEBUG MODE DISABLED', 'info');
            }
        }
    }
    
    // Add debug helpers to visualize the scene
    addDebugHelpers() {
        // Add axes helper
        this.axesHelper = new THREE.AxesHelper(1000);
        this.scene.add(this.axesHelper);
        
        // Add grid helper
        this.gridHelper = new THREE.GridHelper(2000, 20);
        this.scene.add(this.gridHelper);
        
        // Log scene hierarchy
        console.log('Scene hierarchy:');
        this.logSceneHierarchy(this.scene);
    }
    
    // Remove debug helpers
    removeDebugHelpers() {
        if (this.axesHelper) {
            this.scene.remove(this.axesHelper);
            this.axesHelper = null;
        }
        
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper = null;
        }
    }
    
    // Log scene hierarchy for debugging
    logSceneHierarchy(object, indent = 0) {
        const indentStr = ' '.repeat(indent * 2);
        console.log(`${indentStr}${object.type}: ${object.name || 'unnamed'}`);
        
        if (object.children && object.children.length > 0) {
            object.children.forEach(child => {
                this.logSceneHierarchy(child, indent + 1);
            });
        }
    }
    
    // Add a method to forcibly remove all loading screens
    forceRemoveAllLoadingScreens() {
        console.log("Forcibly removing all loading screens");
        
        // Try to remove by ID
        const loadingScreens = [
            document.getElementById('loading'),
            document.getElementById('loading-screen')
        ];
        
        // Also try to find by selector
        document.querySelectorAll('[id*="loading"]').forEach(el => {
            if (!loadingScreens.includes(el)) {
                loadingScreens.push(el);
            }
        });
        
        // Remove each loading screen
        loadingScreens.forEach(screen => {
            if (screen) {
                console.log(`Removing loading screen: ${screen.id}`);
                screen.style.opacity = '0';
                screen.style.display = 'none';
                
                if (screen.parentNode) {
                    screen.parentNode.removeChild(screen);
                }
            }
        });
        
        // Also try to find any element with "Loading game assets" text
        document.querySelectorAll('*').forEach(el => {
            if (el.textContent && el.textContent.includes('Loading game assets')) {
                console.log('Found element with loading text:', el);
                el.style.display = 'none';
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            }
        });
    }
    
    // Add exploration-focused methods
    
    // Scan surroundings for points of interest
    scanSurroundings() {
        if (!this.spacecraft || !this.gameWorld) return;
        
        // Show scanning effect
        if (this.uiManager && this.uiManager.showNotification) {
            this.uiManager.showNotification('SCANNING SURROUNDINGS...', 'info');
        }
        
        // Simulate scanning delay
        setTimeout(() => {
            // Get nearby objects from game world
            const nearbyObjects = this.gameWorld.getNearbyObjects(this.spacecraft.position, 1000);
            
            if (nearbyObjects && nearbyObjects.length > 0) {
                // Filter and categorize objects
                const planets = nearbyObjects.filter(obj => obj.type === 'planet');
                const anomalies = nearbyObjects.filter(obj => obj.type === 'anomaly');
                const ships = nearbyObjects.filter(obj => obj.type === 'ship' || obj.type === 'alien');
                const resources = nearbyObjects.filter(obj => obj.type === 'resource' || obj.type === 'asteroid');
                
                // Report findings
                let message = 'SCAN COMPLETE: ';
                if (planets.length > 0) message += `${planets.length} planets, `;
                if (anomalies.length > 0) message += `${anomalies.length} anomalies, `;
                if (ships.length > 0) message += `${ships.length} ships, `;
                if (resources.length > 0) message += `${resources.length} resources, `;
                
                message = message.endsWith(', ') ? message.slice(0, -2) : message + 'Nothing found';
                
                if (this.uiManager && this.uiManager.showNotification) {
                    this.uiManager.showNotification(message, 'success');
                }
                
                // Update UI with scan results
                if (this.uiManager && this.uiManager.updateScanResults) {
                    this.uiManager.updateScanResults(nearbyObjects);
                }
            } else {
                if (this.uiManager && this.uiManager.showNotification) {
                    this.uiManager.showNotification('SCAN COMPLETE: No objects detected', 'info');
                }
            }
        }, 1500);
    }
    
    // Toggle galactic map
    toggleGalacticMap() {
        if (!this.uiManager) return;
        
        if (this.uiManager.isMapOpen) {
            this.uiManager.closeGalacticMap();
        } else {
            // Prepare map data
            const mapData = {
                currentPosition: this.spacecraft ? this.spacecraft.position : new THREE.Vector3(),
                discoveredSectors: Array.from(this.discoveredSectors),
                discoveredPlanets: Array.from(this.discoveredPlanets),
                discoveredAnomalies: Array.from(this.discoveredAnomalies),
                explorationScore: this.explorationScore
            };
            
            this.uiManager.openGalacticMap(mapData);
        }
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

// Export the Game class for module bundling
export default Game; 