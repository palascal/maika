/**
 * Génère les icônes PWA (192/512) à partir du logo, en réduisant les marges
 * pour une meilleure occupation visuelle sur l'écran d'accueil mobile.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src", "assets", "logo.png");
const outDir = join(root, "public", "icons");

if (!existsSync(src)) {
  console.error("[sync-pwa-icons] Fichier introuvable : src/assets/logo.png (lancez d’abord sync-logo.mjs).");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const p192 = join(outDir, "icon-192.png");
const p512 = join(outDir, "icon-512.png");

const ICON_FILL_RATIO = 0.92;

async function renderIcon(size, outFile) {
  const inner = Math.max(1, Math.floor(size * ICON_FILL_RATIO));
  const padStart = Math.floor((size - inner) / 2);
  const padEnd = size - inner - padStart;

  // trim() retire les transparences externes éventuelles du logo source.
  const trimmed = sharp(src).trim();
  const resized = await trimmed
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(resized)
    .extend({
      top: padStart,
      bottom: padEnd,
      left: padStart,
      right: padEnd,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outFile);
}

await Promise.all([renderIcon(192, p192), renderIcon(512, p512)]);
console.log("[sync-pwa-icons] icons PWA générées avec logo agrandi → public/icons/icon-192.png, icon-512.png");
