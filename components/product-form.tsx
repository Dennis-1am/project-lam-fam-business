"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageEditor } from "@/components/image-editor";
import {
  containedCropBox,
  cropBoxStyle,
  cropFromRecord,
  cropSourceSizes,
  isSquareAspect,
} from "@/lib/crop";
import type { CropData, CroppableImage } from "@/lib/crop";
import { useLanguage, useTranslation } from "@/lib/language-context";
import { TagSelector } from "@/components/tag-selector";
import { DeleteButton } from "@/components/delete-button";
import { LANGUAGE_LABELS, targetLanguages } from "@/lib/languages";
import type { Language } from "@/lib/translations";

export type TranslationEntry = {
  language: string;
  title: string;
  description: string;
  titleManual: boolean;
  descriptionManual: boolean;
};

type ProductFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  initial?: {
    title: string;
    price: string;
    description: string;
    tagId?: string | null;
    tagName?: string | null;
    sourceLanguage?: Language;
    translations?: TranslationEntry[];
    images: CroppableImage[];
  };
  productId?: string;
};

type PendingImage = {
  url: string;
  uploading: boolean;
  crop?: CropData;
  width?: number;
  height?: number;
};

function readImageDims(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement("img");
    probe.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
    };
    probe.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({});
    };
    probe.src = objectUrl;
  });
}

function FieldModeToggle({
  name,
  valueManual,
  manualLabel,
  autoLabel,
  onChange,
}: {
  name: string;
  valueManual: boolean;
  manualLabel: string;
  autoLabel: string;
  onChange: (manual: boolean) => void;
}) {
  function segmentButton(isManual: boolean) {
    const active = valueManual === isManual;
    const visible = isManual ? manualLabel : autoLabel;
    const invisible = isManual ? autoLabel : manualLabel;
    return (
      <button
        type="button"
        onClick={() => onChange(isManual)}
        className="relative z-10 grid place-items-center px-2 py-1 text-[10px] font-medium leading-none"
      >
        <span
          className={`col-start-1 row-start-1 whitespace-nowrap transition-colors ${
            active ? "text-white" : "text-neutral-500"
          }`}
        >
          {visible}
        </span>
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {invisible}
        </span>
      </button>
    );
  }

  return (
    <span className="relative inline-grid grid-cols-2 overflow-hidden rounded bg-neutral-100">
      <span
        className={`absolute inset-y-0 w-1/2 rounded bg-neutral-800 transition-[left] ${
          valueManual ? "left-0" : "left-1/2"
        }`}
      />
      {segmentButton(true)}
      {segmentButton(false)}
      <input
        type="radio"
        name={name}
        value="manual"
        checked={valueManual}
        onChange={() => onChange(true)}
        className="sr-only"
      />
      <input
        type="radio"
        name={name}
        value="auto"
        checked={!valueManual}
        onChange={() => onChange(false)}
        className="sr-only"
      />
    </span>
  );
}

function MainLocalizedField({
  label,
  name,
  initialValue,
  showEdited,
  required,
  multiline,
}: {
  label: string;
  name: string;
  initialValue: string;
  showEdited: boolean;
  required?: boolean;
  multiline?: boolean;
}) {
  const t = useTranslation();
  const [value, setValue] = useState(initialValue);
  const edited = showEdited && value !== initialValue;
  const inputId = `main-${name}`;
  const inputClasses =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-neutral-900 focus:outline-none";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
        {edited && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
            {t("edited")}
          </span>
        )}
      </div>
      {multiline ? (
        <textarea
          id={inputId}
          name={name}
          rows={5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={inputClasses}
        />
      ) : (
        <input
          id={inputId}
          name={name}
          type="text"
          required={required}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={inputClasses}
        />
      )}
    </div>
  );
}

