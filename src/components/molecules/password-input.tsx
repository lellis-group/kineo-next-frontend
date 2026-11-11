"use client";

import type { ComponentProps, KeyboardEvent } from "react";
import { useState } from "react";
import { AlertIcon, EyeIcon, EyeOffIcon } from "@/components/atoms/icons";

export function PasswordInput({
  className = "",
  onKeyDown,
  onKeyUp,
  onBlur,
  onInput,
  ...props
}: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const syncCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(event.getModifierState("CapsLock"));
  };

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`field-input pr-14 ${className}`}
        onKeyDown={(event) => {
          syncCapsLock(event);
          onKeyDown?.(event);
        }}
        onKeyUp={(event) => {
          syncCapsLock(event);
          onKeyUp?.(event);
        }}
        onBlur={(event) => {
          setCapsLock(false);
          onBlur?.(event);
        }}
        onInput={onInput}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={
          visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
        }
        className="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-control text-muted transition-colors hover:text-foreground"
      >
        {visible ? (
          <EyeOffIcon className="h-4.5 w-4.5" />
        ) : (
          <EyeIcon className="h-4.5 w-4.5" />
        )}
      </button>

      {capsLock && (
        <output className="mt-1.5 flex items-center gap-1.5 text-xs text-warning">
          <AlertIcon className="h-3.5 w-3.5" />
          Verr. Maj activé : les lettres seront en majuscules
        </output>
      )}
    </div>
  );
}
