
// src/visualizers/piwm/hooks/useOrtRuntime.js
import { useEffect } from "react";
import * as ort from "onnxruntime-web";

export function useOrtRuntime() {
  useEffect(() => {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;
    ort.env.wasm.proxy = false;
  }, []);
}
