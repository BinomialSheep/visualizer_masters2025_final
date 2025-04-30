// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 「import ... from '/wasm/rust'」という仮想パスを
      // 実際にビルド後 public に置かれる JS へマッピングする
      '/wasm/rust': path.resolve(__dirname, 'public/wasm/rust.js'),
    },
  },
});
