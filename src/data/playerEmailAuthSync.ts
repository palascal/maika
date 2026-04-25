import type { Player } from "../domain/types";
import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseConfigured } from "../lib/supabaseConfig";
import { normalizeAppRole, type AppRole } from "../lib/accessRoles";

export type PlayerAuthChange = {
  playerId: string;
  previousEmail: string | null;
  nextEmail: string | null;
  previousRole: AppRole;
  nextRole: AppRole;
};

function normPlayerEmail(p: Player): string | null {
  const e = p.email?.trim().toLowerCase();
  return e && e.length > 0 ? e : null;
}

function normPlayerRole(p: Player): AppRole {
  return normalizeAppRole(p.authRole ?? "user");
}

/** Compare l’ancienne et la nouvelle liste de joueurs (même `player_id`) pour détecter les changements d’e-mail. */
export function computePlayerAuthChanges(before: Player[], after: Player[]): PlayerAuthChange[] {
  const beforeMap = new Map(before.map((p) => [p.id, { email: normPlayerEmail(p), role: normPlayerRole(p) }]));
  const out: PlayerAuthChange[] = [];
  for (const p of after) {
    const prev = beforeMap.get(p.id) ?? { email: null, role: "user" as const };
    const nextEmail = normPlayerEmail(p);
    const nextRole = normPlayerRole(p);
    if (prev.email === nextEmail && prev.role === nextRole) continue;
    out.push({
      playerId: p.id,
      previousEmail: prev.email,
      nextEmail,
      previousRole: prev.role,
      nextRole,
    });
  }
  return out;
}

export type SyncPlayerAuthEmailsResult =
  | { ok: true }
  | { ok: false; message: string; partialErrors?: Array<{ playerId: string; error?: string }> };

/**
 * Après enregistrement des joueurs en base, aligne les comptes Supabase Auth (invitation ou mise à jour d’e-mail).
 * Nécessite l’Edge Function `admin-sync-player-emails` déployée sur le projet.
 */
export async function syncPlayerAuthEmailsAfterSave(changes: PlayerAuthChange[]): Promise<SyncPlayerAuthEmailsResult> {
  if (!isSupabaseConfigured() || changes.length === 0) return { ok: true };

  const sb = getSupabaseClient();
  const { data: sessionData, error: sessErr } = await sb.auth.getSession();
  if (sessErr || !sessionData.session?.access_token) {
    return { ok: false, message: "Session expirée. Reconnectez-vous pour synchroniser les comptes Auth." };
  }

  const base = import.meta.env.VITE_SUPABASE_URL!.replace(/\/$/, "");
  const res = await fetch(`${base}/functions/v1/admin-sync-player-emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ changes }),
  });

  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    partialErrors?: Array<{ playerId: string; error?: string }>;
  } | null;

  if (!res.ok) {
    const msg = json?.error ?? `Erreur HTTP ${res.status} (fonction admin-sync-player-emails).`;
    return { ok: false, message: msg };
  }

  if (json?.ok === false && json.partialErrors?.length) {
    const bits = json.partialErrors.map((e) => `${e.playerId}${e.error ? ` : ${e.error}` : ""}`).join(" · ");
    return { ok: false, message: `Synchro Auth partielle ou en échec : ${bits}`, partialErrors: json.partialErrors };
  }

  return { ok: true };
}
