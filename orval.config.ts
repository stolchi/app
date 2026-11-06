import { defineConfig } from 'orval';

export default defineConfig({
  stolchi: {
    input: process.env.API_DOCS_URL ?? 'http://localhost:4000/api/docs-json',
    output: {
      mode: 'tags-split',
      target: './src/shared/api/generated/endpoints.ts',
      schemas: './src/shared/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: { path: './src/shared/api/client.ts', name: 'apiFetch' },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
});
