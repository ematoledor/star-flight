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
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.debugMode = false;
        
        // Exploration tracking
        this.discoveredSectors = new Set();
        this.discoveredPlanets = new Set();
        this.discoveredAnomalies = new Set();
        this.explorationScore = 0;
        
        // Game systems
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.stats = null;
        this.clock = new THREE.Clock();
        this.loadingManager = null;
        this.physicsSystem = null;
        this.inputManager = null;
        this.gameWorld = null;
        this.spacecraft = null;
        this.mothership = null;
        
        // UI elements
        this.healthBar = null;
        this.shieldBar = null;
        this.energyBar = null;
        this.fpsCounter = null;
        this.sectorInfo = null;
        
        // Performance monitoring
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.lastTime = performance.now();
        this.fpsElement = null;
        
        // Docking system tracking
        this.lastDockingPromptTime = null;
        
        // Initialize the game
        this.init();
    }
    
    init() {
        try {
            console.log("Initializing game...");
            
            // Setup loading screen
            this.setupLoadingScreenReferences();
            
            // Create loading manager
            this.loadingManager = new THREE.LoadingManager();
            this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
                const progress = (itemsLoaded / itemsTotal) * 100;
                this.updateLoadingProgress(progress);
            };
            
            this.loadingManager.onLoad = () => {
                console.log("All assets loaded");
                this.updateLoadingProgress(100);
                
                // Remove loading screens after a short delay
                setTimeout(() => {
                    this.forceRemoveAllLoadingScreens();
                    
                    // Run diagnostic after loading is complete
                    this.logGameState();
                    
                    // Force a camera reset to ensure we can see the scene
                    this.resetCamera();
                }, 500);
            };
            
            // Initialize Three.js scene
            this.initThreeJS();
            
            // Initialize physics system
            this.initPhysics();
            
            // Initialize game world
            this.initGameWorld();
            
            // Initialize input manager
            this.initInputManager();
            
            // Initialize UI
            this.initUI();
            
            // Set up callbacks for discoveries
            if (this.gameWorld) {
                this.gameWorld.onSectorDiscovered = this.onSectorDiscovered.bind(this);
                this.gameWorld.onPlanetDiscovered = this.onPlanetDiscovered.bind(this);
                this.gameWorld.onAnomalyDiscovered = this.onAnomalyDiscovered.bind(this);
            }
            
            // Start game loop
            this.isRunning = true;
            this.animate();
            
            console.log("Game initialized successfully");
            
            // Welcome message
            this.showNotification("Welcome, Explorer! You are docked at the mothership. Press L to launch and begin your journey.", 'info', 10000);
            
            // Instructions after a delay
            setTimeout(() => {
                this.showNotification("Use WASD to move, SPACE to boost, and SHIFT to brake. Press S to scan your surroundings.", 'info', 8000);
            }, 12000);
            
            // Run diagnostic immediately as well
            this.logGameState();
        } catch (error) {
            console.error("Error initializing game:", error);
            this.showErrorMessage("Error initializing game: " + error.message);
        }
    }
    
    initThreeJS() {
        console.log("Initializing Three.js...");
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Add fog for depth perception
        this.scene.fog = new THREE.FogExp2(0x000000, 0.00005);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            20000 // Far clipping plane
        );
        this.camera.position.set(0, 200, 500);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        
        // Add renderer to DOM
        document.body.appendChild(this.renderer.domElement);
        
        // Add orbit controls for debugging
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 10000;
        this.controls.maxPolarAngle = Math.PI;
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1000, 1000, 1000);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Add distant space backdrop
        this.addDistantSpaceBackdrop();
        
        // Add window resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        console.log("Three.js initialized");
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
        console.log("Debug mode:", this.debugMode ? "ON" : "OFF");
        
        if (this.debugMode) {
            // Add debug helpers
            this.addDebugHelpers();
            
            // Log game state
            this.logGameState();
            
            // Show notification
            this.showNotification("Debug mode enabled. Press G to log game state, R to reset camera.", "info", 5000);
        } else {
            // Remove debug helpers
            this.removeDebugHelpers();
            
            // Show notification
            this.showNotification("Debug mode disabled", "info", 2000);
        }
    }
    
    // Add debug helpers to the scene
    addDebugHelpers() {
        // Add axes helper
        const axesHelper = new THREE.AxesHelper(1000);
        axesHelper.name = "axesHelper";
        this.scene.add(axesHelper);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(2000, 20);
        gridHelper.name = "gridHelper";
        this.scene.add(gridHelper);
        
        console.log("Added debug helpers to scene");
    }
    
    // Remove debug helpers from the scene
    removeDebugHelpers() {
        // Remove axes helper
        const axesHelper = this.scene.getObjectByName("axesHelper");
        if (axesHelper) {
            this.scene.remove(axesHelper);
        }
        
        // Remove grid helper
        const gridHelper = this.scene.getObjectByName("gridHelper");
        if (gridHelper) {
            this.scene.remove(gridHelper);
        }
        
        // Remove debug sphere
        const debugSphere = this.scene.getObjectByName("debugSphere");
        if (debugSphere) {
            this.scene.remove(debugSphere);
        }
        
        // Remove camera sphere
        const cameraSphere = this.scene.getObjectByName("cameraSphere");
        if (cameraSphere) {
            this.scene.remove(cameraSphere);
        }
        
        console.log("Removed debug helpers from scene");
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
        if (!this.gameWorld || !this.spacecraft) {
            this.showNotification("Unable to scan: Systems offline", "warning", 3000);
            return;
        }
        
        // Show scanning effect
        this.showNotification("Scanning surroundings...", "info", 2000);
        
        // Create a visual scanning effect
        const scanRadius = 1000;
        const scanRing = new THREE.Mesh(
            new THREE.RingGeometry(scanRadius, scanRadius + 10, 32),
            new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            })
        );
        
        // Position the scan ring at the spacecraft's position
        scanRing.position.copy(this.spacecraft.position);
        
        // Orient the ring to be horizontal
        scanRing.rotation.x = Math.PI / 2;
        
        // Add to scene
        this.scene.add(scanRing);
        
        // Animate the scan ring
        const startTime = Date.now();
        const duration = 2000; // 2 seconds
        
        const animateScan = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // Remove scan ring when animation completes
                this.scene.remove(scanRing);
                
                // Get nearby objects
                let nearbyObjects = [];
                
                // Check if getNearbyObjects exists, otherwise use a fallback approach
                if (typeof this.gameWorld.getNearbyObjects === 'function') {
                    nearbyObjects = this.gameWorld.getNearbyObjects(this.spacecraft.position, scanRadius);
                } else {
                    // Fallback: manually check for nearby objects
                    nearbyObjects = this.getObjectsNearSpacecraft(scanRadius);
                }
                
                // Display results
                if (nearbyObjects.length > 0) {
                    // Sort by distance
                    nearbyObjects.sort((a, b) => a.distance - b.distance);
                    
                    // Show summary
                    this.showNotification(`Scan complete: ${nearbyObjects.length} objects detected`, "success", 5000);
                    
                    // Show details for each object
                    setTimeout(() => {
                        nearbyObjects.forEach((obj, index) => {
                            setTimeout(() => {
                                const distance = Math.round(obj.distance);
                                const direction = this.getDirectionDescription(obj.position, this.spacecraft.position);
                                this.showNotification(`${obj.name}: ${distance}m ${direction}`, "info", 4000);
                            }, index * 1500);
                        });
                    }, 1000);
                } else {
                    this.showNotification("Scan complete: No objects detected in range", "info", 3000);
                }
                
                return;
            }
            
            // Scale the ring based on progress
            const scale = 0.1 + progress * 0.9;
            scanRing.scale.set(scale, scale, scale);
            
            // Fade out as it expands
            scanRing.material.opacity = 0.7 * (1 - progress);
            
            requestAnimationFrame(animateScan);
        };
        
        animateScan();
    }
    
    // Fallback method to get nearby objects if getNearbyObjects doesn't exist
    getObjectsNearSpacecraft(radius) {
        const nearbyObjects = [];
        const spacecraftPosition = this.spacecraft.position;
        
        // Check planets
        if (this.gameWorld.planets) {
            this.gameWorld.planets.forEach(planet => {
                if (planet.position.distanceTo(spacecraftPosition) < radius) {
                    nearbyObjects.push({
                        type: 'planet',
                        name: planet.name || 'Unknown Planet',
                        position: planet.position,
                        distance: planet.position.distanceTo(spacecraftPosition),
                        object: planet
                    });
                    
                    // Trigger planet discovery callback
                    if (this.onPlanetDiscovered) {
                        this.onPlanetDiscovered({
                            name: planet.name || 'Unknown Planet',
                            position: planet.position
                        });
                    }
                }
            });
        }
        
        // Check anomalies
        if (this.gameWorld.anomalies) {
            this.gameWorld.anomalies.forEach(anomaly => {
                if (anomaly.position.distanceTo(spacecraftPosition) < radius) {
                    nearbyObjects.push({
                        type: 'anomaly',
                        name: anomaly.name || `${anomaly.anomalyType.charAt(0).toUpperCase() + anomaly.anomalyType.slice(1)}`,
                        position: anomaly.position,
                        distance: anomaly.position.distanceTo(spacecraftPosition),
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
        }
        
        // Check motherships
        if (this.gameWorld.motherships) {
            this.gameWorld.motherships.forEach(mothership => {
                if (mothership.position.distanceTo(spacecraftPosition) < radius) {
                    nearbyObjects.push({
                        type: 'mothership',
                        name: mothership.name || 'Mothership',
                        position: mothership.position,
                        distance: mothership.position.distanceTo(spacecraftPosition),
                        object: mothership
                    });
                }
            });
        }
        
        // Check aliens
        if (this.gameWorld.aliens) {
            this.gameWorld.aliens.forEach(alien => {
                if (alien.position.distanceTo(spacecraftPosition) < radius) {
                    nearbyObjects.push({
                        type: 'alien',
                        name: alien.name || 'Unknown Vessel',
                        position: alien.position,
                        distance: alien.position.distanceTo(spacecraftPosition),
                        object: alien
                    });
                }
            });
        }
        
        return nearbyObjects;
    }
    
    // Helper method to get direction description
    getDirectionDescription(targetPosition, referencePosition) {
        const direction = new THREE.Vector3().subVectors(targetPosition, referencePosition);
        
        // Get the angle in the XZ plane (horizontal)
        const angleXZ = Math.atan2(direction.x, direction.z) * (180 / Math.PI);
        
        // Get the vertical angle
        const horizontalDistance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        const angleY = Math.atan2(direction.y, horizontalDistance) * (180 / Math.PI);
        
        // Convert to compass directions
        let compassDirection = "";
        
        // Horizontal direction
        if (angleXZ > -22.5 && angleXZ <= 22.5) {
            compassDirection = "ahead";
        } else if (angleXZ > 22.5 && angleXZ <= 67.5) {
            compassDirection = "ahead-right";
        } else if (angleXZ > 67.5 && angleXZ <= 112.5) {
            compassDirection = "right";
        } else if (angleXZ > 112.5 && angleXZ <= 157.5) {
            compassDirection = "behind-right";
        } else if (angleXZ > 157.5 || angleXZ <= -157.5) {
            compassDirection = "behind";
        } else if (angleXZ > -157.5 && angleXZ <= -112.5) {
            compassDirection = "behind-left";
        } else if (angleXZ > -112.5 && angleXZ <= -67.5) {
            compassDirection = "left";
        } else if (angleXZ > -67.5 && angleXZ <= -22.5) {
            compassDirection = "ahead-left";
        }
        
        // Add vertical component
        if (angleY > 15) {
            compassDirection += " above";
        } else if (angleY < -15) {
            compassDirection += " below";
        }
        
        return compassDirection;
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
    
    // Handle interaction with space anomalies
    handleAnomalyInteraction(anomaly) {
        if (!anomaly || !this.spacecraft) return;
        
        // Handle based on anomaly type
        if (anomaly.type === 'wormhole') {
            // Teleport the spacecraft to the destination
            if (anomaly.destination) {
                // Show wormhole travel effect
                this.showWormholeTravelEffect();
                
                // Notify the player
                this.showNotification(`Entering wormhole to ${this.gameWorld.getDestinationName(anomaly.destination)}...`, 'info', 5000);
                
                // Teleport after a short delay
                setTimeout(() => {
                    // Move spacecraft to destination
                    this.spacecraft.position.copy(anomaly.destination);
                    
                    // Update camera
                    if (this.camera && this.controls) {
                        this.controls.target.copy(this.spacecraft.position);
                    }
                    
                    // Notify arrival
                    this.showNotification(`Arrived at ${this.gameWorld.getDestinationName(anomaly.destination)}`, 'success', 3000);
                    
                    // Scan surroundings at new location
                    this.scanSurroundings();
                }, 2000);
            }
        } else if (anomaly.type === 'blackhole') {
            // Apply damage and gravitational pull based on intensity
            const damage = 10 * (anomaly.intensity || 1);
            
            // Apply damage to shields first, then to hull
            if (this.spacecraft.shields > 0) {
                this.spacecraft.shields -= damage;
                if (this.spacecraft.shields < 0) {
                    // Overflow damage to hull
                    this.spacecraft.hull += this.spacecraft.shields;
                    this.spacecraft.shields = 0;
                }
            } else {
                this.spacecraft.hull -= damage;
            }
            
            // Update UI
            this.updateHealthUI();
            
            // Show warning
            this.showNotification(`WARNING: Black hole gravitational forces damaging spacecraft! Shields: ${Math.round(this.spacecraft.shields)}%, Hull: ${Math.round(this.spacecraft.hull)}%`, 'danger', 3000);
            
            // Apply gravitational pull
            const pullDirection = new THREE.Vector3().subVectors(anomaly.position, this.spacecraft.position).normalize();
            const pullStrength = 50 * (anomaly.intensity || 1);
            
            // Apply force to spacecraft
            this.spacecraft.velocity.add(pullDirection.multiplyScalar(pullStrength * (delta / 1000)));
            
            // If hull reaches 0, destroy spacecraft
            if (this.spacecraft.hull <= 0) {
                this.destroySpacecraft();
            }
        }
    }
    
    // Show wormhole travel effect
    showWormholeTravelEffect() {
        // Create a full-screen overlay for the wormhole effect
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 255, 0.1)';
        overlay.style.zIndex = '1000';
        overlay.style.transition = 'all 2s ease-in-out';
        overlay.style.pointerEvents = 'none';
        
        // Add a spiral or tunnel effect with CSS
        overlay.style.backgroundImage = 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(0,0,255,0.5) 50%, rgba(0,0,0,0) 100%)';
        overlay.style.backgroundSize = '200% 200%';
        overlay.style.backgroundPosition = 'center';
        overlay.style.animation = 'wormhole-travel 2s forwards';
        
        // Add keyframes for the animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes wormhole-travel {
                0% { opacity: 0; transform: scale(0); }
                50% { opacity: 1; transform: scale(1.5); filter: hue-rotate(0deg); }
                100% { opacity: 0; transform: scale(3); filter: hue-rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Remove after animation completes
        setTimeout(() => {
            overlay.remove();
            style.remove();
        }, 2000);
    }
    
    // Destroy spacecraft (game over)
    destroySpacecraft() {
        // Show explosion effect
        if (this.spacecraft && this.spacecraft.position) {
            // Create explosion at spacecraft position
            this.createExplosion(this.spacecraft.position, 5);
        }
        
        // Show game over message
        this.showNotification('CRITICAL FAILURE: Spacecraft destroyed!', 'danger', 0);
        
        // Create game over overlay
        const gameOverOverlay = document.createElement('div');
        gameOverOverlay.style.position = 'fixed';
        gameOverOverlay.style.top = '0';
        gameOverOverlay.style.left = '0';
        gameOverOverlay.style.width = '100%';
        gameOverOverlay.style.height = '100%';
        gameOverOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        gameOverOverlay.style.color = 'red';
        gameOverOverlay.style.display = 'flex';
        gameOverOverlay.style.flexDirection = 'column';
        gameOverOverlay.style.justifyContent = 'center';
        gameOverOverlay.style.alignItems = 'center';
        gameOverOverlay.style.zIndex = '2000';
        gameOverOverlay.style.fontFamily = 'Arial, sans-serif';
        
        // Add game over text
        const gameOverText = document.createElement('h1');
        gameOverText.textContent = 'GAME OVER';
        gameOverText.style.fontSize = '5rem';
        gameOverText.style.marginBottom = '2rem';
        
        // Add exploration score
        const scoreText = document.createElement('p');
        scoreText.textContent = `Exploration Score: ${this.explorationScore}`;
        scoreText.style.fontSize = '2rem';
        scoreText.style.marginBottom = '2rem';
        
        // Add restart button
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart Mission';
        restartButton.style.padding = '1rem 2rem';
        restartButton.style.fontSize = '1.5rem';
        restartButton.style.backgroundColor = '#333';
        restartButton.style.color = 'white';
        restartButton.style.border = '2px solid #666';
        restartButton.style.borderRadius = '5px';
        restartButton.style.cursor = 'pointer';
        
        // Add hover effect
        restartButton.onmouseover = () => {
            restartButton.style.backgroundColor = '#555';
        };
        restartButton.onmouseout = () => {
            restartButton.style.backgroundColor = '#333';
        };
        
        // Add click handler to restart
        restartButton.onclick = () => {
            location.reload();
        };
        
        // Append elements
        gameOverOverlay.appendChild(gameOverText);
        gameOverOverlay.appendChild(scoreText);
        gameOverOverlay.appendChild(restartButton);
        
        // Add to document
        document.body.appendChild(gameOverOverlay);
        
        // Stop game loop
        this.isRunning = false;
    }
    
    // Create explosion effect
    createExplosion(position, size = 1) {
        if (!position || !this.scene) return;
        
        // Create particle system for explosion
        const particleCount = 500 * size;
        const particles = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        const color = new THREE.Color();
        
        for (let i = 0; i < particleCount; i++) {
            // Random position within sphere
            const radius = Math.random() * 10 * size;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i * 3] = position.x + radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = position.y + radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = position.z + radius * Math.cos(phi);
            
            // Color based on distance (red/orange/yellow)
            const distanceFactor = Math.random();
            if (distanceFactor < 0.3) {
                color.setRGB(1, 0.1, 0); // Red
            } else if (distanceFactor < 0.6) {
                color.setRGB(1, 0.5, 0); // Orange
            } else {
                color.setRGB(1, 0.8, 0); // Yellow
            }
            
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            // Random size
            sizes[i] = Math.random() * 5 * size;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Material
        const particleMaterial = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            sizeAttenuation: true
        });
        
        // Create particle system
        const particleSystem = new THREE.Points(particles, particleMaterial);
        particleSystem.name = 'explosion';
        this.scene.add(particleSystem);
        
        // Animate explosion
        const startTime = Date.now();
        const duration = 2000; // 2 seconds
        
        const animateExplosion = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // Remove particle system when animation completes
                this.scene.remove(particleSystem);
                return;
            }
            
            // Expand particles
            const positions = particles.attributes.position.array;
            const sizes = particles.attributes.size.array;
            
            for (let i = 0; i < particleCount; i++) {
                // Move particles outward
                const x = positions[i * 3] - position.x;
                const y = positions[i * 3 + 1] - position.y;
                const z = positions[i * 3 + 2] - position.z;
                
                const length = Math.sqrt(x * x + y * y + z * z);
                const normX = x / length;
                const normY = y / length;
                const normZ = z / length;
                
                const speed = 50 * size * (1 - Math.pow(progress, 2));
                
                positions[i * 3] += normX * speed * (delta / 1000);
                positions[i * 3 + 1] += normY * speed * (delta / 1000);
                positions[i * 3 + 2] += normZ * speed * (delta / 1000);
                
                // Fade out particles
                sizes[i] *= 0.99;
            }
            
            particles.attributes.position.needsUpdate = true;
            particles.attributes.size.needsUpdate = true;
            
            // Fade out material
            particleMaterial.opacity = 1 - progress;
            
            requestAnimationFrame(animateExplosion);
        };
        
        animateExplosion();
    }
    
    // Callback for sector discovery
    onSectorDiscovered(sectorInfo) {
        if (!sectorInfo || !sectorInfo.name) return;
        
        // Check if this sector was already discovered
        if (this.discoveredSectors.has(sectorInfo.name)) return;
        
        // Add to discovered sectors
        this.discoveredSectors.add(sectorInfo.name);
        
        // Update exploration score
        this.explorationScore += 100;
        
        // Show notification
        this.showNotification(`New sector discovered: ${sectorInfo.name}`, 'success', 5000);
        
        // Update UI
        this.updateExplorationUI();
    }
    
    // Callback for planet discovery
    onPlanetDiscovered(planetInfo) {
        if (!planetInfo || !planetInfo.name) return;
        
        // Check if this planet was already discovered
        if (this.discoveredPlanets.has(planetInfo.name)) return;
        
        // Add to discovered planets
        this.discoveredPlanets.add(planetInfo.name);
        
        // Update exploration score
        this.explorationScore += 50;
        
        // Show notification
        this.showNotification(`New celestial body discovered: ${planetInfo.name}`, 'success', 5000);
        
        // Update UI
        this.updateExplorationUI();
    }
    
    // Callback for anomaly discovery
    onAnomalyDiscovered(anomalyInfo) {
        if (!anomalyInfo || !anomalyInfo.name) return;
        
        // Check if this anomaly was already discovered
        if (this.discoveredAnomalies.has(anomalyInfo.name)) return;
        
        // Add to discovered anomalies
        this.discoveredAnomalies.add(anomalyInfo.name);
        
        // Update exploration score
        this.explorationScore += 200;
        
        // Show notification based on anomaly type
        if (anomalyInfo.type === 'wormhole') {
            this.showNotification(`Wormhole discovered: ${anomalyInfo.name}. Approach to travel to a new sector.`, 'warning', 8000);
        } else if (anomalyInfo.type === 'blackhole') {
            this.showNotification(`WARNING: Black hole detected! Approach with extreme caution - gravitational forces may damage your spacecraft.`, 'danger', 8000);
        } else {
            this.showNotification(`Space anomaly discovered: ${anomalyInfo.name}`, 'info', 5000);
        }
        
        // Update UI
        this.updateExplorationUI();
    }
    
    // Update exploration UI
    updateExplorationUI() {
        if (this.uiManager) {
            this.uiManager.updateExplorationScore(this.explorationScore);
            this.uiManager.updateDiscoveries({
                sectors: Array.from(this.discoveredSectors),
                planets: Array.from(this.discoveredPlanets),
                anomalies: Array.from(this.discoveredAnomalies)
            });
        }
    }
    
    update(time, delta) {
        if (!this.isRunning || this.isPaused) return;
        
        // Update physics
        if (this.physicsSystem) {
            this.physicsSystem.update(delta / 1000);
        }
        
        // Update spacecraft
        if (this.spacecraft) {
            this.spacecraft.update(delta / 1000);
            
            // Update UI elements
            this.updateHealthUI();
            this.updateSectorInfo();
        }
        
        // Update game world with player position for discovery checks
        if (this.gameWorld && this.spacecraft) {
            // Check if the update method accepts a player position parameter
            if (this.gameWorld.update.length >= 2) {
                this.gameWorld.update(delta / 1000, this.spacecraft.position);
            } else {
                this.gameWorld.update(delta / 1000);
            }
            
            // Check for anomaly interactions only if the method exists
            if (typeof this.gameWorld.checkAnomalyInteractions === 'function') {
                const interactingAnomaly = this.gameWorld.checkAnomalyInteractions(this.spacecraft);
                if (interactingAnomaly) {
                    this.handleAnomalyInteraction(interactingAnomaly);
                }
            }
        }
        
        // Update debug info if in debug mode
        if (this.debugMode) {
            this.updateDebugInfo();
        }
        
        // Update stats
        if (this.stats) {
            this.stats.update();
        }
    }

    // Add this method to diagnose rendering issues
    logGameState() {
        console.log("=== GAME STATE DIAGNOSTIC LOG ===");
        
        // Log scene information
        if (this.scene) {
            console.log("Scene exists with", this.scene.children.length, "children");
            
            // Count visible objects
            let visibleObjects = 0;
            let meshCount = 0;
            let lightCount = 0;
            
            this.scene.traverse(object => {
                if (object.visible) {
                    visibleObjects++;
                    if (object instanceof THREE.Mesh) meshCount++;
                    if (object instanceof THREE.Light) lightCount++;
                }
            });
            
            console.log(`Visible objects: ${visibleObjects}, Meshes: ${meshCount}, Lights: ${lightCount}`);
        } else {
            console.error("Scene is null or undefined");
        }
        
        // Log camera information
        if (this.camera) {
            console.log("Camera position:", this.camera.position);
            console.log("Camera rotation:", this.camera.rotation);
            console.log("Camera FOV:", this.camera.fov);
            console.log("Camera near/far:", this.camera.near, "/", this.camera.far);
            
            if (this.controls) {
                console.log("Camera controls target:", this.controls.target);
            }
        } else {
            console.error("Camera is null or undefined");
        }
        
        // Log spacecraft information
        if (this.spacecraft) {
            console.log("Spacecraft position:", this.spacecraft.position);
            console.log("Spacecraft visible:", this.spacecraft.visible);
            console.log("Spacecraft parent:", this.spacecraft.parent ? "Yes" : "No");
        } else {
            console.error("Spacecraft is null or undefined");
        }
        
        // Log game world information
        if (this.gameWorld) {
            console.log("Game world exists with:");
            console.log("- Planets:", this.gameWorld.planets ? this.gameWorld.planets.length : 0);
            console.log("- Anomalies:", this.gameWorld.anomalies ? this.gameWorld.anomalies.length : 0);
            console.log("- Motherships:", this.gameWorld.motherships ? this.gameWorld.motherships.length : 0);
            console.log("- Aliens:", this.gameWorld.aliens ? this.gameWorld.aliens.length : 0);
            
            // Log current sector
            if (this.gameWorld.currentSector) {
                console.log("Current sector:", this.gameWorld.currentSector.name);
            } else {
                console.log("No current sector set");
            }
        } else {
            console.error("Game world is null or undefined");
        }
        
        // Log renderer information
        if (this.renderer) {
            console.log("Renderer size:", this.renderer.getSize(new THREE.Vector2()));
            console.log("Renderer pixel ratio:", this.renderer.getPixelRatio());
            console.log("Renderer is WebGL2:", this.renderer.capabilities.isWebGL2);
        } else {
            console.error("Renderer is null or undefined");
        }
        
        console.log("=== END DIAGNOSTIC LOG ===");
        
        // Add a visual indicator in the scene to confirm rendering
        this.addDebugSphere();
    }

    // Add a visible sphere at the origin to confirm rendering
    addDebugSphere() {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(100, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        );
        sphere.name = "debugSphere";
        sphere.position.set(0, 0, 0);
        this.scene.add(sphere);
        
        console.log("Added debug sphere at origin");
        
        // Also add a sphere at the camera position
        const cameraSphere = new THREE.Mesh(
            new THREE.SphereGeometry(10, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        cameraSphere.name = "cameraSphere";
        cameraSphere.position.copy(this.camera.position);
        this.scene.add(cameraSphere);
        
        console.log("Added debug sphere at camera position:", this.camera.position);
    }

    // Add a method to reset the camera to a good viewing position
    resetCamera() {
        if (!this.camera) return;
        
        console.log("Resetting camera position...");
        
        // If we have a mothership, position camera to view it
        if (this.gameWorld && this.gameWorld.motherships && this.gameWorld.motherships.length > 0) {
            const mothership = this.gameWorld.motherships[0];
            
            // Position camera to look at mothership
            this.camera.position.set(
                mothership.position.x + 300,
                mothership.position.y + 200,
                mothership.position.z + 300
            );
            
            // Look at mothership
            if (this.controls) {
                this.controls.target.copy(mothership.position);
                this.controls.update();
            } else {
                this.camera.lookAt(mothership.position);
            }
        } 
        // Otherwise, set a default position
        else {
            this.camera.position.set(0, 500, 500);
            
            if (this.controls) {
                this.controls.target.set(0, 0, 0);
                this.controls.update();
            } else {
                this.camera.lookAt(0, 0, 0);
            }
        }
        
        console.log("Camera reset to position:", this.camera.position);
    }

    // Add this method to initialize input manager
    initInputManager() {
        // Create input manager if it doesn't exist
        if (!this.inputManager) {
            this.inputManager = {
                registerKeyBinding: (key, callback) => {
                    document.addEventListener('keydown', (event) => {
                        if (event.key.toLowerCase() === key.toLowerCase()) {
                            callback();
                        }
                    });
                }
            };
        }
        
        // Register key bindings
        
        // Launch/dock key (L)
        this.inputManager.registerKeyBinding('l', () => {
            console.log("L key pressed - toggle launch/dock");
            // Toggle launch/dock functionality will be implemented
        });
        
        // Debug key (D)
        this.inputManager.registerKeyBinding('d', () => {
            console.log("D key pressed - toggle debug mode");
            this.toggleDebugMode();
        });
        
        // Scan key (S)
        this.inputManager.registerKeyBinding('s', () => {
            console.log("S key pressed - scan surroundings");
            this.scanSurroundings();
        });
        
        // Map key (M)
        this.inputManager.registerKeyBinding('m', () => {
            console.log("M key pressed - toggle galactic map");
            this.toggleGalacticMap();
        });
        
        // Reset camera key (R)
        this.inputManager.registerKeyBinding('r', () => {
            console.log("R key pressed - reset camera");
            this.resetCamera();
        });
        
        // Log game state key (G)
        this.inputManager.registerKeyBinding('g', () => {
            console.log("G key pressed - log game state");
            this.logGameState();
        });
        
        console.log("Input manager initialized with key bindings");
    }

    // Update the animate method to ensure rendering is happening
    animate() {
        // Request next frame
        requestAnimationFrame(this.animate.bind(this));
        
        // Skip if not running
        if (!this.isRunning) return;
        
        // Calculate delta time
        const time = performance.now();
        const delta = time - (this.lastTime || time);
        this.lastTime = time;
        
        // Update game state
        this.update(time, delta);
        
        // Ensure renderer and scene exist
        if (!this.renderer || !this.scene || !this.camera) {
            console.error("Cannot render: missing renderer, scene, or camera");
            return;
        }
        
        // Log rendering attempt in debug mode
        if (this.debugMode && time % 1000 < 20) { // Log approximately once per second
            console.log("Rendering frame at time:", time);
        }
        
        // Render the scene
        try {
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error("Error rendering scene:", error);
        }
    }

    // Initialize physics system
    initPhysics() {
        console.log("Initializing physics system...");
        
        // Create a simple physics system
        this.physicsSystem = {
            objects: [],
            
            addObject: (object) => {
                this.physicsSystem.objects.push(object);
            },
            
            update: (delta) => {
                // Update physics for all objects
                for (const object of this.physicsSystem.objects) {
                    if (object.updatePhysics) {
                        object.updatePhysics(delta);
                    }
                }
            },
            
            collisionGroups: {
                spacecraft: 1,
                planet: 2,
                alien: 3,
                projectile: 4
            }
        };
        
        console.log("Physics system initialized");
    }

    // Initialize game world
    initGameWorld() {
        console.log("Initializing game world...");
        
        // Create game world
        try {
            // Check if GameWorld class is available
            if (typeof GameWorld === 'function') {
                this.gameWorld = new GameWorld(
                    this.scene,
                    this.loadingManager,
                    this.physicsSystem
                );
                
                console.log("Game world initialized");
            } else {
                throw new Error("GameWorld class not found");
            }
        } catch (error) {
            console.error("Error initializing game world:", error);
            
            // Create a minimal fallback game world
            this.gameWorld = {
                planets: [],
                aliens: [],
                motherships: [],
                asteroidFields: [],
                nebulae: [],
                sectors: [],
                anomalies: [],
                currentSector: null,
                
                update: (delta) => {
                    // Empty update method
                }
            };
            
            console.log("Created fallback game world");
        }
    }

    // Initialize UI elements
    initUI() {
        console.log("Initializing UI...");
        
        try {
            // Create UI manager using the imported UIManager class
            if (this.spacecraft && this.gameWorld) {
                this.uiManager = new UIManager(this.spacecraft, this.gameWorld);
                console.log("UI manager initialized");
            } else {
                console.warn("Cannot initialize UI manager: spacecraft or gameWorld not available");
                // Create a minimal UI manager
                this.uiManager = new UIManager(null, null);
            }
        } catch (error) {
            console.error("Error initializing UI:", error);
        }
    }

    // Show notification message - delegate to UIManager
    showNotification(message, type = 'info', duration = 5000) {
        if (this.uiManager) {
            this.uiManager.showNotification(message, type, { duration });
        } else {
            console.log(`Notification (${type}): ${message}`);
        }
    }

    // Update health UI - delegate to UIManager
    updateHealthUI() {
        if (this.uiManager && this.spacecraft) {
            this.uiManager.updateHealth(this.spacecraft.hull, this.spacecraft.shields, this.spacecraft.energy);
        }
    }

    // Update sector info - delegate to UIManager
    updateSectorInfo() {
        if (this.uiManager && this.gameWorld) {
            let sectorName = "UNKNOWN SECTOR";
            
            if (this.spacecraft && this.gameWorld.getCurrentSector) {
                const sectorInfo = this.gameWorld.getCurrentSector(this.spacecraft.position);
                if (sectorInfo && sectorInfo.name) {
                    sectorName = sectorInfo.name;
                }
            } else if (this.gameWorld.currentSector && this.gameWorld.currentSector.name) {
                sectorName = this.gameWorld.currentSector.name;
            }
            
            this.uiManager.updateSectorInfo({
                name: sectorName,
                position: this.spacecraft ? this.spacecraft.position : null
            });
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