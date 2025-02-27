import * as THREE from 'three';

export class VoxelModel extends THREE.Group {
    constructor(config) {
        super();
        
        this.config = Object.assign({
            design: [],
            scale: 1,
            textured: false
        }, config);
        
        this.createModel();
    }
    
    createModel() {
        if (!this.config.design || this.config.design.length === 0) {
            console.warn('No design provided for VoxelModel');
            return;
        }
        
        // Create each voxel block
        this.config.design.forEach(block => {
            const mesh = this.createVoxel(block);
            this.add(mesh);
        });
        
        // Apply overall scale
        this.scale.set(
            this.config.scale,
            this.config.scale,
            this.config.scale
        );
    }
    
    createVoxel(block) {
        // Get block properties
        const position = block.position || [0, 0, 0];
        const size = block.size || [1, 1, 1];
        const color = block.color || 0xffffff;
        const textureType = block.textureType;
        
        // Create geometry
        const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
        
        // Create material
        let material;
        
        if (this.config.textured && textureType) {
            // Create textured material
            material = this.createTexturedMaterial(textureType);
        } else {
            // Create simple colored material
            material = new THREE.MeshLambertMaterial({
                color: color,
                flatShading: true
            });
        }
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        
        // Set position
        mesh.position.set(position[0], position[1], position[2]);
        
        // Add some slight rotation to make it look less perfect
        if (block.randomRotation) {
            mesh.rotation.set(
                Math.random() * 0.1 - 0.05,
                Math.random() * 0.1 - 0.05,
                Math.random() * 0.1 - 0.05
            );
        }
        
        return mesh;
    }
    
    createTexturedMaterial(textureType) {
        // This is a placeholder for texture loading
        // In a real implementation, you would load textures from files
        // For simplicity, we'll create procedural textures here
        
        const textures = {
            metal: this.createMetalTexture(),
            hull: this.createHullTexture(),
            cockpit: this.createCockpitTexture(),
            engine: this.createEngineTexture()
        };
        
        const texture = textures[textureType] || textures.hull;
        
        return new THREE.MeshLambertMaterial({
            map: texture,
            flatShading: true
        });
    }
    
    createMetalTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Fill with base color
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 0, 64, 64);
        
        // Add some noise for a metallic look
        for (let i = 0; i < 1000; i++) {
            const x = Math.floor(Math.random() * 64);
            const y = Math.floor(Math.random() * 64);
            const shade = Math.floor(Math.random() * 40) + 100;
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
            ctx.fillRect(x, y, 1, 1);
        }
        
        // Add some highlights
        for (let i = 0; i < 10; i++) {
            const x = Math.floor(Math.random() * 54) + 5;
            const y = Math.floor(Math.random() * 54) + 5;
            const radius = Math.floor(Math.random() * 3) + 1;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    createHullTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Fill with base color
        ctx.fillStyle = '#3366cc';
        ctx.fillRect(0, 0, 64, 64);
        
        // Add grid pattern
        ctx.strokeStyle = '#2255bb';
        ctx.lineWidth = 1;
        
        for (let i = 8; i < 64; i += 8) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(64, i);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 64);
            ctx.stroke();
        }
        
        // Add some panels
        for (let i = 0; i < 4; i++) {
            const x = Math.floor(Math.random() * 48) + 8;
            const y = Math.floor(Math.random() * 48) + 8;
            const width = Math.floor(Math.random() * 12) + 4;
            const height = Math.floor(Math.random() * 12) + 4;
            
            ctx.fillStyle = '#4477dd';
            ctx.fillRect(x, y, width, height);
            
            ctx.strokeStyle = '#5588ee';
            ctx.strokeRect(x, y, width, height);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    createCockpitTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Fill with base color
        ctx.fillStyle = '#88ccff';
        ctx.fillRect(0, 0, 64, 64);
        
        // Add reflective patterns
        for (let i = 0; i < 5; i++) {
            const x1 = Math.floor(Math.random() * 32);
            const y1 = Math.floor(Math.random() * 32);
            const x2 = x1 + Math.floor(Math.random() * 32) + 16;
            const y2 = y1 + Math.floor(Math.random() * 32) + 16;
            
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 64, 64);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    createEngineTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Fill with base color
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(0, 0, 64, 64);
        
        // Add some grate patterns
        ctx.fillStyle = '#aa2222';
        
        for (let y = 4; y < 64; y += 8) {
            for (let x = 4; x < 64; x += 8) {
                ctx.fillRect(x, y, 4, 2);
            }
        }
        
        // Add some hot spots
        for (let i = 0; i < 10; i++) {
            const x = Math.floor(Math.random() * 54) + 5;
            const y = Math.floor(Math.random() * 54) + 5;
            const radius = Math.floor(Math.random() * 3) + 1;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(1, 'rgba(255, 120, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
} 