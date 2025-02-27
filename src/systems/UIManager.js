import * as THREE from 'three';

export class UIManager {
    constructor(spacecraft, gameWorld) {
        try {
            // Initialize with safe defaults
            this.spacecraft = spacecraft || null;
            this.gameWorld = gameWorld || null;
            this.score = 0;
            this.elements = {};
            this.hudElements = {
                // Default empty properties to prevent "of undefined" errors
                notificationArea: null,
                healthBar: null,
                healthValue: null,
                shieldBar: null,
                shieldValue: null,
                energyBar: null,
                energyValue: null,
                speedValue: null,
                scoreValue: null,
                sectorName: null,
                sectorDifficulty: null,
                sectorInfo: null,
                planetCount: null,
                alienCount: null,
                minimapCanvas: null
            };
            this.isInitialized = false;
            this.currentSector = null;
            this.prevSector = null;
            this.onPlayerDeath = null; // Callback for death events
            this.isPausedState = false; // Add a paused state flag
            
            // Initialize UI
            this.initializeUI();
            
            console.log('UIManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize UIManager:', error);
            // Create fallback minimal UI
            this.createFallbackUI();
        }
    }
    
    createFallbackUI() {
        try {
            // Create minimal UI that won't crash the game
            this.container = document.createElement('div');
            this.container.className = 'game-ui fallback';
            document.body.appendChild(this.container);
            
            const errorMsg = document.createElement('div');
            errorMsg.className = 'ui-error-message';
            errorMsg.textContent = 'UI System Error - Limited Functionality';
            this.container.appendChild(errorMsg);
            
            // Ensure minimal required elements exist
            this.hudElements = {
                notificationArea: document.createElement('div')
            };
            this.hudElements.notificationArea.className = 'notification-area';
            this.container.appendChild(this.hudElements.notificationArea);
            
            this.isInitialized = true;
        } catch (e) {
            console.error('Even fallback UI failed to initialize:', e);
        }
    }
    
    initializeUI() {
        // Create main UI container
        this.container = document.createElement('div');
        this.container.className = 'game-ui';
        document.body.appendChild(this.container);
        
        // Create HUD container
        this.hudContainer = document.createElement('div');
        this.hudContainer.className = 'hud-container';
        this.container.appendChild(this.hudContainer);
        
        // Create elements
        this.createHUDElements();
        this.createSectorDisplay();
        this.createWeaponDisplay();
        this.createTargetingSystem();
        this.createNotificationSystem();
        this.createMinimap();
        this.createControlsPanel();
        this.createLocationPanel();
        
        // Add CSS styles
        this.addStyles();
        
        this.isInitialized = true;
    }
    
    createHUDElements() {
        // Health bar
        const healthBar = document.createElement('div');
        healthBar.className = 'hud-element health-bar';
        healthBar.innerHTML = `
            <div class="label">HULL</div>
            <div class="bar-bg">
                <div class="bar-fill"></div>
            </div>
            <div class="value">100%</div>
        `;
        this.hudContainer.appendChild(healthBar);
        this.hudElements.healthBar = healthBar.querySelector('.bar-fill');
        this.hudElements.healthValue = healthBar.querySelector('.value');
        
        // Shield bar
        const shieldBar = document.createElement('div');
        shieldBar.className = 'hud-element shield-bar';
        shieldBar.innerHTML = `
            <div class="label">SHIELD</div>
            <div class="bar-bg">
                <div class="bar-fill"></div>
            </div>
            <div class="value">100%</div>
        `;
        this.hudContainer.appendChild(shieldBar);
        this.hudElements.shieldBar = shieldBar.querySelector('.bar-fill');
        this.hudElements.shieldValue = shieldBar.querySelector('.value');
        
        // Energy bar
        const energyBar = document.createElement('div');
        energyBar.className = 'hud-element energy-bar';
        energyBar.innerHTML = `
            <div class="label">ENERGY</div>
            <div class="bar-bg">
                <div class="bar-fill"></div>
            </div>
            <div class="value">100%</div>
        `;
        this.hudContainer.appendChild(energyBar);
        this.hudElements.energyBar = energyBar.querySelector('.bar-fill');
        this.hudElements.energyValue = energyBar.querySelector('.value');
        
        // Speed indicator
        const speedIndicator = document.createElement('div');
        speedIndicator.className = 'hud-element speed-indicator';
        speedIndicator.innerHTML = `
            <div class="label">SPEED</div>
            <div class="value">0 km/s</div>
        `;
        this.hudContainer.appendChild(speedIndicator);
        this.hudElements.speedValue = speedIndicator.querySelector('.value');
        
        // Score display
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'hud-element score-display';
        scoreDisplay.innerHTML = `
            <div class="label">SCORE</div>
            <div class="value">0</div>
        `;
        this.hudContainer.appendChild(scoreDisplay);
        this.hudElements.scoreValue = scoreDisplay.querySelector('.value');
        
        // Position indicator
        const positionIndicator = document.createElement('div');
        positionIndicator.className = 'hud-element position-indicator';
        positionIndicator.innerHTML = `
            <div class="label">POSITION</div>
            <div class="value">X: 0 Y: 0 Z: 0</div>
        `;
        this.hudContainer.appendChild(positionIndicator);
        this.hudElements.positionValue = positionIndicator.querySelector('.value');
    }
    
