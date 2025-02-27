/**
 * InputManager - Singleton class for managing keyboard and mouse input in the game.
 * 
 * This manager handles all input events, key bindings, and provides a consistent
 * interface for the rest of the game systems to check input states.
 */
export class InputManager {
    // Singleton instance
    static instance = null;
    
    /**
     * Get the singleton instance of InputManager
     * @returns {InputManager} The singleton instance
     */
    static getInstance() {
        if (!InputManager.instance) {
            InputManager.instance = new InputManager();
        }
        return InputManager.instance;
    }
    
    /**
     * Create a new InputManager
     * Private constructor - use InputManager.getInstance()
     */
    constructor() {
        if (InputManager.instance) {
            throw new Error("InputManager is a singleton. Use InputManager.getInstance() instead.");
        }
        
        // State tracking
        this.keys = {};           // Current state of all keys
        this.mouseButtons = {};   // Current state of mouse buttons
        this.mousePosition = { x: 0, y: 0 };  // Current mouse position
        this.mouseDelta = { x: 0, y: 0 };     // Mouse movement since last frame
        this.mouseWheel = 0;      // Wheel delta
        
        // Key bindings for actions (customizable)
        this.keyBindings = {
            // Movement
            moveForward: ['w', 'ArrowUp'],
            moveBackward: ['s', 'ArrowDown'],
            moveLeft: ['a', 'ArrowLeft'],
            moveRight: ['d', 'ArrowRight'],
            
            // Actions
            fire: ['Space', 'mouse0'], // Primary fire (spacebar or left mouse)
            altFire: ['mouse2'],       // Secondary fire (right mouse)
            boost: ['Shift'],          // Boost/sprint
            brake: ['b', 'x'],         // Brake/stop
            
            // UI Controls
            toggleMenu: ['Escape'],
            toggleMap: ['m'],
            
            // Weapon selection
            nextWeapon: ['e', 'wheel1'],
            prevWeapon: ['q', 'wheel-1'],
            
            // Custom action bindings (populated via registerKeyBinding)
            actions: {}
        };
        
        // Functions to call when keys are pressed/released
        this.keyCallbacks = {
            keydown: {},
            keyup: {}
        };
        
        // Init event listeners
        this.initEventListeners();
        
        console.log("InputManager initialized");
    }
    
