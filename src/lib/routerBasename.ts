/**
 * Chemin de base de l’app (sans slash final), aligné sur `import.meta.env.BASE_URL` de Vite.
 * Sur GitHub Pages (`base: /maika/`) → `/maika`. En dev racine → `undefined`.
 */
export function routerBasename(): string | undefined {
  const trimmed = import.meta.env.BASE_URL.replace(/\/$/, "");
  return trimmed || undefined;
}

/** URL absolue vers une route interne (ex. `/parties/ajout` → `/maika/parties/ajout` en prod Pages). */
export function appAbsolutePath(path: string): string {
  const base = routerBasename() ?? "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
