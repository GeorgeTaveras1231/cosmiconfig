import { defineConfig } from 'vitest/config';

const vitestConfig = defineConfig({
  test: {
    threads: false, // todo
    environment: 'node',
    restoreMocks: true,
    mockReset: true,
    includeSource: ['src/**/*.{js,ts}'],
    coverage: {
      provider: 'istanbul', // or 'c8'
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,ts}'],
    },
  },
});

// eslint-disable-next-line import/no-default-export
export default vitestConfig;
