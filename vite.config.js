import { defineConfig } from 'vite';

export default defineConfig({
  // VITE_BASE=/nexus-2026/ para GitHub Pages, '/' para Render
  base: process.env.VITE_BASE ?? '/',
});
