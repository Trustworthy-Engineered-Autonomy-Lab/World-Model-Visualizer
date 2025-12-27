
// src/visualizers/piwm/hooks/useVaeDecode.js
import { useEffect, useRef } from "react";
import * as ort from "onnxruntime-web";
import { drawCHWFloatToCanvases } from "../utils/canvas";

export function useVaeDecode({ vaeDec, latent, queueRef, smallRef, bigRef, onError }) {
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!vaeDec || !smallRef.current || !bigRef.current) return;

    const token = ++tokenRef.current;

    queueRef.current(async () => {
      if (token !== tokenRef.current) return;

      const z = new Float32Array(latent.length);
      for (let i = 0; i < latent.length; i++) z[i] = latent[i];

      const zTensor = new ort.Tensor("float32", z, [1, latent.length]);
      const out = await vaeDec.run({ z: zTensor });
      if (token !== tokenRef.current) return;

      const xRecon = out["x_recon"];
      drawCHWFloatToCanvases(xRecon.data, smallRef.current, bigRef.current);
    }).catch((e) => onError?.(String(e)));
  }, [vaeDec, latent, queueRef, smallRef, bigRef, onError]);
}
