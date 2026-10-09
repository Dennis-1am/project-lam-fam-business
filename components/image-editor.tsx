"use client";

import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useCallback, useState } from "react";
import type { CropData } from "@/lib/crop";
import { useTranslation } from "@/lib/language-context";

type ImageEditorProps = {
  imageUrl: string;
  initial?: CropData | null;
  /**
   * Displayed width/height ratio to pre-select when there is no saved crop yet.
   * A wide value (like the banner's 3:1) starts the frame at the right shape so
   * the admin only has to nudge it, instead of starting from the whole photo.
   */
  defaultAspect?: number | null;
  onApply: (crop: CropData) => void;
  onCancel: () => void;
};

const FULL_IMAGE: PercentCrop = { x: 0, y: 0, width: 100, height: 100, unit: "%" };

/** Largest centered rectangle of `aspect` (width/height) that fits the photo. */
function centeredCrop(naturalWidth: number, naturalHeight: number, aspect: number): PercentCrop {
  const naturalAspect = naturalWidth / naturalHeight;
  let width = 100;
  let height = 100;
  if (aspect >= naturalAspect) {
    height = (naturalAspect / aspect) * 100;
  } else {
    width = (aspect / naturalAspect) * 100;
  }
  return {
    x: (100 - width) / 2,
    y: (100 - height) / 2,
    width,
    height,
    unit: "%",
  };
}

export function ImageEditor({ imageUrl, initial, defaultAspect, onApply, onCancel }: ImageEditorProps) {
  const t = useTranslation();
  const initialCrop: PercentCrop | null = initial
    ? { x: initial.x, y: initial.y, width: initial.width, height: initial.height, unit: "%" }
    : null;
  const [crop, setCrop] = useState<PercentCrop | null>(initialCrop);
  const [lastCompleted, setLastCompleted] = useState<PercentCrop | null>(initialCrop);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);

  const handleImgLoad = useCallback(
    (event: { currentTarget: HTMLImageElement }) => {
      const img = event.currentTarget;
      if (!(img.naturalWidth > 0 && img.naturalHeight > 0)) return;
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      const startCrop =
        defaultAspect && defaultAspect > 0
          ? centeredCrop(img.naturalWidth, img.naturalHeight, defaultAspect)
          : FULL_IMAGE;
      setCrop((prev) => prev ?? startCrop);
      setLastCompleted((prev) => prev ?? startCrop);
    },
    [defaultAspect],
  );

  const handleFitImage = () => {
    setCrop(FULL_IMAGE);
    setLastCompleted(FULL_IMAGE);
  };

  const handleApply = () => {
    const completed = crop ?? lastCompleted;
    if (!completed || !natural) return;
    const rawAspect = (completed.width / 100) * natural.width / ((completed.height / 100) * natural.height);
    const aspect = Math.min(10, Math.max(0.1, rawAspect));
    onApply({
      x: completed.x,
      y: completed.y,
      width: completed.width,
      height: completed.height,
      aspect,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto mb-6 flex h-[60vh] w-full max-w-2xl items-center justify-center px-4">
        <ReactCrop
          crop={crop ?? undefined}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(_, percentCrop) => setLastCompleted(percentCrop)}
          keepSelection
          ruleOfThirds
          minWidth={40}
          minHeight={40}
          className="max-w-full"
          style={{ maxHeight: "50vh" }}
        >
          {/* The cropper requires a raw <img> element; next/image can't drive it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            onLoad={handleImgLoad}
            className="block max-h-full max-w-full rounded-lg"
          />
        </ReactCrop>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 pb-8">
        <div className="mb-6 flex gap-3">
          <button
            type="button"
            onClick={handleFitImage}
            className="flex-1 rounded-full border border-neutral-500 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-800"
          >
            {t("fitImage")}
          </button>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-neutral-500 px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-800"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!lastCompleted || !natural}
            className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("apply")}
          </button>
        </div>
      </div>
    </div>
  );
}