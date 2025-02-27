import * as THREE from 'three';
import { Projectile } from './Projectile.js';

export class Weapon {
    constructor(config) {
        this.config = Object.assign({
            type: 'laser',
            damage: 10,
            cooldown: 0.5,
            speed: 500,
            color: 0xff0000,
            size: 0.5,
            scene: null
        }, config);
        
        this.scene = this.config.scene;
        this.cooldownTimer = 0;
        this.projectiles = [];
        this.maxProjectiles = 100; // Limit to prevent memory issues
    }
    
    update(delta, spacecraft) {
        // Update cooldown timer
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= delta;
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Update projectile
            if (projectile.update(delta)) {
                // Projectile is dead (traveled too far or hit something)
                this.scene.remove(projectile);
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    fire(spacecraft) {
        if (this.cooldownTimer > 0) {
            return false; // Still in cooldown
        }
        
        // Limit number of projectiles
        if (this.projectiles.length >= this.maxProjectiles) {
            // Remove oldest projectile
            const oldestProjectile = this.projectiles.shift();
            this.scene.remove(oldestProjectile);
        }
        
        // Reset cooldown
        this.cooldownTimer = this.config.cooldown;
        
        // Calculate projectile starting position (from the front of the spacecraft)
        const position = new THREE.Vector3(0, 0, 5)
            .applyQuaternion(spacecraft.quaternion)
            .add(spacecraft.position);
        
        // Calculate projectile direction (forward from spacecraft)
        const direction = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(spacecraft.quaternion);
        
        // Create projectile based on weapon type
        let projectile;
        
        if (this.config.type === 'laser') {
            projectile = this.createLaserProjectile(position, direction);
        } else if (this.config.type === 'missile') {
            projectile = this.createMissileProjectile(position, direction);
        } else {
            projectile = this.createLaserProjectile(position, direction);
        }
        
        // Add projectile to scene and list
        this.scene.add(projectile);
        this.projectiles.push(projectile);
        
        // Add muzzle flash effect
        this.createMuzzleFlash(position);
        
        return true;
    }
    
    createLaserProjectile(position, direction) {
        const projectile = new Projectile({
            type: 'laser',
            position: position,
            direction: direction,
            speed: this.config.speed,
            color: this.config.color,
            size: this.config.size,
            damage: this.config.damage,
            lifespan: 2 // Seconds before auto-destruction
        });
        
        return projectile;
    }
    
    createMissileProjectile(position, direction) {
        const projectile = new Projectile({
            type: 'missile',
            position: position,
            direction: direction,
            speed: this.config.speed,
            color: this.config.color,
            size: this.config.size * 2,
            damage: this.config.damage,
            lifespan: 5 // Seconds before auto-destruction
        });
        
        return projectile;
    }
    
    createMuzzleFlash(position) {
        // Create a quick flash effect at the muzzle
        const flashGeometry = new THREE.SphereGeometry(this.config.size * 2, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: this.config.color,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Animate the flash
        const startTime = Date.now();
        const duration = 100; // ms
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.scene.remove(flash);
                return;
            }
            
            flash.scale.set(1 - progress, 1 - progress, 1 - progress);
            flash.material.opacity = 0.8 * (1 - progress);
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
} 