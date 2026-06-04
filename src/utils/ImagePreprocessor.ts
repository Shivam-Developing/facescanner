// Converts raw RGBA frame pixels → Float32Array ready for MobileFaceNet
export const preprocessFaceForModel = (
  rgbaBytes: Uint8Array,
  srcWidth: number,
  srcHeight: number,
): Float32Array => {
  const SIZE = 112;
  const result = new Float32Array(SIZE * SIZE * 3);
  const scaleX = srcWidth / SIZE;
  const scaleY = srcHeight / SIZE;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const sx = Math.min(Math.floor(x * scaleX), srcWidth - 1);
      const sy = Math.min(Math.floor(y * scaleY), srcHeight - 1);
      const srcIdx = (sy * srcWidth + sx) * 4;
      const dstIdx = (y * SIZE + x) * 3;

      // Normalize RGBA byte channel to [-1.0, 1.0] as expected by MobileFaceNet
      result[dstIdx]     = (rgbaBytes[srcIdx]     / 127.5) - 1.0;  // R
      result[dstIdx + 1] = (rgbaBytes[srcIdx + 1] / 127.5) - 1.0;  // G
      result[dstIdx + 2] = (rgbaBytes[srcIdx + 2] / 127.5) - 1.0;  // B
    }
  }
  return result;
};

// Crop face bounding box from full frame RGBA buffer
export const cropFaceRegion = (
  rgbaBytes: Uint8Array,
  frameWidth: number,
  frameHeight: number,
  bbox: { left: number; top: number; width: number; height: number },
): { pixels: Uint8Array; width: number; height: number } => {
  const left   = Math.max(0, Math.floor(bbox.left));
  const top    = Math.max(0, Math.floor(bbox.top));
  const width  = Math.min(Math.floor(bbox.width), frameWidth - left);
  const height = Math.min(Math.floor(bbox.height), frameHeight - top);

  const cropPixels = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const srcStart = ((top + row) * frameWidth + left) * 4;
    const dstStart = row * width * 4;
    cropPixels.set(rgbaBytes.subarray(srcStart, srcStart + width * 4), dstStart);
  }
  return { pixels: cropPixels, width, height };
};
