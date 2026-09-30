"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface RevealProps {
  children: ReactNode;
  /** Wrapper classes (layout, card…). */
  className?: string;
  /** Stagger delay (ms) when the element becomes visible. */
  delay?: number;
}

/**
 * Scroll-reveal wrapper (IntersectionObserver). The hidden state is only
 * applied from JS — content stays visible without JS or the observer — and
 * the global reduced-motion kill-switch disables the transition.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect();
          node.classList.add("reveal-visible");
        }
      },
      { threshold: 0.15 },
    );

    node.classList.add("reveal-init");
    io.observe(node);

    return () => {
      io.disconnect();
      node.classList.remove("reveal-init", "reveal-visible");
    };
  }, []);

  return (
    <div
      ref={ref}
      // No base `.reveal` rule exists: the hidden state is `.reveal-init`, and
      // the observer swaps in `.reveal-visible`.
      className={cn(className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
