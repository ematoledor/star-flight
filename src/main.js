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
import { InputHandler } from './systems/InputHandler.js';

// Add global emergency functions
window.fixControls = function() {
    console.log("Emergency control fix initiated from console");
    
    try {
        // Try to access the game instance
        const game = window.game;
        
        if (!game) {
            console.error("Game instance not found on window object");
            return false;
        }
        
        // Try to reinitialize input system
        if (typeof game.reinitializeInputSystem === 'function') {
            return game.reinitializeInputSystem();
        } else {
            console.error("reinitializeInputSystem method not found on game instance");
            return false;
        }
    } catch (error) {
        console.error("Error in fixControls:", error);
        return false;
    }
};

// Add a function to force pointer lock
window.forcePointerLock = function() {
    console.log("Forcing pointer lock");
    try {
        document.body.requestPointerLock();
        return true;
    } catch (error) {
        console.error("Error forcing pointer lock:", error);
        return false;
    }
};

// Add a function to check input system status
window.checkInputSystem = function() {
    console.log("Checking input system status");
    
    try {
        const game = window.game;
        const inputManager = window.gameInputManager;
        
        if (!game) {
            console.error("Game instance not found");
            return false;
        }
        
        if (!inputManager) {
            console.error("Input manager not found");
            return false;
        }
        
        // Log diagnostic information
        console.log("Game instance:", game ? "Available" : "Missing");
        console.log("Input manager:", inputManager ? "Available" : "Missing");
        console.log("Spacecraft:", game.spacecraft ? "Available" : "Missing");
        console.log("Document ready state:", document.readyState);
        console.log("Pointer lock element:", document.pointerLockElement);
        
        return true;
    } catch (error) {
        console.error("Error checking input system:", error);
        return false;
    }
};

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
        
        // Make the game instance globally accessible
        window.game = this;
    }
    
    init() {
        try {
            console.log("Game initialization started");
            this.initialized = false;
            this.initStartTime = performance.now();
            
            // Enable debug mode for troubleshooting
            this.debugMode = true;
            console.log("Debug mode enabled");
            
            // Add CSS reset to ensure canvas is visible
            this.addCssReset();
            
            // CRITICAL FIX: Check if document is ready before proceeding
            if (document.readyState === 'loading') {
                console.log("Document still loading, waiting for DOMContentLoaded event");
                
                document.addEventListener('DOMContentLoaded', () => {
                    console.log("DOMContentLoaded event fired, continuing initialization");
                    this.continueInitialization();
                });
                
                // Set a timeout in case the event doesn't fire
                setTimeout(() => {
                    if (!this.initialized) {
                        console.warn("DOMContentLoaded timeout reached, forcing initialization");
                        this.continueInitialization();
                    }
                }, 2000);
            } else {
                // Document already loaded, continue immediately
                console.log("Document already loaded, continuing initialization");
                this.continueInitialization();
            }
        } catch (error) {
            console.error("Critical error during initialization:", error);
            this.showErrorMessage("Failed to initialize game: " + error.message);
            
            // Try emergency initialization after a delay
            setTimeout(() => {
                this.emergencyInitialization();
            }, 3000);
        }
    }
    
    // CRITICAL FIX: Split initialization into a separate method
    continueInitialization() {
        try {
            // Set up loading screen
            this.setupLoadingScreenReferences();
            
            // Initialize Three.js
        this.initThree();
            
            // Initialize physics system
            this.initPhysics();
            
            // Initialize game world
            this.initGameWorld();
            
            // Initialize input manager
            this.initInputManager();
            
            // Initialize UI
            this.initUI();
            
            // Start animation loop
            if (!this.isRunning) {
                this.isRunning = true;
        this.animate();
                console.log("Animation loop started");
            }
            
            // Set timeout for emergency initialization if normal init takes too long
            this.initTimeoutId = setTimeout(() => {
                if (!this.initialized) {
                    console.warn("Initialization timeout reached, triggering emergency initialization");
                    this.emergencyInitialization();
                }
            }, 10000);
            
            // Mark as initialized
            this.initialized = true;
            console.log(`Game initialization completed in ${((performance.now() - this.initStartTime) / 1000).toFixed(2)}s`);
            
            // Schedule periodic canvas visibility checks
            setInterval(() => this.ensureCanvasVisibility(), 5000);
            
            // Force an immediate visibility check
            setTimeout(() => this.ensureCanvasVisibility(), 1000);
        } catch (error) {
            console.error("Error during continueInitialization:", error);
            this.showErrorMessage("Failed to complete initialization: " + error.message);
            
            // Try emergency initialization
            setTimeout(() => {
                this.emergencyInitialization();
            }, 2000);
        }
    }
    
    initThree() {
        try {
            console.log("Initializing Three.js...");
            
            // Create scene with black background
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
            // PERFORMANCE: Enable frustum culling
            this.scene.frustumCulled = true;
            
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
            
            // PERFORMANCE: Detect device capabilities for adaptive quality
            const isLowEndDevice = this.detectLowEndDevice();
            console.log(`Device capability detection: ${isLowEndDevice ? 'Low-end' : 'High-end'} device`);
            
            // Create WebGL renderer with settings optimized for performance
            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: !isLowEndDevice, // Only use antialiasing on high-end devices
                alpha: false, // No transparency needed for space
                powerPreference: 'high-performance',
                precision: isLowEndDevice ? 'mediump' : 'highp', // Lower precision on low-end devices
                stencil: false, // Disable stencil buffer if not needed
                depth: true, // Keep depth buffer for 3D
                logarithmicDepthBuffer: false // Disable logarithmic depth buffer for performance
            });
            
            // CRITICAL FIX: Set renderer size explicitly to match window
            this.renderer.setSize(window.innerWidth, window.innerHeight, false);
            
            // PERFORMANCE: Limit pixel ratio on high-DPI devices
            const maxPixelRatio = isLowEndDevice ? 1 : 2;
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
            
            // CRITICAL FIX: Set output encoding for better colors
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            
            // PERFORMANCE: Optimize renderer settings
            this.renderer.shadowMap.enabled = !isLowEndDevice; // Disable shadows on low-end devices
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Add lights to the scene
            this.addLights(isLowEndDevice);
            
            // PERFORMANCE: Add a simple skybox instead of complex stars
            this.addSimpleSkybox();
            
            // Set up window resize handler with debouncing for performance
            let resizeTimeout;
            window.addEventListener('resize', () => {
                // Clear previous timeout
                if (resizeTimeout) clearTimeout(resizeTimeout);
                
                // Set new timeout to debounce resize events
                resizeTimeout = setTimeout(() => {
                    // Update camera aspect ratio
                    this.camera.aspect = window.innerWidth / window.innerHeight;
                    this.camera.updateProjectionMatrix();
                    
                    // Update renderer size
                    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
                    
                    // Force a render
                    this.renderScene();
                    
                    console.log(`Window resized: ${window.innerWidth}x${window.innerHeight}`);
                }, 250); // 250ms debounce
            });
            
            // Force an initial render to ensure scene is visible
            this.renderScene();
            
            console.log("Three.js initialized successfully");
            return true;
        } catch (error) {
            console.error("Error initializing Three.js:", error);
            return false;
        }
    }
    
    // PERFORMANCE: Add a method to detect low-end devices
    detectLowEndDevice() {
        try {
            // Check for navigator.hardwareConcurrency (CPU cores)
            const lowCPUCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
            
            // Check for low memory (if available)
            const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
            
            // Check for mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Check for WebGL capabilities
            let webGLScore = 0;
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) {
                        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                        console.log(`WebGL Renderer: ${renderer}`);
                        
                        // Check for integrated graphics
                        const isIntegrated = /(Intel|AMD|Microsoft|SwiftShader)/i.test(renderer);
                        webGLScore = isIntegrated ? 1 : 2;
                    }
                }
            } catch (e) {
                console.warn("Error detecting WebGL capabilities:", e);
            }
            
            // Calculate overall score
            const factors = [
                lowCPUCores ? 1 : 0,
                lowMemory ? 1 : 0,
                isMobile ? 1 : 0,
                webGLScore === 1 ? 1 : 0
            ];
            
            const score = factors.reduce((sum, factor) => sum + factor, 0);
            console.log(`Device capability score: ${score}/4`);
            
            // Consider it a low-end device if score is 2 or higher
            return score >= 2;
        } catch (error) {
            console.error("Error in detectLowEndDevice:", error);
            return false; // Default to high-end if detection fails
        }
    }
    
    // PERFORMANCE: Add a method to add optimized lights
    addLights(isLowEndDevice) {
        // Add ambient light (cheap)
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        if (!isLowEndDevice) {
            // Add directional light (more expensive) only for high-end devices
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(1, 1, 1);
            directionalLight.castShadow = true;
            
            // Optimize shadow settings
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 500;
            
        this.scene.add(directionalLight);
        } else {
            // Add a simple directional light without shadows for low-end devices
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(1, 1, 1);
            this.scene.add(directionalLight);
        }
    }
    
    // PERFORMANCE: Add a simple skybox instead of complex star field
    addSimpleSkybox() {
        try {
            // Create a simple star background using a sphere with inverted normals
            const geometry = new THREE.SphereGeometry(5000, 16, 16); // Reduced segments
            
            // Invert the geometry so we can see it from inside
            geometry.scale(-1, 1, 1);
            
            // Create a simple material with a star texture or a basic color
            const material = new THREE.MeshBasicMaterial({
                color: 0x000000,
                side: THREE.BackSide,
                fog: false
            });
            
            // Add some simple stars using points
            const starsGeometry = new THREE.BufferGeometry();
            const starsVertices = [];
            
            // PERFORMANCE: Reduce number of stars based on device capability
            const starCount = this.detectLowEndDevice() ? 1000 : 3000;
            
            for (let i = 0; i < starCount; i++) {
                const x = (Math.random() - 0.5) * 10000;
                const y = (Math.random() - 0.5) * 10000;
                const z = (Math.random() - 0.5) * 10000;
                starsVertices.push(x, y, z);
            }
            
            starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
            
            const starsMaterial = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 2,
                sizeAttenuation: false
            });
            
            const starField = new THREE.Points(starsGeometry, starsMaterial);
            
            // Create the skybox mesh and add to scene
            const skybox = new THREE.Mesh(geometry, material);
            this.scene.add(skybox);
            this.scene.add(starField);
            
            console.log("Simple skybox created");
        } catch (error) {
            console.error("Error creating skybox:", error);
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
        if (!this.spacecraft || !this.gameWorld) {
            console.error("Cannot scan surroundings: spacecraft or game world not available");
            return;
        }
        
        const spacecraft = this.spacecraft;
        const position = spacecraft.position;
        const scanRadius = 5000; // Units to scan
        
        console.log(`Scanning surroundings at position (${position.x.toFixed(0)}, ${position.y.toFixed(0)}, ${position.z.toFixed(0)})`);
        
        // Create a scan results container
        let scanResults = [];
        
        // Scan for planets
        if (this.gameWorld.planets) {
            this.gameWorld.planets.forEach(planet => {
                if (!planet || !planet.position) return;
                
                const distance = position.distanceTo(planet.position);
                if (distance <= scanRadius) {
                    scanResults.push({
                        type: 'planet',
                        name: planet.name || 'Unknown Planet',
                        distance: distance,
                        position: planet.position.clone(),
                        object: planet
                    });
                }
            });
        }
        
        // Scan for other objects (moons, asteroids, etc.)
        if (this.gameWorld.moons) {
            this.gameWorld.moons.forEach(moon => {
                if (!moon || !moon.position) return;
                
                const distance = position.distanceTo(moon.position);
                if (distance <= scanRadius) {
                    scanResults.push({
                        type: 'moon',
                        name: moon.name || 'Unknown Moon',
                        distance: distance,
                        position: moon.position.clone(),
                        object: moon
                    });
                }
            });
        }
        
        // Sort results by distance
        scanResults.sort((a, b) => a.distance - b.distance);
        
        // Display results
        if (scanResults.length > 0) {
            console.log(`Found ${scanResults.length} objects within ${scanRadius} units:`);
            
            let resultsHTML = `<div style="max-height: 300px; overflow-y: auto;">
                <h3 style="margin-top: 0; color: #00aaff;">Scan Results</h3>
                <p>Found ${scanResults.length} objects within ${scanRadius} units:</p>
                <ul style="padding-left: 20px;">`;
                
            scanResults.forEach(result => {
                console.log(`- ${result.name} (${result.type}): ${result.distance.toFixed(0)} units away`);
                
                resultsHTML += `<li style="margin-bottom: 5px;">
                    <strong>${result.name}</strong> (${result.type})<br>
                    Distance: ${result.distance.toFixed(0)} units<br>
                    Position: (${result.position.x.toFixed(0)}, ${result.position.y.toFixed(0)}, ${result.position.z.toFixed(0)})
                    <button class="goto-button" data-name="${result.name}" style="background: #44cc44; border: none; color: white; padding: 2px 5px; border-radius: 3px; cursor: pointer; margin-left: 5px; font-size: 12px;">Go To</button>
                </li>`;
            });
            
            resultsHTML += `</ul></div>`;
            
            // Create a modal to display results
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            modal.style.color = 'white';
            modal.style.padding = '20px';
            modal.style.borderRadius = '10px';
            modal.style.zIndex = '2000';
            modal.style.maxWidth = '500px';
            modal.style.boxShadow = '0 0 20px rgba(0, 100, 255, 0.5)';
            
            modal.innerHTML = resultsHTML + `
                <div style="text-align: center; margin-top: 15px;">
                    <button id="close-scan-modal" style="background: #ff5555; border: none; color: white; padding: 5px 15px; border-radius: 3px; cursor: pointer;">Close</button>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listener to close button
            document.getElementById('close-scan-modal').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            
            // Add event listeners to "Go To" buttons
            const gotoButtons = modal.querySelectorAll('.goto-button');
            gotoButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const objectName = button.getAttribute('data-name');
                    const result = scanResults.find(r => r.name === objectName);
                    
                    if (result && result.object && result.object.position) {
                        // Teleport to the object
                        spacecraft.position.set(
                            result.object.position.x + 200,
                            result.object.position.y + 100,
                            result.object.position.z + 200
                        );
                        
                        // Reset velocity
                        spacecraft.velocity.set(0, 0, 0);
                        
                        // Show notification
                        this.showNotification(`Teleported to ${result.name}`, "info", 3000);
                        
                        // Close the modal
                        document.body.removeChild(modal);
                    }
                });
            });
            
            // Show notification
            this.showNotification(`Scan complete. Found ${scanResults.length} objects.`, "info", 3000);
        } else {
            console.log(`No objects found within ${scanRadius} units.`);
            this.showNotification("Scan complete. No objects found nearby.", "info", 3000);
        }
        
        return scanResults;
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
    
    // Animation loop
    animate() {
        try {
            // Use requestAnimationFrame for the next frame
            this.animationFrameId = requestAnimationFrame(this.animate);
            
            // Calculate delta time
            const now = performance.now();
            let delta = (now - this.lastTime) / 1000; // Convert to seconds
            this.lastTime = now;
            
            // PERFORMANCE: Skip frames if delta is too large (e.g., tab was inactive)
            if (delta > 0.5) {
                console.warn(`Large frame time detected: ${delta.toFixed(2)}s - capping to 100 ms`);
                delta = 0.1; // Cap at 100ms
            }
            
            // Update FPS counter
            this.frameCount++;
            this.framesSinceLastFpsUpdate++;
            
            if (now - this.lastFpsUpdate > 1000) { // Update every second
                this.fps = Math.round((this.framesSinceLastFpsUpdate * 1000) / (now - this.lastFpsUpdate));
                
                // Log FPS for debugging
                console.log(`FPS: ${this.fps}`);
                
                // PERFORMANCE: Detect and handle low FPS
                if (this.fps < 30 && !this.qualityReduced) {
                    this.slowFrameCount++;
                    
                    if (this.slowFrameCount > 5) {
                        console.warn("Low FPS detected, reducing quality settings");
                        this.reduceQuality();
                        this.qualityReduced = true;
                    }
                } else {
                    this.slowFrameCount = 0;
                }
                
                this.lastFpsUpdate = now;
                this.framesSinceLastFpsUpdate = 0;
            }
            
            // Only update and render if the game is running
            if (this.isRunning) {
                // Update game state
                this.update(now, delta);
                
                // Render the scene
                this.renderScene();
            }
        } catch (error) {
            console.error("Error in animation loop:", error);
            
            // PERFORMANCE: Don't stop the animation loop on error
            // Just log the error and continue
        }
    }
    
    // Separate rendering function to ensure it's always called
    renderScene() {
        try {
            // Skip rendering if essential components are missing
            if (!this.renderer || !this.scene || !this.camera) {
                console.warn("Cannot render: missing renderer, scene, or camera");
                return;
            }
            
            // PERFORMANCE: Check if canvas is visible before rendering
            const canvas = this.renderer.domElement;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    // Skip rendering for invisible canvas
                    return;
                }
            }
            
            // PERFORMANCE: Use a simpler render path for low-end devices
            if (this.qualityReduced) {
                // Disable any post-processing
                this.renderer.render(this.scene, this.camera);
            } else {
                // Use normal rendering path
                this.renderer.render(this.scene, this.camera);
            }
        } catch (error) {
            console.error("Error rendering scene:", error);
        }
    }
    
    // Add a method to add an emergency sphere if the scene is empty
    addEmergencySphere() {
        if (!this.scene) return;
        
        try {
            // Create a bright red sphere that's impossible to miss
            const geometry = new THREE.SphereGeometry(20, 16, 16);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                wireframe: true // Wireframe is less resource-intensive
            });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.name = "EmergencySphere";
            sphere.position.set(0, 0, 0);
            this.scene.add(sphere);
            
            // Add a directional light
            if (!this.scene.getObjectByName("EmergencyLight")) {
                const light = new THREE.DirectionalLight(0xffffff, 1);
                light.position.set(1, 1, 1);
                light.name = "EmergencyLight";
                this.scene.add(light);
            }
            
            console.log("Added emergency sphere and light to scene");
        } catch (error) {
            console.error("Failed to add emergency sphere:", error);
        }
    }
    
    // Add a method to reduce quality settings
    reduceQuality() {
        try {
            console.log("Reducing quality settings for better performance");
            
            // Reduce renderer pixel ratio
            if (this.renderer) {
                this.renderer.setPixelRatio(1);
                console.log("Reduced pixel ratio to 1");
            }
            
            // Disable shadows
            if (this.renderer) {
                this.renderer.shadowMap.enabled = false;
                console.log("Disabled shadows");
            }
            
            // Reduce geometry detail in the scene
            if (this.scene) {
                this.scene.traverse(object => {
                    // Reduce geometry detail for meshes
                    if (object.isMesh && object.geometry) {
                        // Skip essential objects
                        if (object.name === "spacecraft" || object.name === "Earth") {
                            return;
                        }
                        
                        // Try to simplify geometry if possible
                        if (typeof object.geometry.dispose === 'function') {
                            // Store original geometry for reference
                            const originalGeometry = object.geometry;
                            
                            // Create simplified geometry if possible
                            if (object.geometry.isBufferGeometry && 
                                object.geometry.attributes.position && 
                                object.geometry.attributes.position.count > 100) {
                                
                                try {
                                    // Reduce vertex count by creating a simpler geometry
                                    if (object.geometry.type.includes('Sphere')) {
                                        const radius = object.scale.x; // Approximate radius
                                        const newGeometry = new THREE.SphereGeometry(
                                            radius, 
                                            8,  // reduced segments
                                            8   // reduced segments
                                        );
                                        object.geometry = newGeometry;
                                        console.log(`Simplified sphere geometry for ${object.name || 'unnamed object'}`);
                                    }
                                    
                                    // Dispose of original geometry to free memory
                                    originalGeometry.dispose();
                                } catch (e) {
                                    console.warn("Error simplifying geometry:", e);
                                    // Restore original geometry if simplification fails
                                    object.geometry = originalGeometry;
                                }
                            }
                        }
                    }
                });
                
                console.log("Reduced geometry detail in scene");
            }
            
            // Force a garbage collection if possible
            if (typeof window.gc === 'function') {
                window.gc();
                console.log("Forced garbage collection");
            }
            
            console.log("Quality reduction complete");
        } catch (error) {
            console.error("Error reducing quality:", error);
        }
    }

    // Add a method to initialize input bindings
    initInputManager() {
        try {
            console.log("Initializing input manager...");
            this.inputManager = new InputHandler(this.spacecraft);
            
            // Add a global reference for emergency access
            window.gameInputManager = this.inputManager;
            
            // Add a global emergency reinitialize function
            window.reinitializeControls = () => this.reinitializeInputSystem();
            
            // Add a keyboard listener for emergency input reset (Alt+R)
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key.toLowerCase() === 'r') {
                    console.log("Emergency input system reset triggered");
                    this.reinitializeInputSystem();
                }
            });
            
            console.log("Input manager initialized");
        } catch (error) {
            console.error("Error initializing input manager:", error);
        }
    }

    // Add this new method for emergency input reset
    reinitializeInputSystem() {
        try {
            console.log("Reinitializing input system...");
            
            // First try to reinitialize the existing input manager
            if (this.inputManager && typeof this.inputManager.reinitialize === 'function') {
                this.inputManager.reinitialize();
            } else {
                // If that fails, create a new input manager
                console.log("Creating new input manager...");
                if (this.inputManager) {
                    // Try to clean up old event listeners (not perfect but helps)
                    this.inputManager = null;
                }
                
                // Force garbage collection if possible
                if (window.gc) window.gc();
                
                // Create new input manager
                this.inputManager = new InputHandler(this.spacecraft);
                
                // Update global reference
                window.gameInputManager = this.inputManager;
            }
            
            // Make sure spacecraft reference is set
            if (this.spacecraft && this.inputManager) {
                this.inputManager.setSpacecraft(this.spacecraft);
            }
            
            // Show notification to user
            this.showNotification("Controls have been reset. Try moving now.", "info", 5000);
            
            console.log("Input system reinitialized");
            return true;
        } catch (error) {
            console.error("Error reinitializing input system:", error);
            return false;
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
            
            // CRITICAL FIX: Ensure we have a scene before creating the game world
            if (!this.scene) {
                console.error("Cannot initialize game world: scene is not available");
                this.initThree(); // Try to initialize Three.js again
                
                if (!this.scene) {
                    console.error("Still no scene available, creating emergency scene");
                    this.scene = new THREE.Scene();
                    this.scene.background = new THREE.Color(0x000000);
                }
            }
            
            // CRITICAL FIX: Ensure we have a physics system
            if (!this.physicsSystem) {
                console.warn("Physics system not initialized, creating now");
                this.initPhysics();
            }
            
            // PERFORMANCE: Check device capability for adaptive loading
            const isLowEndDevice = this.detectLowEndDevice();
            
            // Create game world with proper error handling
            try {
                // PERFORMANCE: Pass device capability to GameWorld for adaptive loading
                this.gameWorld = new GameWorld(this.scene, this.loadingManager, this.physicsSystem, {
                    lowEndDevice: isLowEndDevice
                });
                
                // CRITICAL FIX: Set up callbacks for game world events
                this.gameWorld.onSectorDiscovered = this.onSectorDiscovered.bind(this);
                this.gameWorld.onPlanetDiscovered = this.onPlanetDiscovered.bind(this);
                this.gameWorld.onAnomalyDiscovered = this.onAnomalyDiscovered.bind(this);
                this.gameWorld.onEnemyDestroyed = (type, position) => {
                    this.createExplosion(position, type === 'cruiser' ? 2 : 1);
                    this.showNotification(`Enemy ${type} destroyed!`, 'success');
                };
                
                // PERFORMANCE: Load solar system with progressive detail
                if (typeof this.gameWorld.createSolarSystem === 'function') {
                    console.log("Creating solar system with progressive detail loading");
                    
                    // First create a minimal solar system for immediate visual feedback
                    this.createMinimalSolarSystem();
                    
                    // Then load the full solar system asynchronously
                    this.gameWorld.createSolarSystem({
                        lowDetail: isLowEndDevice,
                        progressiveLoading: true
                    }).then(() => {
                        console.log("Solar system created successfully");
                        
                        // Force a render to show the solar system
                        this.renderScene();
                        
                        // Log the number of planets created
                        if (this.gameWorld.planets) {
                            console.log(`Created ${this.gameWorld.planets.length} planets in the solar system`);
                            
                            // Find Earth and log its position
                            const earth = this.gameWorld.planets.find(planet => planet.name === "Earth");
                            if (earth) {
                                console.log("Earth position:", earth.position);
                                
                                // If we have a camera, point it at Earth
                                if (this.camera) {
                                    this.camera.position.set(
                                        earth.position.x + 0, 
                                        earth.position.y + 100, 
                                        earth.position.z + 300
                                    );
                                    this.camera.lookAt(earth.position);
                                    console.log("Camera positioned to view Earth");
                                    
                                    // Force another render with the new camera position
                                    this.renderScene();
                                }
                            }
                        }
                        
                        // RESTORED: Check if there are any motherships in the gameWorld
                        if (this.gameWorld.motherships && this.gameWorld.motherships.length > 0) {
                            this.mothership = this.gameWorld.motherships[0];
                            console.log("Mothership reference obtained");
                        }
                        
                        // RESTORED: Create the player's spacecraft
                        this.createPlayerSpacecraft();
                    }).catch(error => {
                        console.error("Error creating solar system:", error);
                        
                        // Even if solar system creation fails, try to create spacecraft
                        this.createPlayerSpacecraft();
                    });
                } else {
                    console.warn("GameWorld.createSolarSystem method not found, using fallback");
                    
                    // RESTORED: Create the player's spacecraft even without solar system
                    this.createPlayerSpacecraft();
                }
                
                console.log("Game world initialized");
            } catch (error) {
                console.error("Error creating game world:", error);
                
                // CRITICAL FIX: Create a minimal game world as fallback
                this.createMinimalGameWorld();
            }
        } catch (error) {
            console.error("Critical error in initGameWorld:", error);
            
            // CRITICAL FIX: Create a minimal game world as fallback
            this.createMinimalGameWorld();
        }
    }
    
    // CRITICAL FIX: Add a method to create a minimal game world as fallback
    createMinimalGameWorld() {
        console.warn("Creating minimal game world as fallback");
        
        try {
            // Ensure we have a scene
            if (!this.scene) {
                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x000000);
            }
            
            // Add a sun
            const sunGeometry = new THREE.SphereGeometry(100, 32, 32);
            const sunMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffff00,
                emissive: 0xffff00,
                emissiveIntensity: 1
            });
            const sun = new THREE.Mesh(sunGeometry, sunMaterial);
            sun.position.set(0, 0, 0);
            sun.name = "Sun";
            this.scene.add(sun);
            
            // Add Earth
            const earthGeometry = new THREE.SphereGeometry(50, 32, 32);
            const earthMaterial = new THREE.MeshBasicMaterial({ color: 0x0066ff });
            const earth = new THREE.Mesh(earthGeometry, earthMaterial);
            earth.position.set(500, 0, 0);
            earth.name = "Earth";
            this.scene.add(earth);
            
            // Add a light
            const light = new THREE.PointLight(0xffffff, 1, 2000);
            light.position.set(0, 0, 0);
            this.scene.add(light);
            
            // Position camera to see Earth
            if (this.camera) {
                this.camera.position.set(500, 200, 500);
                this.camera.lookAt(earth.position);
            }
            
            // Force a render
            this.renderScene();
            
            // Create a minimal game world structure
            if (!this.gameWorld) {
                console.log("Creating minimal GameWorld structure");
                this.gameWorld = {
                    scene: this.scene,
                    planets: [earth],
                    stars: [sun],
                    sectors: [],
                    motherships: [],
                    enemies: [],
                    addEntity: function(entity) {
                        console.log("Adding entity to minimal game world:", entity);
                        this.scene.add(entity.mesh || entity);
                    },
                    removeEntity: function(entity) {
                        console.log("Removing entity from minimal game world:", entity);
                        this.scene.remove(entity.mesh || entity);
                    },
                    update: function(deltaTime) {
                        // Minimal update function
                    }
                };
            }
            
            // Try to create the player's spacecraft
            try {
                this.createPlayerSpacecraft();
                console.log("Player spacecraft created in minimal game world");
            } catch (error) {
                console.error("Failed to create player spacecraft:", error);
                
                // Create a minimal spacecraft as fallback
                try {
                    console.log("Creating minimal spacecraft as fallback");
                    
                    // Create a simple spacecraft mesh
                    const spacecraftGeometry = new THREE.ConeGeometry(10, 30, 8);
                    const spacecraftMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    const spacecraftMesh = new THREE.Mesh(spacecraftGeometry, spacecraftMaterial);
                    
                    // Position it near Earth
                    spacecraftMesh.position.set(500, 0, 100);
                    spacecraftMesh.rotation.x = Math.PI / 2;
                    
                    // Add it to the scene
                    this.scene.add(spacecraftMesh);
                    
                    // Create a minimal spacecraft object
                    this.spacecraft = {
                        mesh: spacecraftMesh,
                        position: spacecraftMesh.position,
                        rotation: spacecraftMesh.rotation,
                        update: function(deltaTime) {
                            // Minimal update function
                        }
                    };
                    
                    console.log("Minimal spacecraft created successfully");
                } catch (spacecraftError) {
                    console.error("Failed to create even minimal spacecraft:", spacecraftError);
                }
            }
            
            console.log("Minimal game world created successfully");
        } catch (error) {
            console.error("Failed to create even minimal game world:", error);
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
                // Start near the mothership (slightly offset to be visible)
                startPosition = new THREE.Vector3().copy(mothership.position);
                startPosition.x += 50; // Offset to the side
                startPosition.y += 20; // Slightly above
                startPosition.z += 100; // In front of the mothership
                console.log(`Starting near mothership: ${startPosition.x}, ${startPosition.y}, ${startPosition.z}`);
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
            
            // Show a notification about the starting position
            if (this.uiManager) {
                const locationName = mothership ? "Mothership" : (earth ? "Earth" : "Unknown Location");
                this.uiManager.showNotification(`Starting near ${locationName}`, 'info', 5000);
                
                // Also show controls hint
                setTimeout(() => {
                    this.uiManager.showNotification("Press H to show controls", 'info', 5000);
                }, 6000);
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
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background-color: #000000 !important;
            }
            
            /* Ensure canvas is always visible */
            #game-canvas, canvas {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 9999 !important;
                display: block !important;
                background-color: #000000 !important;
                visibility: visible !important;
                opacity: 1 !important;
                transform: none !important;
            }
            
            /* Hide any potential overlays */
            div[id*="loading"], div[class*="loading"] {
                z-index: 5 !important;
                display: none !important;
            }
        `;
        
        // Add to document head
        document.head.appendChild(style);
        
        // CRITICAL FIX: Set up periodic check to ensure canvas remains visible
        this.canvasVisibilityInterval = setInterval(() => {
            this.ensureCanvasVisibility();
        }, 1000); // Check every second
    }
    
    // Add a new method to ensure canvas visibility
    ensureCanvasVisibility() {
        try {
            console.log("Checking canvas visibility...");
            
            // CRITICAL FIX: Check if document is ready
            if (document.readyState !== 'complete') {
                console.warn(`Document not ready (state: ${document.readyState}), deferring canvas check`);
                return false;
            }
            
            // CRITICAL FIX: Check if document and body exist
            if (!document || !document.body) {
                console.error("Document or body is null, cannot check canvas visibility");
                return false;
            }
            
            // Check if we have a canvas
            const canvas = document.getElementById('game-canvas');
            
            if (!canvas) {
                console.warn("No canvas found with id 'game-canvas', recreating");
                this.recreateCanvas();
                return false;
            }
            
            // Check if canvas is in the DOM
            let isInDOM = false;
            let node = canvas;
            
            while (node) {
                if (node === document.body) {
                    isInDOM = true;
                    break;
                }
                node = node.parentNode;
            }
            
            if (!isInDOM) {
                console.warn("Canvas exists but is not in the DOM, reattaching");
                try {
                    document.body.appendChild(canvas);
                } catch (e) {
                    console.error("Failed to reattach canvas:", e);
                    this.recreateCanvas();
                    return false;
                }
            }
            
            // Check if canvas is visible (has width and height)
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                console.warn("Canvas has zero width or height, fixing styles");
                
                // Fix canvas styles
                canvas.style.position = 'fixed';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.zIndex = '1000';
                canvas.style.display = 'block';
                
                // Update renderer size
                if (this.renderer) {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
                }
            }
            
            // Check if canvas is properly styled
            const computedStyle = window.getComputedStyle(canvas);
            
            if (computedStyle.display === 'none' || 
                computedStyle.visibility === 'hidden' || 
                computedStyle.opacity === '0') {
                
                console.warn("Canvas is hidden by CSS, fixing styles");
                
                // Fix canvas styles
                canvas.style.display = 'block';
                canvas.style.visibility = 'visible';
                canvas.style.opacity = '1';
                canvas.style.zIndex = '1000'; // Ensure it's on top
            }
            
            // Check if renderer is using this canvas
            if (this.renderer && this.renderer.domElement !== canvas) {
                console.warn("Renderer is not using the current canvas, recreating renderer");
                this.recreateCanvas();
                return false;
            }
            
            // Force a render to ensure content is visible
            if (this.scene && this.camera && this.renderer) {
                this.renderer.render(this.scene, this.camera);
            }
            
            console.log("Canvas visibility check completed successfully");
            return true;
        } catch (error) {
            console.error("Error in ensureCanvasVisibility:", error);
            
            // Try to recreate canvas as a last resort
            setTimeout(() => this.recreateCanvas(), 500);
            return false;
        }
    }
    
    // Add a method to recreate the canvas if it's missing
    recreateCanvas() {
        try {
            console.log("Attempting to recreate canvas...");
            
            // CRITICAL FIX: Check if document is fully loaded
            if (document.readyState !== 'complete') {
                console.warn(`Document not ready yet (state: ${document.readyState}), scheduling canvas recreation`);
                setTimeout(() => this.recreateCanvas(), 500);
                return false;
            }
            
            // CRITICAL FIX: Ensure document and body exist
            if (!document || !document.body) {
                console.error("Document or body is null, cannot create canvas");
                
                // Schedule a retry with exponential backoff
                const retryDelay = this.canvasRetryCount ? Math.min(2000, 100 * Math.pow(2, this.canvasRetryCount)) : 100;
                this.canvasRetryCount = (this.canvasRetryCount || 0) + 1;
                
                console.log(`Scheduling canvas recreation retry #${this.canvasRetryCount} in ${retryDelay}ms`);
                setTimeout(() => this.recreateCanvas(), retryDelay);
                return false;
            }
            
            // Reset retry count on successful attempt
            this.canvasRetryCount = 0;
            
            // CRITICAL FIX: Check if we already have a canvas with our ID
            const existingCanvas = document.getElementById('game-canvas');
            if (existingCanvas) {
                console.log("Found existing canvas, removing it first");
                try {
                    existingCanvas.parentNode.removeChild(existingCanvas);
                } catch (e) {
                    console.warn("Error removing existing canvas:", e);
                    // Continue anyway
                }
            }
            
            // Create a new canvas element
            const canvas = document.createElement('canvas');
            canvas.id = 'game-canvas';
            
            // CRITICAL FIX: Apply styles directly to ensure visibility
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.zIndex = '1000';
            canvas.style.backgroundColor = '#000000';
            canvas.style.display = 'block';
            
            // CRITICAL FIX: Ensure body exists again right before appending
            if (!document.body) {
                console.error("Document body disappeared, cannot append canvas");
                setTimeout(() => this.recreateCanvas(), 500);
                return false;
            }
            
            // Append the canvas to the document body
            try {
                document.body.appendChild(canvas);
                console.log("Canvas successfully appended to document body");
            } catch (e) {
                console.error("Error appending canvas to document body:", e);
                setTimeout(() => this.recreateCanvas(), 500);
                return false;
            }
            
            // Create a new renderer using this canvas
            try {
                if (this.renderer) {
                    // Dispose of the old renderer to prevent memory leaks
                    this.renderer.dispose();
                }
                
                this.renderer = new THREE.WebGLRenderer({
                    canvas: canvas,
                    antialias: window.innerWidth > 1200,
                    alpha: false,
                    precision: 'mediump',
                    powerPreference: 'high-performance',
                    stencil: false
                });
                
                // Configure renderer
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
                this.renderer.shadowMap.enabled = true;
                
                console.log("New WebGLRenderer created successfully");
                
                // Force a render to ensure everything is visible
                if (this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                    console.log("Initial render completed with new renderer");
                }
                
                return true;
            } catch (e) {
                console.error("Error creating WebGLRenderer:", e);
                return false;
            }
        } catch (error) {
            console.error("Critical error in recreateCanvas:", error);
            return false;
        }
    }

    // Add this new method after init()
    emergencyInitialization() {
        try {
            console.warn("EMERGENCY INITIALIZATION ACTIVATED");
            
            // Prevent multiple emergency initializations
            if (this.emergencyInitialized) {
                console.log("Emergency initialization already performed, skipping");
                return;
            }
            
            // CRITICAL FIX: Check if document is ready
            if (document.readyState === 'loading') {
                console.log("Document still loading during emergency init, waiting for DOMContentLoaded");
                
                document.addEventListener('DOMContentLoaded', () => {
                    console.log("DOMContentLoaded fired during emergency init, continuing");
                    this.performEmergencyInitialization();
                });
                
                // Set a timeout in case the event doesn't fire
                setTimeout(() => {
                    if (!this.emergencyInitialized) {
                        console.warn("DOMContentLoaded timeout in emergency mode, forcing initialization");
                        this.performEmergencyInitialization();
                    }
                }, 1000);
            } else {
                // Document already loaded, continue immediately
                console.log("Document already loaded during emergency init, continuing");
                this.performEmergencyInitialization();
            }
        } catch (error) {
            console.error("Critical error during emergency initialization:", error);
            
            // Last resort - try to show something on screen
            this.lastResortEmergencyDisplay();
        }
    }
    
    // CRITICAL FIX: Split emergency initialization into a separate method
    performEmergencyInitialization() {
        try {
            console.log("Performing emergency initialization");
            this.emergencyInitialized = true;
            
            // Force remove any loading screens
            this.forceRemoveAllLoadingScreens();
            
            // Create a new scene if it doesn't exist
            if (!this.scene) {
                console.log("Creating emergency scene");
                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x000000);
            }
            
            // Create a camera if it doesn't exist
            if (!this.camera) {
                console.log("Creating emergency camera");
                this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
                this.camera.position.set(0, 10, 30);
                this.camera.lookAt(0, 0, 0);
            }
            
            // Create a new canvas and renderer
            const canvas = document.createElement('canvas');
            canvas.id = 'emergency-canvas';
            
            // Apply styles directly to ensure visibility
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.zIndex = '2000'; // Higher than regular canvas
            canvas.style.backgroundColor = '#000000';
            canvas.style.display = 'block';
            
            // Append to document body if it exists
            if (document.body) {
                document.body.appendChild(canvas);
                console.log("Emergency canvas appended to document body");
            } else if (document.documentElement) {
                document.documentElement.appendChild(canvas);
                console.log("Emergency canvas appended to document element (fallback)");
            } else {
                console.error("Cannot append emergency canvas - no valid parent element");
            }
            
            // Create a new renderer
            try {
                if (this.renderer) {
                    this.renderer.dispose();
                }
                
                this.renderer = new THREE.WebGLRenderer({
                    canvas: canvas,
                    antialias: false, // Disable for performance
                    alpha: false,
                    precision: 'lowp', // Use low precision for performance
                    powerPreference: 'default'
                });
                
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(1); // Use lowest pixel ratio for performance
                console.log("Emergency renderer created");
            } catch (rendererError) {
                console.error("Failed to create WebGL renderer in emergency mode:", rendererError);
                
                // Try to show a message on the canvas using 2D context
                try {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = 'black';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = 'red';
                        ctx.font = '24px Arial';
                        ctx.fillText('EMERGENCY MODE - WebGL not available', 20, canvas.height / 2);
                    }
                } catch (ctxError) {
                    console.error("Failed to create 2D context:", ctxError);
                }
            }
            
            // Add a red sphere to show something is working
            const geometry = new THREE.SphereGeometry(5, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const sphere = new THREE.Mesh(geometry, material);
            this.scene.add(sphere);
            
            // Add a light
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(0, 1, 1);
            this.scene.add(light);
            
            // Add a message to the scene
            this.addEmergencyMessage("EMERGENCY MODE ACTIVATED", "Game is running in fallback mode. Please refresh the page.");
            
            // Start a simple animation loop if not already running
            if (!this.isRunning) {
                this.isRunning = true;
                
                const emergencyRender = () => {
                    if (!this.isRunning) return;
                    
                    // Rotate the sphere
                    if (sphere) {
                        sphere.rotation.x += 0.01;
                        sphere.rotation.y += 0.01;
                    }
        
        // Render the scene
                    if (this.renderer && this.scene && this.camera) {
                        try {
        this.renderer.render(this.scene, this.camera);
                        } catch (renderError) {
                            console.error("Error in emergency render:", renderError);
                        }
                    }
                    
                    requestAnimationFrame(emergencyRender);
                };
                
                emergencyRender();
                console.log("Emergency render loop started");
            }
            
            // Mark as initialized
            this.initialized = true;
            
            console.log("Emergency initialization completed");
        } catch (error) {
            console.error("Critical error during performEmergencyInitialization:", error);
            this.lastResortEmergencyDisplay();
        }
    }
    
    // CRITICAL FIX: Add a last resort method for emergency display
    lastResortEmergencyDisplay() {
        try {
            console.warn("Attempting last resort emergency display");
            
            // Check if document is available
            if (!document || !document.body) {
                console.error("Document or body not available for last resort display");
                return;
            }
            
            // Create a div element with a message
            const emergencyDiv = document.createElement('div');
            emergencyDiv.style.position = 'fixed';
            emergencyDiv.style.top = '0';
            emergencyDiv.style.left = '0';
            emergencyDiv.style.width = '100%';
            emergencyDiv.style.height = '100%';
            emergencyDiv.style.backgroundColor = '#000000';
            emergencyDiv.style.color = '#ff0000';
            emergencyDiv.style.fontFamily = 'Arial, sans-serif';
            emergencyDiv.style.fontSize = '24px';
            emergencyDiv.style.textAlign = 'center';
            emergencyDiv.style.paddingTop = '40vh';
            emergencyDiv.style.zIndex = '9999';
            
            emergencyDiv.innerHTML = `
                <div>CRITICAL ERROR</div>
                <div style="font-size: 18px; margin-top: 20px;">
                    The game encountered a critical error and cannot continue.<br>
                    Please refresh the page or try again later.
                </div>
            `;
            
            document.body.appendChild(emergencyDiv);
            console.log("Last resort emergency display created");
        } catch (error) {
            console.error("Even last resort display failed:", error);
        }
    }
    
    // Add a method to display emergency messages in the 3D scene
    addEmergencyMessage(title, message) {
        try {
            // Create a canvas for the message
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 256;
            const context = canvas.getContext('2d');
            
            // Fill background
            context.fillStyle = '#000000';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add border
            context.strokeStyle = '#ff0000';
            context.lineWidth = 8;
            context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
            
            // Add title
            context.fillStyle = '#ff0000';
            context.font = 'bold 36px Arial';
            context.textAlign = 'center';
            context.fillText(title, canvas.width / 2, 60);
            
            // Add message
            context.fillStyle = '#ffffff';
            context.font = '24px Arial';
            context.fillText(message, canvas.width / 2, 120);
            context.fillText("Please refresh the page.", canvas.width / 2, 160);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            
            // Create a plane to display the message
            const geometry = new THREE.PlaneGeometry(20, 10);
            const material = new THREE.MeshBasicMaterial({ 
                map: texture, 
                transparent: true,
                side: THREE.DoubleSide
            });
            
            const plane = new THREE.Mesh(geometry, material);
            plane.position.set(0, 10, -10);
            
            // Add to scene
            if (this.scene) {
                this.scene.add(plane);
                console.log("Emergency message added to scene");
            }
        } catch (error) {
            console.error("Error adding emergency message:", error);
        }
    }
    
    // PERFORMANCE: Add a method to create a minimal solar system for immediate feedback
    createMinimalSolarSystem() {
        try {
            console.log("Creating minimal solar system for immediate visual feedback");
            
            // Create a simple sun at the center
            const sunGeometry = new THREE.SphereGeometry(100, 16, 16); // Reduced segments
            const sunMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffff00,
                emissive: 0xffff00,
                emissiveIntensity: 1
            });
            const sun = new THREE.Mesh(sunGeometry, sunMaterial);
            sun.position.set(0, 0, 0);
            sun.name = "Sun";
            this.scene.add(sun);
            
            // Create a simple Earth
            const earthGeometry = new THREE.SphereGeometry(50, 16, 16); // Reduced segments
            const earthMaterial = new THREE.MeshBasicMaterial({ color: 0x0066ff });
            const earth = new THREE.Mesh(earthGeometry, earthMaterial);
            earth.position.set(500, 0, 0);
            earth.name = "Earth";
            this.scene.add(earth);
            
            // Add a simple light
            const light = new THREE.PointLight(0xffffff, 1, 2000);
            light.position.set(0, 0, 0);
            this.scene.add(light);
            
            // Position camera to see Earth
            if (this.camera) {
                this.camera.position.set(500, 200, 500);
                this.camera.lookAt(earth.position);
            }
            
            // Force a render
            this.renderScene();
            
            console.log("Minimal solar system created for immediate feedback");
        } catch (error) {
            console.error("Error creating minimal solar system:", error);
        }
    }

    // Add a notification method if it doesn't exist
    showNotification(message, type = "info", duration = 3000) {
        // Check if notification container exists
        let notificationContainer = document.getElementById('game-notifications');
        
        if (!notificationContainer) {
            // Create notification container
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'game-notifications';
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.bottom = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '1000';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.style.backgroundColor = type === 'error' ? 'rgba(255, 50, 50, 0.8)' : 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 15px';
        notification.style.marginTop = '10px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
        notification.style.borderLeft = type === 'error' ? '4px solid #ff3232' : '4px solid #00aaff';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.transition = 'all 0.3s ease';
        notification.style.opacity = '0';
        notification.textContent = message;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode === notificationContainer) {
                    notificationContainer.removeChild(notification);
                }
            }, 300);
        }, duration);
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

