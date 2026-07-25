import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'architecture/tests/**/*.test.ts',
      'server/fsrs-v4/observation-layer/__tests__/**/*.test.ts',
      'server/fsrs-v4/architecture/__tests__/**/*.test.ts'
    ],
    environment: 'node',
    globals: true,
  },
});
