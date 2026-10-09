"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import { CroppedImage } from "@/components/cropped-image";
import { ImageEditor } from "@/components/image-editor";
import { LightroomModal } from "@/components/lightroom-modal";
import { saveSiteBanner } from "@/app/site-actions";
import { cropFromRecord } from "@/lib/crop";
import type { CropData } from "@/lib/crop";
import { IMAGE_ACCEPT, readImageDims } from "@/lib/client-image";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "@/lib/languages";
import { useLanguage, useTranslation } from "@/lib/language-context";
import type { BannerTextByLanguage, SiteBannerData } from "@/lib/site-banner";
import type { Language } from "@/lib/translations";

/**
 * The English copy the homepage showed before the banner existed. Only a
 * starting point, pre-filled so the common case needs no typing; clearing it is
 * allowed and really does remove the overlay.
 */
const DEFAULT_BANNER_TEXT = "Welcome to our shop";

/**
 * Start the crop frame roughly as wide as the banner band (h-48…h-80 across the
 * full width). The admin still drags it, but they begin near the right shape
 * instead of from the whole photo.
 */
const DEFAULT_BANNER_ASPECT = 3;

type BannerMode = "auto" | "manual";

type BannerForm = {
  imageUrl: string;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  cropAspect: number;
  imageWidth: number;
  imageHeight: number;
  sourceLanguage: Language;
  texts: BannerTextByLanguage;
  modes: Record<Language, BannerMode>;
};

function initialModes(banner: SiteBannerData | null, source: Language): Record<Language, BannerMode> {
  const modes = {} as Record<Language, BannerMode>;
  for (const language of SUPPORTED_LANGUAGES) {
    modes[language] =
      language === source ? "manual" : banner?.manual?.[language] ? "manual" : "auto";
  }
  return modes;
}

function formFromBanner(banner: SiteBannerData | null): BannerForm {
  const sourceLanguage = banner?.sourceLanguage ?? "en";
  return {
    imageUrl: banner?.image?.url ?? "",
    cropX: banner?.image?.cropX ?? 0,
    cropY: banner?.image?.cropY ?? 0,
    cropWidth: banner?.image?.cropWidth ?? 100,
    cropHeight: banner?.image?.cropHeight ?? 100,
    cropAspect: banner?.image?.cropAspect ?? 0,
    imageWidth: banner?.image?.imageWidth ?? 0,
    imageHeight: banner?.image?.imageHeight ?? 0,
    sourceLanguage,
    texts: banner?.translations ?? { en: DEFAULT_BANNER_TEXT, es: "", zh: "" },
    modes: initialModes(banner, sourceLanguage),
  };
}

