import * as THREE from 'three';

export class SpaceAnomaly extends THREE.Object3D {
    constructor(config) {
        super();
        
        this.config = Object.assign({
            type: 'wormhole', // 'wormhole', 'blackhole'
            position: new THREE.Vector3(0, 0, 0),
            radius: 50,
            destination: null, // For wormholes: where they lead to
            intensity: 1, // For black holes: gravitational pull strength
            scene: null,
            physicsSystem: null
        }, config);
        
        // Set properties
        this.type = 'anomaly'; // For object type identification
        this.anomalyType = this.config.type;
        this.radius = this.config.radius;
        this.position.copy(this.config.position);
        this.destination = this.config.destination;
        this.intensity = this.config.intensity;
        this.physicsSystem = this.config.physicsSystem;
        this.active = true;
        
        // Create the anomaly
        this.createAnomaly();
        
        // Add to scene
        if (this.config.scene) {
            this.config.scene.add(this);
        }
        
        // Add to physics system if available
        if (this.physicsSystem) {
            this.physicsSystem.addObject(this);
        }
    }
    
    createAnomaly() {
        if (this.anomalyType === 'wormhole') {
            this.createWormhole();
        } else if (this.anomalyType === 'blackhole') {
            this.createBlackhole();
        }
    }
    
    createWormhole() {
        // Create a wormhole visualization
        const wormholeGeometry = new THREE.TorusGeometry(this.radius, this.radius / 3, 16, 100);
        const wormholeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        this.anomalyMesh = new THREE.Mesh(wormholeGeometry, wormholeMaterial);
        this.add(this.anomalyMesh);
        
        // Add a point light in the center
        const light = new THREE.PointLight(0x00ffff, 2, this.radius * 10);
        this.add(light);
        
        // Add particle system for the wormhole effect
        this.createParticleSystem(0x00ffff, 2);
        
        // Add event horizon - inner disk
        const eventHorizonGeometry = new THREE.CircleGeometry(this.radius * 0.8, 32);
        const eventHorizonMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        this.eventHorizon = new THREE.Mesh(eventHorizonGeometry, eventHorizonMaterial);
        this.add(this.eventHorizon);
    }
    
