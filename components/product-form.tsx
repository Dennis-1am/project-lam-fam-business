"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageEditor } from "@/components/image-editor";
import { cropBoxStyle, cropFromRecord, cropSourceSizes } from "@/lib/crop";
import type { CropData, CroppableImage } from "@/lib/crop";
import { useTranslation } from "@/lib/language-context";
import { TagSelector } from "@/components/tag-selector";
import { DeleteButton } from "@/components/delete-button";

type ProductFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  initial?: {
    title: string;
    price: string;
    description: string;
    tagId?: string | null;
    tagName?: string | null;
    images: CroppableImage[];
  };
  productId?: string;
};

type PendingImage = { url: string; uploading: boolean; crop?: CropData };

export function ProductForm({
  action,
  submitLabel,
  initial,
  productId,
}: ProductFormProps) {
  const t = useTranslation();
  const [images, setImages] = useState<PendingImage[]>(
    initial?.images.map((img) => ({
      url: img.url,
      uploading: false,
      crop: cropFromRecord(img) ?? undefined,
    })) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorIndex, setEditorIndex] = useState<number | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    setUploading(true);
    setError(null);

    Promise.all(
      files.map(async (file) => {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Upload failed.");
        }
        const data = (await res.json()) as { url: string };
        return data.url;
      }),
    )
      .then((urls) => {
        setImages((prev) => [...prev, ...urls.map((url) => ({ url, uploading: false }))]);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setUploading(false));
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((img) => img.url !== url));
  }

  function applyCrop(index: number, crop: CropData) {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, crop } : img)));
    setEditorIndex(null);
  }

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-6">
      {productId && <input type="hidden" name="id" value={productId} />}

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-neutral-700">
          {t("title")}
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="price" className="mb-1 block text-sm font-medium text-neutral-700">
          {t("price")}
        </label>
        <div className="flex max-w-48 items-center rounded-lg border border-neutral-300 focus-within:border-neutral-900">
          <span className="pl-3 text-neutral-500">$</span>
          <input
            id="price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={initial?.price}
            className="w-full bg-transparent py-2 pr-3 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-neutral-700">
          {t("description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={initial?.description}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <TagSelector
        productId={productId}
        initialTagId={initial?.tagId ?? null}
        initialTagName={initial?.tagName ?? null}
      />

      <div>
        <span className="mb-1 block text-sm font-medium text-neutral-700">{t("images")}</span>
        <p className="mb-2 text-xs text-neutral-500">
          {t("cropImageHint")}
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={image.url}
              className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
            >
              <button
                type="button"
                aria-label={t("cropImageHint")}
                onClick={() => setEditorIndex(index)}
                className="absolute inset-0 h-full w-full cursor-pointer"
              >
                {image.crop ? (
                  <div className="relative h-full w-full overflow-hidden">
                    <div style={cropBoxStyle(image.crop)} className="absolute">
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        sizes={cropSourceSizes(image.crop, 38, 18)}
                        className="object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                )}
              </button>
              {image.crop && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                  {t("cropped")}
                </span>
              )}
              <DeleteButton
                className="absolute right-1 top-1 z-10"
                aria-label="Remove image"
                onClick={() => removeImage(image.url)}
              />
              <input type="hidden" name="imageUrls" value={image.url} />
              <input type="hidden" name="cropX" value={image.crop?.x ?? ""} />
              <input type="hidden" name="cropY" value={image.crop?.y ?? ""} />
              <input type="hidden" name="cropWidth" value={image.crop?.width ?? ""} />
              <input type="hidden" name="cropHeight" value={image.crop?.height ?? ""} />
            </div>
          ))}

          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-400 transition hover:border-neutral-900 hover:text-neutral-700">
            {uploading ? (
              <span>{t("uploading")}</span>
            ) : (
              <>
                <span className="text-2xl leading-none">+</span>
                <span>{t("addImage")}</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-white transition hover:bg-neutral-700"
        >
          {submitLabel}
        </button>
      </div>

      {editorIndex !== null && images[editorIndex] && (
        <ImageEditor
          imageUrl={images[editorIndex].url}
          initial={images[editorIndex].crop}
          onApply={(crop) => applyCrop(editorIndex, crop)}
          onCancel={() => setEditorIndex(null)}
        />
      )}
    </form>
  );
}