function ModeToggle({
  value,
  onChange,
}: {
  value: BannerMode;
  onChange: (mode: BannerMode) => void;
}) {
  const t = useTranslation();
  const segment = (mode: BannerMode, label: string) => (
    <button
      type="button"
      onClick={() => onChange(mode)}
      className={`px-2 py-1 text-[10px] font-medium leading-none transition-colors ${
        value === mode ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {label}
    </button>
  );
  return (
    <span className="inline-flex overflow-hidden rounded border border-neutral-300">
      {segment("auto", t("autoTranslate"))}
      {segment("manual", t("manuallyEdited"))}
    </span>
  );
}

type BannerEditorProps = {
  /** The saved banner, or null when the admin has never saved one. */
  banner: SiteBannerData | null;
  onClose: () => void;
};

/**
 * The admin's banner form, rendered as an overlay over the storefront. It edits
 * one text field per language with a Manual/Auto choice, plus the background
 * image and its crop. Remounted each time it opens (the parent keys it off
 * `editing`), so it always starts from the saved row.
 */
export function BannerEditor({ banner, onClose }: BannerEditorProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [form, setForm] = useState<BannerForm>(() => formFromBanner(banner));
  const [cropping, setCropping] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lock the page behind the editor for as long as it is mounted.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Escape closes the editor, but not while a child overlay (the cropper or the
  // full-image preview) is open — those handle Escape themselves.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !cropping && !previewOpen) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, cropping, previewOpen]);

  // The cropper edits whatever is currently in the form, which after an upload
  // is the new image rather than the previously saved one.
  const formImage = {
    url: form.imageUrl,
    cropX: form.cropWidth > 0 ? form.cropX : null,
    cropY: form.cropHeight > 0 ? form.cropY : null,
    cropWidth: form.cropWidth > 0 ? form.cropWidth : null,
    cropHeight: form.cropHeight > 0 ? form.cropHeight : null,
    cropAspect: form.cropAspect > 0 ? form.cropAspect : null,
    imageWidth: form.imageWidth || null,
    imageHeight: form.imageHeight || null,
  };

  const previewText = form.texts[language] || form.texts[form.sourceLanguage];

  function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);

    fetch("/api/upload", { method: "POST", body })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
        return data.url;
      })
      .then(async (url) => {
        const dims = await readImageDims(file);
        // A new upload starts with no crop, and the editor opens on it right
        // away so the admin can choose the visible part before saving.
        setForm((prev) => ({
          ...prev,
          imageUrl: url,
          cropX: 0,
          cropY: 0,
          cropWidth: 100,
          cropHeight: 100,
          cropAspect: 0,
          imageWidth: dims.width ?? 0,
          imageHeight: dims.height ?? 0,
        }));
        setCropping(true);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  }

  function applyCrop(crop: CropData) {
    setForm((prev) => ({
      ...prev,
      cropX: crop.x,
      cropY: crop.y,
      cropWidth: crop.width,
      cropHeight: crop.height,
      cropAspect: crop.aspect,
    }));
    setCropping(false);
  }

  function removeImage() {
    setForm((prev) => ({
      ...prev,
      imageUrl: "",
      cropX: 0,
      cropY: 0,
      cropWidth: 100,
      cropHeight: 100,
      cropAspect: 0,
      imageWidth: 0,
      imageHeight: 0,
    }));
  }

  // Typing into a target language means the admin took it over, so it flips to
  // Manual — the same rule the product form follows.
  function handleText(lang: Language, value: string) {
    setForm((prev) => ({
      ...prev,
      texts: { ...prev.texts, [lang]: value },
      modes:
        lang === prev.sourceLanguage ? prev.modes : { ...prev.modes, [lang]: "manual" },
    }));
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const body = new FormData();
    body.append("imageUrl", form.imageUrl);
    body.append("cropX", String(form.cropX));
    body.append("cropY", String(form.cropY));
    body.append("cropWidth", String(form.cropWidth));
    body.append("cropHeight", String(form.cropHeight));
    body.append("cropAspect", String(form.cropAspect));
    body.append("imageWidth", String(form.imageWidth));
    body.append("imageHeight", String(form.imageHeight));
    body.append("sourceLanguage", form.sourceLanguage);
    for (const lang of SUPPORTED_LANGUAGES) {
      body.append(`text[${lang}]`, form.texts[lang]);
      body.append(`translationModes[${lang}]`, form.modes[lang]);
    }

    startTransition(() => {
      saveSiteBanner(body)
        .then((result) => {
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onClose();
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setBusy(false));
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("editBanner")}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSave}
        className="my-auto w-full max-w-2xl space-y-5 rounded-xl bg-white p-4 shadow-xl sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("editBanner")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">{t("bannerImage")}</p>
          {form.imageUrl ? (
            <>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                aria-label={t("bannerImageOnly")}
                className="relative block h-40 w-full cursor-zoom-in overflow-hidden rounded-lg border border-neutral-200"
              >
                {/* The image fills an absolutely-positioned layer so the text
                    can sit on top of it, exactly like the storefront band. */}
                <span className="absolute inset-0 block">
                  <CroppedImage
                    image={formImage}
                    alt=""
                    sizes="(min-width: 768px) 720px, 100vw"
                    layout="fill"
                    fit="cover"
                  />
                </span>
                {previewText ? (
                  <>
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                    <span className="absolute inset-0 flex items-center justify-start pl-4">
                      <span className="max-w-[60%] text-left text-lg font-semibold text-white sm:text-xl">
                        {previewText}
                      </span>
                    </span>
                  </>
                ) : null}
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-neutral-900 disabled:opacity-50"
                >
                  {t("bannerReplaceImage")}
                </button>
                <button
                  type="button"
                  onClick={() => setCropping(true)}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-neutral-900"
                >
                  {t("bannerCropImage")}
                </button>
                <button
                  type="button"
                  onClick={removeImage}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-neutral-900"
                >
                  {t("bannerRemoveImage")}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-neutral-900 disabled:opacity-50"
            >
              {uploading ? t("uploading") : t("bannerChooseImage")}
            </button>
          )}
          <p className="text-xs text-neutral-500">{t("bannerNoImage")}</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">{t("bannerText")}</p>
          <p className="text-xs text-neutral-500">{t("bannerTranslationsHint")}</p>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <label key={lang} className="block space-y-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{LANGUAGE_LABELS[lang]}</span>
                {lang === form.sourceLanguage ? (
                  <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] font-normal text-neutral-600">
                    {t("bannerSource")}
                  </span>
                ) : (
                  <ModeToggle
                    value={form.modes[lang]}
                    onChange={(mode) =>
                      setForm((prev) => ({ ...prev, modes: { ...prev.modes, [lang]: mode } }))
                    }
                  />
                )}
              </span>
              <input
                type="text"
                value={form.texts[lang]}
                onChange={(e) => handleText(lang, e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium transition hover:border-neutral-900"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={busy || uploading}
            className="flex-1 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {t("saveChanges")}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </form>

      {cropping && form.imageUrl ? (
        <ImageEditor
          imageUrl={form.imageUrl}
          initial={cropFromRecord(formImage)}
          defaultAspect={DEFAULT_BANNER_ASPECT}
          onApply={applyCrop}
          onCancel={() => setCropping(false)}
        />
      ) : null}

      {/* The admin's own full-image view: identical to what visitors get, so
          they can confirm the uploaded photo before/after saving. */}
      {previewOpen && form.imageUrl ? (
        <LightroomModal
          imageUrl={form.imageUrl}
          alt={previewText || t("bannerImageOnly")}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