// Add this after the global emergency functions

// Add direct keyboard controls as a fallback
window.addEventListener('DOMContentLoaded', () => {
    console.log("Setting up direct keyboard controls");
    
    // Wait a bit to ensure the game is initialized
    setTimeout(() => {
        // Get the game instance
        const game = window.game;
        
        if (!game || !game.spacecraft) {
            console.error("Game or spacecraft not available for direct controls");
            return;
        }
        
        // Set up direct keyboard controls
        document.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            const spacecraft = game.spacecraft;
            const delta = 1/60; // Approximate delta time
            
            // Skip if spacecraft is not available
            if (!spacecraft) return;
            
            console.log(`Direct key press: ${key}`);
            
            switch (key) {
                case 'w': // Forward
                    spacecraft.accelerate(1, delta);
                    break;
                case 's': // Backward
                    spacecraft.accelerate(-0.5, delta);
                    break;
                case 'a': // Strafe left
                    spacecraft.strafe(-1, delta);
                    break;
                case 'd': // Strafe right
                    spacecraft.strafe(1, delta);
                    break;
                case 'v': // Toggle camera view
                    if (spacecraft.cycleCameraMode) {
                        spacecraft.cycleCameraMode();
                        console.log(`Camera mode switched to: ${spacecraft.cameraMode}`);
                    }
                    break;
                case 'c': // Toggle cockpit view
                    if (spacecraft.switchCameraMode) {
                        const newMode = spacecraft.cameraMode === 'cockpit' ? 'third-person' : 'cockpit';
                        spacecraft.switchCameraMode(newMode);
                    }
                    break;
                case 'f': // Toggle first-person view
                    if (spacecraft.switchCameraMode) {
                        const newMode = spacecraft.cameraMode === 'first-person' ? 'third-person' : 'first-person';
                        spacecraft.switchCameraMode(newMode);
                    }
                    break;
                case ' ': // Boost
                    spacecraft.boost(delta);
                    break;
                case 'shift': // Brake
                    spacecraft.brake(delta);
                    break;
                case 'arrowleft': // Rotate left
                    spacecraft.rotate('y', -1, delta);
                    break;
                case 'arrowright': // Rotate right
                    spacecraft.rotate('y', 1, delta);
                    break;
                case 'arrowup': // Pitch up
                    spacecraft.rotate('x', -1, delta);
                    break;
                case 'arrowdown': // Pitch down
                    spacecraft.rotate('x', 1, delta);
                    break;
                case 'q': // Roll left
                    spacecraft.rotate('z', -1, delta);
                    break;
                case 'e': // Roll right
                    spacecraft.rotate('z', 1, delta);
                    break;
            }
        });
        
        // Add mouse controls for aiming
        document.addEventListener('mousemove', (event) => {
            if (!game.spacecraft) return;
            
            // Only if pointer is locked
            if (document.pointerLockElement) {
                const sensitivity = 0.002;
                const delta = 1/60;
                
                if (event.movementX) {
                    game.spacecraft.rotate('y', -event.movementX * sensitivity, delta);
                }
                
                if (event.movementY) {
                    game.spacecraft.rotate('x', -event.movementY * sensitivity, delta);
                }
            }
        });
        
        // Add click for pointer lock
        document.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                document.body.requestPointerLock();
            }
        });
        
        console.log("Direct keyboard controls set up successfully");
    }, 2000); // Wait 2 seconds for game to initialize
}); 

