import type { Player, PlayerId, PlayerPoste } from "./types";

function comparePlayersForRanking(a: Player, b: Player): number {
  if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
  const ln = a.lastName.localeCompare(b.lastName, "fr");
  if (ln !== 0) return ln;
  return a.firstName.localeCompare(b.firstName, "fr");
}

/** Classement dense par poste : même nombre de points = même rang (1, 1, 2…). */
export function rankingByPoste(players: Player[], poste: PlayerPoste): Map<PlayerId, number> {
  const subset = players.filter((p) => p.poste === poste).slice().sort(comparePlayersForRanking);
  const map = new Map<PlayerId, number>();
  let rank = 1;

  for (let i = 0; i < subset.length; i++) {
    const p = subset[i]!;
    if (i > 0 && p.seasonPoints < subset[i - 1]!.seasonPoints) {
      rank += 1;
    }
    map.set(p.id, rank);
  }
  return map;
}

export function posteLabel(poste: PlayerPoste): string {
  return poste === "avant" ? "Avant" : "Arrière";
}
