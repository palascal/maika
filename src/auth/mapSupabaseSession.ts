import type { User } from "@supabase/supabase-js";
import type { AuthSession } from "./authCredentials";

/** `app_metadata.role === "admin"` défini dans le dashboard Supabase (compte inviolable par le client). */
export function authSessionFromSupabaseUser(user: User | null): AuthSession | null {
  if (!user) return null;
  const meta = user.app_metadata as { role?: string } | undefined;
  const role = meta?.role === "admin" ? "admin" : "user";
  return {
    username: user.email ?? user.id,
    role,
  };
}
