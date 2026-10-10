import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ButtonSize, ButtonVariant } from "@/lib/ui-tokens";

export type { ButtonSize, ButtonVariant };

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary:
    "border border-border-strong bg-surface-2 text-foreground hover:bg-surface-3",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-surface-hover",
  ghost: "bg-transparent text-foreground hover:bg-surface-hover",
  danger:
    "bg-danger text-danger-foreground hover:bg-danger-hover focus:ring-2 focus:ring-danger/50 focus:ring-offset-2 focus:ring-offset-background",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-5 py-3 text-sm",
  lg: "px-5 py-3.5 text-[0.9375rem]",
};

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  /** md: section actions · lg: primary actions (auth forms). */
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  /** Renders as a Next.js Link styled as a button. */
  href?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  type,
  ...rest
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-[0.625rem] font-bold transition-colors disabled:pointer-events-none disabled:opacity-60",
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type ?? "button"} className={classes} {...rest}>
      {children}
    </button>
  );
}
