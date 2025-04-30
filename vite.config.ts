// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  /* ----------★ 1. GH Pages 用ベースパス ---------- */
  base: '/visualizer_masters2025_final/',

  plugins: [react()],

  /* ----------★ 2. Rust→WASM の仮想パスを解決 ---------- */
  resolve: {
    alias: {
      // ビルド結果:  /visualizer_masters2025_final/wasm/rust.js
      '/wasm/rust': path.resolve(__dirname, 'public/wasm/rust.js'),
    },
  },
});