    createSectorDisplay() {
        // Sector info panel
        const sectorPanel = document.createElement('div');
        sectorPanel.className = 'hud-panel sector-panel';
        sectorPanel.innerHTML = `
            <div class="panel-header">SECTOR INFORMATION</div>
            <div class="sector-name">UNKNOWN SECTOR</div>
            <div class="sector-details">
                <div class="detail-item">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value" id="sector-type">Unknown</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Danger Level:</span>
                    <span class="detail-value" id="sector-danger">Unknown</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Planets:</span>
                    <span class="detail-value" id="sector-planets">0</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Aliens:</span>
                    <span class="detail-value" id="sector-aliens">0</span>
                </div>
            </div>
        `;
        this.container.appendChild(sectorPanel);
        
        this.hudElements.sectorName = sectorPanel.querySelector('.sector-name');
        this.hudElements.sectorType = sectorPanel.querySelector('#sector-type');
        this.hudElements.sectorDanger = sectorPanel.querySelector('#sector-danger');
        this.hudElements.sectorPlanets = sectorPanel.querySelector('#sector-planets');
        this.hudElements.sectorAliens = sectorPanel.querySelector('#sector-aliens');
    }
    
    createWeaponDisplay() {
        // Weapon status panel
        const weaponPanel = document.createElement('div');
        weaponPanel.className = 'hud-panel weapon-panel';
        weaponPanel.innerHTML = `
            <div class="panel-header">WEAPONS</div>
            <div class="active-weapon">
                <div class="weapon-name">LASER CANNON</div>
                <div class="weapon-status">READY</div>
                <div class="weapon-energy">
                    <div class="label">Energy per shot:</div>
                    <div class="value">5</div>
                </div>
                <div class="weapon-damage">
                    <div class="label">Damage:</div>
                    <div class="value">10</div>
                </div>
            </div>
            <div class="weapon-cooldown">
                <div class="bar-bg">
                    <div class="bar-fill"></div>
                </div>
            </div>
            <div class="weapon-selector">
                <div class="weapon-slot selected" data-weapon="laser">1:LASER</div>
                <div class="weapon-slot" data-weapon="plasma">2:PLASMA</div>
                <div class="weapon-slot disabled" data-weapon="missile">3:MISSILE</div>
                <div class="weapon-slot disabled" data-weapon="railgun">4:RAILGUN</div>
            </div>
        `;
        this.container.appendChild(weaponPanel);
        
        this.hudElements.weaponName = weaponPanel.querySelector('.weapon-name');
        this.hudElements.weaponStatus = weaponPanel.querySelector('.weapon-status');
        this.hudElements.weaponEnergy = weaponPanel.querySelector('.weapon-energy .value');
        this.hudElements.weaponDamage = weaponPanel.querySelector('.weapon-damage .value');
        this.hudElements.weaponCooldown = weaponPanel.querySelector('.weapon-cooldown .bar-fill');
        this.hudElements.weaponSlots = weaponPanel.querySelectorAll('.weapon-slot');
    }
    
    createTargetingSystem() {
        // Targeting HUD
        const targetingHUD = document.createElement('div');
        targetingHUD.className = 'targeting-hud';
        targetingHUD.innerHTML = `
            <div class="targeting-reticle">
                <div class="reticle-element top"></div>
                <div class="reticle-element right"></div>
                <div class="reticle-element bottom"></div>
                <div class="reticle-element left"></div>
                <div class="reticle-center"></div>
            </div>
            <div class="target-info hidden">
                <div class="target-name">ENEMY FIGHTER</div>
                <div class="target-distance">DISTANCE: 1200m</div>
                <div class="target-health">
                    <div class="bar-bg">
                        <div class="bar-fill"></div>
                    </div>
                </div>
                <div class="target-lock-status">LOCKING...</div>
            </div>
        `;
        this.container.appendChild(targetingHUD);
        
        this.hudElements.targetingReticle = targetingHUD.querySelector('.targeting-reticle');
        this.hudElements.targetInfo = targetingHUD.querySelector('.target-info');
        this.hudElements.targetName = targetingHUD.querySelector('.target-name');
        this.hudElements.targetDistance = targetingHUD.querySelector('.target-distance');
        this.hudElements.targetHealth = targetingHUD.querySelector('.target-health .bar-fill');
        this.hudElements.targetLockStatus = targetingHUD.querySelector('.target-lock-status');
    }
    
    createNotificationSystem() {
        // Notification area
        const notificationArea = document.createElement('div');
        notificationArea.className = 'notification-area';
        this.container.appendChild(notificationArea);
        
        this.hudElements.notificationArea = notificationArea;
    }
    
    createMinimap() {
        // Minimap display
        const minimap = document.createElement('div');
        minimap.className = 'minimap';
        minimap.innerHTML = `
            <div class="minimap-header">SECTOR MAP</div>
            <div class="minimap-container">
                <canvas class="minimap-canvas"></canvas>
                <div class="player-indicator"></div>
            </div>
        `;
        this.container.appendChild(minimap);
        
        this.hudElements.minimapCanvas = minimap.querySelector('.minimap-canvas');
        this.hudElements.playerIndicator = minimap.querySelector('.player-indicator');
        
        // Set canvas size
        this.hudElements.minimapCanvas.width = 200;
        this.hudElements.minimapCanvas.height = 200;
        
        // Initialize minimap
        this.minimapContext = this.hudElements.minimapCanvas.getContext('2d');
    }
    
