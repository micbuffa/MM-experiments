import { defineConfig } from 'vitest/config';
import { localRomsPlugin } from './src/dev/localRoms.ts';

export default defineConfig({
  plugins: [localRomsPlugin()],
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      deny: [
        '.env',
        '.env.*',
        '*.{crt,pem}',
        '**/.git/**',
        '**/roms/**',
        '**/local-roms/**',
      ],
    },
  },
  build: {
    rolldownOptions: {
      input: {
        main: 'index.html',
        scene: 'scene.html',
        terrain: 'terrain.html',
        remaster: 'remaster.html',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/game/**/*.ts',
        'src/remaster/engine/**/*.ts',
        'src/remaster/levels/**/*.ts',
        'src/remaster/level2/**/*.ts',
        'src/remaster/level3/**/*.ts',
        'src/remaster/level4/**/*.ts',
        'src/diagnostics/**/*.ts',
        'src/rendering/videoLayout.ts',
        'src/emulation/romArchive.ts',
        'src/emulation/config.ts',
        'src/emulation/localRoms.ts',
        'src/dev/**/*.ts',
        'src/input/**/*.ts',
        'src/emulation/coreInputPatch.ts',
        'src/emulation/coreVideoPatch.ts',
      ],
      exclude: ['src/**/*.test.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
