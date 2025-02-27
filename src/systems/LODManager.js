import * as THREE from 'three';

/**
 * Level-of-Detail (LOD) Manager
 * 
 * This system improves performance by managing different detail levels of objects
 * based on their distance from the camera. Objects farther away use simplified
 * versions or are completely culled to save resources.
 */
export class LODManager {
    /**
     * Create a new LOD Manager
     * @param {THREE.Camera} camera - The camera to measure distances from
     * @param {number} maxDistance - Maximum distance to render objects at any detail level
     */
    constructor(camera, maxDistance = 10000) {
        this.camera = camera;
        this.maxDistance = maxDistance;
        this.managedObjects = new Map(); // Map of objects being managed for LOD
        this.lastUpdateTime = 0;
        this.updateInterval = 0.5; // seconds between LOD updates
        this.timeSinceLastUpdate = 0;
        this.enabled = true;
        this.debugMode = false;
        
        // Define LOD thresholds as percentages of max distance
        this.lodThresholds = {
            high: 0.15,    // 0-15% of maxDistance gets high detail
            medium: 0.35,  // 15-35% of maxDistance gets medium detail
            low: 0.65,     // 35-65% of maxDistance gets low detail
            minimal: 1.0   // 65-100% of maxDistance gets minimal detail
        };
        
        console.log(`LOD Manager initialized with max distance: ${this.maxDistance}`);
    }
    
    /**
     * Register an object to be managed for LOD
     * @param {Object} object - The object to manage
     * @param {Object} lodLevels - Object containing functions to set different LOD levels
     */
    registerObject(object, lodLevels = {}) {
        if (!object || !object.position) {
            console.warn('Attempted to register an invalid object with LODManager');
            return;
        }
        
        // Default LOD level handlers if not provided
        const defaultLevels = {
            high: () => {
                if (object.setHighDetail) object.setHighDetail();
                else if (object.mesh) object.mesh.visible = true;
            },
            medium: () => {
                if (object.setMediumDetail) object.setMediumDetail();
                else if (object.mesh) object.mesh.visible = true;
            },
            low: () => {
                if (object.setLowDetail) object.setLowDetail();
                else if (object.mesh) object.mesh.visible = true;
            },
            minimal: () => {
                if (object.setMinimalDetail) object.setMinimalDetail();
                else if (object.mesh) object.mesh.visible = true;
            },
            none: () => {
                if (object.setNoDetail) object.setNoDetail();
                else if (object.mesh) object.mesh.visible = false;
            }
        };
        
        // Merge provided levels with defaults
        const levels = {
            high: lodLevels.high || defaultLevels.high,
            medium: lodLevels.medium || defaultLevels.medium,
            low: lodLevels.low || defaultLevels.low,
            minimal: lodLevels.minimal || defaultLevels.minimal,
            none: lodLevels.none || defaultLevels.none
        };
        
        // Store object with its LOD handlers
        this.managedObjects.set(object, {
            levels,
            currentLevel: 'high', // Start at high detail
            lastDistance: 0,
            enabled: true,
            update: lodLevels.update || null, // Custom update function if needed
            userData: {}
        });
        
        // Set initial LOD level
        this.updateObjectLOD(object);
    }
    
    /**
     * Unregister an object from LOD management
     * @param {Object} object - The object to unregister
     */
    unregisterObject(object) {
        // Reset the object to high detail before removing
        const data = this.managedObjects.get(object);
        if (data && data.levels.high) {
            data.levels.high();
        }
        
        this.managedObjects.delete(object);
    }
    
    /**
     * Unregister all objects from LOD management
     */
    unregisterAll() {
        // Reset all objects to high detail
        this.managedObjects.forEach((data, object) => {
            if (data.levels.high) {
                data.levels.high();
            }
        });
        
        this.managedObjects.clear();
    }
    
    /**
     * Enable or disable LOD management for a specific object
     * @param {Object} object - The object to enable/disable
     * @param {boolean} enabled - Whether LOD management should be enabled
     */
    setObjectEnabled(object, enabled) {
        const data = this.managedObjects.get(object);
        if (data) {
            data.enabled = enabled;
            
            // If disabling, set to high detail
            if (!enabled && data.levels.high) {
                data.levels.high();
            }
        }
    }
    
