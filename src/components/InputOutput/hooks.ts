import JSZip from 'jszip';

/** 入力 ZIP を生成してダウンロードさせるカスタムフック */
export const useDownloadInput = (): {
  downloadInput: (
    seed: number,
    problemId: string,
    downloadCases: number,
    setButtonText: (content: string) => void,
  ) => Promise<void>;
} => {
  /** Download ボタンが押されたときの処理 */
  const downloadInput = async (
    seed: number,
    problemId: string,
    downloadCases: number,
    setButtonText: (content: string) => void,
  ): Promise<void> => {
    /* ─────────────── wasm を動的ロード ─────────────── */
    // Vite のバンドル対象にさせないために @vite-ignore を付ける
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { gen } = await import(/* @vite-ignore */ '/wasm/rust');
    /* ──────────────────────────────────────────────── */

    const zip = new JSZip();

    for (let i = 0; i < downloadCases; i++) {
      const inputString = gen(seed + i, problemId); // gen は 2 引数のまま
      zip.file(`${String(seed + i).padStart(4, '0')}.txt`, inputString);
    }

    await zip
      .generateAsync(
        { type: 'blob' },
        (e) =>
          setButtonText(
            `${Math.round(e.percent).toString().padStart(3, ' ')}% finished`,
          ),
      )
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'in.zip';
        a.click();
        URL.revokeObjectURL(a.href);
        setButtonText('Download');
      });
  };

  return { downloadInput };
};
