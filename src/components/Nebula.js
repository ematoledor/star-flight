import * as THREE from 'three';

export class Nebula extends THREE.Object3D {
    constructor(config) {
        super();
        
        // Ensure config is an object
        config = config || {};
        
        this.config = Object.assign({
            position: new THREE.Vector3(0, 0, 0),
            radius: 1000,
            color: 0xff5577,
            scene: null,
            density: 0.3,
            particleSize: 80
        }, config);
        
        // Safely copy position
        try {
            if (this.config.position instanceof THREE.Vector3) {
                this.position.copy(this.config.position);
            } else {
                console.warn("Nebula: Invalid position provided, using default");
                this.position.set(0, 0, 0);
            }
        } catch (e) {
            console.error("Nebula: Error setting position:", e);
            this.position.set(0, 0, 0);
        }
        
        this.scene = this.config.scene;
        this.particles = [];
        this.time = 0;
        
        // Add this object to the scene
        if (this.scene) {
            try {
                this.scene.add(this);
            } catch (e) {
                console.error("Nebula: Could not add to scene:", e);
            }
        }
        
        // Create nebula effect
        try {
            this.createNebula();
        } catch (e) {
            console.error("Nebula: Error creating nebula effect:", e);
        }
    }
    
    createNebula() {
        // Create nebula using particle system for volumetric effect
        const particleCount = Math.floor(this.config.radius * this.config.density);
        
        // Create different layers of particles for depth effect
        this.createParticleLayer(particleCount, 1.0);
        this.createParticleLayer(Math.floor(particleCount * 0.6), 0.7);
        this.createParticleLayer(Math.floor(particleCount * 0.3), 0.4);
        
        // Add central glow
        this.createCentralGlow();
    }
    
    createParticleLayer(count, opacity) {
        // Create particles geometry
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        
        // Base color from config
        const baseColor = new THREE.Color(this.config.color);
        
        // Secondary color for variation (complementary or analogous)
        const hsl = {};
        baseColor.getHSL(hsl);
        
        // Create slightly different hue
        const secondaryColor = new THREE.Color().setHSL(
            (hsl.h + 0.1) % 1.0,
            hsl.s,
            hsl.l
        );
        
        // Fill arrays with random positions and sizes
        for (let i = 0; i < count; i++) {
            // Get random position within nebula volume (sphere)
            const position = this.getRandomPointInSphere(this.config.radius);
            
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            // Random size variation
            sizes[i] = (0.5 + Math.random() * 1.0) * this.config.particleSize;
            
            // Interpolate between colors for variation
            const colorMix = Math.random();
            colors[i * 3] = baseColor.r * colorMix + secondaryColor.r * (1 - colorMix);
            colors[i * 3 + 1] = baseColor.g * colorMix + secondaryColor.g * (1 - colorMix);
            colors[i * 3 + 2] = baseColor.b * colorMix + secondaryColor.b * (1 - colorMix);
        }
        
        // Create buffer geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Create shader material for better looking particles
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                opacity: { value: opacity }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    
                    // Apply a subtle wobble effect
                    vec3 pos = position;
                    float wobble = sin(time * 0.5 + position.x * 0.01 + position.y * 0.01 + position.z * 0.01) * 10.0;
                    pos.x += wobble;
                    pos.y += wobble;
                    pos.z += wobble;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                uniform float opacity;
                
                void main() {
                    // Create soft, circular particles
                    float r = 0.5 * length(gl_PointCoord - vec2(0.5, 0.5));
                    float alpha = opacity * (1.0 - smoothstep(0.4, 0.5, r));
                    
                    if (alpha < 0.01) discard;
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
            transparent: true
        });
        
        // Create particle system
        const particleSystem = new THREE.Points(geometry, material);
        this.add(particleSystem);
        
        // Store reference for animation
        this.particles.push(particleSystem);
    }
    
    createCentralGlow() {
        // Add a central glow point light
        const light = new THREE.PointLight(this.config.color, 1.5, this.config.radius * 2);
        light.position.set(0, 0, 0);
        this.add(light);
        
        // Add ambient glow sphere
        const geometry = new THREE.SphereGeometry(this.config.radius * 0.2, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: this.config.color,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        
        const glowSphere = new THREE.Mesh(geometry, material);
        this.add(glowSphere);
        
        // Store for animation
        this.centralGlow = {
            light: light,
            mesh: glowSphere
        };
    }
    
    getRandomPointInSphere(radius) {
        // Generate random point within a sphere with distance bias (more particles toward center)
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        // Apply square root for density bias (more particles toward center)
        const r = radius * Math.sqrt(Math.random());
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        return new THREE.Vector3(x, y, z);
    }
    
    update(delta) {
        // Update time parameter for animation
        this.time += delta;
        
        // Update particle systems
        this.particles.forEach(particleSystem => {
            particleSystem.material.uniforms.time.value = this.time;
            
            // Slowly rotate the particle system for additional movement
            particleSystem.rotation.y += delta * 0.03;
            particleSystem.rotation.z += delta * 0.01;
        });
        
        // Animate central glow
        if (this.centralGlow) {
            // Pulsate the light intensity
            const pulseIntensity = 1.2 + 0.5 * Math.sin(this.time * 0.7);
            this.centralGlow.light.intensity = pulseIntensity;
            
            // Pulsate the glow size
            const pulseSize = 1.0 + 0.1 * Math.sin(this.time * 0.5);
            this.centralGlow.mesh.scale.set(pulseSize, pulseSize, pulseSize);
        }
    }
} 