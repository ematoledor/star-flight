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
        this.initialized = false;
        this.isRunning = false;
        this.debugMode = false;
        this.initStartTime = 0;
        this.initWarningShown = false;
        
        // CRITICAL FIX: Add initialization timeout tracking
        this.initTimeoutId = null;
        this.emergencyInitialized = false;
        
        // Exploration tracking
        this.discoveredSectors = new Set();
        this.discoveredPlanets = new Set();
        this.discoveredAnomalies = new Set();
        this.explorationScore = 0;
        
        // Three.js components
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
        this.uiManager = null;
        
        // UI elements
        this.healthBar = null;
        this.shieldBar = null;
        this.energyBar = null;
        this.fpsCounter = null;
        this.sectorInfo = null;
        
        // Performance monitoring
        this.frameCount = 0;
        this.slowFrameCount = 0;
        this.qualityReduced = false;
        this.fps = 60;
        this.lastTime = 0;
        this.lastFpsUpdate = 0;
        this.framesSinceLastFpsUpdate = 0;
        
        // Docking system tracking
        this.lastDockingPromptTime = null;
        
        // Loading tracking
        this.totalItemsToLoad = 0;
        this.itemsLoaded = 0;
        
        // Bind methods to this instance
        this.animate = this.animate.bind(this);
        this.update = this.update.bind(this);
        this.renderScene = this.renderScene.bind(this);
        
        // Initialize the game
        this.init();
    }
    
    init() {
        try {
            console.log("Initializing game...");
            
            // Set initialized flag to false until complete
            this.initialized = false;
            
            // CRITICAL FIX: Record start time for initialization
            this.initStartTime = performance.now();
            
            // Enable debug mode for troubleshooting
            this.debugMode = true;
            console.log("Debug mode enabled");
            
            // CRITICAL FIX: Add CSS reset to ensure canvas visibility
            this.addCssReset();
            
            // Setup loading screen
            this.setupLoadingScreenReferences();
            
            // Initialize Three.js scene first
            const threeInitialized = this.initThree();
            if (!threeInitialized) {
                throw new Error("Failed to initialize Three.js");
            }
            
            // CRITICAL FIX: Set up emergency initialization timeout
            // This will force the game to initialize if the normal process takes too long
            this.initTimeoutId = setTimeout(() => {
                this.emergencyInitialization();
            }, 10000); // 10 seconds timeout
            
            // Add debug helpers if in debug mode
            if (this.debugMode) {
                this.addDebugHelpers();
            }
            
            // Add space backdrop immediately for visual feedback
            this.addDistantSpaceBackdrop();
            
            // Create loading manager with better progress tracking
            this.loadingManager = new THREE.LoadingManager();
            
            // Track items to load
            this.totalItemsToLoad = 0;
            this.itemsLoaded = 0;
            
            this.loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
                console.log(`Started loading: ${url}`);
                this.totalItemsToLoad = Math.max(this.totalItemsToLoad, itemsTotal);
            };
            
            this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
                this.itemsLoaded = itemsLoaded;
                this.totalItemsToLoad = Math.max(this.totalItemsToLoad, itemsTotal);
                
                // Calculate progress percentage
                const progress = (this.itemsLoaded / this.totalItemsToLoad) * 95; // Only go to 95%
                this.updateLoadingProgress(progress);
                console.log(`Loading progress: ${progress.toFixed(2)}% - ${url}`);
            };
            
            this.loadingManager.onError = (url) => {
                console.error(`Error loading: ${url}`);
                // Continue loading despite errors
            };
            
            this.loadingManager.onLoad = () => {
                console.log("All assets loaded by LoadingManager");
                
                // CRITICAL FIX: Clear emergency initialization timeout
                if (this.initTimeoutId) {
                    clearTimeout(this.initTimeoutId);
                    this.initTimeoutId = null;
                }
                
                // Initialize remaining systems
                Promise.all([
                    this.initPhysics(),
                    this.initGameWorld(),
                    this.initInputManager(),
                    this.initUI()
                ]).then(() => {
                    console.log("All game systems initialized");
                    
                    // Final loading step - create player spacecraft
                    this.createPlayerSpacecraft();
                    
                    // Update to 100% and remove loading screen
                    this.updateLoadingProgress(100);
                    
                    // Remove loading screens after initialization
                    setTimeout(() => {
                        this.forceRemoveAllLoadingScreens();
                        this.initialized = true;
                        console.log("Game fully initialized");
                        
                        // Force a render to ensure scene is visible
                        this.renderScene();
                        
                        // Log scene hierarchy for debugging
                        if (this.debugMode && this.scene) {
                            console.log("Scene hierarchy:");
                            this.logSceneHierarchy(this.scene);
                        }
                    }, 500);
                }).catch(error => {
                    console.error("Error during initialization:", error);
                    this.showErrorMessage("Failed to initialize game systems: " + error.message);
                    
                    // Force remove loading screen even on error
                    this.updateLoadingProgress(100);
                    setTimeout(() => {
                        this.forceRemoveAllLoadingScreens();
                        this.initialized = true;
                    }, 500);
                });
            };
            
            // Start game loop
            this.isRunning = true;
            this.lastTime = performance.now();
            this.animate();
            
            // Welcome message
            this.showNotification("Welcome, Explorer! You are docked at the mothership. Press L to launch and begin your journey.", 'info', 10000);
            
            // Instructions after a delay
            setTimeout(() => {
                this.showNotification("Use WASD to move, SPACE to boost, and SHIFT to brake. Press S to scan your surroundings.", 'info', 8000);
            }, 12000);
            
            // Failsafe: Force completion after 20 seconds if loading gets stuck
            setTimeout(() => {
                if (!this.initialized) {
                    console.warn("Loading timeout reached. Forcing completion...");
                    this.updateLoadingProgress(100);
                    this.forceRemoveAllLoadingScreens();
                    this.initialized = true;
                    
                    // Force a render
                    this.renderScene();
                }
            }, 20000);
            
            // Add keyboard shortcut for debug mode toggle
            window.addEventListener('keydown', (event) => {
                if (event.key === '`') { // Backtick key
                    this.toggleDebugMode();
                }
            });
            
            return true;
        } catch (error) {
            console.error("Error initializing game:", error);
            this.showErrorMessage("Failed to initialize game: " + error.message);
            return false;
        }
    }
    
    initThree() {
        try {
            console.log("Initializing Three.js...");
            
            // Create scene with black background
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000000);
            
            // Create camera with good defaults for space game
            this.camera = new THREE.PerspectiveCamera(
                75, // Field of view
                window.innerWidth / window.innerHeight, // Aspect ratio
                0.1, // Near clipping plane
                10000 // Far clipping plane
            );
            
            // Position camera at a reasonable starting point
            this.camera.position.set(0, 10, 50);
            console.log(`Initial camera position: ${JSON.stringify(this.camera.position)}`);
            
            // CRITICAL FIX: Remove any existing canvas to prevent conflicts
            const existingCanvas = document.querySelector('canvas');
            if (existingCanvas) {
                console.log("Removing existing canvas");
                existingCanvas.remove();
            }
            
            // Create a new canvas with a unique ID
            const canvas = document.createElement('canvas');
            canvas.id = 'game-canvas';
            
            // CRITICAL FIX: Ensure canvas is visible and positioned correctly
            canvas.style.position = 'fixed'; // Use fixed instead of absolute
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw'; // Use viewport units
            canvas.style.height = '100vh';
            canvas.style.zIndex = '10'; // Higher z-index to ensure it's on top
            canvas.style.display = 'block'; // Ensure it's displayed as block
            canvas.style.backgroundColor = '#000000'; // Black background as fallback
            
            // CRITICAL FIX: Append canvas to body and ensure it's the top element
            document.body.appendChild(canvas);
            
            // Log canvas dimensions for debugging
            console.log(`Canvas dimensions: ${canvas.clientWidth}x${canvas.clientHeight}`);
            
            // Create WebGL renderer with robust settings
            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true, // Always use antialiasing for better visuals
                alpha: false, // No transparency needed for space
                powerPreference: 'high-performance',
                precision: 'highp', // Use high precision for better visuals
                preserveDrawingBuffer: true // Important for screenshots and post-processing
            });
            
            // CRITICAL FIX: Set renderer size explicitly to match window
            this.renderer.setSize(window.innerWidth, window.innerHeight, false);
            this.renderer.setPixelRatio(window.devicePixelRatio || 1);
            
            // CRITICAL FIX: Set output encoding for better colors
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            
            // Add stronger lights to the scene
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
            directionalLight.position.set(1, 1, 1);
            directionalLight.name = "MainLight";
            this.scene.add(directionalLight);
            
            // Add a bright red test sphere to verify rendering
            const geometry = new THREE.SphereGeometry(10, 32, 32); // Larger and more detailed
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.5 // Make it glow
            });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(0, 0, 0);
            sphere.name = "TestSphere";
            this.scene.add(sphere);
            
            // CRITICAL FIX: Add orbit controls for easier debugging
            if (typeof OrbitControls !== 'undefined') {
                try {
                    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
                    this.controls.enableDamping = true;
                    this.controls.dampingFactor = 0.25;
                    console.log("Orbit controls initialized");
                } catch (error) {
                    console.warn("Could not initialize OrbitControls:", error);
                }
            }
            
            // Handle window resize with debouncing
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    console.log("Handling window resize");
                    this.camera.aspect = window.innerWidth / window.innerHeight;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
                    // Force a render after resize
                    this.renderScene();
                }, 100);
            });
            
            // CRITICAL FIX: Force multiple renders to ensure scene is visible
            console.log("Forcing initial renders");
            this.renderer.render(this.scene, this.camera);
            
            // Schedule additional renders to ensure visibility
            setTimeout(() => this.renderer.render(this.scene, this.camera), 100);
            setTimeout(() => this.renderer.render(this.scene, this.camera), 500);
            setTimeout(() => this.renderer.render(this.scene, this.camera), 1000);
            
            console.log(`Scene initialized with ${this.scene.children.length} objects`);
            return true;
        } catch (error) {
            console.error("Error initializing Three.js:", error);
            // CRITICAL FIX: Show error on screen
            this.showErrorMessage("Failed to initialize Three.js: " + error.message);
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
        console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
        
        if (this.debugMode) {
            this.addDebugHelpers();
            
            // Log scene hierarchy
            if (this.scene) {
                console.log("Scene hierarchy:");
                this.logSceneHierarchy(this.scene);
            }
            
            // Log camera position
            if (this.camera) {
                console.log(`Camera position: ${JSON.stringify(this.camera.position)}`);
            }
            
            // Log spacecraft position
            if (this.spacecraft) {
                console.log(`Spacecraft position: ${JSON.stringify(this.spacecraft.position)}`);
            }
        } else {
            this.removeDebugHelpers();
        }
        
        // Force a render to show/hide debug helpers
        this.renderScene();
    }
    
    addDebugHelpers() {
        if (!this.scene) return;
        
        console.log("Adding debug helpers to scene");
        
        // Remove existing helpers first
        this.removeDebugHelpers();
        
        // Create a grid helper
        const gridHelper = new THREE.GridHelper(1000, 100, 0xff0000, 0x444444);
        gridHelper.name = "debugGridHelper";
        this.scene.add(gridHelper);
        
        // Create axes helper
        const axesHelper = new THREE.AxesHelper(500);
        axesHelper.name = "debugAxesHelper";
        this.scene.add(axesHelper);
        
        // Add a light helper for each directional light
        this.scene.traverse((object) => {
            if (object instanceof THREE.DirectionalLight) {
                const lightHelper = new THREE.DirectionalLightHelper(object, 100);
                lightHelper.name = "debugLightHelper";
                this.scene.add(lightHelper);
            }
        });
        
        // Add stats.js if available
        try {
            if (window.Stats && !this.stats) {
                this.stats = new Stats();
                this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
                this.stats.dom.style.position = 'absolute';
                this.stats.dom.style.top = '0px';
                this.stats.dom.style.left = '0px';
                this.stats.dom.style.zIndex = '1000';
                document.body.appendChild(this.stats.dom);
            }
        } catch (error) {
            console.warn("Stats.js not available:", error);
        }
        
        // Add debug info panel
        if (!document.getElementById('debugInfo')) {
            const debugInfo = document.createElement('div');
            debugInfo.id = 'debugInfo';
            debugInfo.style.position = 'absolute';
            debugInfo.style.top = '10px';
            debugInfo.style.right = '10px';
            debugInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            debugInfo.style.color = 'white';
            debugInfo.style.padding = '10px';
            debugInfo.style.fontFamily = 'monospace';
            debugInfo.style.fontSize = '12px';
            debugInfo.style.zIndex = '1000';
            debugInfo.style.maxHeight = '80vh';
            debugInfo.style.overflowY = 'auto';
            debugInfo.style.maxWidth = '300px';
            debugInfo.innerHTML = '<h3>Debug Info</h3><div id="debugContent"></div>';
            document.body.appendChild(debugInfo);
        }
        
        // Update debug info every second
        if (!this.debugInfoInterval) {
            this.debugInfoInterval = setInterval(() => {
                this.updateDebugInfo();
            }, 1000);
        }
    }
    
    removeDebugHelpers() {
        if (!this.scene) return;
        
        console.log("Removing debug helpers from scene");
        
        // Remove grid helper
        const gridHelper = this.scene.getObjectByName("debugGridHelper");
        if (gridHelper) this.scene.remove(gridHelper);
        
        // Remove axes helper
        const axesHelper = this.scene.getObjectByName("debugAxesHelper");
        if (axesHelper) this.scene.remove(axesHelper);
        
        // Remove light helpers
        const lightHelpers = [];
        this.scene.traverse((object) => {
            if (object.name === "debugLightHelper") {
                lightHelpers.push(object);
            }
        });
        lightHelpers.forEach(helper => this.scene.remove(helper));
        
        // Remove stats.js
        if (this.stats && this.stats.dom && this.stats.dom.parentNode) {
            this.stats.dom.parentNode.removeChild(this.stats.dom);
            this.stats = null;
        }
        
        // Remove debug info panel
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo && debugInfo.parentNode) {
            debugInfo.parentNode.removeChild(debugInfo);
        }
        
        // Clear debug info interval
        if (this.debugInfoInterval) {
            clearInterval(this.debugInfoInterval);
            this.debugInfoInterval = null;
        }
    }
    
    updateDebugInfo() {
        const debugContent = document.getElementById('debugContent');
        if (!debugContent) return;
        
        let info = '';
        
        // FPS info
        info += `<p>FPS: ${this.fps.toFixed(1)}</p>`;
        
        // Camera info
        if (this.camera) {
            info += `<p>Camera:<br>
                Position: ${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)}<br>
                Rotation: ${this.camera.rotation.x.toFixed(2)}, ${this.camera.rotation.y.toFixed(2)}, ${this.camera.rotation.z.toFixed(2)}</p>`;
        }
        
        // Spacecraft info
        if (this.spacecraft) {
            info += `<p>Spacecraft:<br>
                Position: ${this.spacecraft.position.x.toFixed(1)}, ${this.spacecraft.position.y.toFixed(1)}, ${this.spacecraft.position.z.toFixed(1)}<br>
                Velocity: ${this.spacecraft.velocity ? this.spacecraft.velocity.length().toFixed(2) : 'N/A'}</p>`;
        }
        
        // Scene info
        if (this.scene) {
            let objectCount = 0;
            this.scene.traverse(() => { objectCount++; });
            info += `<p>Scene objects: ${objectCount}</p>`;
        }
        
        // Game world info
        if (this.gameWorld) {
            info += `<p>Active sector: ${this.gameWorld.currentSector ? this.gameWorld.currentSector.name : 'None'}<br>
                Planets: ${this.gameWorld.planets ? this.gameWorld.planets.length : 0}<br>
                Aliens: ${this.gameWorld.aliens ? this.gameWorld.aliens.length : 0}</p>`;
        }
        
        // Renderer info
        if (this.renderer) {
            const rendererInfo = this.renderer.info;
            info += `<p>Renderer:<br>
                Triangles: ${rendererInfo.render.triangles}<br>
                Draw calls: ${rendererInfo.render.calls}<br>
                Lines: ${rendererInfo.render.lines}</p>`;
        }
        
        // Memory usage
        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            info += `<p>Memory:<br>
                Used: ${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB<br>
                Total: ${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB<br>
                Limit: ${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB</p>`;
        }
        
        debugContent.innerHTML = info;
    }
    
    logSceneHierarchy(object, indent = 0) {
        if (!object) return;
        
        const indentStr = ' '.repeat(indent * 2);
        let info = `${indentStr}${object.name || 'unnamed'} [${object.type}]`;
        
        // Add position info for objects with position
        if (object.position) {
            info += ` - pos: (${object.position.x.toFixed(1)}, ${object.position.y.toFixed(1)}, ${object.position.z.toFixed(1)})`;
        }
        
        // Add visibility info
        if (object.visible !== undefined) {
            info += ` - visible: ${object.visible}`;
        }
        
        console.log(info);
        
        // Recursively log children
        if (object.children && object.children.length > 0) {
            object.children.forEach(child => {
                this.logSceneHierarchy(child, indent + 1);
            });
        }
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        console.log(`Notification: ${message} (${type})`);
        
        // Get notification area
        const notificationArea = document.getElementById('notification-area');
        if (!notificationArea) {
            console.warn('Notification area not found');
            return;
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to notification area
        notificationArea.appendChild(notification);
        
        // Remove after duration
        if (duration > 0) {
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);
        }
    }
    
    // Improved loading screen removal
    forceRemoveAllLoadingScreens() {
        console.log("Forcing removal of all loading screens");
        
        try {
            // Find all loading elements by ID
            const loadingIds = ['loading', 'loading-screen'];
            
            loadingIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    console.log(`Removing loading element: ${id}`);
                    
                    // Fade out
                    element.style.transition = 'opacity 0.5s ease-in-out';
                    element.style.opacity = '0';
                    
                    // Remove from DOM after transition
                    setTimeout(() => {
                        if (element.parentNode) {
                            element.parentNode.removeChild(element);
                            console.log(`Removed ${id} from DOM`);
                        }
                    }, 500);
                } else {
                    console.log(`Loading element not found: ${id}`);
                }
            });
            
            // Also search for any elements containing loading text
            const allElements = document.querySelectorAll('*');
            allElements.forEach(element => {
                if (element.textContent && 
                    (element.textContent.includes('Loading game assets') || 
                     element.textContent.includes('Welcome to a new universe'))) {
                    
                    console.log(`Found loading text element: ${element.tagName}`);
                    
                    // Fade out
                    element.style.transition = 'opacity 0.5s ease-in-out';
                    element.style.opacity = '0';
                    
                    // Remove from DOM after transition
                    setTimeout(() => {
                        if (element.parentNode) {
                            element.parentNode.removeChild(element);
                            console.log(`Removed text element from DOM`);
                        }
                    }, 500);
                }
            });
            
            // Force a render frame to ensure the scene is visible
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        } catch (error) {
            console.error("Error removing loading screens:", error);
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
        try {
            // Skip update if game is not initialized yet
            if (!this.initialized) {
                return;
            }
            
            // Performance monitoring
            const startTime = performance.now();
            
            // Update physics (every frame)
            if (this.physicsSystem) {
                this.physicsSystem.update(delta);
            }
            
            // Update spacecraft (every frame)
            if (this.spacecraft) {
                this.spacecraft.update(delta);
            }
            
            // Update game world (less frequently for better performance)
            if (this.gameWorld && this.frameCount % 2 === 0) {
                const playerPosition = this.spacecraft ? this.spacecraft.position : this.camera.position;
                this.gameWorld.update(delta, playerPosition);
            }
            
            // Update UI (less frequently)
            if (this.uiManager && this.frameCount % 3 === 0) {
                const currentSector = this.gameWorld ? this.gameWorld.getCurrentSector() : null;
                this.uiManager.update(delta, currentSector);
            }
            
            // Always render scene every frame
            this.renderScene();
            
            // Performance monitoring
            const frameDuration = performance.now() - startTime;
            if (frameDuration > 16.67) { // Frame took longer than 60fps budget
                console.warn(`Long frame: ${frameDuration.toFixed(2)}ms`);
                this.slowFrameCount++;
                if (this.slowFrameCount > 30) {
                    this.reduceQuality();
                }
            } else {
                this.slowFrameCount = 0;
            }
            
            // Increment frame counter
            this.frameCount = (this.frameCount + 1) % 1000;
            
        } catch (error) {
            console.error("Error in update loop:", error);
        }
    }
    
    // Separate rendering function to ensure it's always called
    renderScene() {
        try {
            // CRITICAL FIX: Always check if renderer, scene, and camera exist
            if (!this.renderer) {
                console.error("Cannot render: renderer is null");
                return;
            }
            
            if (!this.scene) {
                console.error("Cannot render: scene is null");
                return;
            }
            
            if (!this.camera) {
                console.error("Cannot render: camera is null");
                return;
            }
            
            // Update orbit controls if they exist
            if (this.controls && this.controls.update) {
                this.controls.update();
            }
            
            // Render the scene
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error("Error rendering scene:", error);
        }
    }
    
    // Add a method to reduce quality for better performance
    reduceQuality() {
        if (this.qualityReduced) return; // Only reduce once
        
        console.log("Reducing quality settings for better performance");
        
        // Reduce renderer pixel ratio
        if (this.renderer) {
            const currentPixelRatio = this.renderer.getPixelRatio();
            if (currentPixelRatio > 1) {
                this.renderer.setPixelRatio(currentPixelRatio - 0.5);
                console.log(`Reduced pixel ratio to ${this.renderer.getPixelRatio()}`);
            }
        }
        
        // Disable antialiasing
        // Note: We can't change this at runtime, but it's good to note for future implementations
        
        this.qualityReduced = true;
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

    // Animation loop
    animate() {
        try {
            // Request next frame immediately to ensure smooth animation
            requestAnimationFrame(this.animate);
            
            // CRITICAL FIX: Always render the scene, even if game is not running
            this.renderScene();
            
            // Only continue with game logic if game is active
            if (!this.isRunning) {
                return;
            }
            
            // Calculate delta time
            const now = performance.now();
            const delta = now - this.lastTime;
            
            // Skip if delta is too large (tab was inactive)
            if (delta > 500) {
                console.log("Large frame time detected, skipping update:", delta);
                this.lastTime = now;
                return;
            }
            
            // Update stats if available
            if (this.stats) {
                this.stats.begin();
            }
            
            // Only update game logic if initialized
            if (this.initialized) {
                this.update(now, delta);
            }
            
            // Update stats if available
            if (this.stats) {
                this.stats.end();
            }
            
            // Update FPS counter
            this.frameCount++;
            this.framesSinceLastFpsUpdate++;
            
            if (now - this.lastFpsUpdate > 1000) { // Update FPS every second
                this.fps = this.framesSinceLastFpsUpdate * 1000 / (now - this.lastFpsUpdate);
                this.lastFpsUpdate = now;
                this.framesSinceLastFpsUpdate = 0;
                
                // Log FPS in debug mode
                if (this.debugMode) {
                    console.log(`FPS: ${this.fps.toFixed(1)}`);
                }
            }
            
            this.lastTime = now;
        } catch (error) {
            console.error("Error in animation loop:", error);
            // Continue animation despite errors
            this.lastTime = performance.now();
        }
    }

    // Initialize physics system
    initPhysics() {
        try {
            console.log("Initializing physics system...");
            
            // Create physics system
            this.physicsSystem = new PhysicsSystem();
            
            // No need to define collision groups as they're already defined in the PhysicsSystem constructor
            
            console.log("Physics system initialized");
            return true;
        } catch (error) {
            console.error("Failed to initialize physics system:", error);
            return false;
        }
    }

    // Initialize game world
    initGameWorld() {
        try {
            console.log("Initializing game world...");
            
            // Create game world
            this.gameWorld = new GameWorld(this.scene, this.loadingManager, this.physicsSystem);
            
            // Check if there are any motherships in the gameWorld
            if (this.gameWorld.motherships && this.gameWorld.motherships.length > 0) {
                this.mothership = this.gameWorld.motherships[0];
                console.log("Mothership reference obtained");
            }
            
            // Create the player's spacecraft
            this.createPlayerSpacecraft();
            
            console.log("Game world initialized");
            return true;
        } catch (error) {
            console.error("Failed to initialize game world:", error);
            return false;
        }
    }

    // Create the player's spacecraft
    createPlayerSpacecraft() {
        try {
            console.log("Creating player spacecraft...");
            
            // Check if we already have a spacecraft
            if (this.spacecraft) {
                console.log("Spacecraft already exists, skipping creation");
                return;
            }
            
            // Get mothership if available
            let startPosition;
            let mothership = null;
            
            if (this.gameWorld && this.gameWorld.motherships && this.gameWorld.motherships.length > 0) {
                mothership = this.gameWorld.motherships[0];
                console.log("Found mothership for spacecraft starting position");
            }
            
            // Set starting position based on mothership or Earth
            if (mothership) {
                // Start in front of the mothership
                startPosition = new THREE.Vector3().copy(mothership.position);
                startPosition.y -= 100; // Below the mothership
                console.log(`Starting at mothership: ${startPosition.x}, ${startPosition.y}, ${startPosition.z}`);
            } else {
                // Fallback to starting above Earth
                const earth = this.gameWorld ? 
                    this.gameWorld.planets.find(planet => planet.name === "Earth") : null;
                
                if (earth) {
                    startPosition = new THREE.Vector3().copy(earth.position);
                    startPosition.y += 200; // Above Earth
                    console.log(`Starting above Earth: ${startPosition.x}, ${startPosition.y}, ${startPosition.z}`);
                } else {
                    // Ultimate fallback
                    startPosition = new THREE.Vector3(0, 200, 0);
                    console.log("Using default starting position");
                }
            }
            
            // Create the spacecraft
            this.spacecraft = new Spacecraft({
                scene: this.scene,
                camera: this.camera,
                physicsSystem: this.physicsSystem,
                position: startPosition
            });
            
            // Add to physics system
            if (this.physicsSystem) {
                this.physicsSystem.addObject(this.spacecraft);
                
                // Set collision group if available
                if (this.physicsSystem.collisionGroups) {
                    this.spacecraft.collisionGroup = this.physicsSystem.collisionGroups.spacecraft;
                }
            }
            
            // Position camera to follow spacecraft
            if (this.camera) {
                // Position camera behind and above spacecraft
                this.camera.position.set(
                    startPosition.x, 
                    startPosition.y + 20, 
                    startPosition.z + 50
                );
                this.camera.lookAt(startPosition);
                console.log(`Camera positioned at: ${this.camera.position.x}, ${this.camera.position.y}, ${this.camera.position.z}`);
            }
            
            console.log("Player spacecraft created successfully");
            return this.spacecraft;
        } catch (error) {
            console.error("Error creating player spacecraft:", error);
            this.showErrorMessage("Failed to create spacecraft: " + error.message);
            return null;
        }
    }

    // Initialize UI
    initUI() {
        try {
            console.log("Initializing UI...");
            
            // Get UI elements
            this.healthBar = document.getElementById('health');
            this.shieldBar = document.getElementById('shield');
            this.energyBar = document.getElementById('energy');
            this.fpsElement = document.getElementById('fps');
            this.sectorInfo = document.getElementById('sector');
            
            // Create exploration UI
            this.createExplorationUI();
            
            console.log("UI initialized");
            return true;
        } catch (error) {
            console.error("Error initializing UI:", error);
            return false;
        }
    }

    // Update UI elements
    updateUI() {
        // Update health, shield, energy if spacecraft exists
        if (this.spacecraft) {
            if (this.healthBar) this.healthBar.textContent = Math.round(this.spacecraft.hull);
            if (this.shieldBar) this.shieldBar.textContent = Math.round(this.spacecraft.shields);
            if (this.energyBar) this.energyBar.textContent = Math.round(this.spacecraft.energy);
        }
        
        // Update sector info
        if (this.sectorInfo && this.gameWorld) {
            const currentSector = this.gameWorld.getCurrentSector();
            if (currentSector && currentSector.name) {
                this.sectorInfo.textContent = currentSector.name;
            } else {
                this.sectorInfo.textContent = "Unknown Sector";
            }
        }
        
        // Update FPS counter
        if (this.fpsElement) {
            this.fpsElement.textContent = this.fps;
        }
    }

    // Add this new method after init()
    addCssReset() {
        console.log("Adding CSS reset to ensure canvas visibility");
        
        // Create a style element
        const style = document.createElement('style');
        style.id = 'game-css-reset';
        style.textContent = `
            /* CSS Reset for Star Flight Game */
            html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
                background-color: #000000;
            }
            
            /* Ensure canvas is always visible */
            #game-canvas {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 10 !important;
                display: block !important;
            }
            
            /* Hide any potential overlays */
            div[id*="loading"], div[class*="loading"] {
                z-index: 5 !important;
            }
        `;
        
        // Add to document head
        document.head.appendChild(style);
    }

    // Add this new method after init()
    emergencyInitialization() {
        console.warn("Emergency initialization triggered after timeout");
        
        if (this.initialized || this.emergencyInitialized) {
            console.log("Game already initialized, skipping emergency initialization");
            return;
        }
        
        this.emergencyInitialized = true;
        
        try {
            // Force remove all loading screens
            this.forceRemoveAllLoadingScreens();
            
            // Ensure we have a scene and camera
            if (!this.scene) {
                console.warn("Creating emergency scene");
                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x000000);
            }
            
            if (!this.camera) {
                console.warn("Creating emergency camera");
                this.camera = new THREE.PerspectiveCamera(
                    75,
                    window.innerWidth / window.innerHeight,
                    0.1,
                    10000
                );
                this.camera.position.set(0, 10, 50);
            }
            
            // Ensure we have a renderer
            if (!this.renderer) {
                console.warn("Creating emergency renderer");
                const canvas = document.createElement('canvas');
                canvas.id = 'emergency-canvas';
                canvas.style.position = 'fixed';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.width = '100vw';
                canvas.style.height = '100vh';
                canvas.style.zIndex = '100';
                document.body.appendChild(canvas);
                
                this.renderer = new THREE.WebGLRenderer({
                    canvas: canvas,
                    antialias: true
                });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
            
            // Add a visible object to the scene
            const geometry = new THREE.SphereGeometry(20, 32, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.name = "EmergencySphere";
            this.scene.add(sphere);
            
            // Add text to indicate emergency mode
            const message = document.createElement('div');
            message.style.position = 'fixed';
            message.style.top = '20px';
            message.style.left = '20px';
            message.style.color = 'white';
            message.style.fontFamily = 'Arial, sans-serif';
            message.style.fontSize = '16px';
            message.style.zIndex = '101';
            message.textContent = 'Emergency Mode: Game initialized with minimal features. Refresh to try again.';
            document.body.appendChild(message);
            
            // Force render
            this.renderer.render(this.scene, this.camera);
            
            // Set as initialized and start animation loop
            this.initialized = true;
            this.isRunning = true;
            
            // Start animation loop if not already running
            if (!this.animationFrameId) {
                this.lastTime = performance.now();
                this.animate();
            }
            
            console.log("Emergency initialization complete");
        } catch (error) {
            console.error("Failed emergency initialization:", error);
            this.showErrorMessage("Critical error: " + error.message);
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