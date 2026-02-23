export function createVitestConfig() {
  return {
    test: {
      environment: 'happy-dom',
      globals: true,
      include: ['src/**/*.test.js'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.js'],
        exclude: ['src/**/*.test.js'],
      },
    },
  };
}
