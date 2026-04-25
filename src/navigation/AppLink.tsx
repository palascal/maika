import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { appAbsolutePath } from "../lib/routerBasename";

type AppLinkProps = {
  to: string;
  replace?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  title?: string;
  "aria-label"?: string;
};

/** Lien interne : `href` avec préfixe Pages (`/maika/...`) + navigation SPA. */
export function AppLink({ to, replace, children, style, className, title, "aria-label": ariaLabel }: AppLinkProps) {
  const navigate = useNavigate();
  const href = appAbsolutePath(to);

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to, { replace });
  }

  return (
    <a href={href} onClick={onClick} style={style} className={className} aria-label={ariaLabel} title={title}>
      {children}
    </a>
  );
}

export type ShellNavStyleFn = (opts: { isActive: boolean }) => CSSProperties;

function routeIsActive(pathname: string, search: string, to: string, end: boolean | undefined): boolean {
  const q = to.indexOf("?");
  const toPath = q === -1 ? to : to.slice(0, q);
  const toSearch = q === -1 ? "" : `?${to.slice(q + 1)}`;
  const locSearch = search || "";

  if (end) {
    if (toPath === "/" || toPath === "") return pathname === "/" || pathname === "";
    return pathname === toPath && (toSearch === "" || locSearch === toSearch);
  }
  if (pathname === toPath) return toSearch === "" || locSearch === toSearch;
  return pathname.startsWith(`${toPath}/`);
}

type ShellNavLinkProps = {
  to: string;
  end?: boolean;
  style: ShellNavStyleFn | CSSProperties;
  children: ReactNode | ((opts: { isActive: boolean }) => ReactNode);
  title?: string;
  "aria-label"?: string;
};

/** Lien de menu : même comportement que {@link AppLink} + état actif (GitHub Pages + basename). */
export function ShellNavLink({ to, end, style, children, title, "aria-label": ariaLabel }: ShellNavLinkProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const search = location.search;
  const isActive = routeIsActive(pathname, search, to, end);
  const mergedStyle = typeof style === "function" ? style({ isActive }) : style;
  const href = appAbsolutePath(to);
  const body = typeof children === "function" ? children({ isActive }) : children;

  return (
    <a
      href={href}
      title={title}
      aria-label={ariaLabel}
      style={mergedStyle}
      aria-current={isActive ? "page" : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {body}
    </a>
  );
}
