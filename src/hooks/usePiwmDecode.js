
// src/visualizers/piwm/hooks/usePiwmDecode.js
import { useEffect, useRef } from "react";
import * as ort from "onnxruntime-web";
import { drawCHWFloatToCanvases } from "../utils/canvas";

export function usePiwmDecode({ piwmDec, piwmState, queueRef, smallRef, bigRef, onError }) {
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!piwmDec || !smallRef.current || !bigRef.current) return;

    const token = ++tokenRef.current;

    queueRef.current(async () => {
      if (token !== tokenRef.current) return;

      const s = new Float32Array([piwmState.x, piwmState.theta]);
      const sTensor = new ort.Tensor("float32", s, [1, 2]);

      const out = await piwmDec.run({ state: sTensor });
      if (token !== tokenRef.current) return;

      const img = out["image"];
      drawCHWFloatToCanvases(img.data, smallRef.current, bigRef.current);
    }).catch((e) => onError?.(String(e)));
  }, [piwmDec, piwmState, queueRef, smallRef, bigRef, onError]);
}
