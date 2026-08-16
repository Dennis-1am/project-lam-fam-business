"use client";

import { deleteProduct } from "@/app/actions";

export function DeleteProductButton({
  productId,
  title,
}: {
  productId: string;
  title: string;
}) {
  return (
    <form action={deleteProduct}>
      <input type="hidden" name="id" value={productId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:border-red-400"
        onClick={(e) => {
          if (!confirm(`Delete "${title}"?`)) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}