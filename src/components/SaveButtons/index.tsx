/* ------------------------------------------------------------
 *  SvgViewer  ― PNG / GIF 保存ボタン付きビューワ
 *  ・/wasm/rust は動的 import（@vite-ignore でバンドル対象外）
 *  ・ビルド時に Rollup が wasm stub を探しに行かない
 * ------------------------------------------------------------ */
import type { FC } from 'react';
import { useState, useCallback } from 'react';
import GIF from 'gif.js';
import type { VisualizerSettingInfo } from '../../types';

/* wasm 側の型だけ宣言しておく（必要なら補完を拡張してください） */
type Wasm = {
  vis: (input: string, output: string, turn: number) => {
    svg: string;
    err: string;
    score: number | string;
  };
};

/* -------------------------------------------------- */
/* wasm を必要になった瞬間にロードするヘルパ          */
/*  ⚠️  @vite-ignore を付けて Vite の解決を止める     */
/* -------------------------------------------------- */
const loadWasm = async (): Promise<Wasm> =>
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await import(/* @vite-ignore */ '/wasm/rust');

type Props = { visualizerSettingInfo: VisualizerSettingInfo };

const SvgViewer: FC<Props> = ({ visualizerSettingInfo }) => {
  const [gifBtnLabel, setGifBtnLabel] = useState('Save as Animation GIF');
  const [gifBtnDisabled, setGifBtnDisabled] = useState(false);

  /* ------------ PNG 保存 ------------ */
  const onSavePng = useCallback(async () => {
    const { vis } = await loadWasm();

    const { svg } = vis(
      visualizerSettingInfo.input,
      visualizerSettingInfo.output,
      visualizerSettingInfo.turn,
    );

    const svgElem = new DOMParser()
      .parseFromString(svg, 'image/svg+xml')
      .getElementById('vis') as SVGSVGElement | null;
    if (!svgElem) return;

    const canvas = document.createElement('canvas');
    canvas.width = svgElem.width.baseVal.value;
    canvas.height = svgElem.height.baseVal.value;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'vis.png';
      a.click();
    };
    img.src =
      'data:image/svg+xml;base64,' +
      btoa(unescape(encodeURIComponent(svg)));
  }, [visualizerSettingInfo]);

  /* ------------ GIF 保存 ------------ */
  const onSaveGif = useCallback(async () => {
    setGifBtnDisabled(true);
    setGifBtnLabel('  0% finished');

    const { vis } = await loadWasm();
    const { input, output, maxTurn } = visualizerSettingInfo;

    const STEP = 1;
    const DELAY = (STEP * 2000) / 60; // 60FPS 換算
    const gif = new GIF({
      workers: 2,
      quality: 100,
      workerScript: 'node_modules/gif.js/dist/gif.worker.js',
    });

    gif.on('progress', (p: number) =>
      setGifBtnLabel(`${Math.round(50 + 50 * p).toString().padStart(3, ' ')}% finished`),
    );

    const addFrame = (t: number): void => {
      setGifBtnLabel(
        `${Math.round((50 * t) / maxTurn).toString().padStart(3, ' ')}% finished`,
      );

      const { svg } = vis(input, output, t);
      const svgElem = new DOMParser()
        .parseFromString(svg, 'image/svg+xml')
        .getElementById('vis') as SVGSVGElement | null;
      if (!svgElem) return;

      const canvas = document.createElement('canvas');
      canvas.width = svgElem.width.baseVal.value;
      canvas.height = svgElem.height.baseVal.value;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        gif.addFrame(canvas, { delay: t === maxTurn ? 3000 : DELAY });

        if (t < maxTurn) {
          addFrame(Math.min(t + STEP, maxTurn));
        } else {
          gif.on('finished', (blob: Blob) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'vis.gif';
            a.click();
            URL.revokeObjectURL(a.href);
            setGifBtnLabel('Save as Animation GIF');
            setGifBtnDisabled(false);
          });
          gif.render();
        }
      };
      img.src =
        'data:image/svg+xml;base64,' +
        btoa(unescape(encodeURIComponent(svg)));
    };

    addFrame(0);
  }, [visualizerSettingInfo]);

  /* ------------ UI ------------ */
  return (
    <div>
      <input type="button" value="Save as PNG" onClick={onSavePng} />
      <input
        type="button"
        value={gifBtnLabel}
        onClick={onSaveGif}
        disabled={gifBtnDisabled}
      />
    </div>
  );
};

export default SvgViewer;
