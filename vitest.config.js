import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['apps/coach-app/src/**/*.test.js', 'tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['apps/coach-app/src/**/*.js'],
      exclude: ['apps/coach-app/src/**/*.test.js']
    }
  }
});
