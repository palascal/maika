import type { CSSProperties } from "react";
import logoSrc from "../assets/logo.png";

type SiteLogoProps = {
  /** Hauteur en pixels (largeur proportionnelle). */
  size?: number;
  style?: CSSProperties;
  className?: string;
  /** Image purement décorative (alt vide + masquée des lecteurs d’écran). */
  decorative?: boolean;
};

/**
 * Logo Maika : fichier `src/assets/logo.png` (import Vite → URL correcte avec `base`, ex. GitHub Pages).
 * Pour le remplacer, écrasez ce fichier (ou copiez la racine `logo.png` vers `src/assets/logo.png`).
 */
export function SiteLogo({ size = 28, style, className, decorative = false }: SiteLogoProps) {
  return (
    <img
      src={logoSrc}
      alt={decorative ? "" : "Maika"}
      aria-hidden={decorative ? true : undefined}
      width={size}
      height={size}
      className={className}
      style={{ display: "block", width: size, height: size, objectFit: "contain", ...style }}
      decoding="async"
    />
  );
}
