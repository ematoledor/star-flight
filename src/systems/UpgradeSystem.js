export class UpgradeSystem {
    constructor(spacecraft, combatSystem, uiManager) {
        this.spacecraft = spacecraft;
        this.combatSystem = combatSystem;
        this.uiManager = uiManager;
        
        this.credits = 0;
        this.availableUpgrades = this.initializeUpgrades();
        this.upgradeHistory = []; // Track purchased upgrades
        
        // Define upgrade categories
        this.categories = [
            { id: 'engine', name: 'Engines', icon: '🚀' },
            { id: 'shield', name: 'Shields', icon: '🛡️' },
            { id: 'hull', name: 'Hull', icon: '🔧' },
            { id: 'weapon', name: 'Weapons', icon: '⚔️' },
            { id: 'energy', name: 'Energy Systems', icon: '⚡' },
            { id: 'special', name: 'Special Systems', icon: '✨' }
        ];
        
        // Initialize UI
        this.initializeUI();
    }
    
    /**
     * Initialize available upgrades
     * @returns {Object} Dictionary of available upgrades
     */
    initializeUpgrades() {
        return {
            // Engine upgrades
            'engine_thrust_1': {
                name: 'Enhanced Thrusters I',
                description: 'Increases max speed by 20%',
                category: 'engine',
                cost: 500,
                prerequisites: [],
                apply: (spacecraft) => {
                    spacecraft.maxSpeed *= 1.2;
                    spacecraft.acceleration *= 1.15;
                    this.uiManager.showNotification('Enhanced Thrusters Installed');
                }
            },
            'engine_thrust_2': {
                name: 'Enhanced Thrusters II',
                description: 'Increases max speed by an additional 20%',
                category: 'engine',
                cost: 1200,
                prerequisites: ['engine_thrust_1'],
                apply: (spacecraft) => {
                    spacecraft.maxSpeed *= 1.2;
                    spacecraft.acceleration *= 1.15;
                    this.uiManager.showNotification('Advanced Thrusters Installed');
                }
            },
            'engine_maneuver_1': {
                name: 'Improved Maneuvering',
                description: 'Increases turning speed by 25%',
                category: 'engine',
                cost: 800,
                prerequisites: [],
                apply: (spacecraft) => {
                    spacecraft.turnSpeed *= 1.25;
                    this.uiManager.showNotification('Improved Maneuvering System Installed');
                }
            },
            'engine_brake_1': {
                name: 'Enhanced Braking System',
                description: 'Improves deceleration by 30%',
                category: 'engine',
                cost: 600,
                prerequisites: [],
                apply: (spacecraft) => {
                    spacecraft.deceleration *= 1.3;
                    this.uiManager.showNotification('Enhanced Braking System Installed');
                }
            },
            'engine_afterburner': {
                name: 'Afterburner System',
                description: 'Adds temporary speed boost capability',
                category: 'engine',
                cost: 2000,
                prerequisites: ['engine_thrust_1'],
                apply: (spacecraft) => {
                    spacecraft.hasAfterburner = true;
                    spacecraft.afterburnerMultiplier = 1.8;
                    spacecraft.afterburnerEnergyCost = 30;
                    spacecraft.afterburnerDuration = 3.0;
                    spacecraft.afterburnerCooldown = 8.0;
                    this.uiManager.showNotification('Afterburner System Installed');
                }
            },
            
            // Shield upgrades
            'shield_capacity_1': {
                name: 'Enhanced Shield Capacity I',
                description: 'Increases max shield by 25%',
                category: 'shield',
                cost: 700,
                prerequisites: [],
                apply: (spacecraft) => {
                    spacecraft.maxShield *= 1.25;
                    spacecraft.shield = spacecraft.maxShield; // Refill shield
                    this.uiManager.showNotification('Enhanced Shield Capacity Installed');
                }
            },
            'shield_capacity_2': {
                name: 'Enhanced Shield Capacity II',
                description: 'Increases max shield by additional 25%',
                category: 'shield',
                cost: 1500,
                prerequisites: ['shield_capacity_1'],
                apply: (spacecraft) => {
                    spacecraft.maxShield *= 1.25;
                    spacecraft.shield = spacecraft.maxShield; // Refill shield
                    this.uiManager.showNotification('Advanced Shield Capacity Installed');
                }
            },
            'shield_regen_1': {
                name: 'Shield Regenerator',
                description: 'Adds automatic shield regeneration',
                category: 'shield',
                cost: 1800,
                prerequisites: ['shield_capacity_1'],
                apply: (spacecraft) => {
                    spacecraft.shieldRegenRate = 5; // Shield points per second
                    this.uiManager.showNotification('Shield Regenerator Installed');
                }
            },
            'shield_efficiency_1': {
                name: 'Shield Energy Efficiency',
                description: 'Reduces shield energy usage by 30%',
                category: 'shield',
                cost: 1200,
                prerequisites: ['shield_capacity_1'],
                apply: (spacecraft) => {
                    spacecraft.shieldEnergyCost *= 0.7;
                    this.uiManager.showNotification('Shield Efficiency Module Installed');
                }
            },
            
            // Hull upgrades
            'hull_armor_1': {
                name: 'Reinforced Hull I',
                description: 'Increases max hull health by 30%',
                category: 'hull',
                cost: 800,
                prerequisites: [],
                apply: (spacecraft) => {
                    spacecraft.maxHealth *= 1.3;
                    spacecraft.health = spacecraft.maxHealth; // Repair hull
                    this.uiManager.showNotification('Reinforced Hull Plates Installed');
                }
            },
            'hull_armor_2': {
                name: 'Reinforced Hull II',
                description: 'Increases max hull health by additional 30%',
                category: 'hull',
                cost: 1600,
                prerequisites: ['hull_armor_1'],
                apply: (spacecraft) => {
                    spacecraft.maxHealth *= 1.3;
                    spacecraft.health = spacecraft.maxHealth; // Repair hull
                    this.uiManager.showNotification('Advanced Hull Reinforcement Installed');
                }
            },
            'hull_repair_1': {
                name: 'Auto-Repair System',
                description: 'Slowly repairs hull damage automatically',
                category: 'hull',
                cost: 2000,
                prerequisites: ['hull_armor_1'],
                apply: (spacecraft) => {
                    spacecraft.hullRepairRate = 3; // Health points per second
                    this.uiManager.showNotification('Auto-Repair System Installed');
                }
            },
            'hull_integrity_1': {
                name: 'Structural Integrity Field',
                description: 'Reduces incoming damage by 15%',
                category: 'hull',
                cost: 1500,
                prerequisites: ['hull_armor_1'],
                apply: (spacecraft) => {
                    spacecraft.damageReduction = 0.15; // 15% damage reduction
                    this.uiManager.showNotification('Structural Integrity Field Generator Installed');
                }
            },
            
            // Weapon upgrades
            'weapon_laser_1': {
                name: 'Enhanced Laser Cannons',
                description: 'Increases laser damage by 25%',
                category: 'weapon',
                cost: 1000,
                prerequisites: [],
                apply: (spacecraft) => {
                    // Update laser weapon in combat system
                    if (this.combatSystem && this.combatSystem.weaponTypes.laser) {
                        this.combatSystem.weaponTypes.laser.damage *= 1.25;
                    }
                    this.uiManager.showNotification('Enhanced Laser Cannons Installed');
                }
            },
            'weapon_plasma': {
                name: 'Plasma Cannon',
                description: 'Adds new plasma weapon with high damage',
                category: 'weapon',
                cost: 2000,
                prerequisites: ['weapon_laser_1'],
                apply: (spacecraft) => {
                    // Unlock plasma weapon
                    spacecraft.unlockedWeapons = spacecraft.unlockedWeapons || [];
                    spacecraft.unlockedWeapons.push('plasma');
                    this.uiManager.showNotification('Plasma Cannon System Installed');
                }
            },
            'weapon_missiles': {
                name: 'Missile Launcher',
                description: 'Adds homing missiles with high damage',
                category: 'weapon',
                cost: 3000,
                prerequisites: ['weapon_laser_1'],
                apply: (spacecraft) => {
                    // Unlock missile weapon
                    spacecraft.unlockedWeapons = spacecraft.unlockedWeapons || [];
                    spacecraft.unlockedWeapons.push('missile');
                    this.uiManager.showNotification('Missile Launcher System Installed');
                }
            },
            'weapon_cooldown_1': {
                name: 'Weapon Cooling System',
                description: 'Reduces weapon cooldown times by 20%',
                category: 'weapon',
                cost: 1500,
                prerequisites: ['weapon_laser_1'],
                apply: (spacecraft) => {
                    // Apply to all weapon types
                    if (this.combatSystem) {
                        Object.values(this.combatSystem.weaponTypes).forEach(weapon => {
                            weapon.cooldown *= 0.8;
                        });
                    }
                    this.uiManager.showNotification('Weapon Cooling System Installed');
                }
            },
            'weapon_railgun': {
                name: 'Railgun System',
                description: 'Adds powerful railgun with high penetration',
                category: 'weapon',
                cost: 5000,
                prerequisites: ['weapon_plasma'],
                apply: (spacecraft) => {
                    // Unlock railgun weapon
                    spacecraft.unlockedWeapons = spacecraft.unlockedWeapons || [];
                    spacecraft.unlockedWeapons.push('railgun');
                    this.uiManager.showNotification('Railgun System Installed');
                }
            },
            
            // Energy system upgrades
            'energy_capacity_1': {
                name: 'Enhanced Energy Cells I',
                description: 'Increases max energy by 25%',
                category: 'energy',
                cost: 900,
                prerequisites: [],
                apply: (spacecraft) => {
                    spacecraft.maxEnergy *= 1.25;
                    spacecraft.energy = spacecraft.maxEnergy; // Refill energy
                    this.uiManager.showNotification('Enhanced Energy Cells Installed');
                }
            },
            'energy_capacity_2': {
                name: 'Enhanced Energy Cells II',
                description: 'Increases max energy by additional 25%',
                category: 'energy',
                cost: 1800,
                prerequisites: ['energy_capacity_1'],
                apply: (spacecraft) => {
                    spacecraft.maxEnergy *= 1.25;
                    spacecraft.energy = spacecraft.maxEnergy; // Refill energy
                    this.uiManager.showNotification('Advanced Energy Cells Installed');
                }
            },
            'energy_regen_1': {
                name: 'Improved Energy Generator',
                description: 'Increases energy regeneration by 30%',
                category: 'energy',
                cost: 1200,
                prerequisites: ['energy_capacity_1'],
                apply: (spacecraft) => {
                    spacecraft.energyRegenRate *= 1.3;
                    this.uiManager.showNotification('Improved Energy Generator Installed');
                }
            },
            'energy_efficiency_1': {
                name: 'Energy Efficiency Module',
                description: 'Reduces energy consumption by 20%',
                category: 'energy',
                cost: 1500,
                prerequisites: ['energy_capacity_1'],
                apply: (spacecraft) => {
                    // Apply to all weapon types
                    if (this.combatSystem) {
                        Object.values(this.combatSystem.weaponTypes).forEach(weapon => {
                            weapon.energyCost *= 0.8;
                        });
                    }
                    
                    // Apply to other systems
                    if (spacecraft.shieldEnergyCost) {
                        spacecraft.shieldEnergyCost *= 0.8;
                    }
                    if (spacecraft.afterburnerEnergyCost) {
                        spacecraft.afterburnerEnergyCost *= 0.8;
                    }
                    
                    this.uiManager.showNotification('Energy Efficiency Module Installed');
                }
            },
            
            // Special upgrades
            'special_scanner': {
                name: 'Advanced Scanner',
                description: 'Increases sensor range and reveals enemy info',
                category: 'special',
                cost: 1200,
                prerequisites: [],
                apply: (spacecraft) => {
                    spacecraft.scannerRange = 4000;
                    spacecraft.enhancedScanner = true;
                    this.uiManager.showNotification('Advanced Scanner System Installed');
                }
            },
            'special_cloaking': {
                name: 'Cloaking Device',
                description: 'Temporarily makes your ship invisible to enemies',
                category: 'special',
                cost: 4000,
                prerequisites: ['energy_capacity_2'],
                apply: (spacecraft) => {
                    spacecraft.hasCloakingDevice = true;
                    spacecraft.cloakingEnergyCost = 50;
                    spacecraft.cloakingDuration = 10.0;
                    spacecraft.cloakingCooldown = 30.0;
                    this.uiManager.showNotification('Cloaking Device Installed');
                }
            },
            'special_tractor': {
                name: 'Tractor Beam',
                description: 'Allows collection of resources from a distance',
                category: 'special',
                cost: 2000,
                prerequisites: ['energy_capacity_1'],
                apply: (spacecraft) => {
                    spacecraft.hasTractorBeam = true;
                    spacecraft.tractorBeamRange = 300;
                    spacecraft.tractorBeamEnergyCost = 10;
                    this.uiManager.showNotification('Tractor Beam Installed');
                }
            },
            'special_timewarper': {
                name: 'Temporal Warper',
                description: 'Briefly slows down time around your ship',
                category: 'special',
                cost: 6000,
                prerequisites: ['special_scanner', 'energy_capacity_2'],
                apply: (spacecraft) => {
                    spacecraft.hasTimeWarper = true;
                    spacecraft.timeWarperEnergyCost = 100;
                    spacecraft.timeWarperDuration = 5.0;
                    spacecraft.timeWarperCooldown = 60.0;
                    spacecraft.timeWarperRatio = 0.3; // Slow time to 30%
                    this.uiManager.showNotification('Temporal Warper Installed');
                }
            }
        };
    }
    
    /**
     * Initialize UI for upgrades
     */
    initializeUI() {
        // Create upgrade menu container
        this.upgradeMenu = document.createElement('div');
        this.upgradeMenu.className = 'upgrade-menu';
        this.upgradeMenu.innerHTML = `
            <div class="upgrade-header">
                <h2>SPACECRAFT UPGRADES</h2>
                <div class="credits-display">CREDITS: <span class="credits-value">0</span></div>
                <button class="close-button">✕</button>
            </div>
            <div class="upgrade-categories"></div>
            <div class="upgrade-list"></div>
        `;
        document.body.appendChild(this.upgradeMenu);
        
        // Hide by default
        this.upgradeMenu.style.display = 'none';
        
        // Store references to elements
        this.creditsElement = this.upgradeMenu.querySelector('.credits-value');
        this.categoryContainer = this.upgradeMenu.querySelector('.upgrade-categories');
        this.upgradeListContainer = this.upgradeMenu.querySelector('.upgrade-list');
        
        // Add event listener to close button
        this.upgradeMenu.querySelector('.close-button').addEventListener('click', () => {
            this.hideUpgradeMenu();
        });
        
        // Create categories
        this.createCategoryButtons();
        
        // Add styles
        this.addStyles();
    }
    
    /**
     * Create category buttons
     */
    createCategoryButtons() {
        this.categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-button';
            button.dataset.category = category.id;
            button.innerHTML = `${category.icon} ${category.name}`;
            
            button.addEventListener('click', () => {
                // Deselect all buttons
                this.categoryContainer.querySelectorAll('.category-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Select this button
                button.classList.add('selected');
                
                // Show upgrades for this category
                this.showUpgradesForCategory(category.id);
            });
            
            this.categoryContainer.appendChild(button);
        });
    }
    
    /**
     * Show upgrades for a specific category
     * @param {string} categoryId - Category identifier
     */
    showUpgradesForCategory(categoryId) {
        // Clear current upgrades
        this.upgradeListContainer.innerHTML = '';
        
        // Filter upgrades by category
        const upgrades = Object.entries(this.availableUpgrades)
            .filter(([id, upgrade]) => upgrade.category === categoryId)
            .sort((a, b) => a[1].cost - b[1].cost); // Sort by cost
        
        if (upgrades.length === 0) {
            const message = document.createElement('div');
            message.className = 'no-upgrades-message';
            message.textContent = 'No upgrades available in this category.';
            this.upgradeListContainer.appendChild(message);
            return;
        }
        
        // Create upgrade cards
        upgrades.forEach(([id, upgrade]) => {
            const isPurchased = this.upgradeHistory.includes(id);
            const hasPrereqs = this.checkPrerequisites(upgrade.prerequisites);
            const canAfford = this.credits >= upgrade.cost;
            
            const card = document.createElement('div');
            card.className = `upgrade-card ${isPurchased ? 'purchased' : ''} ${!hasPrereqs ? 'locked' : ''} ${!canAfford && !isPurchased ? 'unaffordable' : ''}`;
            
            // Status indicator
            let statusText = '';
            let statusClass = '';
            
            if (isPurchased) {
                statusText = 'INSTALLED';
                statusClass = 'status-installed';
            } else if (!hasPrereqs) {
                statusText = 'LOCKED';
                statusClass = 'status-locked';
            } else if (!canAfford) {
                statusText = 'INSUFFICIENT CREDITS';
                statusClass = 'status-unaffordable';
            } else {
                statusText = 'AVAILABLE';
                statusClass = 'status-available';
            }
            
            card.innerHTML = `
                <div class="upgrade-name">${upgrade.name}</div>
                <div class="upgrade-description">${upgrade.description}</div>
                <div class="upgrade-cost">Cost: ${upgrade.cost.toLocaleString()} Credits</div>
                <div class="upgrade-status ${statusClass}">${statusText}</div>
                ${!isPurchased && hasPrereqs && canAfford ? '<button class="purchase-button">Purchase</button>' : ''}
                ${!hasPrereqs ? '<div class="prereq-message">Prerequisites not met</div>' : ''}
            `;
            
            // Add purchase functionality
            if (!isPurchased && hasPrereqs && canAfford) {
                card.querySelector('.purchase-button').addEventListener('click', () => {
                    this.purchaseUpgrade(id);
                    this.showUpgradesForCategory(categoryId); // Refresh display
                });
            }
            
            this.upgradeListContainer.appendChild(card);
        });
    }
    
    /**
     * Add CSS styles for upgrade UI
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .upgrade-menu {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 800px;
                height: 600px;
                background-color: rgba(0, 20, 40, 0.95);
                border: 2px solid #8af7ff;
                border-radius: 10px;
                color: #fff;
                font-family: 'Orbitron', sans-serif;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                box-shadow: 0 0 30px rgba(138, 247, 255, 0.5);
                pointer-events: auto;
            }
            
            .upgrade-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid #8af7ff;
                background-color: rgba(0, 40, 80, 0.5);
                border-radius: 8px 8px 0 0;
            }
            
            .upgrade-header h2 {
                margin: 0;
                color: #8af7ff;
                text-shadow: 0 0 5px rgba(138, 247, 255, 0.7);
                font-size: 24px;
            }
            
            .credits-display {
                font-size: 18px;
                color: #ffcc00;
                text-shadow: 0 0 5px rgba(255, 204, 0, 0.7);
            }
            
            .close-button {
                background: none;
                border: none;
                color: #8af7ff;
                font-size: 20px;
                cursor: pointer;
                padding: 5px 10px;
                transition: color 0.2s;
            }
            
            .close-button:hover {
                color: #ff3366;
            }
            
            .upgrade-categories {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                padding: 15px 20px;
                border-bottom: 1px solid #345;
            }
            
            .category-button {
                background-color: rgba(0, 40, 80, 0.5);
                border: 1px solid #8af7ff;
                border-radius: 5px;
                color: #8af7ff;
                padding: 8px 15px;
                font-family: 'Orbitron', sans-serif;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .category-button:hover {
                background-color: rgba(0, 60, 120, 0.7);
                box-shadow: 0 0 10px rgba(138, 247, 255, 0.5);
            }
            
            .category-button.selected {
                background-color: rgba(0, 100, 200, 0.7);
                box-shadow: 0 0 15px rgba(138, 247, 255, 0.7);
            }
            
            .upgrade-list {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                gap: 15px;
            }
            
            .upgrade-card {
                background-color: rgba(0, 30, 60, 0.7);
                border: 1px solid #8af7ff;
                border-radius: 8px;
                padding: 15px;
                display: flex;
                flex-direction: column;
                transition: all 0.2s;
            }
            
            .upgrade-card:hover {
                box-shadow: 0 0 15px rgba(138, 247, 255, 0.4);
                transform: translateY(-2px);
            }
            
            .upgrade-card.purchased {
                border-color: #00ff66;
                background-color: rgba(0, 60, 40, 0.7);
            }
            
            .upgrade-card.locked {
                border-color: #777;
                background-color: rgba(30, 30, 40, 0.7);
                opacity: 0.7;
            }
            
            .upgrade-card.unaffordable {
                border-color: #ff3366;
                opacity: 0.8;
            }
            
            .upgrade-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 8px;
                color: #8af7ff;
            }
            
            .upgrade-card.purchased .upgrade-name {
                color: #00ff66;
            }
            
            .upgrade-description {
                font-size: 14px;
                margin-bottom: 10px;
                color: #ccc;
                flex: 1;
            }
            
            .upgrade-cost {
                font-size: 14px;
                margin-bottom: 10px;
                color: #ffcc00;
            }
            
            .upgrade-status {
                font-size: 12px;
                font-weight: bold;
                padding: 4px;
                border-radius: 3px;
                text-align: center;
                margin-bottom: 10px;
            }
            
            .status-installed {
                background-color: rgba(0, 255, 102, 0.3);
                color: #00ff66;
            }
            
            .status-available {
                background-color: rgba(138, 247, 255, 0.3);
                color: #8af7ff;
            }
            
            .status-locked {
                background-color: rgba(119, 119, 119, 0.3);
                color: #aaa;
            }
            
            .status-unaffordable {
                background-color: rgba(255, 51, 102, 0.3);
                color: #ff3366;
            }
            
            .purchase-button {
                background-color: rgba(0, 100, 200, 0.7);
                border: 1px solid #8af7ff;
                border-radius: 5px;
                color: #fff;
                padding: 8px;
                font-family: 'Orbitron', sans-serif;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .purchase-button:hover {
                background-color: rgba(0, 150, 255, 0.7);
                box-shadow: 0 0 10px rgba(138, 247, 255, 0.7);
            }
            
            .prereq-message {
                font-size: 12px;
                color: #ff9500;
                text-align: center;
                font-style: italic;
            }
            
            .no-upgrades-message {
                grid-column: 1 / -1;
                text-align: center;
                padding: 30px;
                color: #8af7ff;
                font-size: 18px;
            }
            
            /* Scrollbar styling */
            .upgrade-list::-webkit-scrollbar {
                width: 8px;
            }
            
            .upgrade-list::-webkit-scrollbar-track {
                background: rgba(0, 20, 40, 0.5);
                border-radius: 4px;
            }
            
            .upgrade-list::-webkit-scrollbar-thumb {
                background: rgba(138, 247, 255, 0.5);
                border-radius: 4px;
            }
            
            .upgrade-list::-webkit-scrollbar-thumb:hover {
                background: rgba(138, 247, 255, 0.8);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Show the upgrade menu
     */
    showUpgradeMenu() {
        // Update credits display
        this.creditsElement.textContent = this.credits.toLocaleString();
        
        // Show menu
        this.upgradeMenu.style.display = 'flex';
        
        // Select the first category by default if none selected
        const selectedCategory = this.categoryContainer.querySelector('.category-button.selected');
        if (!selectedCategory) {
            const firstCategory = this.categoryContainer.querySelector('.category-button');
            if (firstCategory) {
                firstCategory.click();
            }
        } else {
            // Refresh the current category
            this.showUpgradesForCategory(selectedCategory.dataset.category);
        }
        
        // Optional: pause the game
        // if (this.gameManager) this.gameManager.pauseGame();
    }
    
    /**
     * Hide the upgrade menu
     */
    hideUpgradeMenu() {
        this.upgradeMenu.style.display = 'none';
        
        // Optional: resume the game
        // if (this.gameManager) this.gameManager.resumeGame();
    }
    
    /**
     * Toggle the upgrade menu visibility
     */
    toggleUpgradeMenu() {
        if (this.upgradeMenu.style.display === 'none') {
            this.showUpgradeMenu();
        } else {
            this.hideUpgradeMenu();
        }
    }
    
    /**
     * Check if all prerequisites for an upgrade are met
     * @param {Array} prerequisites - List of prerequisite upgrade IDs
     * @returns {boolean} Whether all prerequisites are met
     */
    checkPrerequisites(prerequisites) {
        if (!prerequisites || prerequisites.length === 0) {
            return true;
        }
        
        return prerequisites.every(prereq => this.upgradeHistory.includes(prereq));
    }
    
    /**
     * Purchase an upgrade
     * @param {string} upgradeId - ID of the upgrade to purchase
     * @returns {boolean} Whether purchase was successful
     */
    purchaseUpgrade(upgradeId) {
        const upgrade = this.availableUpgrades[upgradeId];
        
        // Check if upgrade exists
        if (!upgrade) {
            console.error(`Upgrade ${upgradeId} not found`);
            return false;
        }
        
        // Check if already purchased
        if (this.upgradeHistory.includes(upgradeId)) {
            console.log(`Upgrade ${upgradeId} already purchased`);
            return false;
        }
        
        // Check prerequisites
        if (!this.checkPrerequisites(upgrade.prerequisites)) {
            console.log(`Prerequisites for upgrade ${upgradeId} not met`);
            return false;
        }
        
        // Check if enough credits
        if (this.credits < upgrade.cost) {
            console.log(`Not enough credits for upgrade ${upgradeId}`);
            return false;
        }
        
        // Deduct credits
        this.credits -= upgrade.cost;
        
        // Add to purchase history
        this.upgradeHistory.push(upgradeId);
        
        // Apply upgrade effects
        upgrade.apply(this.spacecraft);
        
        // Update credits display
        this.creditsElement.textContent = this.credits.toLocaleString();
        
        console.log(`Purchased upgrade: ${upgrade.name}`);
        return true;
    }
    
    /**
     * Add credits to player's account
     * @param {number} amount - Amount of credits to add
     */
    addCredits(amount) {
        this.credits += amount;
        
        // Update credits display if menu is open
        if (this.upgradeMenu.style.display !== 'none') {
            this.creditsElement.textContent = this.credits.toLocaleString();
        }
        
        // Show notification
        if (this.uiManager) {
            this.uiManager.showNotification(`+${amount} CREDITS`, 'success');
        }
    }
} 