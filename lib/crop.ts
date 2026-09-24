import type { CSSProperties } from "react";

export type CropData = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Displayed width/height of the crop frame once scaled to its source image. */
  aspect: number;
};

export type CroppableImage = {
  url: string;
  cropX?: number | null;
  cropY?: number | null;
  cropWidth?: number | null;
  cropHeight?: number | null;
  cropAspect?: number | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
};

const MIN_ASPECT = 0.1;
const MAX_ASPECT = 10;

export function cropFromRecord(image: CroppableImage): CropData | null {
  const { cropX, cropY, cropWidth, cropHeight, cropAspect } = image;
  if (cropX == null || cropY == null || cropWidth == null || cropHeight == null) return null;
  if (!(cropWidth > 0 && cropHeight > 0)) return null;
  const aspect =
    typeof cropAspect === "number" && cropAspect >= MIN_ASPECT && cropAspect <= MAX_ASPECT
      ? cropAspect
      : 1;
  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight, aspect };
}

export function isSquareAspect(aspect: number): boolean {
  return Math.abs(aspect - 1) < 0.01;
}

export function cropBoxStyle(crop: CropData): CSSProperties {
  const { x, y, width, height } = crop;
  return {
    position: "absolute",
    left: `calc(${-(x / width) * 100}%)`,
    top: `calc(${-(y / height) * 100}%)`,
    width: `calc(${(100 / width) * 100}%)`,
    height: `calc(${(100 / height) * 100}%)`,
    maxWidth: "none",
  };
}

/**
 * Size (as % of a square tile) a box of the given w/h aspect should take so
 * that it fits entirely inside the tile, preserving its shape.
 */
export function containedCropBox(aspect: number): CSSProperties {
  if (aspect >= 1) {
    return { width: "100%", height: `${(100 / aspect).toFixed(4)}%` };
  }
  return { width: `${(aspect * 100).toFixed(4)}%`, height: "100%" };
}

export function cropSourceSizes(crop: CropData, mobileVw: number, desktopVw: number): string {
  const scale = 100 / crop.width;
  return `(min-width: 768px) ${Math.ceil(desktopVw * scale)}vw, ${Math.ceil(mobileVw * scale)}vw`;
}