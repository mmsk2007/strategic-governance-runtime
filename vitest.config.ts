import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@srg/types': './src/types/index.ts',
      '@srg/core': './src/core/index.ts',
      '@srg/authority': './src/authority/index.ts',
      '@srg/delegation': './src/delegation/index.ts',
      '@srg/artifact': './src/artifact/index.ts',
      '@srg/replay': './src/replay/index.ts',
      '@srg/arbitration': './src/arbitration/index.ts',
      '@srg/consistency': './src/consistency/index.ts',
      '@srg/observability': './src/observability/index.ts',
      '@srg/provenance': './src/provenance/index.ts',
      '@srg/adapters': './src/adapters/index.ts',
      '@srg/layers': './src/layers/index.ts',
      '@srg/stress': './src/stress/index.ts',
    },
  },
});
