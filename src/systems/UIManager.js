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
    
    addStyles() {
        // Add CSS styles programmatically
        const style = document.createElement('style');
        style.textContent = `
            /* General UI styles */
            .game-ui {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                font-family: 'Orbitron', sans-serif;
                color: #8af7ff;
                text-shadow: 0 0 5px rgba(138, 247, 255, 0.7);
                user-select: none;
            }
            
            /* HUD Container */
            .hud-container {
                position: absolute;
                top: 20px;
                left: 20px;
                width: 300px;
            }
            
            /* HUD Elements */
            .hud-element {
                background-color: rgba(0, 20, 40, 0.7);
                border: 1px solid #8af7ff;
                border-radius: 5px;
                padding: 10px;
                margin-bottom: 10px;
                box-shadow: 0 0 10px rgba(0, 100, 200, 0.5);
            }
            
            .hud-element .label {
                font-size: 12px;
                margin-bottom: 5px;
                opacity: 0.8;
            }
            
            .hud-element .value {
                font-size: 16px;
                font-weight: bold;
            }
            
            .bar-bg {
                width: 100%;
                height: 8px;
                background-color: rgba(0, 0, 0, 0.5);
                border-radius: 4px;
                overflow: hidden;
                margin: 5px 0;
            }
            
            .bar-fill {
                height: 100%;
                width: 100%;
                border-radius: 4px;
                transition: width 0.3s ease, background-color 0.3s ease;
            }
            
            .health-bar .bar-fill {
                background-color: #00ff66;
            }
            
            .shield-bar .bar-fill {
                background-color: #4488ff;
            }
            
            .energy-bar .bar-fill {
                background-color: #ffcc00;
            }
            
            /* Panels */
            .hud-panel {
                background-color: rgba(0, 20, 40, 0.7);
                border: 1px solid #8af7ff;
                border-radius: 5px;
                padding: 15px;
                margin: 10px;
                box-shadow: 0 0 10px rgba(0, 100, 200, 0.5);
                position: absolute;
            }
            
            .panel-header {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 10px;
                padding-bottom: 5px;
                border-bottom: 1px solid #8af7ff;
            }
            
            /* Sector panel */
            .sector-panel {
                top: 20px;
                right: 20px;
                width: 250px;
            }
            
            .sector-name {
                font-size: 18px;
                margin-bottom: 10px;
                text-align: center;
            }
            
            .detail-item {
                margin: 5px 0;
                display: flex;
                justify-content: space-between;
            }
            
            /* Weapon panel */
            .weapon-panel {
                bottom: 20px;
                right: 20px;
                width: 250px;
            }
            
            .active-weapon {
                margin-bottom: 10px;
            }
            
            .weapon-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .weapon-status {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 12px;
                margin-bottom: 5px;
                background-color: #00ff66;
                color: #000;
            }
            
            .weapon-status.cooldown {
                background-color: #ff3366;
            }
            
            .weapon-energy, .weapon-damage {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                margin: 2px 0;
            }
            
            .weapon-cooldown {
                margin: 10px 0;
            }
            
            .weapon-selector {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
            }
            
            .weapon-slot {
                padding: 5px 10px;
                border: 1px solid #8af7ff;
                border-radius: 3px;
                font-size: 12px;
                cursor: pointer;
                background-color: rgba(0, 50, 100, 0.5);
                pointer-events: auto;
            }
            
            .weapon-slot.selected {
                background-color: rgba(0, 100, 200, 0.8);
                box-shadow: 0 0 10px #8af7ff;
            }
            
            .weapon-slot.disabled {
                opacity: 0.5;
                border-color: #555;
                color: #888;
                cursor: not-allowed;
            }
            
            /* Targeting system */
            .targeting-hud {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            .targeting-reticle {
                width: 80px;
                height: 80px;
                position: relative;
            }
            
            .reticle-element {
                position: absolute;
                background-color: rgba(138, 247, 255, 0.7);
            }
            
            .reticle-element.top, .reticle-element.bottom {
                width: 20px;
                height: 2px;
                left: 30px;
            }
            
            .reticle-element.left, .reticle-element.right {
                width: 2px;
                height: 20px;
                top: 30px;
            }
            
            .reticle-element.top { top: 0; }
            .reticle-element.right { right: 0; }
            .reticle-element.bottom { bottom: 0; }
            .reticle-element.left { left: 0; }
            
            .reticle-center {
                position: absolute;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background-color: rgba(138, 247, 255, 0.9);
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            .target-info {
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                margin-top: 15px;
                background-color: rgba(0, 20, 40, 0.7);
                border: 1px solid #8af7ff;
                border-radius: 5px;
                padding: 10px;
                width: 200px;
                text-align: center;
            }
            
            .target-info.hidden {
                display: none;
            }
            
            .target-name {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .target-distance {
                font-size: 12px;
                margin-bottom: 5px;
            }
            
            .target-lock-status {
                font-size: 12px;
                margin-top: 5px;
                color: #ff3366;
            }
            
            .target-lock-status.locked {
                color: #00ff66;
            }
            
            /* Notification area */
            .notification-area {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                align-items: center;
                z-index: 100;
            }
            
            .notification {
                background-color: rgba(0, 20, 40, 0.8);
                border: 1px solid #8af7ff;
                border-radius: 5px;
                padding: 15px 30px;
                margin: 10px 0;
                font-size: 20px;
                text-align: center;
                animation: fadeOut 3s forwards;
                max-width: 80%;
            }
            
            .notification.warning {
                border-color: #ff9500;
                color: #ff9500;
            }
            
            .notification.danger {
                border-color: #ff3366;
                color: #ff3366;
            }
            
            .notification.success {
                border-color: #00ff66;
                color: #00ff66;
            }
            
            @keyframes fadeOut {
                0% { opacity: 0; transform: translateY(-20px); }
                10% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; }
                100% { opacity: 0; }
            }
            
            /* Minimap */
            .minimap {
                position: absolute;
                bottom: 20px;
                left: 20px;
                width: 220px;
                background-color: rgba(0, 20, 40, 0.7);
                border: 1px solid #8af7ff;
                border-radius: 5px;
                padding: 10px;
                box-shadow: 0 0 10px rgba(0, 100, 200, 0.5);
            }
            
            .minimap-header {
                font-size: 12px;
                margin-bottom: 10px;
                text-align: center;
            }
            
            .minimap-container {
                position: relative;
                width: 200px;
                height: 200px;
            }
            
            .minimap-canvas {
                background-color: rgba(0, 10, 20, 0.8);
                border-radius: 3px;
            }
            
            .player-indicator {
                position: absolute;
                width: 8px;
                height: 8px;
                background-color: #8af7ff;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 10px #8af7ff;
            }
        `;
        
        document.head.appendChild(style);
        
        // Load Orbitron font
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    }
    
    updateHUD() {
        // Update health
        if (this.spacecraft.health !== undefined) {
            const healthPercent = (this.spacecraft.health / this.spacecraft.maxHealth) * 100;
            this.hudElements.healthBar.style.width = `${healthPercent}%`;
            this.hudElements.healthValue.textContent = `${Math.round(healthPercent)}%`;
            
            // Change color based on health
            if (healthPercent < 25) {
                this.hudElements.healthBar.style.backgroundColor = '#ff3366'; // Red
            } else if (healthPercent < 50) {
                this.hudElements.healthBar.style.backgroundColor = '#ff9500'; // Orange
            } else {
                this.hudElements.healthBar.style.backgroundColor = '#00ff66'; // Green
            }
        }
        
        // Update shields
        if (this.spacecraft.shield !== undefined) {
            const shieldPercent = (this.spacecraft.shield / this.spacecraft.maxShield) * 100;
            this.hudElements.shieldBar.style.width = `${shieldPercent}%`;
            this.hudElements.shieldValue.textContent = `${Math.round(shieldPercent)}%`;
        }
        
        // Update energy
        if (this.spacecraft.energy !== undefined) {
            const energyPercent = (this.spacecraft.energy / this.spacecraft.maxEnergy) * 100;
            this.hudElements.energyBar.style.width = `${energyPercent}%`;
            this.hudElements.energyValue.textContent = `${Math.round(energyPercent)}%`;
        }
        
        // Update speed
        if (this.spacecraft.velocity) {
            const speed = this.spacecraft.velocity.length();
            this.hudElements.speedValue.textContent = `${Math.round(speed)} km/s`;
        }
        
        // Update score
        this.hudElements.scoreValue.textContent = this.score.toLocaleString();
        
        // Update position
        if (this.spacecraft.position) {
            const pos = this.spacecraft.position;
            this.hudElements.positionValue.textContent = `X: ${Math.round(pos.x)} Y: ${Math.round(pos.y)} Z: ${Math.round(pos.z)}`;
        }
        
        // Update weapon status
        this.updateWeaponStatus();
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
                        this.hudElements.healthValue.textContent = `${Math.round(healthPercent)}%`;
                    }
                }
                
                // Update shield
                if (this.hudElements.shieldBar && typeof this.spacecraft.shield === 'number') {
                    const shieldPercent = (this.spacecraft.shield / this.spacecraft.maxShield) * 100;
                    this.hudElements.shieldBar.style.width = `${Math.max(0, Math.min(100, shieldPercent))}%`;
                    
                    if (this.hudElements.shieldValue) {
                        this.hudElements.shieldValue.textContent = `${Math.round(shieldPercent)}%`;
                    }
                }
                
                // Update energy
                if (this.hudElements.energyBar && typeof this.spacecraft.energy === 'number') {
                    const energyPercent = (this.spacecraft.energy / this.spacecraft.maxEnergy) * 100;
                    this.hudElements.energyBar.style.width = `${Math.max(0, Math.min(100, energyPercent))}%`;
                    
                    if (this.hudElements.energyValue) {
                        this.hudElements.energyValue.textContent = `${Math.round(energyPercent)}%`;
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
} 