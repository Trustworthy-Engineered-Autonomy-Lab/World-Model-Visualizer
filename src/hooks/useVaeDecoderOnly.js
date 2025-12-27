
// src/visualizers/piwm/hooks/useVaeDecoderOnly.js
import { useEffect, useState } from "react";
import * as ort from "onnxruntime-web";

export function useVaeDecoderOnly(path = "/vae_decoder16.onnx") {
  const [vaeDec, setVaeDec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, _setError] = useState(null);

  const setError = (msg) => _setError(msg);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        _setError(null);

        // Match PIWM: force wasm EP explicitly for consistency
        const sessOpts = { executionProviders: ["wasm"] };
        const s = await ort.InferenceSession.create(path, sessOpts);

        if (cancelled) return;
        setVaeDec(s);
      } catch (e) {
        if (!cancelled) _setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { vaeDec, loading, error, setError };
}
