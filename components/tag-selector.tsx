"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import { useTranslation } from "@/lib/language-context";
import { TAG_NAME_MAX_LENGTH } from "@/lib/tags";
import {
  assignProductTag,
  createTagAndAssign,
  deleteTag,
} from "@/app/tag-actions";

type Tag = { id: string; name: string };

type TagSelectorProps = {
  productId: string;
  initialTagId?: string | null;
  initialTagName?: string | null;
};

export function TagSelector({
  productId,
  initialTagId = null,
  initialTagName = null,
}: TagSelectorProps) {
  const t = useTranslation();
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(
    initialTagId && initialTagName
      ? { id: initialTagId, name: initialTagName }
      : null,
  );
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optimisticSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tags")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setTags(data.items);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

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

  const showEmptyPrompt = tags !== null && tags.length === 0;

  function selectTag(tag: Tag | null) {
    if (busy) return;
    setError(null);
    const prev = selected;
    setSelected(tag);
    setOpen(false);
    setBusy(true);
    startTransition(() => {
      assignProductTag(productId, tag?.id ?? null)
        .catch((err: Error) => {
          setSelected(prev);
          setError(err.message);
        })
        .finally(() => setBusy(false));
    });
  }

  function removeTag(tag: Tag) {
    if (busy) return;
    setError(null);
    const wasSelected = selected?.id === tag.id;
    setTags((prev) => (prev ?? []).filter((x) => x.id !== tag.id));
    setSelected((prev) => (prev?.id === tag.id ? null : prev));
    setBusy(true);
    startTransition(() => {
      deleteTag(tag.id)
        .catch((err: Error) => {
          setTags((prev) => [...(prev ?? []), tag]);
          if (wasSelected) setSelected(tag);
          setError(err.message);
        })
        .finally(() => setBusy(false));
    });
  }

  function submitCreate() {
    if (busy) return;
    const name = inputValue.trim();
    if (!name) {
      setError(t("tagNameRequired"));
      return;
    }
    if (name.length > TAG_NAME_MAX_LENGTH) {
      setError(t("tagNameTooLong"));
      return;
    }
    setError(null);
    const optimistic: Tag = {
      id: `optimistic-${++optimisticSeq.current}`,
      name,
    };
    setTags((prev) => [...(prev ?? []), optimistic]);
    setSelected(optimistic);
    setOpen(false);
    setAdding(false);
    setInputValue("");
    setBusy(true);
    startTransition(() => {
      createTagAndAssign(productId, name)
        .then((created) => {
          setTags((prev) =>
            (prev ?? []).map((tag) =>
              tag.id === optimistic.id
                ? { id: created.tagId, name: created.name }
                : tag,
            ),
          );
          setSelected({ id: created.tagId, name: created.name });
        })
        .catch((err: Error) => {
          setTags((prev) =>
            (prev ?? []).filter((tag) => tag.id !== optimistic.id),
          );
          setSelected((prev) => (prev?.id === optimistic.id ? null : prev));
          setError(err.message);
        })
        .finally(() => setBusy(false));
    });
  }

  function renderCreateInput(autoClose?: () => void) {
    return (
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          maxLength={TAG_NAME_MAX_LENGTH}
          value={inputValue}
          placeholder={t("tagName")}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCreate();
            } else if (e.key === "Escape") {
              if (autoClose) autoClose();
              setInputValue("");
              setError(null);
            }
          }}
          className="w-full min-w-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <button
          type="button"
          onClick={submitCreate}
          disabled={busy}
          className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {t("createTag")}
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {t("tag")}
      </span>
      <button
        type="button"
        onClick={() => {
          if (!busy) setOpen((v) => !v);
        }}
        disabled={busy}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-left focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "" : "text-neutral-400"}>
          {selected ? selected.name : t("selectTag")}
        </span>
        <span className="text-xs text-neutral-400" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
          {loadFailed && (
            <p className="px-3 py-3 text-xs text-red-600">{t("tagLoadFailed")}</p>
          )}
          {error && (
            <p className="px-3 py-3 text-xs text-red-600">{error}</p>
          )}

          <button
            type="button"
            onClick={() => selectTag(null)}
            className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
              selected ? "" : "bg-neutral-50 font-medium"
            }`}
          >
            {t("noTag")}
          </button>

          {tags === null && !loadFailed && (
            <div className="px-3 py-3 text-sm text-neutral-400">Loading...</div>
          )}

          {showEmptyPrompt && (
            <div className="border-t border-neutral-100 px-3 py-3">
              <p className="mb-2 text-sm text-neutral-500">{t("noTagsYet")}</p>
              {renderCreateInput()}
            </div>
          )}

          {tags && tags.length > 0 && (
            <div className="border-t border-neutral-100">
              {tags.map((tag) => (
                <div key={tag.id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => selectTag(tag)}
                    className={`flex-1 px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                      selected?.id === tag.id ? "bg-neutral-50 font-medium" : ""
                    }`}
                  >
                    {tag.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`${t("delete")}: ${tag.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(tag);
                    }}
                    className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}

              {adding ? (
                <div className="border-t border-neutral-100 px-3 py-2">
                  {renderCreateInput(() => {
                    setAdding(false);
                    setInputValue("");
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center gap-1 border-t border-neutral-100 px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  <span className="text-base leading-none">+</span>{" "}
                  {t("addNewTag")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}