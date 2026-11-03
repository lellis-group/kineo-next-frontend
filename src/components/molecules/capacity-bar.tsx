import { UsersIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";
import { formatCapacity } from "@/lib/listings";

/**
 * Candidats appliqués, au trait du « fleet distribution » de la référence.
 *
 * Un chiffre suivi d'une fine barre de remplissage : « x / y » dit la place
 * restante en mots, la barre la dit en une forme lisible d'un balayage de la
 * colonne — le même geste graphique que les barres de distribution de la
 * maquette, qui accrochent à chaque ligne un chiffre et son trait.
 *
 * Sans plafond (`maxApplications` absent), la barre n'existe pas : un ratio
 * sans dénominateur est une chose qu'elle ne peut pas décrire, et un trait
 * plein « pour décorer » affirmerait une jauge que rien ne règle. Le chiffre
 * seul, comme avant.
 */
export function CapacityBar({
  count,
  max,
  className,
}: {
  count: number;
  /** Le plafond de candidatures ; absent, la barre se retire. */
  max?: number | null;
  className?: string;
}) {
  // Plafonnée à 100 : « 6 sur 5 » est un état possible côté serveur
  // (candidatures reçues au-delà de la capacité), et la barre doit alors dire
  // « pleine », pas déborder de la piste.
  const percent = max ? Math.min(100, Math.round((count / max) * 100)) : 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[var(--cell-gap)] whitespace-nowrap leading-[var(--cell-icon)] text-muted tabular-nums",
        className,
      )}
      title={formatCapacity(count, max ?? undefined)}
    >
      <UsersIcon className="size-[var(--cell-icon)] shrink-0" />
      <span>
        {count}
        {max ? ` / ${max}` : ""}
      </span>
      {max != null && max > 0 && (
        <span
          /*
            La piste et son remplissage. `bg-border` plutôt qu'un blanc brut :
            la piste est le fond de la cellule visible à travers une jauge, pas
            une ligne de texte — et `border-strong` la dose au niveau où les
            autres traits de tableau se voient sans rivaliser avec le crème.
          */
          className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-border-strong"
        >
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${percent}%` }}
          />
        </span>
      )}
    </span>
  );
}
