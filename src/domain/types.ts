/** Identifiant stable d’un joueur pour la saison (ex. "marie-dupont"). */
export type PlayerId = string;

/** Poste au filet (avant) ou au fond de court (arrière) — deux classements distincts. */
export type PlayerPoste = "avant" | "arriere";

/** Une équipe de double = exactement 2 joueurs. */
export type DoublesTeam = readonly [PlayerId, PlayerId];

export type MatchStatus = "scheduled" | "played" | "cancelled";

export interface Player {
  id: PlayerId;
  lastName: string;
  firstName: string;
  poste: PlayerPoste;
  /**
   * Points cumulés saison ; le classement est calculé parmi les joueurs du même poste.
   * Le Maika affiché est la partie entière de `seasonPoints / 10` (voir `maikaFromSeasonPoints`).
   */
  seasonPoints: number;
  /**
   * Si `false`, le joueur reste en base pour l’historique des parties mais est exclu des classements
   * et des listes de sélection pour de nouvelles parties. Absent ou `true` = actif.
   */
  active?: boolean;
  /**
   * E-mail de contact ou de rattachement logique (optionnel). Indépendant du compte Supabase Auth
   * sauf si vous alignez manuellement les adresses dans le dashboard.
   */
  email?: string;
}

/**
 * Partie de pelote basque en double : 2 équipes de 2.
 * Partie en 40 points : on enregistre le total marqué par chaque équipe (ex. 40 et 25).
 */
export interface Match {
  id: string;
  seasonId: string;
  status: MatchStatus;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Heure locale optionnelle (heure seule, ex. « 17 » ou « 17:00 » en données anciennes). */
  time?: string;
  /** Lieu (fronton, trinquet, ville, etc.). */
  venue?: string;
  teamA: DoublesTeam;
  teamB: DoublesTeam;
  /**
   * Points marqués par l’équipe A et l’équipe B (partie en 40).
   * Renseignés lorsque status === "played".
   */
  scoreTeamA?: number;
  scoreTeamB?: number;
  notes?: string;
  /**
   * Deltas de points saison appliqués lors de la dernière validation (pour annulation si la partie est modifiée ou retirée).
   */
  appliedSeasonPointDeltas?: Partial<Record<PlayerId, number>>;
}

export interface PlayersFile {
  seasonId: string;
  seasonLabel: string;
  updatedAt: string;
  players: Player[];
}

export interface MatchesFile {
  seasonId: string;
  updatedAt: string;
  matches: Match[];
}
