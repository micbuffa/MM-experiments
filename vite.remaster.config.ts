import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
  },
  build: {
    outDir: 'dist-remaster',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        remaster: 'remaster.html',
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4175,
  },
});
