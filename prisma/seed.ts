import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

const PRODUCT_COUNT = 75;
const MAX_IMAGES_PER_PRODUCT = 5;
const UNTAGGED_EVERY = 10;

const TAGS = ["Tabletop", "Kitchenware", "Home Decor", "Textiles"];

const TAG_BY_ITEM: Record<string, string> = {
  Vase: "Home Decor",
  "Serving Bowl": "Tabletop",
  "Cutting Board": "Kitchenware",
  Throw: "Textiles",
  Tumblers: "Glass & Drinkware",
  "Candle Set": "Home Decor",
  Mug: "Tabletop",
  "Table Runner": "Textiles",
  "Storage Basket": "Storage",
  Teapot: "Kitchenware",
  "Dinner Plates": "Tabletop",
  "Salad Bowl": "Tabletop",
  Coasters: "Tabletop",
  Pitcher: "Kitchenware",
  "Fruit Bowl": "Tabletop",
  "Utensil Set": "Kitchenware",
  "Butter Dish": "Tabletop",
  "Serving Platter": "Tabletop",
  "Breakfast Set": "Tabletop",
  Trivet: "Kitchenware",
};

function itemName(i: number): string {
  return ITEMS[Math.floor(i / MATERIALS.length) % ITEMS.length];
}

function tagNameForIndex(i: number): string | null {
  if (i % UNTAGGED_EVERY === 0) return null;
  return TAG_BY_ITEM[itemName(i)] ?? null;
}

async function printTagSummary(prefix: string) {
  const tagged = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { name: true, _count: { select: { products: true } } },
  });
  const untagged = await prisma.product.count({ where: { tagId: null } });
  const distribution = tagged
    .map((t) => `${t.name} (${t._count.products})`)
    .join(", ");
  console.log(`${prefix} ${distribution}${distribution ? ", " : ""}Untagged (${untagged})`);
}

const MATERIALS = [
  "Handmade Ceramic",
  "Stoneware",
  "Oak",
  "Woven Cotton",
  "Handblown Glass",
  "Soy Wax",
  "Glazed Ceramic",
  "Linen",
  "Bamboo",
  "Cast Iron",
  "Beechwood",
  "Acacia",
  "Terracotta",
  "Rattan",
  "Enamel",
  "Wool Felt",
  "Porcelain",
  "Hammered Copper",
  "Solid Walnut",
  "Brushed Steel",
];

const ITEMS = [
  "Vase",
  "Serving Bowl",
  "Cutting Board",
  "Throw",
  "Tumblers",
  "Candle Set",
  "Mug",
  "Table Runner",
  "Storage Basket",
  "Teapot",
  "Dinner Plates",
  "Salad Bowl",
  "Coasters",
  "Pitcher",
  "Fruit Bowl",
  "Utensil Set",
  "Butter Dish",
  "Serving Platter",
  "Breakfast Set",
  "Trivet",
];

const ICONS = [
  "\u{1F3A8}", "\u{1F963}", "\u{1F355}", "\u{1FAF6}", "\u{1F379}",
  "\u{1F56F}\u{FE0F}", "\u2615", "\u{1FAF5}", "\u{1F9F0}", "\u{1FAD6}",
  "\u{1F95A}", "\u{1F966}", "\u{1FAB4}", "\u{1F970}", "\u{1F35E}",
  "\u{1F9C0}", "\u{1FAD4}", "\u26A1", "\u{1F373}", "\u{1F34E}",
];

