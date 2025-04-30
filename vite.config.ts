import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // GitHub Pages の URL
  base: '/visualizer_masters2025_final/',   // ←★ここを必ず設定
  plugins: [react(), tsconfigPaths()],
});
