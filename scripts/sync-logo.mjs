/**
 * Copie `logo.png` (racine du projet) vers `src/assets/logo.png` avant le build.
 * Sur CI, si seule la racine est versionnée, le bundle embarque le bon fichier.
 * Si la racine est absente mais `src/assets/logo.png` existe déjà, ne fait rien.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fromRoot = join(root, "logo.png");
const destDir = join(root, "src", "assets");
const dest = join(destDir, "logo.png");

if (existsSync(fromRoot)) {
  mkdirSync(destDir, { recursive: true });
  copyFileSync(fromRoot, dest);
  console.log("[sync-logo] logo.png → src/assets/logo.png");
} else if (!existsSync(dest)) {
  console.error("[sync-logo] Aucun logo : ajoutez logo.png à la racine du projet ou src/assets/logo.png.");
  process.exit(1);
}
