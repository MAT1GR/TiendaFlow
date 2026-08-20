/**
 * Genera todos los derivados de la marca a partir del master
 * `public/brand/tiendaflow-mark.png` (isotipo, 512px, fondo transparente).
 *
 *   node scripts/brand-assets.mjs
 *
 * Usa `sharp`, que ya viene instalado con Next.js. No hace falta correrlo en
 * cada build: los archivos que produce están versionados. Corrélo sólo si
 * cambia el logo.
 */

import { createRequire } from "node:module";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MASTER = path.join(ROOT, "public/brand/tiendaflow-mark.png");

const INK_900 = "#0f172a";
const BRAND_500 = "#6d5dfb";
const CYAN = "#22d3ee";

/** PNG optimizado: paleta cuando alcanza, color real cuando hay degradés finos. */
const png = (palette) =>
  palette
    ? { palette: true, quality: 92, effort: 10, compressionLevel: 9 }
    : { compressionLevel: 9, effort: 10 };

async function write(file, buffer) {
  const target = path.join(ROOT, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  console.log(`  ${file.padEnd(38)} ${(buffer.length / 1024).toFixed(1)} kB`);
}

/** ICO con PNGs embebidos (soportado por todos los navegadores actuales). */
async function buildIco(sizes) {
  const images = await Promise.all(
    sizes.map(async (size) => ({
      size,
      data: await sharp(MASTER).resize(size, size).png(png(true)).toBuffer(),
    })),
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: ícono
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // colores de la paleta
    entry.writeUInt8(0, 3); // reservado
    entry.writeUInt16LE(1, 4); // planos
    entry.writeUInt16LE(32, 6); // bits por pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

/** Placa social 1200×630: fondo oscuro con halos de marca, isotipo y wordmark. */
async function buildSocialCard() {
  const W = 1200;
  const H = 630;

  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="halo-a" cx="0.18" cy="0.1" r="0.75">
      <stop offset="0" stop-color="${BRAND_500}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${BRAND_500}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="halo-b" cx="0.9" cy="0.95" r="0.7">
      <stop offset="0" stop-color="${CYAN}" stop-opacity="0.32"/>
      <stop offset="1" stop-color="${CYAN}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${INK_900}"/>
  <rect width="${W}" height="${H}" fill="url(#halo-a)"/>
  <rect width="${W}" height="${H}" fill="url(#halo-b)"/>
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="${BRAND_500}"/>
</svg>`);

  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <g font-family="Segoe UI, Inter, Helvetica Neue, Arial, sans-serif" fill="#ffffff">
    <text x="96" y="352" font-size="76" font-weight="600" letter-spacing="-2">TiendaFlow</text>
    <text x="96" y="424" font-size="34" font-weight="400" fill="#cbd5e1">De una idea a una oferta lista para vender.</text>
    <text x="96" y="516" font-size="24" font-weight="600" fill="#8b83fc" letter-spacing="3">CREATE · LAUNCH · SELL · OPTIMIZE</text>
  </g>
</svg>`);

  const mark = await sharp(MASTER).resize(168, 168).toBuffer();

  // Isotipo gigante y muy tenue sobre el margen derecho, para equilibrar la placa.
  const watermarkSize = 620;
  const watermark = await sharp(MASTER)
    .resize(watermarkSize, watermarkSize)
    .composite([
      {
        input: {
          create: {
            width: watermarkSize,
            height: watermarkSize,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 0.13 },
          },
        },
        blend: "dest-in",
      },
    ])
    .toBuffer();

  return sharp(background)
    .composite([
      { input: watermark, left: W - watermarkSize + 70, top: (H - watermarkSize) / 2 | 0 },
      { input: mark, left: 96, top: 108 },
      { input: text },
    ])
    .png(png(false))
    .toBuffer();
}

async function main() {
  await fs.access(MASTER);
  console.log("Generando assets de marca desde public/brand/tiendaflow-mark.png\n");

  // Isotipo chico para la UI (se muestra entre 26 y 40 px).
  await write(
    "public/brand/tiendaflow-mark-128.png",
    await sharp(MASTER).resize(128, 128).png(png(true)).toBuffer(),
  );

  // Favicons y app icons (convenciones de archivo de Next.js).
  await write("src/app/icon.png", await sharp(MASTER).resize(256, 256).png(png(true)).toBuffer());
  await write("src/app/favicon.ico", await buildIco([16, 32, 48]));

  // iOS recorta el ícono, así que necesita fondo opaco.
  await write(
    "src/app/apple-icon.png",
    await sharp({
      create: { width: 180, height: 180, channels: 4, background: "#ffffff" },
    })
      .composite([{ input: await sharp(MASTER).resize(140, 140).toBuffer(), left: 20, top: 20 }])
      .png(png(true))
      .toBuffer(),
  );

  // Ícono maskable para Android: el sistema lo recorta, así que el isotipo
  // tiene que entrar en el 60% central del lienzo.
  await write(
    "public/brand/tiendaflow-maskable-512.png",
    await sharp({ create: { width: 512, height: 512, channels: 4, background: "#ffffff" } })
      .composite([{ input: await sharp(MASTER).resize(300, 300).toBuffer(), left: 106, top: 106 }])
      .png(png(true))
      .toBuffer(),
  );

  const card = await buildSocialCard();
  await write("src/app/opengraph-image.png", card);
  await write("src/app/twitter-image.png", card);

  console.log("\nListo.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