    createControlsPanel() {
        const controlsPanel = document.createElement('div');
        controlsPanel.className = 'controls-panel';
        controlsPanel.innerHTML = `
            <div class="panel-header">CONTROLS</div>
            <div class="controls-list">
                <div class="control-item">
                    <span class="key">W/A/S/D</span>
                    <span class="action">Move</span>
                </div>
                <div class="control-item">
                    <span class="key">MOUSE</span>
                    <span class="action">Aim</span>
                </div>
                <div class="control-item">
                    <span class="key">SPACE</span>
                    <span class="action">Boost</span>
                </div>
                <div class="control-item">
                    <span class="key">SHIFT</span>
                    <span class="action">Brake</span>
                </div>
                <div class="control-item">
                    <span class="key">V</span>
                    <span class="action">Cycle Camera</span>
                </div>
                <div class="control-item">
                    <span class="key">C</span>
                    <span class="action">Cockpit View</span>
                </div>
                <div class="control-item">
                    <span class="key">F</span>
                    <span class="action">First Person</span>
                </div>
                <div class="control-item">
                    <span class="key">Q/E</span>
                    <span class="action">Roll</span>
                </div>
                <div class="control-item">
                    <span class="key">CLICK</span>
                    <span class="action">Fire</span>
                </div>
            </div>
            <div class="toggle-controls">HIDE [H]</div>
        `;
        
        this.container.appendChild(controlsPanel);
        this.hudElements.controlsPanel = controlsPanel;
        
        // Add toggle functionality
        const toggleButton = controlsPanel.querySelector('.toggle-controls');
        toggleButton.addEventListener('click', () => {
            this.toggleControlsPanel();
        });
        
        // Initially hide the controls panel
        controlsPanel.classList.add('minimized');
    }
    
    toggleControlsPanel() {
        if (this.hudElements.controlsPanel) {
            this.hudElements.controlsPanel.classList.toggle('minimized');
            
            // Update toggle button text
            const toggleButton = this.hudElements.controlsPanel.querySelector('.toggle-controls');
            if (toggleButton) {
                toggleButton.textContent = this.hudElements.controlsPanel.classList.contains('minimized') 
                    ? 'SHOW [H]' 
                    : 'HIDE [H]';
            }
        }
    }
    
