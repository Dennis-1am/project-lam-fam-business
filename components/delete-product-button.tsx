"use client";

import { useRef, useState } from "react";
import { deleteProduct } from "@/app/actions";
import { useTranslation } from "@/lib/language-context";
import { ConfirmDialog } from "./confirm-dialog";

export function DeleteProductButton({
  productId,
  title,
}: {
  productId: string;
  title: string;
}) {
  const t = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <form ref={formRef} action={deleteProduct} className="inline-block">
        <input type="hidden" name="id" value={productId} />
        <button
          type="submit"
          className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:border-red-400"
          onClick={(e) => {
            e.preventDefault();
            setConfirming(true);
          }}
        >
          {t("delete")}
        </button>
      </form>
      <ConfirmDialog
        open={confirming}
        message={t("deleteConfirm").replace("{title}", title)}
        onCancel={() => setConfirming(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}