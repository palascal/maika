import { flattenSeasonScoringForJson, type SeasonScoringConfig } from "./seasonScoringConfigStorage";

/** POST vers le serveur Vite (dev / preview) pour écrire `scoring-config.json` sur le disque. */
export async function saveScoringConfigToDisk(config: SeasonScoringConfig): Promise<void> {
  const res = await fetch("/api/save-scoring-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(flattenSeasonScoringForJson(config)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Enregistrement refusé (${res.status}). Lancez « npm run dev » ou « npm run preview ».`);
  }
}