    /**
     * Initialize all event listeners
     */
    initEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (event) => this.onKeyDown(event));
        window.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // Mouse events
        window.addEventListener('mousemove', (event) => this.onMouseMove(event));
        window.addEventListener('mousedown', (event) => this.onMouseDown(event));
        window.addEventListener('mouseup', (event) => this.onMouseUp(event));
        window.addEventListener('wheel', (event) => this.onMouseWheel(event));
        
        // Prevent default browser context menu
        window.addEventListener('contextmenu', (event) => event.preventDefault());
        
        // Handle focus loss (release all keys when window loses focus)
        window.addEventListener('blur', () => this.onBlur());
    }
    
    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyDown(event) {
        const key = event.key;
        
        // Don't handle repeated keydown events (when key is held)
        if (this.keys[key]) return;
        
        this.keys[key] = true;
        
        // Call any registered callbacks for this key
        if (this.keyCallbacks.keydown[key]) {
            this.keyCallbacks.keydown[key].forEach(callback => callback(event));
        }
        
        // Check if this key is bound to an action
        for (const action in this.keyBindings.actions) {
            if (this.keyBindings.actions[action] === key) {
                this.keyBindings.actions[action].callback(event);
                break;
            }
        }
        
        // Prevent default browser behavior for game keys
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            event.preventDefault();
        }
    }
    
    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyUp(event) {
        const key = event.key;
        this.keys[key] = false;
        
        // Call any registered callbacks for this key
        if (this.keyCallbacks.keyup[key]) {
            this.keyCallbacks.keyup[key].forEach(callback => callback(event));
        }
    }
    
    /**
     * Handle mousemove events
     * @param {MouseEvent} event - The mouse event
     */
    onMouseMove(event) {
        // Calculate delta from last position
        const deltaX = event.clientX - this.mousePosition.x;
        const deltaY = event.clientY - this.mousePosition.y;
        
        // Update current position
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
        
        // Update delta for this frame
        this.mouseDelta.x = deltaX;
        this.mouseDelta.y = deltaY;
    }
    
    /**
     * Handle mousedown events
     * @param {MouseEvent} event - The mouse event
     */
    onMouseDown(event) {
        this.mouseButtons[`mouse${event.button}`] = true;
        
        // Call any registered callbacks for this mouse button
        const key = `mouse${event.button}`;
        if (this.keyCallbacks.keydown[key]) {
            this.keyCallbacks.keydown[key].forEach(callback => callback(event));
        }
        
        // Check if this mouse button is bound to an action
        for (const action in this.keyBindings.actions) {
            if (this.keyBindings.actions[action] === key) {
                this.keyBindings.actions[action].callback(event);
                break;
            }
        }
    }
    
    /**
     * Handle mouseup events
     * @param {MouseEvent} event - The mouse event
     */
    onMouseUp(event) {
        this.mouseButtons[`mouse${event.button}`] = false;
        
        // Call any registered callbacks for this mouse button
        const key = `mouse${event.button}`;
        if (this.keyCallbacks.keyup[key]) {
            this.keyCallbacks.keyup[key].forEach(callback => callback(event));
        }
    }
    
    /**
     * Handle mouse wheel events
     * @param {WheelEvent} event - The wheel event
     */
    onMouseWheel(event) {
        this.mouseWheel = Math.sign(event.deltaY);
        
        // Call any registered callbacks for mouse wheel
        const key = `wheel${this.mouseWheel}`;
        if (this.keyCallbacks.keydown[key]) {
            this.keyCallbacks.keydown[key].forEach(callback => callback(event));
        }
        
        // Reset wheel value after a short delay
        setTimeout(() => {
            this.mouseWheel = 0;
        }, 50);
    }
    
    /**
     * Handle window blur (user tabs away, etc)
     */
    onBlur() {
        // Reset all input states
        this.keys = {};
        this.mouseButtons = {};
        this.mouseDelta = { x: 0, y: 0 };
        this.mouseWheel = 0;
    }
    
    /**
     * Register a keyboard or mouse callback
     * @param {string} eventType - 'keydown' or 'keyup'
     * @param {string} key - The key to bind to
     * @param {Function} callback - The function to call when key is pressed/released
     */
    registerCallback(eventType, key, callback) {
        if (!this.keyCallbacks[eventType]) {
            console.warn(`Invalid event type: ${eventType}`);
            return;
        }
        
        if (!this.keyCallbacks[eventType][key]) {
            this.keyCallbacks[eventType][key] = [];
        }
        
        this.keyCallbacks[eventType][key].push(callback);
    }
    
    /**
     * Register a key binding for a custom action
     * @param {string} key - The key to bind
     * @param {Function} callback - Function to call when key is pressed
     * @param {string} actionName - Optional name for the action
     */
    registerKeyBinding(key, callback, actionName = null) {
        const name = actionName || `action_${Object.keys(this.keyBindings.actions).length}`;
        
        this.keyBindings.actions[name] = {
            key: key,
            callback: callback
        };
        
        // Also register as a normal keydown callback
        this.registerCallback('keydown', key, callback);
        
        return name; // Return the action name for reference
    }
    
    /**
     * Unregister a key binding
     * @param {string} actionName - The name of the action to unbind
     */
    unregisterKeyBinding(actionName) {
        if (this.keyBindings.actions[actionName]) {
            delete this.keyBindings.actions[actionName];
        }
    }
    
    /**
     * Check if an action is currently active
     * @param {string} action - The action to check
     * @returns {boolean} Whether the action is active
     */
    isActionActive(action) {
        // Handle standard game actions
        if (this.keyBindings[action]) {
            // Check if any of the bound keys are pressed
            return this.keyBindings[action].some(key => {
                // Check if key is a mouse button
                if (key.startsWith('mouse')) {
                    return this.mouseButtons[key];
                }
                // Check if key is mouse wheel
                if (key.startsWith('wheel')) {
                    const direction = parseInt(key.substring(5));
                    return this.mouseWheel === direction;
                }
                // Otherwise it's a keyboard key
                return this.keys[key];
            });
        }
        
        return false;
    }
    
    /**
     * Get the current mouse position
     * @returns {Object} The current mouse position {x, y}
     */
    getMousePosition() {
        return { ...this.mousePosition };
    }
    
    /**
     * Get the mouse movement since last frame
     * @returns {Object} The mouse delta {x, y}
     */
    getMouseDelta() {
        const delta = { ...this.mouseDelta };
        // Reset delta after reading
        this.mouseDelta = { x: 0, y: 0 };
        return delta;
    }
    
    /**
     * Get the mouse wheel direction
     * @returns {number} Wheel direction (-1, 0, or 1)
     */
    getMouseWheel() {
        return this.mouseWheel;
    }
    
    /**
     * Check if a specific key is pressed
     * @param {string} key - The key to check
     * @returns {boolean} Whether the key is pressed
     */
    isKeyPressed(key) {
        return !!this.keys[key];
    }
    
    /**
     * Check if a mouse button is pressed
     * @param {number} button - The button to check (0 = left, 1 = middle, 2 = right)
     * @returns {boolean} Whether the button is pressed
     */
    isMouseButtonPressed(button) {
        return !!this.mouseButtons[`mouse${button}`];
    }
    
    /**
     * Clear all input states
     * Used when switching scenes or game states
     */
    clearInputState() {
        this.keys = {};
        this.mouseButtons = {};
        this.mouseDelta = { x: 0, y: 0 };
        this.mouseWheel = 0;
    }
} 