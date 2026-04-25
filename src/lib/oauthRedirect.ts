import { appAbsolutePath } from "./routerBasename";

/**
 * URL complète de retour après « mot de passe oublié » (e-mail Supabase).
 * À autoriser dans Supabase : Authentication → URL configuration → Redirect URLs.
 */
export function supabasePasswordRecoveryRedirectTo(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${appAbsolutePath("/profil")}`;
}
