// src/visualizers/piwm/PIWMVisualizer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

import { useOrtRuntime } from "./hooks/useOrtRuntime";
import { usePiwmModels } from "./hooks/usePiwmModels";
import { useRunQueue } from "./hooks/useRunQueue";
import { useVaeDecode } from "./hooks/useVaeDecode";
import { usePiwmDecode } from "./hooks/usePiwmDecode";
import { usePiwmControls } from "./hooks/usePiwmControls";

import { IMG_H, IMG_W, blitUpscale } from "./utils/canvas";
import { renderObservationTo96 } from "./utils/render.js";

const SCALE = 4;

const LATENT_DIM = 16;
// LSTM ONNX must match
const NUM_LAYERS = 2;
const HIDDEN_DIM = 128;

// render canvas (match python)
const RENDER_W = 600;
const RENDER_H = 400;

export default function PIWMVisualizer() {
  // ---- ORT runtime config ----
  useOrtRuntime();

  // ---- models ----
  const { vaeEnc, vaeDec, lstm, piwmEnc, piwmDec, loading, error, setError } = usePiwmModels();

  // ---- state: Ground truth full state ----
  const [gtState, setGtState] = useState({
    x: 0,
    xDot: 0,
    theta: 0,
    thetaDot: 0,
  });

  // ---- state: LSTM latent + hidden ----
  const [latent, setLatent] = useState(() => Array(LATENT_DIM).fill(0));
  const [hData, setHData] = useState(null);
  const [cData, setCData] = useState(null);

  // ---- state: PIWM state (decoder uses only x/theta) ----
  const [piwmState, setPiwmState] = useState({
    x: 0,
    xDot: 0,
    theta: 0,
    thetaDot: 0,
  });

  // ---- refs - GT renderer ----
  const gtRenderCanvasRef = useRef(null);
  const gtSmallCanvasRef = useRef(null);
  const gtBigCanvasRef = useRef(null);

  // ---- refs - VAE latent decoded image ----
  const latentSmallCanvasRef = useRef(null);
  const latentBigCanvasRef = useRef(null);

  // ---- refs - PIWM decoded image ----
  const piwmSmallCanvasRef = useRef(null);
  const piwmBigCanvasRef = useRef(null);

  // IMPORTANT: ONE global queue for *all* ORT runs (prevents Session already started)
  const ortQueueRef = useRunQueue();

  // ---- GT render effect ----
  useEffect(() => {
    if (!gtRenderCanvasRef.current || !gtSmallCanvasRef.current || !gtBigCanvasRef.current) return;

    renderObservationTo96({
      position: gtState.x,
      angle: gtState.theta,
      renderCanvas: gtRenderCanvasRef.current,
      smallCanvas96: gtSmallCanvasRef.current,
      renderW: RENDER_W,
      renderH: RENDER_H,
    });

    blitUpscale(gtSmallCanvasRef.current, gtBigCanvasRef.current);
  }, [gtState]);

  // ---- decode hooks ----
  useVaeDecode({
    vaeDec,
    latent,
    queueRef: ortQueueRef,
    smallRef: latentSmallCanvasRef,
    bigRef: latentBigCanvasRef,
    onError: (msg) => setError?.(msg),
  });

  usePiwmDecode({
    piwmDec,
    piwmState,
    queueRef: ortQueueRef,
    smallRef: piwmSmallCanvasRef,
    bigRef: piwmBigCanvasRef,
    onError: (msg) => setError?.(msg),
  });

  // ---- controls (sync + action stepping) ----
  const { syncGT, stepWithAction } = usePiwmControls({
    vaeEnc,
    piwmEnc,
    lstm,
    queueRef: ortQueueRef,
    gtSmallCanvasRef,

    latent,
    setLatent,
    hData,
    setHData,
    cData,
    setCData,

    setGtState,
    setPiwmState,

    onError: (msg) => setError?.(msg),

    LATENT_DIM,
    NUM_LAYERS,
    HIDDEN_DIM,
  });

  // ---- resets ----
  const resetGT = () => setGtState({ x: 0, xDot: 0, theta: 0, thetaDot: 0 });
  const resetLatent = () => {
    setLatent(Array(LATENT_DIM).fill(0));
    setHData(null);
    setCData(null);
  };
  const resetPiwm = () => setPiwmState({ x: 0, xDot: 0, theta: 0, thetaDot: 0 });

  const disabled = loading || !vaeEnc || !vaeDec || !lstm || !piwmEnc || !piwmDec;

  // ---- styles (same look as your current component) ----
  const styles = useMemo(() => {
    const font =
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"';

    const card = {
      borderRadius: 16,
      border: "1px solid rgba(15,23,42,0.08)",
      background: "rgba(255,255,255,0.86)",
      boxShadow: "0 12px 24px rgba(15,23,42,0.05)",
      padding: 16,
    };

    const titleRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 };

    const pill = (bg, border) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 10px",
      borderRadius: 999,
      border: `1px solid ${border}`,
      background: bg,
      fontSize: 12.5,
      color: "#0f172a",
      whiteSpace: "nowrap",
    });

    const dot = (c) => ({
      width: 9,
      height: 9,
      borderRadius: 999,
      background: c,
      boxShadow: "0 0 0 3px rgba(15,23,42,0.05)",
    });

    const btn = {
      padding: "9px 12px",
      fontSize: 13.5,
      borderRadius: 12,
      border: "1px solid rgba(15,23,42,0.14)",
      background: "rgba(255,255,255,0.78)",
      color: "#0f172a",
      cursor: "pointer",
      boxShadow: "0 10px 18px rgba(15,23,42,0.04)",
    };

    const btnPrimary = {
      ...btn,
      border: "1px solid rgba(37,99,235,0.28)",
      background: "linear-gradient(180deg, rgba(59,130,246,0.16), rgba(59,130,246,0.07))",
    };

    const btnDanger = {
      ...btn,
      border: "1px solid rgba(244,63,94,0.28)",
      background: "linear-gradient(180deg, rgba(244,63,94,0.12), rgba(244,63,94,0.05))",
    };

    const btnDisabled = {
      opacity: 0.55,
      cursor: "not-allowed",
    };

    const kbd = {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 12.5,
      padding: "2px 6px",
      borderRadius: 8,
      border: "1px solid rgba(15,23,42,0.18)",
      background: "rgba(255,255,255,0.78)",
      color: "#0f172a",
      whiteSpace: "nowrap",
    };

    const canvasFrame = {
      width: `${IMG_W * SCALE}px`,
      height: `${IMG_H * SCALE}px`,
      imageRendering: "pixelated",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.14)",
      background:
        "radial-gradient(450px 220px at 30% 20%, rgba(59,130,246,0.10), rgba(15,23,42,0.02))",
      boxShadow: "0 12px 22px rgba(15,23,42,0.06)",
    };

    const smallText = { fontSize: 12.5, color: "#64748b", lineHeight: 1.55, marginBottom: 10 };

    const sliderWrap = {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginTop: 8,
    };

    const sliderLabel = {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 10,
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 12.5,
      color: "#0f172a",
      marginBottom: 6,
    };

    const slider = {
      width: 240,
      accentColor: "#2563eb",
    };

    const page = {
      fontFamily: font,
      color: "#0f172a",
      padding: 18,
      maxWidth: "95%",
      margin: "0 auto",
    };

    const header = {
      marginBottom: 14,
      borderRadius: 18,
      border: "1px solid rgba(15,23,42,0.08)",
      background: "linear-gradient(135deg, rgba(59,130,246,0.10), rgba(236,72,153,0.08))",
      padding: 16,
      boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
    };

    const h1 = { margin: 0, fontSize: 22, letterSpacing: -0.35 };
    const lead = { margin: "6px 0 0 0", color: "#334155", fontSize: 13.5, lineHeight: 1.6 };

    const grid = {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 16,
      alignItems: "start",
    };

    const callout = {
      marginTop: 10,
      padding: 12,
      borderRadius: 14,
      border: "1px solid rgba(2,132,199,0.22)",
      background: "linear-gradient(180deg, rgba(56,189,248,0.10), rgba(56,189,248,0.04))",
      fontSize: 13,
      color: "#334155",
      lineHeight: 1.55,
    };

    const err = {
      borderRadius: 16,
      border: "1px solid rgba(244,63,94,0.25)",
      background: "linear-gradient(180deg, rgba(244,63,94,0.10), rgba(244,63,94,0.03))",
      padding: 12,
      color: "#991b1b",
      whiteSpace: "pre-wrap",
      fontSize: 13,
      marginBottom: 12,
    };

    return {
      page,
      header,
      h1,
      lead,
      grid,
      card,
      titleRow,
      pill,
      dot,
      btn,
      btnPrimary,
      btnDanger,
      btnDisabled,
      kbd,
      canvasFrame,
      smallText,
      sliderWrap,
      sliderLabel,
      slider,
      callout,
      err,
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={styles.h1}>PIWM Visualizer</h1>
            <p style={styles.lead}>
              Side-by-side comparison of <span style={styles.kbd}>Ground Truth</span>,{" "}
              <span style={styles.kbd}>Latent LSTM</span>, and <span style={styles.kbd}>PIWM state↔image</span>.
              Use <b>Sync</b> to align all representations to the same GT observation.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={styles.pill("rgba(34,197,94,0.10)", "rgba(34,197,94,0.28)")}>
              <span style={styles.dot("#22c55e")} /> Ground Truth
            </span>
            <span style={styles.pill("rgba(14,165,233,0.10)", "rgba(14,165,233,0.26)")}>
              <span style={styles.dot("#0ea5e9")} /> LSTM Rollout
            </span>
            <span style={styles.pill("rgba(168,85,247,0.10)", "rgba(168,85,247,0.24)")}>
              <span style={styles.dot("#a855f7")} /> PIWM
            </span>
          </div>
        </div>

        <div style={styles.callout}>
          <b>Recommended flow:</b> Set a clean GT state → <b>Sync GT → VAE + PIWM</b> → apply actions (Left/Right) →
          observe drift. If anything looks off, reset + sync again.
        </div>
      </div>

      {loading && (
        <div style={{ ...styles.card, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Loading ONNX models…</div>
          <div style={styles.smallText}>
            If this takes unusually long, confirm the model paths are correct and that the browser is not blocking WASM
            assets.
          </div>
        </div>
      )}

      {error && <div style={styles.err}>Error: {error}</div>}

      <div style={styles.grid}>
        {/* ===================== GT ===================== */}
        <section style={styles.card}>
          <div style={styles.titleRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={styles.dot("#22c55e")} aria-hidden />
              <div>
                <div style={{ fontWeight: 850, letterSpacing: -0.2 }}>Ground Truth</div>
                <div style={styles.smallText}>Physics transition + deterministic renderer</div>
              </div>
            </div>

            <button onClick={resetGT} style={{ ...styles.btnDanger }} type="button" aria-label="Reset ground truth">
              Reset
            </button>
          </div>

          {/* hidden render canvases */}
          <canvas ref={gtRenderCanvasRef} width={RENDER_W} height={RENDER_H} style={{ display: "none" }} />
          <canvas ref={gtSmallCanvasRef} width={IMG_W} height={IMG_H} style={{ display: "none" }} />

          <canvas ref={gtBigCanvasRef} width={IMG_W * SCALE} height={IMG_H * SCALE} style={styles.canvasFrame} />

          <div style={styles.sliderWrap}>
            <div>
              <div style={styles.sliderLabel}>
                <span>Position</span>
                <span>{gtState.x.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-2.4}
                max={2.4}
                step={0.01}
                value={gtState.x}
                onChange={(e) => setGtState((prev) => ({ ...prev, x: Number(e.target.value) }))}
                style={styles.slider}
              />
            </div>

            <div>
              <div style={styles.sliderLabel}>
                <span>Angle</span>
                <span>{gtState.theta.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-3.14159}
                max={3.14159}
                step={0.01}
                value={gtState.theta}
                onChange={(e) => setGtState((prev) => ({ ...prev, theta: Number(e.target.value) }))}
                style={styles.slider}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button
              onClick={syncGT}
              disabled={disabled}
              style={{ ...styles.btnPrimary, ...(disabled ? styles.btnDisabled : {}) }}
              type="button"
            >
              Sync GT → VAE + PIWM
            </button>

            <div style={styles.smallText}>
              State: x={gtState.x.toFixed(2)}, xDot={gtState.xDot.toFixed(2)}, θ={gtState.theta.toFixed(2)}, θDot=
              {gtState.thetaDot.toFixed(2)}
            </div>
          </div>
        </section>

        {/* ===================== LSTM ===================== */}
        <section style={styles.card}>
          <div style={styles.titleRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={styles.dot("#0ea5e9")} aria-hidden />
              <div>
                <div style={{ fontWeight: 850, letterSpacing: -0.2 }}>LSTM Latent Rollout</div>
                <div style={styles.smallText}>Latent transition (z, a, h/c) → z′</div>
              </div>
            </div>

            <button onClick={resetLatent} style={styles.btn} type="button">
              Reset latent & hidden
            </button>
          </div>

          <canvas ref={latentSmallCanvasRef} width={IMG_W} height={IMG_H} style={{ display: "none" }} />
          <canvas
            ref={latentBigCanvasRef}
            width={IMG_W * SCALE}
            height={IMG_H * SCALE}
            style={styles.canvasFrame}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => stepWithAction(0)}
              disabled={disabled}
              style={{ ...styles.btnPrimary, ...(disabled ? styles.btnDisabled : {}) }}
              type="button"
            >
              Action: Left
            </button>
            <button
              onClick={() => stepWithAction(1)}
              disabled={disabled}
              style={{ ...styles.btnPrimary, ...(disabled ? styles.btnDisabled : {}) }}
              type="button"
            >
              Action: Right
            </button>
          </div>

          <div style={{ marginTop: 12, borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a" }}>Latent controls</div>
            <div style={styles.smallText}>
              Edit <span style={styles.kbd}>z[i]</span> manually to probe what directions the decoder uses.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: 16,
                rowGap: 12,
                maxHeight: 420,
                overflowY: "auto",
                paddingRight: 6,
                marginTop: 10,
              }}
            >
              {latent.map((v, i) => (
                <div key={i}>
                  <div style={styles.sliderLabel}>
                    <span>z[{i}]</span>
                    <span>{v.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={-3}
                    max={3}
                    step={0.05}
                    value={v}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLatent((prev) => {
                        const next = [...prev];
                        next[i] = val;
                        return next;
                      });
                    }}
                    style={styles.slider}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== PIWM ===================== */}
        <section style={styles.card}>
          <div style={styles.titleRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={styles.dot("#a855f7")} aria-hidden />
              <div>
                <div style={{ fontWeight: 850, letterSpacing: -0.2 }}>PIWM (state ↔ image)</div>
                <div style={styles.smallText}>Encoder: image → (x, θ) • Decoder: (x, θ) → image</div>
              </div>
            </div>

            <button onClick={resetPiwm} style={styles.btnDanger} type="button">
              Reset
            </button>
          </div>

          <canvas ref={piwmSmallCanvasRef} width={IMG_W} height={IMG_H} style={{ display: "none" }} />
          <canvas
            ref={piwmBigCanvasRef}
            width={IMG_W * SCALE}
            height={IMG_H * SCALE}
            style={styles.canvasFrame}
          />

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a" }}>State</div>
            <div style={styles.smallText}>
              PIWM state: x={piwmState.x.toFixed(2)}, xDot={piwmState.xDot.toFixed(2)}, θ={piwmState.theta.toFixed(2)},
              θDot={piwmState.thetaDot.toFixed(2)}
              <br />
              Decoder input (pos, angle) = ({piwmState.x.toFixed(2)}, {piwmState.theta.toFixed(2)})
            </div>

            <div style={{ marginTop: 12, borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a" }}>Actions update PIWM too</div>
              <div style={styles.smallText}>
                Clicking <b>Action: Left/Right</b> also steps PIWM dynamics once (learned parameters). Compare drift vs
                GT.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

