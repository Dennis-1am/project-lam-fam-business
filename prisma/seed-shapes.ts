import { PrismaClient } from "@prisma/client";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { UPLOADS_DIR } from "../lib/storage";

const prisma = new PrismaClient();

const DEMO_PREFIX = "Shape Demo";

type Shape = { w: number; h: number; label: string };
type Crop = {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  cropAspect: number;
};

const SHAPES: Shape[] = [
  { w: 1200, h: 800, label: "3:2" },
  { w: 1200, h: 900, label: "4:3" },
  { w: 1440, h: 810, label: "16:9" },
  { w: 1600, h: 640, label: "2.5:1" },
  { w: 750, h: 1000, label: "3:4" },
  { w: 720, h: 1280, label: "9:16" },
  { w: 1000, h: 1000, label: "1:1" },
];

// A 4:3 crop centred inside a 3:2 (1200x800) source.
const CROP_4_3 = cropFor(1200, 800, 4 / 3);
// A square crop centred inside a 3:2 (1200x800) source.
const CROP_1_1 = cropFor(1200, 800, 1);

function cropFor(sourceW: number, sourceH: number, aspect: number): Crop {
  if (sourceW / sourceH >= aspect) {
    const widthPct = (aspect * sourceH) / sourceW * 100;
    const xPct = (100 - widthPct) / 2;
    return { cropX: xPct, cropY: 0, cropWidth: widthPct, cropHeight: 100, cropAspect: aspect };
  }
  const heightPct = sourceW / aspect / sourceH * 100;
  const yPct = (100 - heightPct) / 2;
  return { cropX: 0, cropY: yPct, cropWidth: 100, cropHeight: heightPct, cropAspect: aspect };
}

function svgPlaceholder(label: string, w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7f9bb5"/>
      <stop offset="100%" stop-color="#3a5a7d"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g font-family="Georgia, serif" text-anchor="middle">
    <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.28}" fill="rgba(255,255,255,0.15)"/>
    <text x="${w / 2}" y="${h / 2 - 8}" font-size="${Math.min(w, h) * 0.11}" fill="#ffffff" font-weight="bold">${label}</text>
    <text x="${w / 2}" y="${h / 2 + Math.min(w, h) * 0.06}" font-size="${Math.min(w, h) * 0.045}" fill="rgba(255,255,255,0.85)">Shape Demo image</text>
  </g>
</svg>`;
}

async function deleteExistingDemos() {
  const products = await prisma.product.findMany({
    include: {
      images: true,
      translations: { where: { language: "en" } },
    },
  });
  const existing = products.filter((product) =>
    product.translations.some((t) => t.title.startsWith(DEMO_PREFIX)),
  );
  for (const product of existing) {
    await prisma.product.delete({ where: { id: product.id } });
    for (const image of product.images) {
      const name = image.url.replace("/api/images/", "");
      try {
        await unlink(path.join(UPLOADS_DIR, name));
      } catch {
        // ignore
      }
    }
    console.log(`Removed previous demo "${product.translations[0]?.title}".`);
  }
}

async function writeImage(shape: Shape): Promise<{ url: string; width: number; height: number }> {
  const file = `${Date.now()}-${randomUUID()}.svg`;
  await writeFile(path.join(UPLOADS_DIR, file), svgPlaceholder(shape.label, shape.w, shape.h));
  return { url: `/api/images/${file}`, width: shape.w, height: shape.h };
}

async function createDemo(title: string, description: string, images: Array<{ url: string; width: number; height: number; crop?: Crop }>) {
  await prisma.product.create({
    data: {
      priceCents: 2499,
      images: {
        create: images.map((image, index) => ({
          url: image.url,
          position: index,
          imageWidth: image.width,
          imageHeight: image.height,
          ...(image.crop ?? {}),
        })),
      },
      translations: {
        create: {
          language: "en",
          title,
          description,
          titleManual: true,
          descriptionManual: true,
        },
      },
    },
  });
}

async function main() {
  await mkdir(UPLOADS_DIR, { recursive: true });
  await deleteExistingDemos();

  const full = await Promise.all(SHAPES.map(writeImage));
  const landscape = full[0];
  const landscape43 = full[1];
  const wide = full[2];
  const pano = full[3];
  const portrait = full[4];
  const tall = full[5];
  const square = full[6];

  await createDemo(
    `${DEMO_PREFIX} — No Crop (full image)`,
    "Same product, many shapes. No crop set, so every image shows in full — catalog cards letterbox each image into the square tile; the gallery stage, thumbnails, and lightbox show each image in a box at its natural proportion.",
    [
      { ...landscape },
      { ...portrait },
      { ...wide },
      { ...tall },
      { ...square },
    ],
  );

  await createDemo(
    `${DEMO_PREFIX} — Cropped 4:3`,
    "Free-form crop: a 4:3 frame carved out of a 3:2 photo. Catalog cards zoom-fill the square tile with the crop; the gallery stage, thumbnails, and lightbox show the crop in a 4:3 box.",
    [
      { ...landscape, crop: CROP_4_3 },
      { ...portrait },
    ],
  );

  await createDemo(
    `${DEMO_PREFIX} — Cropped Square`,
    "A centred square crop carved out of a 3:2 photo. Catalog cards zoom-fill the square with the crop; the gallery stage, thumbnails, and lightbox show the square crop filling the tile exactly.",
    [
      { ...landscape, crop: CROP_1_1 },
      { ...landscape43 },
      { ...portrait },
    ],
  );

  await createDemo(
    `${DEMO_PREFIX} — Panorama`,
    "An extreme 2.5:1 image, uncropped. The catalog card letterboxes it into its square tile; the gallery stage, thumbnails, and lightbox show it in a wide box.",
    [
      { ...pano },
      { ...tall },
    ],
  );

  const products = await prisma.product.findMany({
    include: { translations: { where: { language: "en" } } },
  });
  const created = products.filter((product) =>
    product.translations.some((t) => t.title.startsWith(DEMO_PREFIX)),
  ).length;
  console.log(`Seeded ${created} shape-demo products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());