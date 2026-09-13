"use client";

import type { ButtonHTMLAttributes } from "react";

type DeleteButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function DeleteButton({ className = "", ...props }: DeleteButtonProps) {
  return (
    <button
      type="button"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded p-1 bg-white/60 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-red-600 ${className}`}
      {...props}
    >
      ×
    </button>
  );
}