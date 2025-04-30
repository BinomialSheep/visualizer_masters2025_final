// src/types/wasm.d.ts
/**
 * wasm-bindgen が生成した JS/TS バインディングを
 * TypeScript に認識させるためのダミー型定義。
 *
 * “import { gen, vis } from '/wasm/rust';”
 * のエクスポートとシグネチャだけ書けば十分です。
 */

declare module '/wasm/rust' {
    /** 初期化関数 (デフォルト export) */
    const init: (wasmPath?: string | URL | Request) => Promise<void>;
    export default init;
  
    /** 入力生成 (seed, problemId) → input 文字列 */
    export function gen(seed: number, problemId: string): string;
  
    /** 最大ターン取得 */
    export function get_max_turn(input: string, output: string): number;
  
    /** 可視化 (turn 毎に SVG 等を返す) */
    export function vis(
      input: string,
      output: string,
      turn: number,
    ): {
      score: number; // i64 が JS に来ると string の場合もあるが今回は number で扱う
      err: string;
      svg: string;
    };
  }
  