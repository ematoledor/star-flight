export class UIManager {
    constructor(spacecraft) {
        this.spacecraft = spacecraft;
        
        // Get UI elements
        this.speedElement = document.getElementById('speed');
        this.healthElement = document.getElementById('health');
        this.ammoElement = document.getElementById('ammo');
        
        // Game state
        this.isPaused = false;
        this.isGameOver = false;
        
        // Initialize the UI
        this.init();
    }
    
    init() {
        // Create pause menu
        this.createPauseMenu();
        
        // Create game over screen
        this.createGameOverScreen();
        
        // Hide menus initially
        this.togglePauseMenu(false);
        this.toggleGameOverScreen(false);
    }
    
    createPauseMenu() {
        // Create pause menu div
        this.pauseMenu = document.createElement('div');
        this.pauseMenu.id = 'pause-menu';
        this.pauseMenu.style.position = 'absolute';
        this.pauseMenu.style.top = '50%';
        this.pauseMenu.style.left = '50%';
        this.pauseMenu.style.transform = 'translate(-50%, -50%)';
        this.pauseMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.pauseMenu.style.color = 'white';
        this.pauseMenu.style.padding = '20px';
        this.pauseMenu.style.borderRadius = '10px';
        this.pauseMenu.style.textAlign = 'center';
        this.pauseMenu.style.fontFamily = "'Courier New', monospace";
        this.pauseMenu.style.zIndex = '1000';
        this.pauseMenu.style.display = 'none';
        
        // Add title
        const title = document.createElement('h2');
        title.textContent = 'GAME PAUSED';
        this.pauseMenu.appendChild(title);
        
        // Add resume button
        const resumeBtn = document.createElement('button');
        resumeBtn.textContent = 'RESUME';
        resumeBtn.style.backgroundColor = '#0088ff';
        resumeBtn.style.color = 'white';
        resumeBtn.style.border = 'none';
        resumeBtn.style.padding = '10px 20px';
        resumeBtn.style.margin = '10px';
        resumeBtn.style.cursor = 'pointer';
        resumeBtn.addEventListener('click', () => this.resumeGame());
        this.pauseMenu.appendChild(resumeBtn);
        
        // Add restart button
        const restartBtn = document.createElement('button');
        restartBtn.textContent = 'RESTART';
        restartBtn.style.backgroundColor = '#ff8800';
        restartBtn.style.color = 'white';
        restartBtn.style.border = 'none';
        restartBtn.style.padding = '10px 20px';
        restartBtn.style.margin = '10px';
        restartBtn.style.cursor = 'pointer';
        restartBtn.addEventListener('click', () => this.restartGame());
        this.pauseMenu.appendChild(restartBtn);
        
        // Add to document
        document.body.appendChild(this.pauseMenu);
    }
    
    createGameOverScreen() {
        // Create game over div
        this.gameOverScreen = document.createElement('div');
        this.gameOverScreen.id = 'game-over-screen';
        this.gameOverScreen.style.position = 'absolute';
        this.gameOverScreen.style.top = '50%';
        this.gameOverScreen.style.left = '50%';
        this.gameOverScreen.style.transform = 'translate(-50%, -50%)';
        this.gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.gameOverScreen.style.color = 'white';
        this.gameOverScreen.style.padding = '20px';
        this.gameOverScreen.style.borderRadius = '10px';
        this.gameOverScreen.style.textAlign = 'center';
        this.gameOverScreen.style.fontFamily = "'Courier New', monospace";
        this.gameOverScreen.style.zIndex = '1000';
        this.gameOverScreen.style.display = 'none';
        
        // Add title
        const title = document.createElement('h2');
        title.textContent = 'GAME OVER';
        title.style.color = '#ff0000';
        this.gameOverScreen.appendChild(title);
        
        // Add score display
        this.scoreDisplay = document.createElement('p');
        this.scoreDisplay.textContent = 'SCORE: 0';
        this.gameOverScreen.appendChild(this.scoreDisplay);
        
        // Add restart button
        const restartBtn = document.createElement('button');
        restartBtn.textContent = 'RESTART';
        restartBtn.style.backgroundColor = '#0088ff';
        restartBtn.style.color = 'white';
        restartBtn.style.border = 'none';
        restartBtn.style.padding = '10px 20px';
        restartBtn.style.margin = '10px';
        restartBtn.style.cursor = 'pointer';
        restartBtn.addEventListener('click', () => this.restartGame());
        this.gameOverScreen.appendChild(restartBtn);
        
        // Add to document
        document.body.appendChild(this.gameOverScreen);
    }
    
    update() {
        // Skip UI updates if game is paused or over
        if (this.isPaused || this.isGameOver) {
            return;
        }
        
        // Update speed display
        if (this.speedElement && this.spacecraft.velocity) {
            const speed = Math.round(this.spacecraft.velocity.length() * 10) / 10;
            this.speedElement.textContent = speed;
        }
        
        // Update health display
        if (this.healthElement) {
            this.healthElement.textContent = Math.round(this.spacecraft.health);
            
            // Change color based on health level
            if (this.spacecraft.health < 30) {
                this.healthElement.style.color = '#ff0000';
            } else if (this.spacecraft.health < 60) {
                this.healthElement.style.color = '#ff8800';
            } else {
                this.healthElement.style.color = '#ffffff';
            }
            
            // Check for game over
            if (this.spacecraft.health <= 0) {
                this.gameOver();
            }
        }
        
        // Update ammo display
        if (this.ammoElement) {
            this.ammoElement.textContent = this.spacecraft.ammo;
            
            // Change color based on ammo level
            if (this.spacecraft.ammo < 20) {
                this.ammoElement.style.color = '#ff0000';
            } else if (this.spacecraft.ammo < 50) {
                this.ammoElement.style.color = '#ff8800';
            } else {
                this.ammoElement.style.color = '#ffffff';
            }
        }
    }
    
    pauseGame() {
        if (!this.isGameOver) {
            this.isPaused = true;
            this.togglePauseMenu(true);
            
            // Optional: pause audio, physics, etc.
        }
    }
    
    resumeGame() {
        this.isPaused = false;
        this.togglePauseMenu(false);
        
        // Optional: resume audio, physics, etc.
        
        // Request pointer lock again
        document.body.requestPointerLock();
    }
    
    gameOver(score = 0) {
        this.isGameOver = true;
        this.toggleGameOverScreen(true);
        
        // Update score display
        this.scoreDisplay.textContent = `SCORE: ${score}`;
        
        // Optional: play game over sound, stop background music, etc.
    }
    
    restartGame() {
        // Reset game state
        this.isPaused = false;
        this.isGameOver = false;
        
        // Hide UI elements
        this.togglePauseMenu(false);
        this.toggleGameOverScreen(false);
        
        // Reset spacecraft state
        if (this.spacecraft) {
            this.spacecraft.health = this.spacecraft.maxHealth;
            this.spacecraft.ammo = this.spacecraft.maxAmmo;
            this.spacecraft.position.set(0, 0, 0);
            this.spacecraft.velocity.set(0, 0, 0);
        }
        
        // Request pointer lock again
        document.body.requestPointerLock();
        
        // Optional: restart level, reset score, etc.
    }
    
    togglePauseMenu(show) {
        if (this.pauseMenu) {
            this.pauseMenu.style.display = show ? 'block' : 'none';
        }
    }
    
    toggleGameOverScreen(show) {
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = show ? 'block' : 'none';
        }
    }
    
    showMessage(message, duration = 3000) {
        // Create message element if it doesn't exist
        if (!this.messageElement) {
            this.messageElement = document.createElement('div');
            this.messageElement.style.position = 'absolute';
            this.messageElement.style.bottom = '100px';
            this.messageElement.style.left = '50%';
            this.messageElement.style.transform = 'translateX(-50%)';
            this.messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            this.messageElement.style.color = 'white';
            this.messageElement.style.padding = '10px 20px';
            this.messageElement.style.borderRadius = '5px';
            this.messageElement.style.fontFamily = "'Courier New', monospace";
            this.messageElement.style.textAlign = 'center';
            this.messageElement.style.zIndex = '900';
            this.messageElement.style.display = 'none';
            document.body.appendChild(this.messageElement);
        }
        
        // Set message text and show
        this.messageElement.textContent = message;
        this.messageElement.style.display = 'block';
        
        // Clear any existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        // Hide after duration
        this.messageTimeout = setTimeout(() => {
            this.messageElement.style.display = 'none';
        }, duration);
    }
} 