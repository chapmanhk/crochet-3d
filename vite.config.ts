import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@scene': path.resolve(__dirname, 'src/scene'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@store': path.resolve(__dirname, 'src/store'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@dimforge/rapier') || id.includes('@react-three/rapier')) {
            return 'rapier';
          }
          if (id.includes('node_modules/three')) {
            return 'three';
          }
          if (
            id.includes('node_modules/@react-three/fiber') ||
            id.includes('node_modules/@react-three/drei')
          ) {
            return 'r3f';
          }
          if (id.includes('/src/scene/')) {
            return 'scene';
          }
        },
      },
    },
  },
});
