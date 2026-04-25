/**
 * Upsert les 26 joueurs (noms + postes) pour la saison MAIKA_SEASON_ID (défaut depuis .env.local).
 * Nécessite SUPABASE_SERVICE_ROLE_KEY et VITE_SUPABASE_URL (ou SUPABASE_URL).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAIRS = [
  ["Azcarate", "avant"],
  ["Camredon", "avant"],
  ["Novella", "avant"],
  ["Pissinis", "avant"],
  ["Ithurria", "avant"],
  ["Perez", "avant"],
  ["TailleurV", "arriere"],
  ["Bourdel", "arriere"],
  ["Perusin", "arriere"],
  ["Oyhenard", "arriere"],
  ["Duprat", "arriere"],
  ["Bourthoumieu", "arriere"],
  ["Domingo", "arriere"],
  ["TailleurJ", "avant"],
  ["Labourdette", "avant"],
  ["Martin", "arriere"],
  ["Lallemand", "arriere"],
  ["VanRentherghem", "arriere"],
  ["Berot", "avant"],
  ["Becaas", "avant"],
  ["Iris", "avant"],
  ["Latrubesse", "arriere"],
  ["Montlezun", "arriere"],
  ["Naude", "avant"],
  ["Marestin", "arriere"],
  ["Chassaing", "arriere"],
];

function stripDiacritics(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function part(s) {
  return stripDiacritics(s.trim().toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function basePlayerSlug(firstName, lastName) {
  const a = part(firstName);
  const b = part(lastName);
  const slug = [a, b].filter(Boolean).join("-");
  return slug.length > 0 ? slug : "joueur";
}

function uniquePlayerId(firstName, lastName, existingIds) {
  let base = basePlayerSlug(firstName, lastName);
  if (!existingIds.has(base)) return base;
  let n = 2;
  while (existingIds.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function loadEnvLocal() {
  const path = resolve(__dirname, "../.env.local");
  const out = {};
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  } catch {
    // ignore
  }
  return out;
}

const envLocal = loadEnvLocal();
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || envLocal.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seasonId =
  process.env.MAIKA_SEASON_ID || envLocal.VITE_SUPABASE_SEASON_ID || "2026";

if (!url || !serviceKey) {
  console.error("Manque SUPABASE_URL (ou VITE_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const sb = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: rows, error: e1 } = await sb.from("players").select("player_id").eq("season_id", seasonId);
if (e1) throw e1;
const existing = new Set((rows ?? []).map((r) => r.player_id));

const { data: sc, error: e2 } = await sb.from("scoring_config").select("payload").eq("season_id", seasonId).maybeSingle();
if (e2) throw e2;
const start =
  sc?.payload && typeof sc.payload.startingSeasonPoints === "number" && Number.isFinite(sc.payload.startingSeasonPoints)
    ? Math.round(sc.payload.startingSeasonPoints)
    : 10;

const inserts = [];
for (const [lastName, poste] of PAIRS) {
  const player_id = uniquePlayerId("", lastName, existing);
  existing.add(player_id);
  const email = `${player_id}@debug.maika.local`;
  inserts.push({
    season_id: seasonId,
    player_id,
    last_name: lastName,
    first_name: "",
    poste,
    season_points: start,
    active: true,
    email,
    auth_role: "user",
  });
}

const { error: e3 } = await sb.from("players").upsert(inserts, { onConflict: "season_id,player_id" });
if (e3) throw e3;

const today = new Date().toISOString().slice(0, 10);
const { error: e4 } = await sb.from("seasons").update({ players_updated_at: today }).eq("id", seasonId);
if (e4) throw e4;

console.log("OK season", seasonId, "lignes", inserts.length);
for (const r of inserts) console.log(r.player_id, r.last_name, r.poste, r.email);
