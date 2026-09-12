"use client";

import Cropper from "react-easy-crop";
import { useCallback, useState } from "react";
import type { CropData } from "@/lib/crop";
import { useTranslation } from "@/lib/language-context";

type ImageEditorProps = {
  imageUrl: string;
  initial?: CropData | null;
  onApply: (crop: CropData) => void;
  onCancel: () => void;
};

export function ImageEditor({ imageUrl, initial, onApply, onCancel }: ImageEditorProps) {
  const t = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [lastArea, setLastArea] = useState<CropData | null>(null);

  const handleCropComplete = useCallback((croppedArea: CropData) => {
    setLastArea(croppedArea);
  }, []);

  const handleApply = () => {
    if (lastArea) onApply(lastArea);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative m-auto h-[62vh] w-full max-w-2xl px-4">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={1}
          initialCroppedAreaPercentages={initial ?? undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 pb-8">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
          {t("zoom")}
        </label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="mb-6 w-full accent-neutral-100"
        />
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
            disabled={!lastArea}
            className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("apply")}
          </button>
        </div>
      </div>
    </div>
  );
}