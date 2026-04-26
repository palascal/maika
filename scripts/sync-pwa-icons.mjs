/**
 * Copie le logo vers public/icons/ pour le manifest PWA (192 et 512, même fichier source).
 * À lancer après sync-logo.mjs (src/assets/logo.png doit exister).
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
copyFileSync(src, p192);
copyFileSync(src, p512);
console.log("[sync-pwa-icons] src/assets/logo.png → public/icons/icon-192.png, icon-512.png");
