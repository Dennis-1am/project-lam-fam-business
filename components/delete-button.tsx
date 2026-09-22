"use client";

import type { ButtonHTMLAttributes } from "react";

type DeleteButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function DeleteButton({ className = "", ...props }: DeleteButtonProps) {
  return (
    <button
      type="button"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-base font-bold leading-none text-white shadow-md transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${className}`}
      {...props}
    >
      ×
    </button>
  );
}