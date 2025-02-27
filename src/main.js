import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GameWorld } from './scenes/GameWorld.js';
import { Spacecraft } from './entities/Spacecraft.js';
import { InputHandler } from './systems/InputHandler.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { UIManager } from './systems/UIManager.js';

class Game {
    constructor() {
        this.initThree();
        this.setupLoadingManager();
        this.initGameSystems();
        
        // Start the game loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    initThree() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.position.z = 15;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
        
        // Add basic lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);
        
        // Add controls (temporary for development, will be replaced by spacecraft controls)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    }
    
    setupLoadingManager() {
        this.loadingManager = new THREE.LoadingManager();
        
        const progressBar = document.getElementById('loading-progress');
        const loadingScreen = document.getElementById('loading');
        
        this.loadingManager.onProgress = (url, loaded, total) => {
            const progress = (loaded / total) * 100;
            progressBar.style.width = progress + '%';
        };
        
        this.loadingManager.onLoad = () => {
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        };
    }
    
    initGameSystems() {
        this.clock = new THREE.Clock();
        
        // Initialize game world
        this.gameWorld = new GameWorld(this.scene, this.loadingManager);
        
        // Initialize player spacecraft
        this.spacecraft = new Spacecraft(this.scene, this.camera);
        
        // Initialize physics system
        this.physicsSystem = new PhysicsSystem();
        
        // Initialize input handler
        this.inputHandler = new InputHandler(this.spacecraft);
        
        // Initialize UI
        this.uiManager = new UIManager(this.spacecraft);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock.getDelta();
        
        // Update game systems
        this.inputHandler.update();
        this.spacecraft.update(delta);
        this.physicsSystem.update(delta);
        this.gameWorld.update(delta);
        this.uiManager.update();
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
    setTimeout(() => {
        new Game();
    }, 1000); // Small delay to allow the loading screen to display
}); 