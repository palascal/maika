import type { Player } from "./types";

/** `active` absent ou `true` → joueur actif ; `false` → désactivé (hors classements / nouvelles parties). */
export function playerIsActive(p: Pick<Player, "active">): boolean {
  return p.active !== false;
}
