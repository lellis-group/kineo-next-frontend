"use client";

import { useEffect, useState } from "react";

/**
 * Which of the page's sections the reader is in: the last one whose top has
 * passed a line a third of the way down the viewport. Starts on the first, so
 * the server render and the first paint agree.
 */
export function useActiveSection(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    if (sections.length === 0) return;

    const update = () => {
      const line = window.innerHeight / 3;
      let current = sections[0]?.id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section.id;
      }
      // At the very bottom the last section may never reach the line.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      setActive(atBottom ? sections.at(-1)?.id : current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ids]);

  return active;
}
