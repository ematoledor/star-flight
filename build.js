// Custom build script for Vercel
import { execSync } from 'child_process';

console.log('Starting custom build process...');

try {
  // Run Vite build using the locally installed version
  console.log('Running Vite build...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 