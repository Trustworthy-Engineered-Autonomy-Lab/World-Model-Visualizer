
// src/visualizers/piwm/utils/canvas.js
export const IMG_H = 96;
export const IMG_W = 96;

export function blitUpscale(smallCanvas, bigCanvas) {
  const bctx = bigCanvas.getContext("2d");
  bctx.imageSmoothingEnabled = false;
  bctx.clearRect(0, 0, bigCanvas.width, bigCanvas.height);
  bctx.drawImage(
    smallCanvas,
    0,
    0,
    smallCanvas.width,
    smallCanvas.height,
    0,
    0,
    bigCanvas.width,
    bigCanvas.height
  );
}

export function drawCHWFloatToCanvases(chwData, smallCanvas, bigCanvas) {
  const sctx = smallCanvas.getContext("2d");
  const imageData = sctx.createImageData(IMG_W, IMG_H);
  const rgba = imageData.data;
  const planeSize = IMG_H * IMG_W;

  for (let i = 0; i < planeSize; i++) {
    const rr = chwData[0 * planeSize + i];
    const gg = chwData[1 * planeSize + i];
    const bb = chwData[2 * planeSize + i];
    const idx = i * 4;
    rgba[idx + 0] = Math.max(0, Math.min(255, Math.round(rr * 255)));
    rgba[idx + 1] = Math.max(0, Math.min(255, Math.round(gg * 255)));
    rgba[idx + 2] = Math.max(0, Math.min(255, Math.round(bb * 255)));
    rgba[idx + 3] = 255;
  }

  sctx.putImageData(imageData, 0, 0);
  blitUpscale(smallCanvas, bigCanvas);
}

export function canvasToCHWFloat(smallCanvas) {
  const ctx = smallCanvas.getContext("2d");
  const img = ctx.getImageData(0, 0, IMG_W, IMG_H).data;
  const planeSize = IMG_W * IMG_H;
  const chw = new Float32Array(3 * planeSize);

  for (let i = 0; i < planeSize; i++) {
    chw[0 * planeSize + i] = img[i * 4 + 0] / 255;
    chw[1 * planeSize + i] = img[i * 4 + 1] / 255;
    chw[2 * planeSize + i] = img[i * 4 + 2] / 255;
  }
  return chw;
}
