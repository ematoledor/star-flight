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
                }, 500);
            };
            
            // Initialize Three.js scene
            this.initThree();
            
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
        } catch (error) {
            console.error("Error initializing game:", error);
        }
    }
    
    initThree() {
        try {
            // Create scene
            this.scene = new THREE.Scene();
            
            // Create camera with wider field of view
            this.camera = new THREE.PerspectiveCamera(
                75, // Field of view (increased from default)
                window.innerWidth / window.innerHeight,
                0.1,
                10000 // Increased far plane for space scenes
            );
            
            // Position camera at a better starting position
            this.camera.position.set(0, 100, 300);
            this.camera.lookAt(0, 0, 0);
            
            // Log camera position for debugging
            console.log("Initial camera position:", this.camera.position);
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setClearColor(0x000000, 1);
            
            // Add renderer to page
            document.body.appendChild(this.renderer.domElement);
            
            // Handle window resize
            window.addEventListener('resize', () => {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            });
            
            // Add ambient light
            const ambientLight = new THREE.AmbientLight(0x404040);
            this.scene.add(ambientLight);
            
            // Add directional light (sun)
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(1, 1, 1).normalize();
            this.scene.add(directionalLight);
            
            // Add a simple object to verify rendering is working
            const testGeometry = new THREE.SphereGeometry(50, 32, 32);
            const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const testSphere = new THREE.Mesh(testGeometry, testMaterial);
            testSphere.position.set(0, 0, 0);
            this.scene.add(testSphere);
            console.log("Added test sphere to scene at origin");
            
            // Log scene children count
            console.log(`Scene initialized with ${this.scene.children.length} objects`);
            
            return true;
        } catch (error) {
            console.error("Error initializing Three.js:", error);
            this.showErrorMessage("Failed to initialize 3D renderer");
            return false;
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
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log(`Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
        
        if (this.debugMode) {
            // Move camera to a high position to see more of the scene
            this.camera.position.set(0, 1000, 1000);
            this.camera.lookAt(new THREE.Vector3(0, 0, 0));
            
            // Add debug helpers to the scene
            this.addDebugHelpers();
            
            // Enable orbit controls if available
            if (this.controls) {
                this.controls.enabled = true;
            } else {
                // Create orbit controls if they don't exist
                try {
                    const OrbitControls = THREE.OrbitControls;
                    if (OrbitControls && this.camera && this.renderer) {
                        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
                        this.controls.enableDamping = true;
                        this.controls.dampingFactor = 0.25;
                        this.controls.screenSpacePanning = false;
                        this.controls.maxPolarAngle = Math.PI / 1.5;
                        this.controls.enabled = true;
                    }
                } catch (error) {
                    console.error("Could not create orbit controls:", error);
                }
            }
            
            // Log scene hierarchy
            console.log("Scene hierarchy:");
            this.logSceneHierarchy(this.scene);
            
            // Show notification
            this.showNotification("Debug mode enabled. Press D to toggle.", "info", 3000);
        } else {
            // Return to normal view
            if (this.spacecraft) {
                // Position camera behind spacecraft
                this.camera.position.copy(this.spacecraft.position);
                this.camera.position.y += 10;
                this.camera.position.z += 30;
                this.camera.lookAt(new THREE.Vector3(
                    this.spacecraft.position.x,
                    this.spacecraft.position.y,
                    this.spacecraft.position.z - 100
                ));
            }
            
            // Disable orbit controls
            if (this.controls) {
                this.controls.enabled = false;
            }
            
            // Remove debug helpers
            this.removeDebugHelpers();
            
            // Show notification
            this.showNotification("Debug mode disabled.", "info", 3000);
        }
    }
    
    addDebugHelpers() {
        // Add axes helper
        this.axesHelper = new THREE.AxesHelper(1000);
        this.scene.add(this.axesHelper);
        
        // Add grid helper
        this.gridHelper = new THREE.GridHelper(2000, 20);
        this.scene.add(this.gridHelper);
        
        console.log("Debug helpers added to scene");
    }
    
    removeDebugHelpers() {
        // Remove axes helper
        if (this.axesHelper) {
            this.scene.remove(this.axesHelper);
            this.axesHelper = null;
        }
        
        // Remove grid helper
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper = null;
        }
        
        console.log("Debug helpers removed from scene");
    }
    
    logSceneHierarchy(object, indent = 0) {
        if (!object) return;
        
        const indentStr = ' '.repeat(indent * 2);
        console.log(`${indentStr}${object.name || 'unnamed'} [${object.type}] ${object.visible ? 'visible' : 'hidden'}`);
        
        if (object.children && object.children.length > 0) {
            object.children.forEach(child => {
                this.logSceneHierarchy(child, indent + 1);
            });
        }
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        console.log(`Notification: ${message} (${type})`);
        
        // Create notification element if it doesn't exist
        let notification = document.getElementById('game-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'game-notification';
            notification.style.position = 'absolute';
            notification.style.bottom = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.fontFamily = 'Arial, sans-serif';
            notification.style.zIndex = '1000';
            notification.style.transition = 'opacity 0.3s ease';
            document.body.appendChild(notification);
        }
        
        // Set notification style based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = 'rgba(0, 128, 0, 0.8)';
                notification.style.color = 'white';
                break;
            case 'warning':
                notification.style.backgroundColor = 'rgba(255, 165, 0, 0.8)';
                notification.style.color = 'black';
                break;
            case 'danger':
                notification.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
                notification.style.color = 'white';
                break;
            case 'info':
            default:
                notification.style.backgroundColor = 'rgba(0, 0, 128, 0.8)';
                notification.style.color = 'white';
                break;
        }
        
        // Set message and show notification
        notification.textContent = message;
        notification.style.opacity = '1';
        
        // Hide notification after duration
        if (duration > 0) {
            setTimeout(() => {
                notification.style.opacity = '0';
            }, duration);
        }
    }
    
    // Add a method to forcibly remove all loading screens
    forceRemoveAllLoadingScreens() {
        console.log("Forcing removal of all loading screens");
        
        // Remove by ID
        const loadingElements = [
            document.getElementById('loading'),
            document.getElementById('loading-screen')
        ];
        
        loadingElements.forEach(element => {
            if (element) {
                console.log(`Removing loading element: ${element.id}`);
                element.style.opacity = '0';
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                }, 500);
            }
        });
        
        // Find any elements containing loading text
        document.querySelectorAll('*').forEach(element => {
            if (element.textContent && element.textContent.includes('Loading game assets')) {
                console.log(`Removing element with loading text: ${element.tagName}`);
                element.style.opacity = '0';
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                }, 500);
            }
        });
        
        // Force render a frame to ensure scene is visible
        if (this.renderer && this.scene && this.camera) {
            console.log("Forcing a render frame");
            this.renderer.render(this.scene, this.camera);
        }
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
        // Update exploration score display
        const scoreElement = document.getElementById('exploration-score');
        if (scoreElement) {
            scoreElement.textContent = this.explorationScore;
        } else {
            // Create exploration score display if it doesn't exist
            this.createExplorationUI();
        }
        
        // Update discoveries list
        this.updateDiscoveriesList();
    }
    
    // Create exploration UI
    createExplorationUI() {
        // Create exploration panel
        const explorationPanel = document.createElement('div');
        explorationPanel.id = 'exploration-panel';
        explorationPanel.style.position = 'absolute';
        explorationPanel.style.top = '10px';
        explorationPanel.style.right = '10px';
        explorationPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        explorationPanel.style.color = '#0ff';
        explorationPanel.style.padding = '10px';
        explorationPanel.style.borderRadius = '5px';
        explorationPanel.style.fontFamily = 'Arial, sans-serif';
        explorationPanel.style.zIndex = '100';
        explorationPanel.style.minWidth = '200px';
        
        // Create score display
        const scoreContainer = document.createElement('div');
        scoreContainer.style.display = 'flex';
        scoreContainer.style.justifyContent = 'space-between';
        scoreContainer.style.marginBottom = '5px';
        
        const scoreLabel = document.createElement('span');
        scoreLabel.textContent = 'Exploration Score:';
        
        const scoreValue = document.createElement('span');
        scoreValue.id = 'exploration-score';
        scoreValue.textContent = this.explorationScore;
        
        scoreContainer.appendChild(scoreLabel);
        scoreContainer.appendChild(scoreValue);
        
        // Create discoveries container
        const discoveriesContainer = document.createElement('div');
        discoveriesContainer.id = 'discoveries-container';
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Show Discoveries';
        toggleButton.style.backgroundColor = '#333';
        toggleButton.style.color = 'white';
        toggleButton.style.border = '1px solid #666';
        toggleButton.style.borderRadius = '3px';
        toggleButton.style.padding = '5px 10px';
        toggleButton.style.marginTop = '5px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.width = '100%';
        
        // Toggle discoveries visibility
        toggleButton.onclick = () => {
            const discoveriesList = document.getElementById('discoveries-list');
            if (discoveriesList.style.display === 'none') {
                discoveriesList.style.display = 'block';
                toggleButton.textContent = 'Hide Discoveries';
            } else {
                discoveriesList.style.display = 'none';
                toggleButton.textContent = 'Show Discoveries';
            }
        };
        
        // Create discoveries list
        const discoveriesList = document.createElement('div');
        discoveriesList.id = 'discoveries-list';
        discoveriesList.style.display = 'none';
        discoveriesList.style.marginTop = '10px';
        discoveriesList.style.maxHeight = '300px';
        discoveriesList.style.overflowY = 'auto';
        
        // Append elements
        discoveriesContainer.appendChild(toggleButton);
        discoveriesContainer.appendChild(discoveriesList);
        
        explorationPanel.appendChild(scoreContainer);
        explorationPanel.appendChild(discoveriesContainer);
        
        // Add to document
        document.body.appendChild(explorationPanel);
        
        // Update discoveries list
        this.updateDiscoveriesList();
    }
    
    // Update discoveries list
    updateDiscoveriesList() {
        const discoveriesList = document.getElementById('discoveries-list');
        if (!discoveriesList) return;
        
        // Clear current list
        discoveriesList.innerHTML = '';
        
        // Add sections for different discovery types
        const sections = [
            { title: 'Sectors', items: Array.from(this.discoveredSectors), icon: '🌌' },
            { title: 'Planets', items: Array.from(this.discoveredPlanets), icon: '🪐' },
            { title: 'Anomalies', items: Array.from(this.discoveredAnomalies), icon: '⚠️' }
        ];
        
        sections.forEach(section => {
            if (section.items.length > 0) {
                // Create section header
                const sectionHeader = document.createElement('div');
                sectionHeader.style.fontWeight = 'bold';
                sectionHeader.style.marginTop = '10px';
                sectionHeader.style.marginBottom = '5px';
                sectionHeader.style.borderBottom = '1px solid #555';
                sectionHeader.textContent = `${section.icon} ${section.title} (${section.items.length})`;
                
                discoveriesList.appendChild(sectionHeader);
                
                // Create items
                section.items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.style.padding = '3px 0';
                    itemElement.style.paddingLeft = '15px';
                    itemElement.textContent = item;
                    
                    discoveriesList.appendChild(itemElement);
                });
            }
        });
        
        // If no discoveries yet
        if (discoveriesList.children.length === 0) {
            const noDiscoveries = document.createElement('div');
            noDiscoveries.style.fontStyle = 'italic';
            noDiscoveries.style.padding = '10px 0';
            noDiscoveries.textContent = 'No discoveries yet. Explore the universe!';
            
            discoveriesList.appendChild(noDiscoveries);
        }
    }
    
    update(time, delta) {
        // Skip updates if game is not initialized
        if (!this.initialized) {
            return;
        }
        
        // Debug logging every 60 frames
        if (this.frameCount % 60 === 0) {
            console.log(`Camera position: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
            console.log(`Scene objects: ${this.scene.children.length}`);
            if (this.spacecraft) {
                console.log(`Spacecraft position: ${this.spacecraft.position.x.toFixed(2)}, ${this.spacecraft.position.y.toFixed(2)}, ${this.spacecraft.position.z.toFixed(2)}`);
                console.log(`Spacecraft visible: ${this.spacecraft.visible}`);
            }
        }
        this.frameCount = (this.frameCount || 0) + 1;
        
        // Update physics
        if (this.physicsSystem) {
            this.physicsSystem.update(delta);
        }
        
        // Update game world
        if (this.gameWorld) {
            const playerPosition = this.spacecraft ? this.spacecraft.position : this.camera.position;
            this.gameWorld.update(delta, playerPosition);
        }
        
        // Update spacecraft
        if (this.spacecraft) {
            this.spacecraft.update(delta);
            
            // Update camera to follow spacecraft if not in debug mode
            if (!this.debugMode) {
                // Get spacecraft direction
                const direction = new THREE.Vector3(0, 0, -1);
                direction.applyQuaternion(this.spacecraft.quaternion);
                
                // Position camera behind spacecraft
                const cameraOffset = new THREE.Vector3(0, 30, 100);
                cameraOffset.applyQuaternion(this.spacecraft.quaternion);
                
                this.camera.position.copy(this.spacecraft.position).add(cameraOffset);
                this.camera.lookAt(this.spacecraft.position);
            }
            
            // Check for anomaly interactions
            if (this.gameWorld) {
                const anomaly = this.gameWorld.checkAnomalyInteractions(this.spacecraft);
                if (anomaly) {
                    this.handleAnomalyInteraction(anomaly);
                }
            }
        }
        
        // Update UI
        this.updateUI();
        
        // Update controls if in debug mode
        if (this.debugMode && this.controls) {
            this.controls.update();
        }
        
        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        } else {
            console.warn("Cannot render: missing renderer, scene, or camera");
        }
    }

    // Add a method to initialize input bindings
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
        
        // Register debug key (D)
        this.inputManager.registerKeyBinding('d', () => {
            this.toggleDebugMode();
        });
        
        // Register launch key (L)
        this.inputManager.registerKeyBinding('l', () => {
            if (this.spacecraft) {
                console.log('Launch key pressed');
                // Add launch logic here
            }
        });
        
        // Register scan key (S)
        this.inputManager.registerKeyBinding('s', () => {
            this.scanSurroundings();
        });
        
        console.log('Input manager initialized with key bindings');
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