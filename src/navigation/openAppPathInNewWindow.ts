/**
 * Ouvre une route de l’app dans un nouvel onglet (fenêtre).
 * Sur mobile ou si les popups sont bloquées, bascule sur la navigation dans l’onglet courant.
 */
export function openAppPathInNewWindow(path: string): void {
  const url = new URL(path, window.location.href).href;
  const handle = window.open(url, "_blank", "noopener,noreferrer");
  if (!handle) {
    window.location.assign(path);
  }
}