    createLocationPanel() {
        const locationPanel = document.createElement('div');
        locationPanel.className = 'location-panel';
        locationPanel.innerHTML = `
            <div class="panel-header">NAVIGATION</div>
            <div class="location-info">
                <div class="location-item">
                    <span class="label">SECTOR:</span>
                    <span class="value sector-name">Unknown</span>
                </div>
                <div class="location-item">
                    <span class="label">COORDINATES:</span>
                    <span class="value position-value">X: 0 Y: 0 Z: 0</span>
                </div>
                <div class="location-item">
                    <span class="label">SPEED:</span>
                    <span class="value speed-value">0 km/h</span>
                </div>
                <div class="location-item">
                    <span class="label">CAMERA:</span>
                    <span class="value camera-mode">Third Person</span>
                </div>
                <div class="location-item">
                    <span class="label">NEAREST:</span>
                    <span class="value nearest-object">None</span>
                </div>
            </div>
        `;
        
        this.container.appendChild(locationPanel);
        
        // Store references to elements
        this.hudElements.locationPanel = locationPanel;
        this.hudElements.sectorName = locationPanel.querySelector('.sector-name');
        this.hudElements.positionValue = locationPanel.querySelector('.position-value');
        this.hudElements.speedValue = locationPanel.querySelector('.speed-value');
        this.hudElements.cameraMode = locationPanel.querySelector('.camera-mode');
        this.hudElements.nearestObject = locationPanel.querySelector('.nearest-object');
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Existing styles */
            .game-ui {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                font-family: 'Courier New', monospace;
                color: #00ff00;
                text-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
                z-index: 1000;
            }
            
            .hud-container {
                position: relative;
                width: 100%;
                height: 100%;
            }
            
            .hud-element {
                position: absolute;
                pointer-events: auto;
            }
            
            /* New styles for controls panel */
            .controls-panel {
                position: absolute;
                top: 20px;
                right: 20px;
                background-color: rgba(0, 20, 40, 0.7);
                border: 1px solid #00ff00;
                border-radius: 5px;
                padding: 10px;
                width: 200px;
                transition: all 0.3s ease;
                pointer-events: auto;
                z-index: 1001;
            }
            
            .controls-panel.minimized {
                width: 40px;
                height: 20px;
                overflow: hidden;
            }
            
            .panel-header {
                font-weight: bold;
                text-align: center;
                margin-bottom: 10px;
                border-bottom: 1px solid #00ff00;
                padding-bottom: 5px;
            }
            
            .controls-list {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .control-item {
                display: flex;
                justify-content: space-between;
            }
            
            .key {
                background-color: rgba(0, 100, 0, 0.5);
                padding: 2px 5px;
                border-radius: 3px;
                font-weight: bold;
                min-width: 50px;
                text-align: center;
            }
            
            .toggle-controls {
                text-align: center;
                margin-top: 10px;
                cursor: pointer;
                font-size: 0.8em;
                padding: 3px;
                background-color: rgba(0, 50, 0, 0.5);
                border-radius: 3px;
            }
            
            /* Styles for location panel */
            .location-panel {
                position: absolute;
                bottom: 20px;
                left: 20px;
                background-color: rgba(0, 20, 40, 0.7);
                border: 1px solid #00ff00;
                border-radius: 5px;
                padding: 10px;
                width: 250px;
                pointer-events: auto;
            }
            
            .location-info {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .location-item {
                display: flex;
                justify-content: space-between;
            }
            
            .label {
                font-weight: bold;
            }
            
            /* Existing notification styles */
            .notification-area {
                position: absolute;
                top: 50px;
                left: 50%;
                transform: translateX(-50%);
                width: 80%;
                max-width: 600px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                pointer-events: none;
            }
            
            .notification {
                background-color: rgba(0, 20, 40, 0.7);
                border: 1px solid #00ff00;
                border-radius: 5px;
                padding: 10px 20px;
                text-align: center;
                animation: fadeIn 0.3s ease-in, fadeOut 0.3s ease-out 4.7s;
                pointer-events: none;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-20px); }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    updateHUD() {
        try {
            // Skip if not initialized
            if (!this.isInitialized || !this.spacecraft) return;
            
            // Update health
            if (this.hudElements.healthBar && this.hudElements.healthValue) {
                const healthPercent = (this.spacecraft.health / this.spacecraft.maxHealth) * 100;
                this.hudElements.healthBar.style.width = `${healthPercent}%`;
                this.hudElements.healthValue.textContent = `${Math.round(this.spacecraft.health)}/${this.spacecraft.maxHealth}`;
            }
            
            // Update shields
            if (this.hudElements.shieldBar && this.hudElements.shieldValue && this.spacecraft.shields !== undefined) {
                const shieldPercent = (this.spacecraft.shields / this.spacecraft.maxShields) * 100;
                this.hudElements.shieldBar.style.width = `${shieldPercent}%`;
                this.hudElements.shieldValue.textContent = `${Math.round(this.spacecraft.shields)}/${this.spacecraft.maxShields}`;
            }
            
            // Update energy
            if (this.hudElements.energyBar && this.hudElements.energyValue && this.spacecraft.energy !== undefined) {
                const energyPercent = (this.spacecraft.energy / this.spacecraft.maxEnergy) * 100;
                this.hudElements.energyBar.style.width = `${energyPercent}%`;
                this.hudElements.energyValue.textContent = `${Math.round(this.spacecraft.energy)}/${this.spacecraft.maxEnergy}`;
            }
            
            // Update speed
            if (this.hudElements.speedValue) {
                const speed = this.spacecraft.velocity ? this.spacecraft.velocity.length() : 0;
                this.hudElements.speedValue.textContent = `${Math.round(speed)} km/h`;
            }
            
            // Update position
            if (this.hudElements.positionValue && this.spacecraft.position) {
                const pos = this.spacecraft.position;
                this.hudElements.positionValue.textContent = `X: ${Math.round(pos.x)} Y: ${Math.round(pos.y)} Z: ${Math.round(pos.z)}`;
            }
            
            // Update camera mode
            if (this.hudElements.cameraMode && this.spacecraft.cameraMode) {
                // Format the camera mode for display (capitalize and replace hyphens with spaces)
                const formattedMode = this.spacecraft.cameraMode
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                this.hudElements.cameraMode.textContent = formattedMode;
            }
            
            // Update nearest object
            if (this.hudElements.nearestObject && this.gameWorld) {
                // Find the nearest object (planet, mothership, etc.)
                let nearestObject = this.findNearestObject();
                if (nearestObject) {
                    const distance = Math.round(nearestObject.distance);
                    this.hudElements.nearestObject.textContent = `${nearestObject.name} (${distance}m)`;
                } else {
                    this.hudElements.nearestObject.textContent = "None";
                }
            }
            
            // Update weapon status
            this.updateWeaponStatus();
        } catch (error) {
            console.error("Error updating HUD:", error);
        }
    }
    
    findNearestObject() {
        try {
            if (!this.spacecraft || !this.gameWorld) return null;
            
            const spacecraftPos = this.spacecraft.position;
            let nearestObject = null;
            let nearestDistance = Infinity;
            
            // Check planets
            if (this.gameWorld.planets) {
                for (const planet of this.gameWorld.planets) {
                    if (!planet || !planet.position) continue;
                    
                    const distance = spacecraftPos.distanceTo(planet.position);
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestObject = {
                            name: planet.name || "Unknown Planet",
                            distance: distance
                        };
                    }
                }
            }
            
            // Check motherships
            if (this.gameWorld.motherships) {
                for (const ship of this.gameWorld.motherships) {
                    if (!ship || !ship.position) continue;
                    
                    const distance = spacecraftPos.distanceTo(ship.position);
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestObject = {
                            name: "Mothership",
                            distance: distance
                        };
                    }
                }
            }
            
            return nearestObject;
        } catch (error) {
            console.error("Error finding nearest object:", error);
            return null;
        }
    }
    
