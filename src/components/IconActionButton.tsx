import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export const iconButtonBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "0.45rem 0.55rem",
  minWidth: "2.5rem",
  minHeight: "2.5rem",
  borderRadius: 10,
  cursor: "pointer",
  lineHeight: 0,
  touchAction: "manipulation",
};

type IconActionButtonProps = {
  type?: "button" | "submit";
  label: string;
  icon: LucideIcon;
  iconSize?: number;
  /** Ex. `animate-icon-spin` sur un `Loader2`. */
  iconClassName?: string;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
};

/** Bouton action uniquement icône (étiquette vocalisée + infobulle). */
export function IconActionButton({
  type = "button",
  label,
  icon: Icon,
  iconSize = 18,
  iconClassName,
  disabled,
  style,
  className,
  onClick,
  children,
}: IconActionButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={{ ...iconButtonBaseStyle, ...style }}
    >
      <Icon size={iconSize} strokeWidth={2} aria-hidden focusable={false} className={iconClassName} />
      {children}
    </button>
  );
}
