
// src/visualizers/piwm/utils/render.js
import { IMG_W, IMG_H } from "./canvas";
import { LENGTH } from "./physics";

// match your old component constants
const X_THRESHOLD = 2.4;

// ---------- draw polygon helper ----------
function fillPolygon(ctx, pts, fillStyle, strokeStyle) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ---------- rotate point (x,y) by angle radians ----------
function rot(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

/**
 * Render the CartPole observation into a hidden "renderCanvas", then downsample
 * into a 96x96 "smallCanvas96".
 *
 * This matches your previous geometry:
 * - White background
 * - Black cart
 * - Brown pole
 * - Blue axle
 * - Ground line
 * - Y-flip to match pygame.transform.flip(..., True)
 * - Downsample via drawImage (browser smoothing)
 */
export function renderObservationTo96({
  position,
  angle,
  renderCanvas,
  smallCanvas96,
  renderW = 600,
  renderH = 400,
}) {
  const rctx = renderCanvas.getContext("2d");
  const sctx = smallCanvas96.getContext("2d");

  // Clear render canvas
  rctx.setTransform(1, 0, 0, 1, 0, 0);
  rctx.clearRect(0, 0, renderW, renderH);
  rctx.fillStyle = "#ffffff";
  rctx.fillRect(0, 0, renderW, renderH);

  // World -> screen scaling (matches previous)
  const worldWidth = X_THRESHOLD * 2;
  const scale = renderW / worldWidth;

  const polewidth = 10.0;
  const polelen = scale * (2 * LENGTH);

  const cartwidth = 50.0;
  const cartheight = 30.0;

  const l = -cartwidth / 2;
  const r = cartwidth / 2;
  const t = cartheight / 2;
  const b = -cartheight / 2;
  const axleoffset = cartheight / 4.0;

  const cartx = position * scale + renderW / 2.0;
  const carty = renderH / 2.0;

  // flip y like pygame.transform.flip(..., True)
  rctx.save();
  rctx.translate(0, renderH);
  rctx.scale(1, -1);

  // Cart
  const cartPts = [
    { x: l + cartx, y: b + carty },
    { x: l + cartx, y: t + carty },
    { x: r + cartx, y: t + carty },
    { x: r + cartx, y: b + carty },
  ];
  fillPolygon(rctx, cartPts, "#000000", "#000000");

  // Pole (local rect rotated about anchor)
  const pl = -polewidth / 2;
  const pr = polewidth / 2;
  const pt = polelen - polewidth / 2;
  const pb = -polewidth / 2;

  const anchorX = cartx;
  const anchorY = carty + axleoffset;

  const localPole = [
    { x: pl, y: pb },
    { x: pl, y: pt },
    { x: pr, y: pt },
    { x: pr, y: pb },
  ];

  // rotate_rad(-angle) like your original
  const polePts = localPole.map((p) => {
    const q = rot(p.x, p.y, -angle);
    return { x: q.x + anchorX, y: q.y + anchorY };
  });
  fillPolygon(rctx, polePts, "rgb(202,152,101)", "rgb(202,152,101)");

  // Axle
  rctx.beginPath();
  rctx.arc(anchorX, anchorY, polewidth / 2, 0, Math.PI * 2);
  rctx.fillStyle = "rgb(129,132,203)";
  rctx.fill();
  rctx.strokeStyle = "rgb(129,132,203)";
  rctx.stroke();

  // Ground line
  rctx.beginPath();
  rctx.moveTo(0, carty);
  rctx.lineTo(renderW, carty);
  rctx.strokeStyle = "#000000";
  rctx.lineWidth = 1;
  rctx.stroke();

  rctx.restore();

  // Downsample to 96x96
  sctx.imageSmoothingEnabled = true;
  sctx.clearRect(0, 0, IMG_W, IMG_H);
  sctx.drawImage(renderCanvas, 0, 0, renderW, renderH, 0, 0, IMG_W, IMG_H);
}