    /**
     * Enable or disable the entire LOD system
     * @param {boolean} enabled - Whether the system should be enabled
     */
    setEnabled(enabled) {
        if (this.enabled !== enabled) {
            this.enabled = enabled;
            
            // If disabling, reset all objects to high detail
            if (!enabled) {
                this.managedObjects.forEach((data, object) => {
                    if (data.levels.high) {
                        data.levels.high();
                    }
                });
            }
        }
    }
    
    /**
     * Update LOD levels based on distance to camera
     * @param {number} delta - Time elapsed since last frame
     */
    update(delta) {
        if (!this.enabled || !this.camera) return;
        
        // Only update LOD periodically to improve performance
        this.timeSinceLastUpdate += delta;
        if (this.timeSinceLastUpdate < this.updateInterval) return;
        
        // Update all managed objects
        this.managedObjects.forEach((data, object) => {
            if (data.enabled && object && object.position) {
                this.updateObjectLOD(object);
                
                // Call custom update function if provided
                if (data.update) {
                    data.update(object, data.currentLevel, delta);
                }
            }
        });
        
        this.timeSinceLastUpdate = 0;
        this.lastUpdateTime = performance.now();
    }
    
    /**
     * Update LOD level for a specific object based on distance
     * @param {Object} object - The object to update
     */
    updateObjectLOD(object) {
        if (!object || !object.position || !this.camera) return;
        
        const data = this.managedObjects.get(object);
        if (!data) return;
        
        // Calculate distance to camera
        const distanceToCamera = this.camera.position.distanceTo(object.position);
        
        // Store the last distance for reference
        data.lastDistance = distanceToCamera;
        
        // Determine appropriate LOD level
        const newLevel = this.determineLODLevel(distanceToCamera);
        
        // Only update if level changed
        if (newLevel !== data.currentLevel) {
            data.currentLevel = newLevel;
            
            // Apply the LOD level
            if (newLevel === 'none') {
                data.levels.none();
            } else if (data.levels[newLevel]) {
                data.levels[newLevel]();
            }
            
            // Debug output if enabled
            if (this.debugMode) {
                console.log(`Object LOD updated to ${newLevel} at distance ${distanceToCamera.toFixed(2)}`);
            }
        }
    }
    
    /**
     * Determine the appropriate LOD level based on distance
     * @param {number} distance - Distance to the camera
     * @returns {string} The LOD level to use
     */
    determineLODLevel(distance) {
        if (distance > this.maxDistance) {
            return 'none'; // Beyond rendering distance
        }
        
        // Calculate distance as a percentage of max distance
        const distanceRatio = distance / this.maxDistance;
        
        if (distanceRatio <= this.lodThresholds.high) {
            return 'high';
        } else if (distanceRatio <= this.lodThresholds.medium) {
            return 'medium';
        } else if (distanceRatio <= this.lodThresholds.low) {
            return 'low';
        } else {
            return 'minimal';
        }
    }
    
    /**
     * Set debug mode to visualize LOD levels
     * @param {boolean} enabled - Whether debug mode should be enabled
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
    
    /**
     * Draw debug visualization for LOD levels
     * Useful for debugging and visualizing LOD distances
     */
    debug() {
        if (!this.debugMode) return;
        
        // Display LOD statistics
        console.log('LOD Manager Statistics:');
        console.log(`Total managed objects: ${this.managedObjects.size}`);
        
        // Count objects at each LOD level
        const levelCounts = {
            high: 0,
            medium: 0,
            low: 0,
            minimal: 0,
            none: 0
        };
        
        this.managedObjects.forEach(data => {
            levelCounts[data.currentLevel]++;
        });
        
        console.log('Objects per LOD level:');
        console.log(`  High: ${levelCounts.high}`);
        console.log(`  Medium: ${levelCounts.medium}`);
        console.log(`  Low: ${levelCounts.low}`);
        console.log(`  Minimal: ${levelCounts.minimal}`);
        console.log(`  None (culled): ${levelCounts.none}`);
        
        // Could add visual debugging using scene objects here
        // For example, drawing spheres at the LOD threshold distances
    }
} 