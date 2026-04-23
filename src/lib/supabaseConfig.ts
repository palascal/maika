/** True when the app should use Supabase for data and (optionally) auth instead of JSON + Vite APIs. */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && String(url).trim() && String(key).trim());
}

/** Season primary key in DB (`seasons.id`). Must match migration seed or your data. */
export function supabaseSeasonId(): string {
  const v = import.meta.env.VITE_SUPABASE_SEASON_ID;
  return (typeof v === "string" && v.trim() ? v.trim() : "2026") as string;
}
