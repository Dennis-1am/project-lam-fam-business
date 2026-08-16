import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function svgPlaceholder(title: string, from: string, to: string, icon: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <g transform="translate(400,320)" font-family="Georgia, serif" text-anchor="middle">
    <text x="0" y="0" font-size="90" fill="rgba(255,255,255,0.9)">${icon}</text>
    <text x="0" y="120" font-size="42" fill="#ffffff" font-weight="bold">${title}</text>
    <text x="0" y="170" font-size="26" fill="rgba(255,255,255,0.85)">Sample listing image</text>
  </g>
</svg>`;
}

async function main() {
  const existing = await prisma.product.findFirst({
    where: { title: "Handmade Ceramic Vase" },
  });
  if (existing) {
    console.log("Sample product already exists, skipping.");
    return;
  }

  await mkdir(UPLOADS_DIR, { recursive: true });

  const samples = [
    {
      file: "sample-vase-1.svg",
      svg: svgPlaceholder("Handmade Ceramic Vase", "#8e6b52", "#5a3d2b", "\u{1F3A8}"),
    },
    {
      file: "sample-vase-2.svg",
      svg: svgPlaceholder("Handmade Ceramic Vase", "#b0846a", "#6b4a33", "\u{1F3A8}"),
    },
    {
      file: "sample-vase-3.svg",
      svg: svgPlaceholder("Handmade Ceramic Vase", "#c49a7c", "#7d5940", "\u{1F3A8}"),
    },
  ];

  const urls: string[] = [];
  for (const sample of samples) {
    const filePath = path.join(UPLOADS_DIR, sample.file);
    await writeFile(filePath, sample.svg);
    urls.push(`/uploads/${sample.file}`);
  }

  await prisma.product.create({
    data: {
      title: "Handmade Ceramic Vase",
      description:
        "A one-of-a-kind handmade ceramic vase, glazed in warm earth tones. Each piece is shaped and painted by hand, so no two are exactly alike. Makes a lovely centerpiece for flowers or dried stems.",
      priceCents: 4500,
      images: {
        create: urls.map((url, index) => ({ url, position: index })),
      },
    },
  });

  console.log("Seeded sample product with 3 images.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());