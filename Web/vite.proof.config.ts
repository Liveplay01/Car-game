import { defineConfig } from 'vite';

/** The core's replay as one file for the ranking service (`Server/`): `Server/proof/proof.mjs`. */
export default defineConfig({
  publicDir: false,
  build: {
    ssr: 'src/core/proofEntry.ts',
    outDir: '../Server/proof',
    emptyOutDir: true,
    minify: false,
    rollupOptions: { output: { entryFileNames: 'proof.mjs', format: 'es' } },
  },
});
