import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const TAB_SOURCE = flag("tab", "assets/elife-shop-favicon-cropped.png");
const APP_SOURCE = flag("app", "assets/elife-shop-favicon.jpeg");
const ICO_SIZES = [16, 32, 48, 256];
const FLAT_SIZES = [192, 512];
const APPLE_ICON_SIZE = 180;
const MASKABLE_INSET = 0.76;

const resolve = (file) => {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error(`missing source image: ${file}`);
    process.exit(1);
  }
  return abs;
};

const tabSrc = resolve(TAB_SOURCE);
const appSrc = resolve(APP_SOURCE);

fs.mkdirSync("public/icons", { recursive: true });

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const hasAlpha = async (file) => (await sharp(file).metadata()).hasAlpha === true;

const cornerColor = async (file) => {
  const { data } = await sharp(file)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2], alpha: 1 };
};

// Cutouts have no usable corner pixel (transparent pixels still carry hidden
// RGB), so only opaque sources get their own color as the letterbox fill.
const pageFill = async (file) =>
  (await hasAlpha(file)) ? TRANSPARENT : await cornerColor(file);

const flatten = (file, size, options) =>
  sharp(file)
    .resize(size, size, options)
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();

const containOnSquare = async (file, size) =>
  sharp(file)
    .resize(size, size, { fit: "contain", background: await pageFill(file) })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();

const insetOnSquare = async (file, size, inset) => {
  const art = Math.round(size * inset);
  const slack = size - art;
  const near = Math.floor(slack / 2);
  return sharp(file)
    .resize(art, art, { fit: "inside" })
    .extend({
      top: near,
      bottom: slack - near,
      left: near,
      right: slack - near,
      background: await cornerColor(file),
    })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
};

for (const size of FLAT_SIZES) {
  fs.writeFileSync(
    `public/icons/icon-${size}.png`,
    await flatten(appSrc, size, { fit: "cover" }),
  );
}

for (const size of FLAT_SIZES) {
  fs.writeFileSync(
    `public/icons/icon-maskable-${size}.png`,
    await insetOnSquare(appSrc, size, MASKABLE_INSET),
  );
}

fs.writeFileSync(
  "app/apple-icon.png",
  await flatten(appSrc, APPLE_ICON_SIZE, { fit: "cover" }),
);

const entries = await Promise.all(
  ICO_SIZES.map((size) => containOnSquare(tabSrc, size)),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(entries.length, 4);

let offset = header.length + entries.length * 16;
const directory = entries.map((data, i) => {
  const size = ICO_SIZES[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(data.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += data.length;
  return entry;
});

fs.writeFileSync(
  "app/favicon.ico",
  Buffer.concat([header, ...directory, ...entries]),
);

console.log(
  [
    `tab  ${TAB_SOURCE} -> app/favicon.ico [${ICO_SIZES.join(",")}]`,
    `app  ${APP_SOURCE} -> app/apple-icon.png ${APPLE_ICON_SIZE}, public/icons/icon-{${FLAT_SIZES.join(",")}}, public/icons/icon-maskable-{${FLAT_SIZES.join(",")}}`,
  ].join("\n"),
);