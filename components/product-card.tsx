import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/site";
import { cropBoxStyle, cropFromRecord, cropSourceSizes } from "@/lib/crop";
import type { CroppableImage } from "@/lib/crop";

type ProductCardProps = {
  id: string;
  title: string;
  priceCents: number;
  images: CroppableImage[];
};

export function ProductCard({ id, title, priceCents, images }: ProductCardProps) {
  const cover = images[0];
  const coverCrop = cropFromRecord(cover ?? {});

  return (
    <Link href={`/product/${id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
        {cover ? (
          coverCrop ? (
            <div className="relative h-full w-full overflow-hidden">
              <div style={cropBoxStyle(coverCrop)} className="absolute">
                <Image
                  src={cover.url}
                  alt={title}
                  fill
                  sizes={cropSourceSizes(coverCrop, 50, 25)}
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
          ) : (
            <Image
              src={cover.url}
              alt={title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            No image
          </div>
        )}
      </div>
      <div className="mt-2 px-1">
        <h2 className="truncate text-sm font-medium">{title}</h2>
        <p className="text-sm font-semibold text-neutral-700">
          {formatPrice(priceCents)}
        </p>
      </div>
    </Link>
  );
}