const PALETTES: Array<[string, string]> = [
  ["#8e6b52", "#5a3d2b"], ["#b5895f", "#7a4f2b"], ["#d8b4a0", "#9b6b55"],
  ["#7fd1c8", "#2d8f86"], ["#f3d9a4", "#c99a3f"], ["#d9a066", "#a2632e"],
  ["#cfe3e3", "#6fa8a8"], ["#d0b48a", "#8a6a3c"], ["#6e6e7a", "#2b2b33"],
  ["#f0e3c8", "#b8a160"], ["#c4c950", "#6d7220"], ["#e0a860", "#9c5f1f"],
  ["#c96f4e", "#7c331a"], ["#b7a4c4", "#5f4a73"], ["#d9a86c", "#8a5a28"],
  ["#8fc1e0", "#3c6e94"], ["#9a9a9a", "#4a4a4a"], ["#9bdfc0", "#3f9b72"],
  ["#f0a1a1", "#b03d3d"], ["#e8e3d0", "#9aa0ab"],
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function shade(from: string, to: string, step: number, total: number): [string, string] {
  const factor = step / Math.max(1, total - 1);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * factor);
  const hx = (n: number) => n.toString(16).padStart(2, "0");
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  return [
    `#${hx(mix(r1, r2))}${hx(mix(g1, g2))}${hx(mix(b1, b2))}`,
    `#${hx(mix(r2, r1))}${hx(mix(g2, g1))}${hx(mix(b2, b1))}`,
  ];
}

function svgPlaceholder(title: string, icon: string, from: string, to: string): string {
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

// Deterministic list of PRODUCT_COUNT products, built from unique material/item
// combinations so every title is distinct.
function sampleProducts() {
  return Array.from({ length: PRODUCT_COUNT }, (_, i) => ({
    title: `${MATERIALS[i % MATERIALS.length]} ${ITEMS[Math.floor(i / MATERIALS.length) % ITEMS.length]}`,
    icon: ICONS[i % ICONS.length],
    from: PALETTES[i % PALETTES.length][0],
    to: PALETTES[i % PALETTES.length][1],
    imageCount: 2 + (i % MAX_IMAGES_PER_PRODUCT), // 2..5
  }));
}

async function main() {
  const tagIds: Record<string, string> = {};
  for (const name of TAGS) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    tagIds[name] = tag.id;
  }
  console.log(`Ensured ${TAGS.length} tags: ${TAGS.join(", ")}`);

  const existingCount = await prisma.product.count();

  const existing = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, tagId: true },
  });
  let assigned = 0;
  for (let i = 0; i < existing.length; i++) {
    if (existing[i].tagId !== null) continue;
    const tagName = tagNameForIndex(i);
    if (!tagName) continue;
    await prisma.product.update({
      where: { id: existing[i].id },
      data: { tagId: tagIds[tagName] },
    });
    assigned++;
  }
  if (assigned > 0) {
    console.log(`Assigned tags to ${assigned} previously-untagged products.`);
  }

  if (existingCount >= PRODUCT_COUNT) {
    console.log(
      `Database already has ${existingCount} products (>= ${PRODUCT_COUNT}). Skipping new products.`,
    );
    await printTagSummary("Tag distribution:");
    return;
  }

  await mkdir(UPLOADS_DIR, { recursive: true });

  let imagesCreated = 0;
  const samples = sampleProducts();

  for (let i = existingCount; i < PRODUCT_COUNT; i++) {
    const sample = samples[i];
    const slug = slugify(sample.title);
    const urls: string[] = [];

    for (let j = 0; j < sample.imageCount; j++) {
      const [from, to] = shade(sample.from, sample.to, j, sample.imageCount);
      const file = `sample-${slug}-${j + 1}.svg`;
      const filePath = path.join(UPLOADS_DIR, file);
      await writeFile(filePath, svgPlaceholder(sample.title, sample.icon, from, to));
      urls.push(`/uploads/${file}`);
    }

    const tagName = tagNameForIndex(i);
    const description = `A sample listing for "${sample.title}". Swapped in by the seed script — replace the details and images with real inventory before going live.`;

    await prisma.product.create({
      data: {
        priceCents: 1500 + Math.floor(Math.random() * 8500),
        tagId: tagName ? tagIds[tagName] : null,
        images: {
          create: urls.map((url, index) => ({ url, position: index })),
        },
        translations: {
          create: {
            language: "en",
            title: sample.title,
            description,
            titleManual: true,
            descriptionManual: true,
          },
        },
      },
    });

    imagesCreated += urls.length;
  }

  const created = PRODUCT_COUNT - existingCount;
  console.log(
    `Seeded ${created} products with ${imagesCreated} images (up to ${MAX_IMAGES_PER_PRODUCT} per product). Every ${UNTAGGED_EVERY}th product is left untagged.`,
  );
  await printTagSummary("Tag distribution:");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());