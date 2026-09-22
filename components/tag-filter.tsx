"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/language-context";

type Tag = { id: string; name: string };

type TagFilterProps = {
  activeTag: Tag | null;
  untagged: boolean;
  hiddenOnly: boolean;
  isAdmin: boolean;
  hiddenCount: number;
};

export function TagFilter({
  activeTag,
  untagged,
  hiddenOnly,
  isAdmin,
  hiddenCount,
}: TagFilterProps) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tags")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setTags(data.items);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filterActive = untagged || activeTag !== null || hiddenOnly;
  const label = hiddenOnly
    ? t("hiddenProducts")
    : untagged
      ? t("noTag")
      : activeTag
        ? activeTag.name
        : null;

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-2">
        <div ref={rootRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition hover:border-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            <span>{t("filter")}</span>
            <span className="text-xs text-neutral-400" aria-hidden>
              ▾
            </span>
          </button>

          {open && (
            <div
              role="listbox"
              className="absolute left-0 top-full z-20 mt-1 max-h-72 min-w-48 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg"
            >
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                  filterActive ? "" : "bg-neutral-50 font-medium"
                }`}
              >
                {t("allProducts")}
                {!filterActive && (
                  <span aria-hidden className="text-neutral-400">
                    ✓
                  </span>
                )}
              </Link>

              {isAdmin && (
                <>
                  <Link
                    href="/?untagged=1"
                    onClick={() => setOpen(false)}
                    className={`flex w-full items-center justify-between gap-3 whitespace-nowrap border-t border-neutral-100 px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                      untagged ? "bg-neutral-50 font-medium" : ""
                    }`}
                  >
                    {t("noTag")}
                    {untagged && (
                      <span aria-hidden className="text-neutral-400">
                        ✓
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/?hidden=1"
                    onClick={() => setOpen(false)}
                    className={`flex w-full items-center justify-between gap-3 whitespace-nowrap border-t border-neutral-100 px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                      hiddenOnly ? "bg-neutral-50 font-medium" : ""
                    }`}
                  >
                    <span>
                      {t("hiddenProducts")}{" "}
                      <span className="text-xs text-neutral-400">
                        ({hiddenCount})
                      </span>
                    </span>
                    {hiddenOnly && (
                      <span aria-hidden className="text-neutral-400">
                        ✓
                      </span>
                    )}
                  </Link>
                </>
              )}

              {loadFailed && (
                <p className="border-t border-neutral-100 px-3 py-3 text-xs text-red-600">
                  {t("tagLoadFailed")}
                </p>
              )}

              {tags === null && !loadFailed && (
                <div className="border-t border-neutral-100 px-3 py-3 text-sm text-neutral-400">
                  Loading...
                </div>
              )}

              {tags && tags.length > 0 && (
                <div className="border-t border-neutral-100">
                  {tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/?tag=${encodeURIComponent(tag.id)}`}
                      onClick={() => setOpen(false)}
                      className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                        activeTag?.id === tag.id ? "bg-neutral-50 font-medium" : ""
                      }`}
                    >
                      {tag.name}
                      {activeTag?.id === tag.id && (
                        <span aria-hidden className="text-neutral-400">
                          ✓
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {label && (
          <Link
            href="/"
            aria-label={`${t("clearFilter")}: ${label}`}
            className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm transition hover:border-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            {label}
            <span aria-hidden className="text-neutral-400">
              ✕
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}