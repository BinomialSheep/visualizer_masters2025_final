import { FC, useEffect, useRef, useState } from 'react';
import type { VisualizerResult, VisualizerSettingInfo } from '../types';

import Description from './Description';
import FileUploader from './FileUploader';
import InputOutput from './InputOutput';
import SaveButtons from './SaveButtons';
import SvgViewer from './SvgViewer';
import TurnSlider from './TurnSlider';

/* wasm ロード用共通関数 */
const wasmBase = `${import.meta.env.BASE_URL}wasm/`;

const wasmReady = (async () => {
  const {
    default: init,
    gen,
    get_max_turn,
    vis,
  } = await import(/* @vite-ignore */ `${wasmBase}rust.js`);
  await init(`${wasmBase}rust_bg.wasm`);
  return { gen, get_max_turn, vis };
})();

const AHCLikeVisualizer: FC = () => {
  /* ─────────────── state ─────────────── */
  const [visualizerSettingInfo, setVisualizerSettingInfo] =
    useState<VisualizerSettingInfo>({
      input: '',
      output: '',
      seed: 0,
      turn: 0,
      maxTurn: 0,
      problemId: 'A',
    });

  const [visualizerResult, setVisualizerResult] = useState<VisualizerResult>({
    svgString: '',
    err: '',
    score: 0,
  });

  const wasmRef = useRef<Awaited<typeof wasmReady>>();

  /* wasm 初期化（1 回だけ） */
  useEffect(() => {
    wasmReady
      .then((m) => {
        wasmRef.current = m;
        const inputText = m.gen(
          visualizerSettingInfo.seed,
          visualizerSettingInfo.problemId,
        );
        setVisualizerSettingInfo((prev) => ({ ...prev, input: inputText }));
      })
      .catch((e) => console.error('wasm init error:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* seed または problemId が変わったら入力を再生成 */
  useEffect(() => {
    if (!wasmRef.current) return;
    const inputText = wasmRef.current.gen(
      visualizerSettingInfo.seed,
      visualizerSettingInfo.problemId,
    );
    setVisualizerSettingInfo((prev) => ({ ...prev, input: inputText }));
  }, [visualizerSettingInfo.seed, visualizerSettingInfo.problemId]);

  /* output / input が変わったら maxTurn を更新 */
  useEffect(() => {
    if (!wasmRef.current) return;
    try {
      const maxTurn = wasmRef.current.get_max_turn(
        visualizerSettingInfo.input,
        visualizerSettingInfo.output,
      );
      setVisualizerSettingInfo((prev) => ({ ...prev, maxTurn, turn: 0 }));
    } catch {
      setVisualizerSettingInfo((prev) => ({ ...prev, maxTurn: 0, turn: 0 }));
    }
  }, [visualizerSettingInfo.output, visualizerSettingInfo.input]);

  /* vis を呼び出して SVG / score 更新 */
  useEffect(() => {
    if (!wasmRef.current) return;
    try {
      const ret = wasmRef.current.vis(
        visualizerSettingInfo.input,
        visualizerSettingInfo.output,
        visualizerSettingInfo.turn,
      );
      setVisualizerResult({
        svgString: ret.svg,
        err: ret.err,
        score: Number(ret.score),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setVisualizerResult({
        svgString: 'invalid input or output',
        err: msg,
        score: 0,
      });
    }
  }, [
    visualizerSettingInfo.turn,
    visualizerSettingInfo.input,
    visualizerSettingInfo.output,
  ]);

  /* ─────────────── UI ─────────────── */
  return (
    <>
      <Description />
      <hr />
      <FileUploader setVisualizerSettingInfo={setVisualizerSettingInfo} />
      <InputOutput
        visualizerSettingInfo={visualizerSettingInfo}
        setVisualizerSettingInfo={setVisualizerSettingInfo}
      />
      <SaveButtons visualizerSettingInfo={visualizerSettingInfo} />
      <TurnSlider
        visualizerSettingInfo={visualizerSettingInfo}
        setVisualizerSettingInfo={setVisualizerSettingInfo}
      />
      <hr />
      <SvgViewer
        svgString={visualizerResult.svgString}
        err={visualizerResult.err}
        score={visualizerResult.score}
      />
    </>
  );
};

export default AHCLikeVisualizer;
