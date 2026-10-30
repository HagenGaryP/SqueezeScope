import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/test/setup.ts',
    css: true,
    // Playwright specs in e2e/ run via `npm run test:a11y`; .github/scripts tests use node:test.
    exclude: [...configDefaults.exclude, 'e2e/**', '.github/**'],
  }
});