export function ProductForm({
  action,
  submitLabel,
  initial,
  productId,
}: ProductFormProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const initialManualTitle: Record<string, boolean> = {};
  const initialManualDescription: Record<string, boolean> = {};
  for (const entry of initial?.translations ?? []) {
    if (entry.titleManual) initialManualTitle[entry.language] = true;
    if (entry.descriptionManual) initialManualDescription[entry.language] = true;
  }
  const [manualTitle, setManualTitle] = useState<Record<string, boolean>>(
    initialManualTitle,
  );
  const [manualDescription, setManualDescription] = useState<Record<string, boolean>>(
    initialManualDescription,
  );
  const [images, setImages] = useState<PendingImage[]>(
    initial?.images.map((img) => ({
      url: img.url,
      uploading: false,
      crop: cropFromRecord(img) ?? undefined,
      width: img.imageWidth ?? undefined,
      height: img.imageHeight ?? undefined,
    })) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorIndex, setEditorIndex] = useState<number | null>(null);

  const translationsByLang = new Map(
    (initial?.translations ?? []).map((entry) => [entry.language, entry]),
  );
  const translationLanguages = targetLanguages(language);

  // The main title/description follow the app language. Every language is a
  // real translation row now, so the loaded text is simply that cell's.
  const mainCell = translationsByLang.get(language);
  const mainTitleInitial = mainCell?.title ?? "";
  const mainDescriptionInitial = mainCell?.description ?? "";

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
        const dims = await readImageDims(file);
        return { url: data.url, ...dims };
      }),
    )
      .then((entries) => {
        setImages((prev) => [
          ...prev,
          ...entries.map((entry) => ({
            url: entry.url,
            uploading: false,
            width: entry.width,
            height: entry.height,
          })),
        ]);
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
    const isFullImage =
      Math.abs(crop.x) < 0.5 &&
      Math.abs(crop.y) < 0.5 &&
      crop.width > 99.5 &&
      crop.height > 99.5;
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, crop: isFullImage ? undefined : crop } : img)),
    );
    setEditorIndex(null);
  }

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-6">
      {productId && <input type="hidden" name="id" value={productId} />}
      <input type="hidden" name="sourceLanguage" value={language} />

      <div key={language} className="grid gap-4">
        <MainLocalizedField
          label={t("title")}
          name="title"
          required
          showEdited={Boolean(initial)}
          initialValue={mainTitleInitial}
        />
        <MainLocalizedField
          label={t("description")}
          name="description"
          multiline
          showEdited={Boolean(initial)}
          initialValue={mainDescriptionInitial}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className="mb-1 block text-sm font-medium text-neutral-700">
            {t("price")}
          </label>
          <div className="flex items-center rounded-lg border border-neutral-300 focus-within:border-neutral-900">
            <span className="pl-3 text-neutral-500">$</span>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initial?.price}
              className="w-full bg-transparent py-2 pr-3 focus:outline-none"
            />
          </div>
        </div>

        <TagSelector
          initialTagId={initial?.tagId ?? null}
          initialTagName={initial?.tagName ?? null}
        />
      </div>

      {productId && (
        <div className="space-y-4">
          <div>
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              {t("productTranslations")}
            </span>
            <p className="mb-2 text-xs text-neutral-500">
              {t("translationsHint")}
            </p>
          </div>

          {translationLanguages.map((lang) => {
            const entry = translationsByLang.get(lang);
            const missing = !entry;
            return (
              <fieldset
                key={lang}
                className="rounded-lg border border-neutral-200 p-4"
              >
                <legend className="px-1 text-sm font-semibold text-neutral-800">
                  {LANGUAGE_LABELS[lang]}
                </legend>

                {missing && (
                  <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {t("quotaNotice")}
                  </p>
                )}

                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label htmlFor={`translation-${lang}-title`} className="text-sm font-medium text-neutral-700">
                        {t("title")}
                      </label>
                      <FieldModeToggle
                        name={`translationModes[${lang}][title]`}
                        valueManual={manualTitle[lang] ?? false}
                        manualLabel={t("manuallyEdited")}
                        autoLabel={t("autoTranslate")}
                        onChange={(manual) =>
                          setManualTitle((prev) => ({ ...prev, [lang]: manual }))
                        }
                      />
                    </div>
                    <input
                      id={`translation-${lang}-title`}
                      name={`translations[${lang}][title]`}
                      type="text"
                      defaultValue={entry?.title ?? ""}
                      onChange={() =>
                        setManualTitle((prev) => ({ ...prev, [lang]: true }))
                      }
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label htmlFor={`translation-${lang}-description`} className="text-sm font-medium text-neutral-700">
                        {t("description")}
                      </label>
                      <FieldModeToggle
                        name={`translationModes[${lang}][description]`}
                        valueManual={manualDescription[lang] ?? false}
                        manualLabel={t("manuallyEdited")}
                        autoLabel={t("autoTranslate")}
                        onChange={(manual) =>
                          setManualDescription((prev) => ({ ...prev, [lang]: manual }))
                        }
                      />
                    </div>
                    <textarea
                      id={`translation-${lang}-description`}
                      name={`translations[${lang}][description]`}
                      rows={3}
                      defaultValue={entry?.description ?? ""}
                      onChange={() =>
                        setManualDescription((prev) => ({ ...prev, [lang]: true }))
                      }
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>
              </fieldset>
            );
          })}
        </div>
      )}

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
                {image.crop && !isSquareAspect(image.crop.aspect) ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      style={containedCropBox(image.crop.aspect)}
                      className="relative overflow-hidden"
                    >
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
                  </div>
                ) : image.crop ? (
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
                    className="object-contain"
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
              <input type="hidden" name="cropAspect" value={image.crop?.aspect ?? ""} />
              <input type="hidden" name="imageWidth" value={image.width ?? ""} />
              <input type="hidden" name="imageHeight" value={image.height ?? ""} />
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