import { appAbsolutePath } from "../lib/routerBasename";

/**
 * Ouvre une route de l’app dans un nouvel onglet (fenêtre).
 * Sur mobile ou si les popups sont bloquées, bascule sur la navigation dans l’onglet courant.
 * Préfixe le chemin avec le `basename` Vite (ex. GitHub Pages `/maika/`) pour éviter les 404.
 */
export function openAppPathInNewWindow(path: string): void {
  const fullPath = appAbsolutePath(path);
  const url = `${window.location.origin}${fullPath}`;
  const handle = window.open(url, "_blank");
  if (handle) {
    // Harden against reverse-tabnabbing without relying on browser-specific "noreferrer" behavior.
    handle.opener = null;
  } else {
    window.location.assign(fullPath);
  }
}
