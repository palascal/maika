import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { savePlayersJsonPlugin } from "./vite-plugins/savePlayersJson";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const basePath = process.env.VITE_BASE_PATH && process.env.VITE_BASE_PATH.trim() ? process.env.VITE_BASE_PATH : "/";

export default defineConfig({
  base: basePath,
  plugins: [react(), savePlayersJsonPlugin(rootDir)],
});
