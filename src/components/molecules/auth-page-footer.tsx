"use client";

import Link from "next/link";
import { Button } from "@/components/atoms/button";
import { ArrowLeftIcon } from "@/components/atoms/icons";

/**
 * The "already have an account / back home" tail shared by the auth forms.
 * Written out separately on each page, with the spacing drifting between them.
 */
export function AuthPageFooter({
  lead,
  actionLabel,
  actionHref,
}: {
  lead: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <>
      <p className="mt-7 text-center text-sm text-muted">
        {lead}{" "}
        <Link
          href={actionHref}
          className="font-medium text-primary transition-colors hover:text-primary-hover"
        >
          {actionLabel}
        </Link>
      </p>

      <div className="mt-4 text-center">
        <Button href="/" variant="ghost">
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Accueil</span>
        </Button>
      </div>
    </>
  );
}
