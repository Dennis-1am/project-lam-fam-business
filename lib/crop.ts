import type { CSSProperties } from "react";

export type CropData = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CroppableImage = {
  url: string;
  cropX?: number | null;
  cropY?: number | null;
  cropWidth?: number | null;
  cropHeight?: number | null;
};

export function cropFromRecord(image: CroppableImage): CropData | null {
  const { cropX, cropY, cropWidth, cropHeight } = image;
  if (cropX == null || cropY == null || cropWidth == null || cropHeight == null) return null;
  if (!(cropWidth > 0 && cropHeight > 0)) return null;
  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
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

export function cropSourceSizes(crop: CropData, mobileVw: number, desktopVw: number): string {
  const scale = 100 / crop.width;
  return `(min-width: 768px) ${Math.ceil(desktopVw * scale)}vw, ${Math.ceil(mobileVw * scale)}vw`;
}