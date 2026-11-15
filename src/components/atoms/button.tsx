import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ButtonSize, ButtonVariant } from "@/lib/ui-tokens";

export type { ButtonVariant };

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
  lg: "px-5 py-3.5 text-base",
};

interface ButtonOwnProps {
  variant?: ButtonVariant;
  /** md: section actions · lg: primary actions (auth forms). */
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

/** A `<button>`. */
export type ButtonAsButton = ButtonOwnProps &
  Omit<ComponentProps<"button">, keyof ButtonOwnProps> & { href?: undefined };

/** A Next.js `Link` styled as a button; its other props reach the anchor. */
type ButtonAsLink = ButtonOwnProps &
  Omit<ComponentProps<typeof Link>, keyof ButtonOwnProps | "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:pointer-events-none disabled:opacity-60",
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className,
  );

  if (props.href !== undefined) {
    const {
      variant: _variant,
      size: _size,
      className: _className,
      children: _children,
      ...linkProps
    } = props;
    return (
      <Link {...linkProps} className={classes}>
        {children}
      </Link>
    );
  }

  const {
    variant: _variant,
    size: _size,
    className: _className,
    children: _children,
    type,
    ...buttonProps
  } = props;
  return (
    <button {...buttonProps} type={type ?? "button"} className={classes}>
      {children}
    </button>
  );
}
