import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import faviconUrl from "./assets/logo.png";
import { routerBasename } from "./lib/routerBasename";
import "./index.css";
import { App } from "./App";

function baseUrlPrefix(): string {
  const b = import.meta.env.BASE_URL;
  return b.endsWith("/") ? b : `${b}/`;
}

/** Manifest, icône écran d’accueil iOS, enregistrement du service worker (prod uniquement). */
function setupPwaHeadAndServiceWorker(): void {
  const root = baseUrlPrefix();

  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = `${root}manifest.webmanifest`;
    document.head.appendChild(link);
  }

  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const link = document.createElement("link");
    link.rel = "apple-touch-icon";
    link.href = `${root}icons/icon-192.png`;
    document.head.appendChild(link);
  }

  if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    const meta = document.createElement("meta");
    meta.name = "apple-mobile-web-app-capable";
    meta.content = "yes";
    document.head.appendChild(meta);
  }

  if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) {
    const meta = document.createElement("meta");
    meta.name = "apple-mobile-web-app-title";
    meta.content = "Maika";
    document.head.appendChild(meta);
  }

  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register(`${root}sw.js`).catch(() => {
        /* ignore : SW optionnel si hébergeur bloque */
      });
    });
  }
}

{
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/png";
    document.head.appendChild(icon);
  }
  icon.href = faviconUrl;
}

setupPwaHeadAndServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename()}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
