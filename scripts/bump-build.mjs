import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src", "buildInfo.ts");

const raw = readFileSync(target, "utf8");
const m = raw.match(/BUILD_NUMBER\s*=\s*(\d+)/);
if (!m) {
  console.error("[bump-build] BUILD_NUMBER introuvable dans src/buildInfo.ts");
  process.exit(1);
}

const current = Number(m[1]);
const next = current + 1;
const updated = raw.replace(/BUILD_NUMBER\s*=\s*\d+/, `BUILD_NUMBER = ${next}`);
writeFileSync(target, updated, "utf8");
console.log(`[bump-build] ${current} -> ${next}`);
