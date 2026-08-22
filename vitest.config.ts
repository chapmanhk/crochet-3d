import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@scene': path.resolve(__dirname, 'src/scene'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@store': path.resolve(__dirname, 'src/store'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
