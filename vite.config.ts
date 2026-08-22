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
});