    createBlackhole() {
        // Create a black hole visualization
        const blackholeGeometry = new THREE.SphereGeometry(this.radius, 32, 32);
        const blackholeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.9
        });
        
        this.anomalyMesh = new THREE.Mesh(blackholeGeometry, blackholeMaterial);
        this.add(this.anomalyMesh);
        
        // Add accretion disk
        const diskGeometry = new THREE.RingGeometry(this.radius * 1.2, this.radius * 3, 32);
        const diskMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        this.accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
        this.accretionDisk.rotation.x = Math.PI / 2;
        this.add(this.accretionDisk);
        
        // Add particle system for the black hole effect
        this.createParticleSystem(0xff3300, 3);
        
        // Add gravitational lensing effect (simplified)
        const lensGeometry = new THREE.SphereGeometry(this.radius * 1.1, 32, 32);
        const lensMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        this.lensingEffect = new THREE.Mesh(lensGeometry, lensMaterial);
        this.add(this.lensingEffect);
    }
    
    createParticleSystem(color, speed) {
        // Create particles for visual effect
        const particleCount = 1000;
        const particles = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Random position in a sphere
            const radius = this.radius * (1 + Math.random());
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            // Store velocity for animation
            velocities.push({
                x: (Math.random() - 0.5) * speed,
                y: (Math.random() - 0.5) * speed,
                z: (Math.random() - 0.5) * speed
            });
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            color: color,
            size: 2,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        // Create particle system
        this.particleSystem = new THREE.Points(particles, particleMaterial);
        this.add(this.particleSystem);
        
        // Store velocities for animation
        this.particleVelocities = velocities;
    }
    
    update(delta) {
        // Rotate the anomaly for visual effect
        if (this.anomalyMesh) {
            this.anomalyMesh.rotation.y += 0.2 * delta;
            this.anomalyMesh.rotation.z += 0.1 * delta;
        }
        
        // For black holes, rotate the accretion disk
        if (this.anomalyType === 'blackhole' && this.accretionDisk) {
            this.accretionDisk.rotation.z += 0.3 * delta;
        }
        
        // For wormholes, rotate the event horizon
        if (this.anomalyType === 'wormhole' && this.eventHorizon) {
            this.eventHorizon.rotation.z += 0.5 * delta;
        }
        
        // Update particle system
        if (this.particleSystem && this.particleVelocities) {
            const positions = this.particleSystem.geometry.attributes.position.array;
            
            for (let i = 0; i < positions.length / 3; i++) {
                // Get current position
                const x = positions[i * 3];
                const y = positions[i * 3 + 1];
                const z = positions[i * 3 + 2];
                
                // Calculate distance from center
                const distance = Math.sqrt(x * x + y * y + z * z);
                
                // For black holes, particles move inward
                if (this.anomalyType === 'blackhole') {
                    // Direction to center
                    const dx = -x / distance;
                    const dy = -y / distance;
                    const dz = -z / distance;
                    
                    // Move toward center faster when closer
                    const pullFactor = (this.radius * 3) / Math.max(distance, 0.1);
                    
                    positions[i * 3] += dx * pullFactor * delta * this.intensity;
                    positions[i * 3 + 1] += dy * pullFactor * delta * this.intensity;
                    positions[i * 3 + 2] += dz * pullFactor * delta * this.intensity;
                    
                    // If too close to center, reset to outer radius
                    if (distance < this.radius * 0.8) {
                        const newRadius = this.radius * (2 + Math.random());
                        const theta = Math.random() * Math.PI * 2;
                        const phi = Math.acos(2 * Math.random() - 1);
                        
                        positions[i * 3] = newRadius * Math.sin(phi) * Math.cos(theta);
                        positions[i * 3 + 1] = newRadius * Math.sin(phi) * Math.sin(theta);
                        positions[i * 3 + 2] = newRadius * Math.cos(phi);
                    }
                } 
                // For wormholes, particles spiral around
                else if (this.anomalyType === 'wormhole') {
                    // Spiral motion
                    const angle = 0.5 * delta;
                    const cosAngle = Math.cos(angle);
                    const sinAngle = Math.sin(angle);
                    
                    // Rotate around y-axis
                    const newX = x * cosAngle - z * sinAngle;
                    const newZ = x * sinAngle + z * cosAngle;
                    
                    positions[i * 3] = newX;
                    positions[i * 3 + 2] = newZ;
                    
                    // Pulsate in and out
                    const pulseFactor = Math.sin(Date.now() * 0.001) * 0.1;
                    const direction = distance < this.radius ? 1 : -1;
                    
                    positions[i * 3] *= 1 + pulseFactor * direction;
                    positions[i * 3 + 1] *= 1 + pulseFactor * direction;
                    positions[i * 3 + 2] *= 1 + pulseFactor * direction;
                }
            }
            
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    // Method to check if a spacecraft is close enough to interact
    isSpacecraftInRange(spacecraft) {
        if (!spacecraft) return false;
        
        const distance = this.position.distanceTo(spacecraft.position);
        return distance < this.radius * 2;
    }
    
    // Method to handle spacecraft interaction
    interactWithSpacecraft(spacecraft) {
        if (!spacecraft || !this.active) return false;
        
        if (this.anomalyType === 'wormhole' && this.destination) {
            // Teleport spacecraft to destination
            spacecraft.position.copy(this.destination);
            
            // Add some velocity in the forward direction
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(spacecraft.quaternion);
            spacecraft.velocity.copy(forward.multiplyScalar(50));
            
            return true;
        } 
        else if (this.anomalyType === 'blackhole') {
            // Black holes damage spacecraft
            if (spacecraft.takeDamage) {
                spacecraft.takeDamage(10 * this.intensity);
            }
            
            // Pull spacecraft toward black hole
            const direction = new THREE.Vector3().subVectors(this.position, spacecraft.position).normalize();
            const pullStrength = (this.radius * 5) / Math.max(this.position.distanceTo(spacecraft.position), 0.1);
            
            spacecraft.velocity.add(direction.multiplyScalar(pullStrength * this.intensity));
            
            return true;
        }
        
        return false;
    }
    
    // Method to get collision bounds for physics
    getCollisionBounds() {
        return new THREE.Sphere(this.position, this.radius);
    }
} 