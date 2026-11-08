import type { ReactElement, SVGProps } from "react";
import {
  ActivityIcon,
  BrainIcon,
  SparkleIcon,
  StethoscopeIcon,
  ToothIcon,
} from "@/components/atoms/icons";
import type { Specialty } from "@/lib/types/api";

/**
 * The icon for a specialty, as a component rather than an element.
 *
 * A component so the caller sizes and colours it with its own `className`, the
 * way every other icon in the app is used — a rendered `<StethoscopeIcon />`
 * captured here would ignore the size the list row asks for.
 *
 * `Record<Specialty, …>` rather than a `Map` or a lookup with a default arm:
 * the union is closed, so the exhaustiveness check below catches a specialty
 * added to the backend and wired into the types but forgotten here. A stray key
 * is the one failure this shape cannot have — and `OTHER` is a real member, not
 * a catch-all label, so it carries the generic medical mark on purpose.
 */
const SPECIALTY_ICONS: Record<
  Specialty,
  (props: SVGProps<SVGSVGElement>) => ReactElement
> = {
  GENERALIST: StethoscopeIcon,
  DENTIST: ToothIcon,
  DERMATOLOGIST: SparkleIcon,
  PSYCHIATRIST: BrainIcon,
  OTHER: ActivityIcon,
};

/**
 * Draws the icon for one posting's specialty.
 *
 * Every listing row and card shows the same mark today; giving each discipline
 * its own glyph lets a reader scan the list by shape before reading a label.
 * The chosen mark is decorative here — the specialty name sits beside it in both
 * surfaces — so the icon stays `aria-hidden`, as all icons in the set are.
 */
export function SpecialtyIcon({
  specialty,
  ...props
}: { specialty: Specialty } & SVGProps<SVGSVGElement>) {
  const Icon = SPECIALTY_ICONS[specialty];
  return <Icon {...props} />;
}
