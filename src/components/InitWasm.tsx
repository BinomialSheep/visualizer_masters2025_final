import { FC, useEffect, useState } from 'react';
import AHCLikeVisualizer from './AHCLikeVisualizer';

/**
 * wasm と JS ラッパーの配置
 *   public/
 *     └─ wasm/
 *         ├─ rust.js
 *         └─ rust_bg.wasm
 *
 * `import.meta.env.BASE_URL` は
 *   - dev サーバー: '/'
 *   - GitHub Pages: '/visualizer_masters2025_final/'
 * になるので、環境ごとに正しい URL を組み立てられる。
 */
const wasmBase = `${import.meta.env.BASE_URL}wasm/`;

const InitWasm: FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // rust.js は文字列結合なので Vite の静的解析を回避する
      const { default: init } = await import(
        /* @vite-ignore */ `${wasmBase}rust.js`
      );

      // wasm ファイルの URL を渡して初期化
      await init(`${wasmBase}rust_bg.wasm`);
      setReady(true);
    })().catch((e) => console.error('wasm init error:', e));
  }, []);

  return ready ? <AHCLikeVisualizer /> : null;
};

export default InitWasm;
