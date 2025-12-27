// src/VaeLatentVisualizer.jsx
import React, { useEffect, useState, useRef } from "react";
import { useOrtRuntime } from "./hooks/useOrtRuntime";
import { useRunQueue } from "./hooks/useRunQueue";
import { IMG_H, IMG_W } from "./utils/canvas";
import { useVaeDecoderOnly } from "./hooks/useVaeDecoderOnly";
import { useVaeDecode } from "./hooks/useVaeDecode";

const LATENT_DIM = 16;
const SCALE = 4; // upscale factor → 96 * 4 = 384

const UNUSED_LATENTS = [0, 2, 1, 3, 4, 6, 7, 8, 13, 14];

function VaeLatentVisualizer() {
  // ORT runtime config (same as PIWM: single-thread, simd, no proxy)
  useOrtRuntime();

  // Single global queue to serialize ORT runs (prevents ORT wasm overlap issues)
  const ortQueueRef = useRunQueue();

  // Load ONLY the decoder session (reusing PIWM loader pattern)
  const { vaeDec: session, loading, error, setError } = useVaeDecoderOnly();

  const [latent, setLatent] = useState(() => Array(LATENT_DIM).fill(0));

  // small offscreen canvas (96x96)
  const smallCanvasRef = useRef(null);
  // big visible canvas (384x384)
  const bigCanvasRef = useRef(null);

  // Decode on latent change (reuses your exact pixel pipeline via drawCHWFloatToCanvases)
  useVaeDecode({
    vaeDec: session,
    latent,
    queueRef: ortQueueRef,
    smallRef: smallCanvasRef,
    bigRef: bigCanvasRef,
    onError: (msg) => setError?.(msg),
  });

  const handleSliderChange = (idx, value) => {
    setLatent((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const resetLatent = () => {
    setLatent(Array(LATENT_DIM).fill(0));
  };

  const randomLatent = () => {
    // sample z ~ N(0,1) via Box–Muller
    const arr = [];
    for (let i = 0; i < LATENT_DIM; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const r = Math.sqrt(-2.0 * Math.log(Math.max(u1, 1e-8)));
      const theta = 2.0 * Math.PI * u2;
      const z = r * Math.cos(theta);
      arr.push(z);
    }
    setLatent(arr);
  };

  // --- Optional: preserve old "decode on mount" behavior even if latent is all zeros ---
  // useVaeDecode already runs on first render since latent is initialized.
  // No additional effect needed.

  return (
    <div style={{ justifyContent: "center", padding: 16, fontFamily: "sans-serif" }}>
      {loading && <p>Loading ONNX model…</p>}
      {error && (
        <p style={{ color: "red", whiteSpace: "pre-wrap" }}>
          Error: {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Sliders */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 52,
            maxHeight: "100%",
            maxWidth: "100%",
            overflowY: "auto",
          }}
        >
          {latent.map((value, i) => {
            const isUnused = UNUSED_LATENTS.includes(i);

            return (
              <div key={i}>
                <label
                  style={{
                    display: "block",
                    fontSize: 20,
                    marginBottom: 4,
                    fontFamily: "monospace",
                    color: isUnused ? "#888" : "#000",
                  }}
                >
                  z[{i}] = {value.toFixed(2)}
                </label>
                <input
                  type="range"
                  min={-3}
                  max={3}
                  step={0.05}
                  value={value}
                  onChange={(e) => handleSliderChange(i, Number(e.target.value))}
                  style={{
                    width: 200,
                    accentColor: isUnused ? "#888888" : "#2563eb",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Canvases */}
        <div>
          {/* offscreen small canvas (96x96) */}
          <p style={{ fontSize: 25, color: "#666", marginBottom: 8 }}>
            Decoded image
          </p>

          <canvas
            ref={smallCanvasRef}
            width={IMG_W}
            height={IMG_H}
            style={{ display: "none" }}
          />

          <canvas
            ref={bigCanvasRef}
            width={IMG_W * SCALE}
            height={IMG_H * SCALE}
            style={{
              width: `${IMG_W * SCALE}px`,
              height: `${IMG_H * SCALE}px`,
              imageRendering: "pixelated",
              border: "1px solid #ccc",
              backgroundColor: "#000",
            }}
          />

          <div style={{ marginTop: 20 }}>
            <button onClick={resetLatent} style={{ padding: "8px 16px", fontSize: 25 }}>
              Reset Latent
            </button>
            <button
              onClick={randomLatent}
              style={{ padding: "8px 16px", fontSize: 25, marginLeft: 17 }}
            >
              Random latent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VaeLatentVisualizer;

