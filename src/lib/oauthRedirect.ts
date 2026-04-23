/** URL de base de l’app (origine + chemin Vite), pour OAuth Supabase (redirectTo). */
export function supabaseOAuthRedirectTo(): string {
  const base = import.meta.env.BASE_URL;
  if (!base || base === "/") return `${window.location.origin}/`;
  const path = base.endsWith("/") ? base : `${base}/`;
  return `${window.location.origin}${path}`;
}
