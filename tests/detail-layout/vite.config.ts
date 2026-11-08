import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://fixture.invalid'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('synthetic-public-key'),
    'import.meta.env.VITE_ENABLE_PHASE2_ALIAS_OBSERVATION': JSON.stringify('false'),
  },
  build: { outDir: '../../.artifacts/detail-layout-app', emptyOutDir: true, target: 'esnext' },
});