    updateWeaponStatus() {
        if (!this.spacecraft.currentWeapon) return;
        
        const weapon = this.spacecraft.currentWeapon;
        this.hudElements.weaponName.textContent = weapon.name.toUpperCase();
        
        // Weapon cooldown
        if (this.spacecraft.weaponCooldowns && this.spacecraft.weaponCooldowns[weapon.type] > 0) {
            const cooldownPercent = (this.spacecraft.weaponCooldowns[weapon.type] / weapon.cooldown) * 100;
            this.hudElements.weaponCooldown.style.width = `${cooldownPercent}%`;
            this.hudElements.weaponStatus.textContent = 'COOLDOWN';
            this.hudElements.weaponStatus.classList.add('cooldown');
        } else {
            this.hudElements.weaponCooldown.style.width = '0%';
            this.hudElements.weaponStatus.textContent = 'READY';
            this.hudElements.weaponStatus.classList.remove('cooldown');
        }
        
        // Weapon info
        this.hudElements.weaponEnergy.textContent = weapon.energyCost;
        this.hudElements.weaponDamage.textContent = weapon.damage;
        
        // Update selected weapon indicator
        this.hudElements.weaponSlots.forEach(slot => {
            if (slot.dataset.weapon === weapon.type) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    }
    
    updateTargeting(combatSystem) {
        if (!combatSystem || !combatSystem.currentTarget) {
            this.hudElements.targetInfo.classList.add('hidden');
            return;
        }
        
        const targetInfo = combatSystem.getCurrentTargetInfo();
        if (!targetInfo) return;
        
        this.hudElements.targetInfo.classList.remove('hidden');
        
        // Update target info
        const target = targetInfo.target;
        this.hudElements.targetName.textContent = target.name || 'UNKNOWN TARGET';
        this.hudElements.targetDistance.textContent = `DISTANCE: ${Math.round(targetInfo.distance)}m`;
        
        // Update target health if available
        if (target.health !== undefined && target.maxHealth !== undefined) {
            const healthPercent = (target.health / target.maxHealth) * 100;
            this.hudElements.targetHealth.style.width = `${healthPercent}%`;
            
            // Change health bar color based on health
            if (healthPercent < 25) {
                this.hudElements.targetHealth.style.backgroundColor = '#ff3366'; // Red
            } else if (healthPercent < 50) {
                this.hudElements.targetHealth.style.backgroundColor = '#ff9500'; // Orange
            } else {
                this.hudElements.targetHealth.style.backgroundColor = '#00ff66'; // Green
            }
        }
        
        // Update lock status
        if (targetInfo.inRange) {
            this.hudElements.targetLockStatus.textContent = 'TARGET LOCKED';
            this.hudElements.targetLockStatus.classList.add('locked');
        } else {
            this.hudElements.targetLockStatus.textContent = 'TARGET OUT OF RANGE';
            this.hudElements.targetLockStatus.classList.remove('locked');
        }
    }
    
    updateSectorInfo(currentSector) {
        try {
            // Default values if something goes wrong
            let sectorName = "Unknown";
            let sectorDifficulty = 0;
            let planetCount = 0;
            let alienCount = 0;
            
            // Handle undefined or null sector
            if (!currentSector || !currentSector.sector) {
                sectorName = "Deep Space";
                
                // Set HUD with default values
                if (this.hudElements) {
                    if (this.hudElements.sectorName) this.hudElements.sectorName.textContent = sectorName;
                    if (this.hudElements.sectorDifficulty) this.hudElements.sectorDifficulty.textContent = "N/A";
                    if (this.hudElements.sectorPlanets) this.hudElements.sectorPlanets.textContent = planetCount;
                    if (this.hudElements.sectorAliens) this.hudElements.sectorAliens.textContent = alienCount;
                }
                return;
            }
            
            sectorName = currentSector.name || "Unknown Sector";
            sectorDifficulty = currentSector.sector.difficulty || 0;
            
            // Update HUD sector name
            if (this.hudElements && this.hudElements.sectorName) {
                this.hudElements.sectorName.textContent = sectorName;
            }
            
            // Update difficulty indicator (1-5 stars)
            if (this.hudElements && this.hudElements.sectorDifficulty) {
                this.hudElements.sectorDifficulty.textContent = "★".repeat(sectorDifficulty);
            }
            
            // Count objects in this sector - ULTRA SIMPLE version that avoids filter()
            if (this.gameWorld) {
                const sectorPos = (currentSector.sector && currentSector.sector.position) ? 
                    currentSector.sector.position : new THREE.Vector3(0, 0, 0);
                const sectorRadius = (currentSector.sector && typeof currentSector.sector.radius === 'number') ? 
                    currentSector.sector.radius : 1000;
                
                // Count planets - MANUAL counting to avoid filter()
                if (this.gameWorld.planets && Array.isArray(this.gameWorld.planets)) {
                    try {
                        planetCount = 0; // Reset counter
                        for (let i = 0; i < this.gameWorld.planets.length; i++) {
                            const planet = this.gameWorld.planets[i];
                            // Check if planet is valid
                            if (planet && planet.position) {
                                // Check if planet is in this sector
                                const dist = planet.position.distanceTo(sectorPos);
                                if (dist <= sectorRadius) {
                                    planetCount++;
                                }
                            }
                        }
                    } catch (err) {
                        console.warn("Error counting planets in sector:", err);
                    }
                }
                
                // Count aliens - check multiple possible arrays
                // This avoids using filter() completely
                try {
                    alienCount = 0; // Reset counter
                    
                    // Define the arrays to check (safely)
                    const arrayToCheck = [
                        this.gameWorld.aliens,
                        this.gameWorld.alienShips, 
                        this.gameWorld.enemies
                    ];
                    
                    // Loop through each possible array
                    for (let a = 0; a < arrayToCheck.length; a++) {
                        const aliens = arrayToCheck[a];
                        
                        // Skip if not an array
                        if (!aliens || !Array.isArray(aliens)) {
                            continue;
                        }
                        
                        // Loop through aliens in the array
                        for (let i = 0; i < aliens.length; i++) {
                            const alien = aliens[i];
                            
                            // Check if alien is valid
                            if (alien && alien.position) {
                                // Check if alien is in this sector
                                const dist = alien.position.distanceTo(sectorPos);
                                if (dist <= sectorRadius) {
                                    alienCount++;
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.warn("Error counting aliens in sector:", err);
                }
            }
            
            // Safely update HUD with counted objects
            if (this.hudElements) {
                if (this.hudElements.sectorPlanets) this.hudElements.sectorPlanets.textContent = planetCount;
                if (this.hudElements.sectorAliens) this.hudElements.sectorAliens.textContent = alienCount;
            }
            
            // Update minimap if it exists
            if (this.updateMinimap && typeof this.updateMinimap === 'function') {
                try {
                    this.updateMinimap();
                } catch (err) {
                    console.warn("Error updating minimap:", err);
                }
            }
        } catch (error) {
            console.warn("Error in updateSectorInfo:", error);
        }
    }
    
    updateMinimap() {
        try {
            // Guard clauses - return early if any required component is missing
            if (!this.minimapContext) {
                console.warn('UIManager: Cannot update minimap - context not available');
                return;
            }
            
            if (!this.currentSector) {
                console.warn('UIManager: Cannot update minimap - no current sector');
                return;
            }
            
            if (!this.currentSector.sector) {
                console.warn('UIManager: Cannot update minimap - current sector has no sector property');
                return;
            }
            
            if (!this.spacecraft) {
                console.warn('UIManager: Cannot update minimap - spacecraft not available');
                return;
            }
            
            if (!this.spacecraft.position) {
                console.warn('UIManager: Cannot update minimap - spacecraft has no position');
                return;
            }
            
            if (!this.hudElements || !this.hudElements.minimapCanvas) {
                console.warn('UIManager: Cannot update minimap - canvas not available');
                return;
            }
            
            // Safe local references
            const ctx = this.minimapContext;
            const canvas = this.hudElements.minimapCanvas;
            const width = canvas.width || 200;
            const height = canvas.height || 200;
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            // Get sector data safely
            const sectorRadius = this.currentSector.sector.radius || 1000;
            const sectorCenter = this.currentSector.sector.center || new THREE.Vector3(0, 0, 0);
            const sectorName = this.currentSector.name || "Unknown";
            
            // Set scale and center coordinates
            const scale = Math.min(width, height) / (sectorRadius * 2.2); // Scale with margin
            const centerX = width / 2;
            const centerY = height / 2;
            
            // Draw sector circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, sectorRadius * scale, 0, Math.PI * 2);
            ctx.strokeStyle = '#8af7ff';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw sector name
            ctx.fillStyle = '#8af7ff';
            try {
                ctx.font = '10px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText(sectorName.toUpperCase(), centerX, 15);
            } catch (fontError) {
                console.warn('UIManager: Font error in minimap', fontError);
                // Use a fallback font
                ctx.font = '10px sans-serif';
                ctx.fillText(sectorName.toUpperCase(), centerX, 15);
            }
            
            // Draw objects in this sector - planets
            if (this.gameWorld && this.gameWorld.planets) {
                // Safety check - ensure planets is an array
                const planets = Array.isArray(this.gameWorld.planets) ? this.gameWorld.planets : [];
                
                // Use for loop instead of forEach for better control
                for (let i = 0; i < planets.length; i++) {
                    const planet = planets[i];
                    
                    // Skip invalid planets
                    if (!planet || !planet.position) continue;
                    
                    try {
                        // Calculate distance safely
                        const distanceToPlanet = planet.position.distanceTo(sectorCenter);
                        
                        if (distanceToPlanet <= sectorRadius) {
                            const planetX = centerX + (planet.position.x - sectorCenter.x) * scale;
                            const planetY = centerY + (planet.position.z - sectorCenter.z) * scale;
                            
                            // Determine color based on planet type
                            let color = '#8af7ff';
                            if (planet.config && planet.config.type) {
                                switch(planet.config.type) {
                                    case 'earth': color = '#4488ff'; break;
                                    case 'desert': color = '#ffcc00'; break;
                                    case 'gas': color = '#ff9500'; break;
                                    case 'ice': color = '#aaddff'; break;
                                    case 'lava': color = '#ff3366'; break;
                                    case 'rocky': color = '#aaaaaa'; break;
                                }
                            }
                            
                            // Draw planet
                            ctx.beginPath();
                            ctx.arc(planetX, planetY, 5, 0, Math.PI * 2);
                            ctx.fillStyle = color;
                            ctx.fill();
                        }
                    } catch (planetError) {
                        console.warn('UIManager: Error drawing planet on minimap', planetError);
                        continue; // Skip to next planet
                    }
                }
            }
            
            // Draw alien ships - check multiple possible array names
            const alienArrays = [
                this.gameWorld && this.gameWorld.alienShips,
                this.gameWorld && this.gameWorld.aliens,
                this.gameWorld && this.gameWorld.enemies
            ];
            
            // Try each possible array name
            for (const alienArray of alienArrays) {
                if (!alienArray || !Array.isArray(alienArray)) continue;
                
                for (let i = 0; i < alienArray.length; i++) {
                    const alien = alienArray[i];
                    
                    // Skip invalid aliens
                    if (!alien || !alien.position) continue;
                    
                    try {
                        const distanceToAlien = alien.position.distanceTo(sectorCenter);
                        
                        if (distanceToAlien <= sectorRadius) {
                            const alienX = centerX + (alien.position.x - sectorCenter.x) * scale;
                            const alienY = centerY + (alien.position.z - sectorCenter.z) * scale;
                            
                            // Draw alien
                            ctx.beginPath();
                            ctx.moveTo(alienX, alienY - 3);
                            ctx.lineTo(alienX + 3, alienY + 3);
                            ctx.lineTo(alienX - 3, alienY + 3);
                            ctx.closePath();
                            ctx.fillStyle = '#ff3366';
                            ctx.fill();
                        }
                    } catch (alienError) {
                        console.warn('UIManager: Error drawing alien on minimap', alienError);
                        continue; // Skip to next alien
                    }
                }
            }
            
            // Draw player position - with safety checks
            try {
                if (this.spacecraft && this.spacecraft.position && sectorCenter) {
                    const playerRelativeX = this.spacecraft.position.x - sectorCenter.x;
                    const playerRelativeZ = this.spacecraft.position.z - sectorCenter.z;
                    
                    const playerX = centerX + playerRelativeX * scale;
                    const playerY = centerY + playerRelativeZ * scale;
                    
                    // Update player indicator if it exists
                    if (this.hudElements.playerIndicator) {
                        this.hudElements.playerIndicator.style.left = `${playerX}px`;
                        this.hudElements.playerIndicator.style.top = `${playerY}px`;
                    }
                }
            } catch (playerError) {
                console.warn('UIManager: Error drawing player on minimap', playerError);
            }
        } catch (error) {
            console.warn('UIManager: Critical error in updateMinimap', error);
            // Don't re-throw - minimap errors should not crash the game
        }
    }
    
    updateScore(points) {
        this.score += points;
        this.showNotification(`+${points} POINTS`, 'success');
    }
    
    showNotification(message, type = '', options = {}) {
        try {
            if (!message) {
                console.warn('UIManager: Attempted to show notification with empty message');
                return;
            }
            
            if (!this.hudElements || !this.hudElements.notificationArea) {
                console.warn('UIManager: Cannot show notification, notification area not initialized');
                return;
            }
            
            // Initialize notification queue if it doesn't exist
            if (!this.notificationQueue) {
                this.notificationQueue = [];
                this.isProcessingNotifications = false;
            }
            
            // Add notification to queue
            this.notificationQueue.push({
                message: message.toString(),
                type: type || '',
                duration: options.duration || 3000,
                priority: options.priority || 1  // Higher number = higher priority
            });
            
            // Sort queue by priority (higher priority first)
            this.notificationQueue.sort((a, b) => b.priority - a.priority);
            
            // Limit queue length to prevent memory issues
            if (this.notificationQueue.length > 10) {
                this.notificationQueue = this.notificationQueue.slice(0, 10);
            }
            
            // Start processing notifications if not already processing
            if (!this.isProcessingNotifications) {
                this.processNotificationQueue();
            }
        } catch (error) {
            console.warn('UIManager: Failed to queue notification', error);
        }
    }
    
    processNotificationQueue() {
        try {
            if (!this.notificationQueue || this.notificationQueue.length === 0) {
                this.isProcessingNotifications = false;
                return;
            }
            
            this.isProcessingNotifications = true;
            
            // Get next notification
            const next = this.notificationQueue.shift();
            
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification ${next.type}`;
            notification.textContent = next.message;
            
            // Check for duplicate notifications already on screen
            const existingNotifications = this.hudElements.notificationArea.querySelectorAll('.notification');
            let isDuplicate = false;
            
            existingNotifications.forEach(existing => {
                if (existing.textContent === next.message) {
                    // Reset the animation for the existing notification
                    existing.style.animation = 'none';
                    // Trigger reflow
                    void existing.offsetWidth;
                    // Restart the animation
                    existing.style.animation = `fadeOut ${next.duration/1000}s forwards`;
                    isDuplicate = true;
                }
            });
            
            if (!isDuplicate) {
                // Add new notification to DOM
                this.hudElements.notificationArea.appendChild(notification);
                
                // Set display duration
                notification.style.animationDuration = `${next.duration/1000}s`;
                
                // Remove after animation completes
                setTimeout(() => {
                    try {
                        if (notification && notification.parentNode) {
                            notification.remove();
                        }
                    } catch (e) {
                        console.warn('UIManager: Error removing notification', e);
                    }
                    
                    // Process next notification after a small delay
                    setTimeout(() => this.processNotificationQueue(), 250);
                }, next.duration);
            } else {
                // If it was a duplicate, process next notification after a small delay
                setTimeout(() => this.processNotificationQueue(), 250);
            }
        } catch (error) {
            console.warn('UIManager: Failed to process notification queue', error);
            // Continue processing queue even if there was an error
            setTimeout(() => this.processNotificationQueue(), 250);
        }
    }
    
    showRespawnMessage() {
        this.showNotification('SPACECRAFT RECONSTRUCTED', 'warning', { priority: 3 });
    }
    
    showDeathScreen() {
        const deathScreen = document.createElement('div');
        deathScreen.className = 'death-screen';
        deathScreen.innerHTML = `
            <div class="death-message">SPACECRAFT DESTROYED</div>
            <div class="death-score">FINAL SCORE: ${this.score.toLocaleString()}</div>
            <div class="respawn-message">RECONSTRUCTING... PLEASE WAIT</div>
            <div class="respawn-progress">
                <div class="bar-bg">
                    <div class="bar-fill"></div>
                </div>
            </div>
        `;
        
        this.container.appendChild(deathScreen);
        
        // Animate progress bar
        const progressBar = deathScreen.querySelector('.bar-fill');
        progressBar.style.transition = 'width 3s linear';
        
        setTimeout(() => {
            progressBar.style.width = '100%';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            deathScreen.remove();
            
            // Trigger respawn callback
            if (this.onPlayerDeath) {
                this.onPlayerDeath();
            }
        }, 3000);
    }
    
    update(delta, currentSector) {
        // ULTRA-SIMPLE approach - no complex operations that can cause errors
        try {
            // Update basic HUD for health, shield, energy
            if (this.spacecraft) {
                // Update health
                if (this.hudElements.healthBar && typeof this.spacecraft.health === 'number') {
                    const healthPercent = (this.spacecraft.health / this.spacecraft.maxHealth) * 100;
                    this.hudElements.healthBar.style.width = `${Math.max(0, Math.min(100, healthPercent))}%`;
                    
                    if (this.hudElements.healthValue) {
                        this.hudElements.healthValue.textContent = `${Math.round(this.spacecraft.health)}/${this.spacecraft.maxHealth}`;
                    }
                }
                
                // Update shield
                if (this.hudElements.shieldBar && typeof this.spacecraft.shield === 'number') {
                    const shieldPercent = (this.spacecraft.shield / this.spacecraft.maxShield) * 100;
                    this.hudElements.shieldBar.style.width = `${Math.max(0, Math.min(100, shieldPercent))}%`;
                    
                    if (this.hudElements.shieldValue) {
                        this.hudElements.shieldValue.textContent = `${Math.round(this.spacecraft.shield)}/${this.spacecraft.maxShield}`;
                    }
                }
                
                // Update energy
                if (this.hudElements.energyBar && typeof this.spacecraft.energy === 'number') {
                    const energyPercent = (this.spacecraft.energy / this.spacecraft.maxEnergy) * 100;
                    this.hudElements.energyBar.style.width = `${Math.max(0, Math.min(100, energyPercent))}%`;
                    
                    if (this.hudElements.energyValue) {
                        this.hudElements.energyValue.textContent = `${Math.round(this.spacecraft.energy)}/${this.spacecraft.maxEnergy}`;
                    }
                }
                
                // Update position if available
                if (this.hudElements.positionValue && this.spacecraft.position) {
                    const x = Math.round(this.spacecraft.position.x);
                    const y = Math.round(this.spacecraft.position.y);
                    const z = Math.round(this.spacecraft.position.z);
                    this.hudElements.positionValue.textContent = `X: ${x} Y: ${y} Z: ${z}`;
                }
            }
            
            // Very basic sector display with no object counting
            if (currentSector && this.hudElements.sectorName) {
                const name = currentSector.name || "Unknown Sector";
                this.hudElements.sectorName.textContent = name;
                
                // Store current sector for reference (safe way)
                if (this.currentSector !== currentSector) {
                    const prevName = this.currentSector ? (this.currentSector.name || "") : "";
                    const currentName = currentSector.name || "";
                    
                    if (prevName !== currentName) {
                        this.showNotification(`ENTERING ${currentName.toUpperCase()} SECTOR`);
                    }
                    
                    this.currentSector = currentSector;
                }
                
                // Update difficulty stars if available
                if (this.hudElements.sectorDifficulty && currentSector.difficulty) {
                    const difficulty = Math.max(0, Math.min(5, currentSector.difficulty));
                    this.hudElements.sectorDifficulty.textContent = "★".repeat(difficulty);
                }
                
                // Fixed placeholder values for sector objects - no counting
                if (this.hudElements.sectorPlanets) {
                    this.hudElements.sectorPlanets.textContent = "???";
                }
                
                if (this.hudElements.sectorAliens) {
                    this.hudElements.sectorAliens.textContent = "???";
                }
            }
            
            // Check for player death
            if (this.spacecraft && typeof this.spacecraft.health === 'number' && this.spacecraft.health <= 0) {
                this.showDeathScreen();
                // Reset health to prevent multiple death screens
                this.spacecraft.health = 0.1;
            }
            
        } catch (error) {
            // Never throw errors from UI
            console.warn("Simplified UI update error:", error);
        }
    }
    
    /**
     * Check if the game is paused
     * @returns {boolean} True if the game is paused
     */
    isPaused() {
        return this.isPausedState;
    }
    
    /**
     * Set the pause state of the game
     * @param {boolean} value - True to pause, false to unpause
     */
    setPaused(value) {
        this.isPausedState = value;
        // Update UI to reflect pause state
        if (value) {
            this.showPauseMenu();
        } else {
            this.hidePauseMenu();
        }
    }
    
    /**
     * Toggle the pause state of the game
     * @returns {boolean} New pause state
     */
    togglePause() {
        this.isPausedState = !this.isPausedState;
        // Update UI to reflect pause state
        if (this.isPausedState) {
            this.showPauseMenu();
        } else {
            this.hidePauseMenu();
        }
        return this.isPausedState;
    }
    
    /**
     * Show the pause menu
     */
    showPauseMenu() {
        // Create pause menu overlay if it doesn't exist
        if (!this.pauseMenu) {
            this.pauseMenu = document.createElement('div');
            this.pauseMenu.style.position = 'absolute';
            this.pauseMenu.style.width = '100%';
            this.pauseMenu.style.height = '100%';
            this.pauseMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            this.pauseMenu.style.display = 'flex';
            this.pauseMenu.style.flexDirection = 'column';
            this.pauseMenu.style.justifyContent = 'center';
            this.pauseMenu.style.alignItems = 'center';
            this.pauseMenu.style.zIndex = '1000';
            this.pauseMenu.style.color = 'white';
            this.pauseMenu.style.fontFamily = 'Arial, sans-serif';
            
            const pauseTitle = document.createElement('h1');
            pauseTitle.textContent = 'GAME PAUSED';
            pauseTitle.style.marginBottom = '20px';
            pauseTitle.style.fontSize = '48px';
            pauseTitle.style.textShadow = '0 0 10px rgba(0, 100, 255, 0.8)';
            
            const pauseMessage = document.createElement('p');
            pauseMessage.textContent = 'Press ESC to resume';
            pauseMessage.style.fontSize = '24px';
            pauseMessage.style.marginBottom = '30px';
            
            this.pauseMenu.appendChild(pauseTitle);
            this.pauseMenu.appendChild(pauseMessage);
            
            document.body.appendChild(this.pauseMenu);
        }
        
        // Show the pause menu
        this.pauseMenu.style.display = 'flex';
        console.log("Game paused");
    }
    
    /**
     * Hide the pause menu
     */
    hidePauseMenu() {
        // Hide the pause menu if it exists
        if (this.pauseMenu) {
            this.pauseMenu.style.display = 'none';
        }
        console.log("Game resumed");
    }
    
    // Method to set spacecraft reference after initialization
    setSpacecraft(spacecraft) {
        if (spacecraft) {
            this.spacecraft = spacecraft;
            console.log("UIManager: Spacecraft reference updated");
            this.updateHUD(); // Update HUD with new spacecraft data
        }
    }
} 