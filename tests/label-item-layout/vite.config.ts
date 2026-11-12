import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),envDir:false,plugins:[{name:'synthetic-admin-transport',enforce:'pre',resolveId(source,importer){if(source==='../../lib/adminApi'&&importer?.includes('/src/pages/admin/'))return fileURLToPath(new URL('./api.ts',import.meta.url));}},react()],build:{outDir:'../../.artifacts/label-item-layout-app',emptyOutDir:true,target:'esnext'}});
