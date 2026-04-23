import type { PlayersFile } from "../domain/types";

/** POST vers le serveur Vite (dev / preview) pour écrire `players.json` sur le disque. */
export async function savePlayersToDisk(data: PlayersFile): Promise<void> {
  const res = await fetch("/api/save-players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Enregistrement refusé (${res.status}). Lancez « npm run dev » ou « npm run build » puis « npm run preview ».`);
  }
}
