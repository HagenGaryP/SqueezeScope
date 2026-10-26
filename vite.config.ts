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
    // Playwright browser specs live in e2e/ and run via `npm run test:a11y`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  }
});
