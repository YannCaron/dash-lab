import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ command }) => ({
  root: `${projectRoot}/demo`,
  plugins: [react()],
  resolve: {
    alias:
      command === 'serve'
        ? [
            { find: /^@cyann\/dash-lab$/, replacement: `${projectRoot}/src/index.ts` },
            { find: /^@cyann\/dash-lab\/style.css$/, replacement: `${projectRoot}/src/styles.css` },
          ]
        : [],
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true, fs: { allow: [projectRoot] } },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { outDir: `${projectRoot}/demo-dist`, emptyOutDir: true },
}));
