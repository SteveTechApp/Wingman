import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY)
      },
      resolve: {
        alias: {
          // @ts-ignore - Fix: __dirname is not available in all module systems. path.resolve('.') resolves from the current working directory, which is the project root when running Vite.
          '@': path.resolve('.'),
        }
      }
    };
});