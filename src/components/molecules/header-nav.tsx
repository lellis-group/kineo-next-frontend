import Link from "next/link";
import type { HeaderLink } from "@/lib/navigation";

export interface HeaderNavProps {
  links: HeaderLink[];
  /** Highlighted link (aria-current="page"). */
  activeHref?: string;
  orientation: "horizontal" | "vertical";
  /** Called when a link is activated (mobile menu close). */
  onNavigate?: () => void;
}

/** Navigation link list — shared between the desktop bar and the mobile menu. */
export function HeaderNav({
  links,
  activeHref,
  orientation,
  onNavigate,
}: HeaderNavProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <nav
      aria-label="Navigation principale"
      className={
        isHorizontal
          ? "hidden items-center gap-1.5 xl:flex"
          : "flex flex-col gap-1"
      }
    >
      {links.map((link) => {
        const isActive = activeHref === link.href;
        return (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            className={
              isHorizontal
                ? `rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`
                : `block w-full rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors ${
                    isActive
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
