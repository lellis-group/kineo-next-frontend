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
                ? `border-b-2 px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? // An underline rather than a filled pill: the reference
                        // marks the current section with a cream rule under the
                        // word and nothing else, which leaves the row of links
                        // reading as navigation instead of as a row of buttons.
                        // Both states carry the border so the active link's
                        // underline costs the row no height.
                        "border-primary font-semibold text-foreground"
                      : "border-transparent text-muted hover:text-foreground"
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
