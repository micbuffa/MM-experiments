import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist-beta',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        beta: 'beta.html',
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4174,
  },
});
