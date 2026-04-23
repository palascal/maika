/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Identifiant de saison en base (clé `seasons.id`), défaut `2026`. */
  readonly VITE_SUPABASE_SEASON_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