// Add this after the direct keyboard controls

// Add a simple visible controls panel
window.addEventListener('DOMContentLoaded', () => {
    console.log("Setting up visible controls panel");
    
    // Wait a bit to ensure the game is initialized
    setTimeout(() => {
        // Create a controls panel
        const controlsPanel = document.createElement('div');
        controlsPanel.style.position = 'fixed';
        controlsPanel.style.bottom = '10px';
        controlsPanel.style.right = '10px';
        controlsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        controlsPanel.style.color = 'white';
        controlsPanel.style.padding = '10px';
        controlsPanel.style.borderRadius = '5px';
        controlsPanel.style.fontFamily = 'Arial, sans-serif';
        controlsPanel.style.fontSize = '14px';
        controlsPanel.style.zIndex = '1000';
        controlsPanel.style.maxWidth = '300px';
        
        // Add controls information
        controlsPanel.innerHTML = `
            <h3 style="margin-top: 0; color: #00aaff;">Spacecraft Controls</h3>
            <div style="margin-bottom: 10px;">
                <strong>Movement:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>W - Forward</li>
                    <li>S - Backward</li>
                    <li>A - Strafe Left</li>
                    <li>D - Strafe Right</li>
                    <li>Space - Boost</li>
                    <li>Shift - Brake</li>
                </ul>
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Camera:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>V - Cycle Camera Views</li>
                    <li>C - Toggle Cockpit View</li>
                    <li>F - Toggle First-Person</li>
                </ul>
            </div>
            <div>
                <strong>Rotation:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>Mouse - Aim</li>
                    <li>Arrow Keys - Rotate</li>
                    <li>Q/E - Roll Left/Right</li>
                </ul>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #aaaaaa;">
                Click anywhere to lock mouse pointer for controls
            </div>
        `;
        
        // Add to document
        document.body.appendChild(controlsPanel);
        
        console.log("Visible controls panel added");
    }, 1000); // Wait 1 second for game to initialize
}); 

