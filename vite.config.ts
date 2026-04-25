import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { savePlayersJsonPlugin } from "./vite-plugins/savePlayersJson";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function normalizeBase(raw: string): string {
  const t = raw.trim();
  if (!t || t === "/") return "/";
  return t.endsWith("/") ? t : `${t}/`;
}

/**
 * - `npm run dev` : toujours base `/` → http://localhost:5173/ (évite page vide si VITE_BASE_PATH=/maika/ dans l’environnement).
 * - `npm run build` : base = VITE_BASE_PATH (ex. GitHub Pages) ou `/`.
 * - `npm run preview` : même base que le build si VITE_BASE_PATH est défini (ex. `VITE_BASE_PATH=/maika/ npm run preview`).
 */
export default defineConfig(({ command }) => {
  const fromEnv = process.env.VITE_BASE_PATH?.trim();
  const subBase = fromEnv ? normalizeBase(fromEnv) : "/";

  const isPreview = process.argv.includes("preview");
  let basePath = "/";
  if (command === "build") {
    basePath = subBase;
  } else if (command === "serve" && isPreview) {
    basePath = subBase;
  } else {
    basePath = "/";
  }

  return {
    base: basePath,
    plugins: [react(), savePlayersJsonPlugin(rootDir)],
  };
});
