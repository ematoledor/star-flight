export class InputHandler {
    constructor(spacecraft) {
        this.spacecraft = spacecraft;
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            down: false,
            rightDown: false
        };
        
        // Track key press timestamps to prevent multiple triggers
        this.lastKeyPressTime = {};
        this.keyDebounceTime = 300; // ms
        
        // Flag to track if initialization is complete
        this.initialized = false;
        
        // Initialize input listeners with a slight delay to ensure DOM is ready
        setTimeout(() => this.initialize(), 500);
        
        console.log("InputHandler created, initializing with delay");
    }
    
    // New method to initialize all listeners
    initialize() {
        if (this.initialized) {
            console.log("InputHandler already initialized, skipping");
            return;
        }
        
        try {
            // Initialize input listeners
            this.initKeyboardListeners();
            this.initMouseListeners();
            
            // Lock pointer for FPS-style controls
            this.initPointerLock();
            
            this.initialized = true;
            console.log("InputHandler successfully initialized");
            
            // Force a diagnostic log of available keys
            this.logDiagnostics();
        } catch (error) {
            console.error("Error initializing InputHandler:", error);
        }
    }
    
    // New method to force reinitialization
    reinitialize() {
        console.log("Forcing InputHandler reinitialization");
        this.initialized = false;
        this.initialize();
    }
    
    // New diagnostic method
    logDiagnostics() {
        console.log("InputHandler diagnostics:");
        console.log("- Spacecraft reference:", this.spacecraft ? "Available" : "Missing");
        console.log("- Document ready state:", document.readyState);
        console.log("- Pointer lock available:", 'pointerLockElement' in document ? "Yes" : "No");
        
        // Test a key press
        const testKey = 'w';
        this.keys[testKey] = true;
        setTimeout(() => {
            console.log(`- Test key '${testKey}' registered:`, this.keys[testKey] ? "Yes" : "No");
            this.keys[testKey] = false;
        }, 100);
    }
    
    // Method to set spacecraft reference after initialization
    setSpacecraft(spacecraft) {
        if (spacecraft) {
            this.spacecraft = spacecraft;
            console.log("InputHandler: Spacecraft reference updated");
        }
    }
    
    initKeyboardListeners() {
        // Key down event
        document.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            
            // Only register the key press if it's not already pressed
            // or if enough time has passed since the last press (for toggle actions)
            const now = Date.now();
            if (!this.keys[key] || (now - (this.lastKeyPressTime[key] || 0) > this.keyDebounceTime)) {
                this.keys[key] = true;
                this.lastKeyPressTime[key] = now;
                
                // Handle special cases that should trigger immediately
                this.handleSpecialKeys(key);
            }
            
            // Handle special cases
            if (key === 'escape') {
                this.toggleMenu();
            }
        });
        
        // Key up event
        document.addEventListener('keyup', (event) => {
            this.keys[event.key.toLowerCase()] = false;
        });
    }
    
    // Handle special key presses that should trigger once per press
    handleSpecialKeys(key) {
        // Skip if spacecraft is not available
        if (!this.spacecraft) return;
        
        switch (key) {
            case 'v': // Toggle camera view
                if (this.spacecraft.cycleCameraMode) {
                    this.spacecraft.cycleCameraMode();
                    console.log(`Camera mode switched to: ${this.spacecraft.cameraMode}`);
                }
                break;
                
            case 'c': // Toggle cockpit view specifically
                if (this.spacecraft.switchCameraMode) {
                    const newMode = this.spacecraft.cameraMode === 'cockpit' ? 'third-person' : 'cockpit';
                    this.spacecraft.switchCameraMode(newMode);
                }
                break;
                
            case 'f': // Toggle first-person view specifically
                if (this.spacecraft.switchCameraMode) {
                    const newMode = this.spacecraft.cameraMode === 'first-person' ? 'third-person' : 'first-person';
                    this.spacecraft.switchCameraMode(newMode);
                }
                break;
                
            case 'h': // Toggle controls panel
                this.toggleControlsPanel();
                break;
        }
    }
    
    // Toggle controls panel visibility
    toggleControlsPanel() {
        // Find the UI manager in the global scope
        const uiManager = window.game && window.game.uiManager;
        
        // Toggle controls panel if UI manager is available
        if (uiManager && typeof uiManager.toggleControlsPanel === 'function') {
            uiManager.toggleControlsPanel();
        } else {
            console.warn("UI Manager not found, cannot toggle controls panel");
        }
    }
    
    initMouseListeners() {
        // Mouse move event
        document.addEventListener('mousemove', (event) => {
            // If we're using pointer lock (preferred for this type of game)
            if (document.pointerLockElement) {
                this.mouse.x += event.movementX;
                this.mouse.y += event.movementY;
            } else {
                this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            }
        });
        
        // Mouse down events
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left click
                this.mouse.down = true;
            } else if (event.button === 2) { // Right click
                this.mouse.rightDown = true;
            }
        });
        
        // Mouse up events
        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) { // Left click
                this.mouse.down = false;
            } else if (event.button === 2) { // Right click
                this.mouse.rightDown = false;
            }
        });
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    initPointerLock() {
        // Request pointer lock when clicking on the canvas
        document.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                document.body.requestPointerLock();
            }
        });
        
        // Reset mouse position when pointer lock changes
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement) {
                this.mouse.x = 0;
                this.mouse.y = 0;
            }
        });
    }
    
    update() {
        // Calculate the time since the last frame
        const delta = 1/60; // Approximation, should use actual delta time
        
        // Handle movement
        this.handleMovement(delta);
        
        // Handle rotation (aiming)
        this.handleRotation(delta);
        
        // Handle weapons
        this.handleWeapons();
        
        // Reset mouse movement delta after it's been processed
        if (document.pointerLockElement) {
            this.mouse.x = 0;
            this.mouse.y = 0;
        }
    }
    
    handleMovement(delta) {
        // Forward/backward
        if (this.keys['w']) {
            this.spacecraft.accelerate(1, delta);
        } else if (this.keys['s']) {
            this.spacecraft.accelerate(-0.5, delta); // Slower backward movement
        }
        
        // Strafing left/right
        if (this.keys['a']) {
            this.spacecraft.strafe(-1, delta);
        } else if (this.keys['d']) {
            this.spacecraft.strafe(1, delta);
        }
        
        // Braking
        if (this.keys['shift']) {
            this.spacecraft.brake(delta);
        }
        
        // Boost
        if (this.keys[' ']) { // Space bar
            this.spacecraft.boost(delta);
        }
    }
    
    handleRotation(delta) {
        // Using mouse for rotation
        if (document.pointerLockElement) {
            // Convert mouse movement to rotation
            // This uses a simplified approach - may need tuning
            const sensitivity = 0.002;
            
            if (this.mouse.x !== 0) {
                this.spacecraft.rotate('y', -this.mouse.x * sensitivity, delta);
            }
            
            if (this.mouse.y !== 0) {
                this.spacecraft.rotate('x', -this.mouse.y * sensitivity, delta);
            }
        }
        
        // Optional keyboard rotation controls
        if (this.keys['arrowleft']) {
            this.spacecraft.rotate('y', -1, delta);
        } else if (this.keys['arrowright']) {
            this.spacecraft.rotate('y', 1, delta);
        }
        
        if (this.keys['arrowup']) {
            this.spacecraft.rotate('x', -1, delta);
        } else if (this.keys['arrowdown']) {
            this.spacecraft.rotate('x', 1, delta);
        }
        
        // Roll controls
        if (this.keys['q']) {
            this.spacecraft.rotate('z', -1, delta);
        } else if (this.keys['e']) {
            this.spacecraft.rotate('z', 1, delta);
        }
    }
    
    handleWeapons() {
        // Primary weapon (left mouse button)
        if (this.mouse.down) {
            this.spacecraft.firePrimary();
        }
        
        // Secondary weapon (right mouse button)
        if (this.mouse.rightDown) {
            this.spacecraft.fireSecondary();
        }
    }
    
    toggleMenu() {
        // TODO: Implement menu toggle logic
        console.log('Menu toggled');
    }
} 