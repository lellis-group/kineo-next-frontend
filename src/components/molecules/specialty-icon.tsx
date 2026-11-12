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
 * The icon component per specialty, so callers size it with their own
 * `className`. Exhaustive by type.
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

/** Draws the icon for one posting's specialty; `aria-hidden`, the name sits beside it. */
export function SpecialtyIcon({
  specialty,
  ...props
}: { specialty: Specialty } & SVGProps<SVGSVGElement>) {
  const Icon = SPECIALTY_ICONS[specialty];
  return <Icon {...props} />;
}