// Add this after the visible controls panel

// Add a continuous key checker
window.addEventListener('DOMContentLoaded', () => {
    console.log("Setting up continuous key checker");
    
    // Wait a bit to ensure the game is initialized
    setTimeout(() => {
        // Get the game instance
        const game = window.game;
        
        if (!game) {
            console.error("Game not available for continuous key checker");
            return;
        }
        
        // Create a key state tracker
        const keyState = {};
        
        // Set up key listeners
        document.addEventListener('keydown', (event) => {
            keyState[event.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (event) => {
            keyState[event.key.toLowerCase()] = false;
        });
        
        // Set up continuous update loop
        const updateInterval = setInterval(() => {
            // Skip if game or spacecraft is not available
            if (!game || !game.spacecraft) {
                return;
            }
            
            const spacecraft = game.spacecraft;
            const delta = 1/60; // Approximate delta time
            
            // Handle movement
            if (keyState['w']) {
                spacecraft.accelerate(1, delta);
            }
            
            if (keyState['s']) {
                spacecraft.accelerate(-0.5, delta);
            }
            
            if (keyState['a']) {
                spacecraft.strafe(-1, delta);
            }
            
            if (keyState['d']) {
                spacecraft.strafe(1, delta);
            }
            
            // Handle rotation
            if (keyState['arrowleft']) {
                spacecraft.rotate('y', -1, delta);
            }
            
            if (keyState['arrowright']) {
                spacecraft.rotate('y', 1, delta);
            }
            
            if (keyState['arrowup']) {
                spacecraft.rotate('x', -1, delta);
            }
            
            if (keyState['arrowdown']) {
                spacecraft.rotate('x', 1, delta);
            }
            
            // Handle special actions
            if (keyState[' ']) { // Space
                spacecraft.boost(delta);
            }
            
            if (keyState['shift']) {
                spacecraft.brake(delta);
            }
            
            if (keyState['q']) {
                spacecraft.rotate('z', -1, delta);
            }
            
            if (keyState['e']) {
                spacecraft.rotate('z', 1, delta);
            }
        }, 16); // ~60fps
        
        // Store the interval for cleanup
        window.continuousKeyCheckerInterval = updateInterval;
        
        console.log("Continuous key checker set up successfully");
    }, 3000); // Wait 3 seconds for game to initialize
}); 

// Add this after the continuous key checker

// Add a direct control system that hooks into the game update loop
window.addEventListener('DOMContentLoaded', () => {
    console.log("Setting up direct control system in game loop");
    
    // Wait a bit to ensure the game is initialized
    setTimeout(() => {
        // Get the game instance
        const game = window.game;
        
        if (!game) {
            console.error("Game not available for direct control system");
            return;
        }
        
        // Create a key state tracker that will be used by the game loop
        window.directControlKeyState = {};
        
        // Set up key listeners
        document.addEventListener('keydown', (event) => {
            window.directControlKeyState[event.key.toLowerCase()] = true;
            console.log(`Key down: ${event.key.toLowerCase()}`);
        });
        
        document.addEventListener('keyup', (event) => {
            window.directControlKeyState[event.key.toLowerCase()] = false;
            console.log(`Key up: ${event.key.toLowerCase()}`);
        });
        
        // Override the game's update method to include our direct controls
        const originalUpdate = game.update;
        game.update = function(time, delta) {
            // First, apply our direct controls
            if (this.spacecraft && window.directControlKeyState) {
                const spacecraft = this.spacecraft;
                
                // Movement controls
                if (window.directControlKeyState['w']) {
                    spacecraft.accelerate(1, delta);
                    console.log("Moving forward");
                }
                
                if (window.directControlKeyState['s']) {
                    spacecraft.accelerate(-0.5, delta);
                    console.log("Moving backward");
                }
                
                if (window.directControlKeyState['a']) {
                    spacecraft.strafe(-1, delta);
                    console.log("Strafing left");
                }
                
                if (window.directControlKeyState['d']) {
                    spacecraft.strafe(1, delta);
                    console.log("Strafing right");
                }
                
                // Special actions
                if (window.directControlKeyState[' ']) {
                    spacecraft.boost(delta);
                    console.log("Boosting");
                }
                
                if (window.directControlKeyState['shift']) {
                    spacecraft.brake(delta);
                    console.log("Braking");
                }
                
                // Rotation controls
                if (window.directControlKeyState['arrowleft']) {
                    spacecraft.rotate('y', -1, delta);
                    console.log("Rotating left");
                }
                
                if (window.directControlKeyState['arrowright']) {
                    spacecraft.rotate('y', 1, delta);
                    console.log("Rotating right");
                }
                
                if (window.directControlKeyState['arrowup']) {
                    spacecraft.rotate('x', -1, delta);
                    console.log("Rotating up");
                }
                
                if (window.directControlKeyState['arrowdown']) {
                    spacecraft.rotate('x', 1, delta);
                    console.log("Rotating down");
                }
                
                if (window.directControlKeyState['q']) {
                    spacecraft.rotate('z', -1, delta);
                    console.log("Rolling left");
                }
                
                if (window.directControlKeyState['e']) {
                    spacecraft.rotate('z', 1, delta);
                    console.log("Rolling right");
                }
            }
            
            // Then call the original update method
            return originalUpdate.call(this, time, delta);
        };
        
        console.log("Direct control system in game loop set up successfully");
        
        // Add a notification to the user
        if (game.showNotification) {
            game.showNotification("Direct control system activated. Try using WASD to move the spacecraft.", "info", 5000);
        }
    }, 4000); // Wait 4 seconds for game to initialize
}); 

// Add this after the direct control system

// Add a navigation system to help explore the solar system
window.addEventListener('DOMContentLoaded', () => {
    console.log("Setting up navigation system");
    
    // Wait a bit to ensure the game is initialized
    setTimeout(() => {
        // Get the game instance
        const game = window.game;
        
        if (!game) {
            console.error("Game not available for navigation system");
            return;
        }
        
        // Create a navigation panel
        const navPanel = document.createElement('div');
        navPanel.style.position = 'fixed';
        navPanel.style.top = '10px';
        navPanel.style.left = '10px';
        navPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        navPanel.style.color = 'white';
        navPanel.style.padding = '10px';
        navPanel.style.borderRadius = '5px';
        navPanel.style.fontFamily = 'Arial, sans-serif';
        navPanel.style.fontSize = '14px';
        navPanel.style.zIndex = '1000';
        navPanel.style.maxWidth = '300px';
        
        // Add navigation information
        navPanel.innerHTML = `
            <h3 style="margin-top: 0; color: #00aaff;">Navigation System</h3>
            <div id="current-location">
                <strong>Current Location:</strong> <span id="location-value">Unknown</span>
            </div>
            <div id="coordinates" style="margin-top: 5px;">
                <strong>Coordinates:</strong> <span id="coordinates-value">0, 0, 0</span>
            </div>
            <div id="speed" style="margin-top: 5px;">
                <strong>Speed:</strong> <span id="speed-value">0</span>
            </div>
            <div id="nearest-object" style="margin-top: 5px;">
                <strong>Nearest Object:</strong> <span id="nearest-object-value">None</span>
            </div>
            <div id="planets-list" style="margin-top: 10px;">
                <strong>Solar System:</strong>
                <ul id="planets-list-items" style="margin: 5px 0; padding-left: 20px;">
                    <li>Loading planets...</li>
                </ul>
            </div>
            <div style="margin-top: 10px;">
                <button id="scan-button" style="background: #00aaff; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Scan Surroundings</button>
                <button id="goto-earth-button" style="background: #44cc44; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">Go to Earth</button>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(navPanel);
        
        // Add event listeners to buttons
        document.getElementById('scan-button').addEventListener('click', () => {
            if (game.scanSurroundings) {
                game.scanSurroundings();
            }
        });
        
        document.getElementById('goto-earth-button').addEventListener('click', () => {
            if (game.gameWorld && game.spacecraft) {
                // Find Earth
                const earth = game.gameWorld.planets.find(planet => planet.name === "Earth");
                if (earth) {
                    // Set spacecraft position near Earth
                    game.spacecraft.position.set(
                        earth.position.x + 200,
                        earth.position.y + 100,
                        earth.position.z + 200
                    );
                    
                    // Reset velocity
                    game.spacecraft.velocity.set(0, 0, 0);
                    
                    // Show notification
                    if (game.showNotification) {
                        game.showNotification("Teleported to Earth", "info", 3000);
                    }
                } else {
                    console.error("Earth not found in the game world");
                    if (game.showNotification) {
                        game.showNotification("Earth not found in the solar system", "error", 3000);
                    }
                }
            }
        });
        
        // Update navigation panel periodically
        const updateNavPanel = () => {
            if (!game || !game.spacecraft || !game.gameWorld) return;
            
            const spacecraft = game.spacecraft;
            const gameWorld = game.gameWorld;
            
            // Update coordinates
            const coords = spacecraft.position;
            document.getElementById('coordinates-value').textContent = 
                `${coords.x.toFixed(0)}, ${coords.y.toFixed(0)}, ${coords.z.toFixed(0)}`;
            
            // Update speed
            const speed = spacecraft.velocity.length();
            document.getElementById('speed-value').textContent = `${speed.toFixed(1)} units/s`;
            
            // Update current location
            let locationInfo = gameWorld.getSectorAt ? gameWorld.getSectorAt(coords) : { name: "Unknown" };
            document.getElementById('location-value').textContent = locationInfo.name || "Unknown";
            
            // Find nearest object
            let nearestObject = null;
            let nearestDistance = Infinity;
            
            // Check planets
            if (gameWorld.planets) {
                gameWorld.planets.forEach(planet => {
                    if (!planet || !planet.position) return;
                    
                    const distance = coords.distanceTo(planet.position);
                    if (distance < nearestDistance) {
                        nearestObject = planet;
                        nearestDistance = distance;
                    }
                });
            }
            
            // Update nearest object display
            if (nearestObject) {
                document.getElementById('nearest-object-value').textContent = 
                    `${nearestObject.name || "Unknown"} (${nearestDistance.toFixed(0)} units)`;
            } else {
                document.getElementById('nearest-object-value').textContent = "None";
            }
            
            // Update planets list
            if (gameWorld.planets && gameWorld.planets.length > 0) {
                const planetsList = document.getElementById('planets-list-items');
                
                // Only update if needed
                if (planetsList.innerHTML === '<li>Loading planets...</li>' || gameWorld.planets.length !== planetsList.children.length) {
                    planetsList.innerHTML = '';
                    
                    gameWorld.planets.forEach(planet => {
                        if (!planet || !planet.name) return;
                        
                        const listItem = document.createElement('li');
                        listItem.textContent = planet.name;
                        listItem.style.cursor = 'pointer';
                        listItem.style.color = '#00aaff';
                        
                        // Add click event to navigate to the planet
                        listItem.addEventListener('click', () => {
                            if (game.spacecraft) {
                                // Set spacecraft position near the planet
                                game.spacecraft.position.set(
                                    planet.position.x + 200,
                                    planet.position.y + 100,
                                    planet.position.z + 200
                                );
                                
                                // Reset velocity
                                game.spacecraft.velocity.set(0, 0, 0);
                                
                                // Show notification
                                if (game.showNotification) {
                                    game.showNotification(`Teleported to ${planet.name}`, "info", 3000);
                                }
                            }
                        });
                        
                        planetsList.appendChild(listItem);
                    });
                }
            }
        };
        
        // Update every second
        setInterval(updateNavPanel, 1000);
        
        console.log("Navigation system set up successfully");
        
        // Add a notification to the user
        if (game.showNotification) {
            game.showNotification("Navigation system activated. Use the panel to explore the solar system.", "info", 5000);
        }
    }, 5000); // Wait 5 seconds for game to initialize
}); 

// Add this at the end of the file, outside any functions

// Emergency navigation system - will run regardless of game initialization
setTimeout(() => {
    console.log("Setting up emergency navigation system");
    
    // Create a navigation panel
    const navPanel = document.createElement('div');
    navPanel.id = 'emergency-nav-panel';
    navPanel.style.position = 'fixed';
    navPanel.style.top = '10px';
    navPanel.style.left = '10px';
    navPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    navPanel.style.color = 'white';
    navPanel.style.padding = '15px';
    navPanel.style.borderRadius = '5px';
    navPanel.style.fontFamily = 'Arial, sans-serif';
    navPanel.style.fontSize = '14px';
    navPanel.style.zIndex = '10000';
    navPanel.style.maxWidth = '300px';
    navPanel.style.boxShadow = '0 0 20px rgba(0, 100, 255, 0.5)';
    navPanel.style.border = '1px solid #00aaff';
    
    // Add navigation information
    navPanel.innerHTML = `
        <h3 style="margin-top: 0; color: #00aaff; font-size: 18px;">Star Flight Navigation</h3>
        <div id="current-location" style="margin-top: 10px;">
            <strong>Current Location:</strong> <span id="location-value">Unknown</span>
        </div>
        <div id="coordinates" style="margin-top: 5px;">
            <strong>Coordinates:</strong> <span id="coordinates-value">0, 0, 0</span>
        </div>
        <div id="speed" style="margin-top: 5px;">
            <strong>Speed:</strong> <span id="speed-value">0</span>
        </div>
        <div id="nearest-object" style="margin-top: 5px;">
            <strong>Nearest Object:</strong> <span id="nearest-object-value">None</span>
        </div>
        <div id="planets-list" style="margin-top: 10px;">
            <strong>Solar System:</strong>
            <ul id="planets-list-items" style="margin: 5px 0; padding-left: 20px;">
                <li>Sun</li>
                <li>Mercury</li>
                <li>Venus</li>
                <li>Earth</li>
                <li>Mars</li>
                <li>Jupiter</li>
                <li>Saturn</li>
                <li>Uranus</li>
                <li>Neptune</li>
            </ul>
        </div>
        <div style="margin-top: 10px;">
            <button id="scan-button" style="background: #00aaff; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Scan Surroundings</button>
            <button id="goto-earth-button" style="background: #44cc44; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">Go to Earth</button>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(navPanel);
    
    // Make planet names clickable
    const planetItems = navPanel.querySelectorAll('#planets-list-items li');
    planetItems.forEach(item => {
        item.style.cursor = 'pointer';
        item.style.color = '#00aaff';
        item.addEventListener('click', () => {
            teleportToPlanet(item.textContent);
        });
    });
    
    // Add event listeners to buttons
    document.getElementById('scan-button').addEventListener('click', () => {
        scanSurroundings();
    });
    
    document.getElementById('goto-earth-button').addEventListener('click', () => {
        teleportToPlanet('Earth');
    });
    
    // Function to teleport to a planet
    function teleportToPlanet(planetName) {
        try {
            // Try to get the game instance
            const game = window.game;
            
            if (!game || !game.gameWorld || !game.spacecraft) {
                showEmergencyNotification(`Cannot teleport: Game not fully initialized`, 'error');
                return;
            }
            
            // Find the planet
            const planet = game.gameWorld.planets.find(p => p.name === planetName);
            
            if (planet) {
                // Set spacecraft position near the planet
                game.spacecraft.position.set(
                    planet.position.x + 200,
                    planet.position.y + 100,
                    planet.position.z + 200
                );
                
                // Reset velocity
                game.spacecraft.velocity.set(0, 0, 0);
                
                showEmergencyNotification(`Teleported to ${planetName}`, 'info');
            } else {
                showEmergencyNotification(`Planet ${planetName} not found`, 'error');
            }
        } catch (error) {
            console.error("Error teleporting to planet:", error);
            showEmergencyNotification("Error teleporting to planet", 'error');
        }
    }
    
    // Function to scan surroundings
    function scanSurroundings() {
        try {
            // Try to get the game instance
            const game = window.game;
            
            if (!game || !game.gameWorld || !game.spacecraft) {
                showEmergencyNotification(`Cannot scan: Game not fully initialized`, 'error');
                return;
            }
            
            const position = game.spacecraft.position;
            const scanRadius = 5000;
            
            console.log(`Scanning surroundings at position (${position.x.toFixed(0)}, ${position.y.toFixed(0)}, ${position.z.toFixed(0)})`);
            
            // Create a scan results container
            let scanResults = [];
            
            // Scan for planets
            if (game.gameWorld.planets) {
                game.gameWorld.planets.forEach(planet => {
                    if (!planet || !planet.position) return;
                    
                    const distance = position.distanceTo(planet.position);
                    scanResults.push({
                        type: 'planet',
                        name: planet.name || 'Unknown Planet',
                        distance: distance,
                        position: planet.position.clone(),
                        object: planet
                    });
                });
            }
            
            // Sort results by distance
            scanResults.sort((a, b) => a.distance - b.distance);
            
            // Display results
            if (scanResults.length > 0) {
                console.log(`Found ${scanResults.length} objects within ${scanRadius} units:`);
                
                let resultsHTML = `<div style="max-height: 300px; overflow-y: auto;">
                    <h3 style="margin-top: 0; color: #00aaff;">Scan Results</h3>
                    <p>Found ${scanResults.length} objects:</p>
                    <ul style="padding-left: 20px;">`;
                    
                scanResults.forEach(result => {
                    console.log(`- ${result.name} (${result.type}): ${result.distance.toFixed(0)} units away`);
                    
                    resultsHTML += `<li style="margin-bottom: 5px;">
                        <strong>${result.name}</strong> (${result.type})<br>
                        Distance: ${result.distance.toFixed(0)} units<br>
                        Position: (${result.position.x.toFixed(0)}, ${result.position.y.toFixed(0)}, ${result.position.z.toFixed(0)})
                        <button class="goto-button" data-name="${result.name}" style="background: #44cc44; border: none; color: white; padding: 2px 5px; border-radius: 3px; cursor: pointer; margin-left: 5px; font-size: 12px;">Go To</button>
                    </li>`;
                });
                
                resultsHTML += `</ul></div>`;
                
                // Create a modal to display results
                const modal = document.createElement('div');
                modal.style.position = 'fixed';
                modal.style.top = '50%';
                modal.style.left = '50%';
                modal.style.transform = 'translate(-50%, -50%)';
                modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                modal.style.color = 'white';
                modal.style.padding = '20px';
                modal.style.borderRadius = '10px';
                modal.style.zIndex = '20000';
                modal.style.maxWidth = '500px';
                modal.style.boxShadow = '0 0 20px rgba(0, 100, 255, 0.5)';
                
                modal.innerHTML = resultsHTML + `
                    <div style="text-align: center; margin-top: 15px;">
                        <button id="close-scan-modal" style="background: #ff5555; border: none; color: white; padding: 5px 15px; border-radius: 3px; cursor: pointer;">Close</button>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Add event listener to close button
                document.getElementById('close-scan-modal').addEventListener('click', () => {
                    document.body.removeChild(modal);
                });
                
                // Add event listeners to "Go To" buttons
                const gotoButtons = modal.querySelectorAll('.goto-button');
                gotoButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const objectName = button.getAttribute('data-name');
                        teleportToPlanet(objectName);
                        document.body.removeChild(modal);
                    });
                });
                
                showEmergencyNotification(`Scan complete. Found ${scanResults.length} objects.`, 'info');
            } else {
                console.log(`No objects found.`);
                showEmergencyNotification("Scan complete. No objects found.", 'info');
            }
        } catch (error) {
            console.error("Error scanning surroundings:", error);
            showEmergencyNotification("Error scanning surroundings", 'error');
        }
    }
    
    // Function to show notifications
    function showEmergencyNotification(message, type = 'info') {
        // Check if notification container exists
        let notificationContainer = document.getElementById('emergency-notifications');
        
        if (!notificationContainer) {
            // Create notification container
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'emergency-notifications';
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.bottom = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '10001';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.style.backgroundColor = type === 'error' ? 'rgba(255, 50, 50, 0.8)' : 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 15px';
        notification.style.marginTop = '10px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
        notification.style.borderLeft = type === 'error' ? '4px solid #ff3232' : '4px solid #00aaff';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.transition = 'all 0.3s ease';
        notification.style.opacity = '0';
        notification.textContent = message;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode === notificationContainer) {
                    notificationContainer.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Update navigation panel periodically
    function updateNavPanel() {
        try {
            // Try to get the game instance
            const game = window.game;
            
            if (!game || !game.spacecraft || !game.gameWorld) return;
            
            const spacecraft = game.spacecraft;
            const gameWorld = game.gameWorld;
            
            // Update coordinates
            const coords = spacecraft.position;
            document.getElementById('coordinates-value').textContent = 
                `${coords.x.toFixed(0)}, ${coords.y.toFixed(0)}, ${coords.z.toFixed(0)}`;
            
            // Update speed
            const speed = spacecraft.velocity.length();
            document.getElementById('speed-value').textContent = `${speed.toFixed(1)} units/s`;
            
            // Update current location
            let locationInfo = gameWorld.getSectorAt ? gameWorld.getSectorAt(coords) : { name: "Unknown" };
            document.getElementById('location-value').textContent = locationInfo.name || "Unknown";
            
            // Find nearest object
            let nearestObject = null;
            let nearestDistance = Infinity;
            
            // Check planets
            if (gameWorld.planets) {
                gameWorld.planets.forEach(planet => {
                    if (!planet || !planet.position) return;
                    
                    const distance = coords.distanceTo(planet.position);
                    if (distance < nearestDistance) {
                        nearestObject = planet;
                        nearestDistance = distance;
                    }
                });
            }
            
            // Update nearest object display
            if (nearestObject) {
                document.getElementById('nearest-object-value').textContent = 
                    `${nearestObject.name || "Unknown"} (${nearestDistance.toFixed(0)} units)`;
            } else {
                document.getElementById('nearest-object-value').textContent = "None";
            }
        } catch (error) {
            console.error("Error updating navigation panel:", error);
        }
    }
    
    // Update every second
    setInterval(updateNavPanel, 1000);
    
    // Show initial notification
    showEmergencyNotification("Emergency Navigation System activated", 'info');
    
}, 2000); // Wait 2 seconds before setting up

// Add this after the emergency navigation system code

// Create planets and objects directly
setTimeout(() => {
    console.log("Creating emergency solar system...");
    
    try {
        // Try to get the game instance
        const game = window.game;
        
        if (!game) {
            console.error("Game not available for creating emergency solar system");
            showEmergencyNotification("Cannot create solar system: Game not initialized", "error");
            return;
        }
        
        // Check if THREE is available
        if (typeof THREE === 'undefined') {
            console.error("THREE.js not available for creating emergency solar system");
            showEmergencyNotification("Cannot create solar system: THREE.js not available", "error");
            return;
        }
        
        // Create a minimal solar system if one doesn't exist
        if (!game.gameWorld || !game.gameWorld.planets || game.gameWorld.planets.length === 0) {
            console.log("No planets found, creating emergency solar system");
            
            // Create a scene if it doesn't exist
            if (!game.scene) {
                console.error("Scene not available for creating emergency solar system");
                showEmergencyNotification("Cannot create solar system: Scene not available", "error");
                return;
            }
            
            // Create a minimal solar system
            const createPlanet = (name, position, radius, color) => {
                // Create a simple sphere for the planet
                const geometry = new THREE.SphereGeometry(radius, 32, 32);
                const material = new THREE.MeshBasicMaterial({ color: color });
                const planet = new THREE.Mesh(geometry, material);
                planet.position.copy(position);
                planet.name = name;
                
                // Add to scene
                game.scene.add(planet);
                
                return planet;
            };
            
            // Initialize planets array if it doesn't exist
            if (!game.gameWorld) {
                game.gameWorld = {};
            }
            
            if (!game.gameWorld.planets) {
                game.gameWorld.planets = [];
            }
            
            // Create the Sun
            const sun = createPlanet("Sun", new THREE.Vector3(0, 0, 0), 300, 0xffff00);
            game.gameWorld.planets.push(sun);
            
            // Create planets
            const planets = [
                { name: "Mercury", distance: 600, radius: 30, color: 0xaaaaaa },
                { name: "Venus", distance: 800, radius: 60, color: 0xffcc88 },
                { name: "Earth", distance: 1000, radius: 70, color: 0x4444ff },
                { name: "Mars", distance: 1300, radius: 50, color: 0xff4444 },
                { name: "Jupiter", distance: 1800, radius: 150, color: 0xffaa44 },
                { name: "Saturn", distance: 2300, radius: 120, color: 0xdddd88 },
                { name: "Uranus", distance: 2700, radius: 90, color: 0x88ffff },
                { name: "Neptune", distance: 3000, radius: 85, color: 0x4444ff }
            ];
            
            planets.forEach(planetData => {
                // Calculate position based on distance from sun
                const angle = Math.random() * Math.PI * 2; // Random angle around the sun
                const x = Math.cos(angle) * planetData.distance;
                const z = Math.sin(angle) * planetData.distance;
                const position = new THREE.Vector3(x, 0, z);
                
                // Create the planet
                const planet = createPlanet(
                    planetData.name,
                    position,
                    planetData.radius,
                    planetData.color
                );
                
                game.gameWorld.planets.push(planet);
                console.log(`Created planet: ${planetData.name} at position ${x}, 0, ${z}`);
            });
            
            // Create Earth's moon
            const earth = game.gameWorld.planets.find(planet => planet.name === "Earth");
            if (earth) {
                const moonPosition = new THREE.Vector3(
                    earth.position.x + 100,
                    earth.position.y,
                    earth.position.z + 100
                );
                
                const moon = createPlanet("Moon", moonPosition, 20, 0xcccccc);
                game.gameWorld.planets.push(moon);
                console.log("Created Earth's moon");
            }
            
            // Create a mothership near Earth
            if (earth) {
                const mothershipPosition = new THREE.Vector3(
                    earth.position.x + 300,
                    earth.position.y + 100,
                    earth.position.z + 300
                );
                
                // Create a simple box for the mothership
                const geometry = new THREE.BoxGeometry(200, 50, 400);
                const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
                const mothership = new THREE.Mesh(geometry, material);
                mothership.position.copy(mothershipPosition);
                mothership.name = "Mothership";
                
                // Add to scene
                game.scene.add(mothership);
                
                // Initialize motherships array if it doesn't exist
                if (!game.gameWorld.motherships) {
                    game.gameWorld.motherships = [];
                }
                
                game.gameWorld.motherships.push(mothership);
                console.log("Created mothership near Earth");
            }
            
            // Create a wormhole
            const wormholePosition = new THREE.Vector3(2000, 0, 2000);
            const wormholeGeometry = new THREE.TorusGeometry(100, 30, 16, 100);
            const wormholeMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x8800ff,
                transparent: true,
                opacity: 0.7
            });
            const wormhole = new THREE.Mesh(wormholeGeometry, wormholeMaterial);
            wormhole.position.copy(wormholePosition);
            wormhole.name = "Wormhole";
            
            // Add to scene
            game.scene.add(wormhole);
            
            // Initialize anomalies array if it doesn't exist
            if (!game.gameWorld.anomalies) {
                game.gameWorld.anomalies = [];
            }
            
            game.gameWorld.anomalies.push(wormhole);
            console.log("Created wormhole");
            
            // Create an alien ship
            const alienPosition = new THREE.Vector3(-1500, 200, -1500);
            const alienGeometry = new THREE.ConeGeometry(50, 100, 8);
            const alienMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const alienShip = new THREE.Mesh(alienGeometry, alienMaterial);
            alienShip.position.copy(alienPosition);
            alienShip.name = "Alien Ship";
            
            // Add to scene
            game.scene.add(alienShip);
            
            // Initialize aliens array if it doesn't exist
            if (!game.gameWorld.aliens) {
                game.gameWorld.aliens = [];
            }
            
            game.gameWorld.aliens.push(alienShip);
            console.log("Created alien ship");
            
            showEmergencyNotification("Emergency solar system created", "info");
        } else {
            console.log("Solar system already exists with " + game.gameWorld.planets.length + " planets");
        }
        
        // Fix inverted controls if spacecraft exists
        if (game.spacecraft) {
            // Override the accelerate method to fix inverted controls
            const originalAccelerate = game.spacecraft.accelerate;
            
            game.spacecraft.accelerate = function(direction, delta) {
                // Invert the direction to fix the controls
                originalAccelerate.call(this, -direction, delta);
            };
            
            // Enhance thruster effects
            const originalUpdateEngineEffects = game.spacecraft.updateEngineEffects;
            
            game.spacecraft.updateEngineEffects = function(delta) {
                // Call the original method
                if (originalUpdateEngineEffects) {
                    originalUpdateEngineEffects.call(this, delta);
                }
                
                // Enhance thruster effects when boosting
                const speed = this.velocity.length();
                const enginePower = Math.min(1, speed / this.maxSpeed);
                
                // Make thrusters more visible
                if (this.leftEngineGlow && this.rightEngineGlow) {
                    // Increase opacity and scale based on speed
                    this.leftEngineGlow.material.opacity = 0.5 + enginePower * 0.5;
                    this.rightEngineGlow.material.opacity = 0.5 + enginePower * 0.5;
                    
                    // Make thrusters larger when moving fast
                    const engineScale = 1 + enginePower * 1.5;
                    this.leftEngineGlow.scale.set(engineScale, engineScale, 1 + enginePower * 3);
                    this.rightEngineGlow.scale.set(engineScale, engineScale, 1 + enginePower * 3);
                    
                    // Change color based on speed (from orange to blue for boost)
                    if (speed > this.maxSpeed * 0.7) {
                        this.leftEngineGlow.material.color.setHex(0x00aaff);
                        this.rightEngineGlow.material.color.setHex(0x00aaff);
                    } else {
                        this.leftEngineGlow.material.color.setHex(0xff7700);
                        this.rightEngineGlow.material.color.setHex(0xff7700);
                    }
                }
            };
            
            console.log("Fixed inverted controls and enhanced thruster effects");
            showEmergencyNotification("Controls fixed and thrusters enhanced", "info");
        } else {
            console.log("Spacecraft not available to fix controls");
        }
    } catch (error) {
        console.error("Error creating emergency solar system:", error);
        showEmergencyNotification("Error creating solar system", "error");
    }
}, 3000); // Wait 3 seconds before creating the solar system

// Add this after the emergency solar system creation code

// Enhance wormhole functionality
setTimeout(() => {
    console.log("Setting up enhanced wormhole functionality...");
    
    try {
        // Try to get the game instance
        const game = window.game;
        
        if (!game) {
            console.error("Game not available for enhancing wormhole functionality");
            return;
        }
        
        // Create sectors if they don't exist
        if (!game.gameWorld) {
            game.gameWorld = {};
        }
        
        if (!game.gameWorld.sectors) {
            game.gameWorld.sectors = [
                { name: "Solar System", position: new THREE.Vector3(0, 0, 0), difficulty: 1, radius: 3000, isPopulated: true },
                { name: "Alpha Centauri", position: new THREE.Vector3(5000, 0, 0), difficulty: 2, radius: 1500, isPopulated: false },
                { name: "Sirius System", position: new THREE.Vector3(0, 0, 5000), difficulty: 3, radius: 1800, isPopulated: false },
                { name: "Orion Nebula", position: new THREE.Vector3(5000, 0, 5000), difficulty: 4, radius: 2000, isPopulated: false }
            ];
            
            console.log("Created sectors for the game world");
        }
        
        // Add getSectorAt method if it doesn't exist
        if (!game.gameWorld.getSectorAt) {
            game.gameWorld.getSectorAt = function(position) {
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
            };
            
            console.log("Added getSectorAt method to game world");
        }
        
        // Create planets in other sectors
        game.gameWorld.sectors.forEach((sector, index) => {
            if (index === 0) return; // Skip Solar System, already populated
            
            if (!sector.isPopulated) {
                console.log(`Populating sector: ${sector.name}`);
                
                // Create planets in this sector
                const planetCount = 2 + Math.floor(Math.random() * 3); // 2-4 planets
                
                for (let i = 0; i < planetCount; i++) {
                    // Random position within sector
                    const radius = Math.random() * sector.radius * 0.8;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI;
                    
                    const x = sector.position.x + radius * Math.sin(phi) * Math.cos(theta);
                    const y = sector.position.y + radius * Math.sin(phi) * Math.sin(theta);
                    const z = sector.position.z + radius * Math.cos(phi);
                    
                    const position = new THREE.Vector3(x, y, z);
                    
                    // Random planet properties
                    const planetRadius = 30 + Math.random() * 100;
                    
                    // Random color based on sector
                    let color;
                    switch (index) {
                        case 1: // Alpha Centauri - reddish
                            color = 0xff8866;
                            break;
                        case 2: // Sirius - bluish
                            color = 0x66aaff;
                            break;
                        case 3: // Orion - greenish
                            color = 0x66ffaa;
                            break;
                        default:
                            color = 0xaaaaaa;
                    }
                    
                    // Create the planet
                    const planetGeometry = new THREE.SphereGeometry(planetRadius, 32, 32);
                    const planetMaterial = new THREE.MeshBasicMaterial({ color: color });
                    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
                    planet.position.copy(position);
                    planet.name = `${sector.name} Planet ${i+1}`;
                    
                    // Add to scene
                    game.scene.add(planet);
                    
                    // Add to planets array
                    if (!game.gameWorld.planets) {
                        game.gameWorld.planets = [];
                    }
                    
                    game.gameWorld.planets.push(planet);
                    console.log(`Created planet: ${planet.name} at position ${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)}`);
                }
                
                // Create a wormhole back to Solar System
                const wormholePosition = new THREE.Vector3(
                    sector.position.x + Math.random() * 500 - 250,
                    sector.position.y + Math.random() * 500 - 250,
                    sector.position.z + Math.random() * 500 - 250
                );
                
                const wormholeGeometry = new THREE.TorusGeometry(100, 30, 16, 100);
                const wormholeMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x8800ff,
                    transparent: true,
                    opacity: 0.7
                });
                const wormhole = new THREE.Mesh(wormholeGeometry, wormholeMaterial);
                wormhole.position.copy(wormholePosition);
                wormhole.name = `Wormhole to Solar System`;
                wormhole.userData = {
                    type: 'wormhole',
                    destination: new THREE.Vector3(0, 0, 0),
                    destinationName: 'Solar System'
                };
                
                // Add to scene
                game.scene.add(wormhole);
                
                // Add to anomalies array
                if (!game.gameWorld.anomalies) {
                    game.gameWorld.anomalies = [];
                }
                
                game.gameWorld.anomalies.push(wormhole);
                console.log(`Created wormhole back to Solar System in ${sector.name}`);
                
                // Mark sector as populated
                sector.isPopulated = true;
            }
        });
        
        // Update existing wormholes to have destinations
        if (game.gameWorld.anomalies) {
            game.gameWorld.anomalies.forEach(anomaly => {
                if (anomaly.name === "Wormhole" && !anomaly.userData?.destination) {
                    // Set destination to a random sector other than Solar System
                    const sectors = game.gameWorld.sectors.filter(s => s.name !== "Solar System");
                    const randomSector = sectors[Math.floor(Math.random() * sectors.length)];
                    
                    anomaly.userData = {
                        type: 'wormhole',
                        destination: randomSector.position.clone(),
                        destinationName: randomSector.name
                    };
                    
                    console.log(`Set wormhole destination to ${randomSector.name}`);
                }
            });
        }
        
        // Add wormhole travel functionality
        game.checkWormholeInteraction = function() {
            if (!this.spacecraft || !this.gameWorld || !this.gameWorld.anomalies) return;
            
            const spacecraft = this.spacecraft;
            
            // Check each wormhole
            this.gameWorld.anomalies.forEach(anomaly => {
                if (anomaly.userData && anomaly.userData.type === 'wormhole') {
                    const distance = spacecraft.position.distanceTo(anomaly.position);
                    
                    // If spacecraft is close to wormhole
                    if (distance < 150) {
                        console.log(`Spacecraft near wormhole to ${anomaly.userData.destinationName}`);
                        
                        // Show notification
                        showEmergencyNotification(`Press E to enter wormhole to ${anomaly.userData.destinationName}`, "info");
                        
                        // Check if E key is pressed
                        const handleWormholeKeyPress = (event) => {
                            if (event.key === 'e' || event.key === 'E') {
                                // Remove event listener
                                document.removeEventListener('keydown', handleWormholeKeyPress);
                                
                                // Travel through wormhole
                                this.travelThroughWormhole(anomaly);
                            }
                        };
                        
                        // Add event listener for E key
                        document.addEventListener('keydown', handleWormholeKeyPress);
                        
                        // Remove event listener after 5 seconds
                        setTimeout(() => {
                            document.removeEventListener('keydown', handleWormholeKeyPress);
                        }, 5000);
                    }
                }
            });
        };
        
        // Add wormhole travel method
        game.travelThroughWormhole = function(wormhole) {
            if (!this.spacecraft || !wormhole.userData || !wormhole.userData.destination) return;
            
            console.log(`Traveling through wormhole to ${wormhole.userData.destinationName}`);
            
            // Show wormhole travel effect
            this.showWormholeTravelEffect();
            
            // Teleport spacecraft to destination
            setTimeout(() => {
                // Add some random offset to avoid spawning inside objects
                const offset = new THREE.Vector3(
                    Math.random() * 200 - 100,
                    Math.random() * 200 - 100,
                    Math.random() * 200 - 100
                );
                
                this.spacecraft.position.copy(wormhole.userData.destination).add(offset);
                this.spacecraft.velocity.set(0, 0, 0); // Reset velocity
                
                showEmergencyNotification(`Arrived at ${wormhole.userData.destinationName}`, "info");
            }, 2000);
        };
        
        // Add wormhole travel effect
        game.showWormholeTravelEffect = function() {
            // Create a full-screen effect
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(136, 0, 255, 0)';
            overlay.style.zIndex = '9999';
            overlay.style.transition = 'background-color 1s ease-in-out';
            
            document.body.appendChild(overlay);
            
            // Fade in
            setTimeout(() => {
                overlay.style.backgroundColor = 'rgba(136, 0, 255, 0.8)';
            }, 10);
            
            // Show wormhole travel text
            const travelText = document.createElement('div');
            travelText.style.position = 'absolute';
            travelText.style.top = '50%';
            travelText.style.left = '50%';
            travelText.style.transform = 'translate(-50%, -50%)';
            travelText.style.color = 'white';
            travelText.style.fontSize = '24px';
            travelText.style.fontFamily = 'Arial, sans-serif';
            travelText.style.textAlign = 'center';
            travelText.innerHTML = 'Traveling through wormhole...<br>Please wait';
            
            overlay.appendChild(travelText);
            
            // Fade out and remove
            setTimeout(() => {
                overlay.style.backgroundColor = 'rgba(136, 0, 255, 0)';
                
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 1000);
            }, 1500);
        };
        
        // Add wormhole checking to update loop
        const originalUpdate = game.update;
        
        if (originalUpdate) {
            game.update = function(time, delta) {
                // Call original update
                originalUpdate.call(this, time, delta);
                
                // Check for wormhole interaction
                this.checkWormholeInteraction();
            };
        }
        
        console.log("Enhanced wormhole functionality set up successfully");
        showEmergencyNotification("Wormhole travel system activated", "info");
        
    } catch (error) {
        console.error("Error setting up enhanced wormhole functionality:", error);
    }
}, 5000); // Wait 5 seconds before setting up