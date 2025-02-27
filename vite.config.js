import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    assetsDir: 'assets',
    minify: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    },
  },
  server: {
    host: true,
    open: true,
    port: 3000
  }
}); 