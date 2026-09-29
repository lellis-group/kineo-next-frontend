import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDownIcon } from "@/components/atoms/icons";
import { KineoLogo } from "@/components/atoms/kineo-logo";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Kineo",
  description:
    "Politique de confidentialité (RGPD) de la console de remplacement Kineo.",
};

/**
 * Privacy policy.
 *
 * Two kinds of content, deliberately not mixed:
 *
 * - sections describing what the platform actually does today, verified
 *   against the schema and the services (data inventory, retention, erasure
 *   lifecycle). These are binding and a user is entitled to read them, so they
 *   are written in full;
 * - sections that only the legal team can settle (legal basis per purpose,
 *   sub-processor list, DPO, supervisory authority, hosting location). Rather
 *   than interrupt the reading flow with a badge in every one of them, they are
 *   collected once in the status callout at the top, which lists exactly what
 *   is still open.
 *
 * A notice that invents those facts is worse than one that admits it is
 * incomplete, so the open items are named rather than papered over.
 */

/** Anchors, in reading order — the sidebar and the headings share the ids. */
const SECTIONS = [
  { id: "responsable", label: "Responsable de traitement" },
  { id: "donnees", label: "Données collectées" },
  { id: "finalites", label: "Finalités et bases légales" },
  { id: "conservation", label: "Durées de conservation" },
  { id: "suppression", label: "Suppression de votre compte" },
  { id: "droits", label: "Vos droits" },
  { id: "sous-traitants", label: "Sous-traitants" },
  { id: "securite", label: "Sécurité" },
  { id: "contact", label: "Nous contacter" },
] as const;

/** Still to be settled by the legal team, surfaced once at the top. */
const PENDING = [
  "Identité légale et adresse du siège (section 1)",
  "Base légale et finalité de chaque traitement (section 3)",
  "Durée de conservation des annonces, cabinets et candidatures (section 4)",
  "Modalités d'exercice des droits non encore automatisés (section 6)",
  "Liste des sous-traitants et localisation de l'hébergement (section 7)",
  "Contact du DPO et autorité de contrôle (section 9)",
] as const;

/** Paragraph measure: ~72 characters, where French prose reads comfortably. */
const PROSE = "max-w-[70ch] text-[0.925rem] leading-relaxed";

function Section({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
        <span className="text-faint">{index}.</span> {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-2 text-sm font-bold tracking-tight text-foreground">
      {children}
    </h3>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className={PROSE}>{children}</p>;
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className={`space-y-2.5 ${PROSE} list-none`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary"
          />
          <span className="text-foreground/85">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Numbered procedure — used for the erasure timeline. */
function Steps({ items }: { items: readonly string[] }) {
  return (
    <ol className={`space-y-3 ${PROSE} list-none`}>
      {items.map((item, index) => (
        <li key={item} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary"
          >
            {index + 1}
          </span>
          <span className="text-foreground/85">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** Note pinned to a section the legal team has still to settle. */
function PendingNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      className={`${PROSE} border-l-2 border-warning/40 pl-4 text-sm text-muted`}
    >
      {children}
    </p>
  );
}

const RETENTION = [
  {
    data: "Sessions de connexion expirées",
    duration: "Purge à l'échéance",
    note: "Balayage horaire. Supprime le jeton, l'adresse IP et l'agent utilisateur.",
  },
  {
    data: "Jetons de vérification expirés",
    duration: "Purge à l'échéance",
    note: "Ces lignes contiennent l'adresse e-mail en clair tant qu'elles sont valides, y compris pour une demande de suppression abandonnée.",
  },
  {
    data: "Trace d'une demande de suppression exécutée",
    duration: "365 jours",
    note: "Deux empreintes non réversibles et des horodatages. Aucun nom, aucune adresse e-mail.",
  },
  {
    data: "Trace d'une demande jamais confirmée",
    duration: "30 jours",
    note: "Elle n'a enregistré qu'une intention.",
  },
  {
    data: "Compte anonymisé",
    duration: "30 jours",
    note: "Délai de grâce avant suppression définitive. Voir la section 5.",
  },
  {
    data: "Annonces, cabinets et candidatures",
    duration: "Non définies",
    note: "Aucune purge automatique ne s'applique à ces données tant que le compte est actif.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10 flex flex-col items-center gap-6 text-center">
          <Link href="/" aria-label="Kineo — Accueil">
            <KineoLogo />
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Politique de confidentialité
            </h1>
            <p className="text-sm text-muted">
              Dernière mise à jour : 29 septembre 2026
            </p>
          </div>
        </header>

        {/* Intro sits above the two-column grid: centred like the header above
            it, so the document opens as one block before the body starts. */}
        <div className="mx-auto max-w-[52ch] space-y-4 text-center text-sm leading-relaxed text-foreground/85">
          <p>
            Cette page décrit la manière dont Kineo traite les données
            personnelles de ses utilisateurs. Les sections 1 à 5 décrivent le
            fonctionnement réel de la plateforme et s&apos;appliquent dès
            aujourd&apos;hui.
          </p>
          <p>
            Les sections 6 à 9 restent à valider par notre service juridique.
            Elles ne sont pas rédigées ici plutôt que de l&apos;être à moitié.
          </p>
        </div>

        {/* One callout instead of a badge interrupting every pending section. */}
        <details className="group mt-8 rounded-2xl border border-warning/25 bg-warning/5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-semibold text-warning marker:content-none">
            <span>
              En attente de validation juridique ({PENDING.length} points)
            </span>
            <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="space-y-2 border-t border-warning/20 px-5 py-4">
            {PENDING.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-muted"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-warning/60"
                />
                {item}
              </li>
            ))}
          </ul>
        </details>

        <div className="mt-12 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
          <nav
            aria-label="Sommaire"
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <p className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">
              Sommaire
            </p>
            <ol className="space-y-0.5">
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex gap-2 rounded-lg px-2 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    <span className="text-faint">{index + 1}.</span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-12">
            <Section
              id="responsable"
              index={1}
              title="Responsable de traitement"
            >
              <Paragraph>
                L&apos;éditeur de la plateforme Kineo est le responsable du
                traitement des données décrites ci-dessous.
              </Paragraph>
              <PendingNote>
                L&apos;identité légale, l&apos;adresse du siège et les
                coordonnées postales seront renseignées ici avant la mise en
                production.
              </PendingNote>
            </Section>

            <Section id="donnees" index={2} title="Données collectées">
              <Paragraph>
                Kineo met en relation des professionnels de santé pour organiser
                des remplacements. Les données collectées sont celles
                nécessaires à la création d&apos;un compte, à la publication
                d&apos;une offre et à la gestion des candidatures.
              </Paragraph>

              <Subheading>Compte et authentification</Subheading>
              <BulletList
                items={[
                  "Adresse e-mail, nom et photo de profil",
                  "Empreinte du mot de passe, jamais le mot de passe en clair",
                  "Jeton de session, adresse IP et agent utilisateur des connexions actives",
                  "Jetons d'accès des éventuels comptes tiers de connexion",
                  "Jeton à usage unique des e-mails de vérification, de réinitialisation et de suppression de compte",
                ]}
              />

              <Subheading>Profil professionnel</Subheading>
              <BulletList
                items={[
                  "Numéro RPPS, spécialité et type de profil (remplaçant, installé ou les deux)",
                  "Ville et coordonnées géographiques",
                  "Statut de vérification de l'identité professionnelle",
                  "Cabinets : nom, adresse, ville et coordonnées",
                ]}
              />

              <Subheading>Contenu publié et candidatures</Subheading>
              <BulletList
                items={[
                  "Annonces : titre, description, dates, spécialité, caractère urgent et nombre maximal de candidatures",
                  "Candidatures : message au cabinet, statut, motif de refus ou de retrait, dates de consultation et de réponse",
                ]}
              />

              <Subheading>Qui voit quoi</Subheading>
              <Paragraph>
                Votre profil est public dans l&apos;annuaire par défaut, à
                l&apos;exclusion de votre numéro RPPS. Vous pouvez le rendre
                privé depuis votre page profil. Les annonces ouvertes et les
                informations du cabinet associé (nom, adresse, ville) sont
                visibles par tous.
              </Paragraph>
              <Paragraph>
                Vos candidatures ne sont visibles que par vous et par le cabinet
                concerné. Votre message est lu par ce cabinet, qui peut le
                conserver pour traiter votre candidature.
              </Paragraph>
            </Section>

            <Section
              id="finalites"
              index={3}
              title="Finalités et bases légales"
            >
              <Paragraph>
                Chaque traitement repose sur une base légale et une finalité
                déterminées.
              </Paragraph>
              <PendingNote>
                Le tableau des finalités (exécution du service, intérêt
                légitime, consentement) sera complété par notre service
                juridique. Nous n&apos;indiquons ici aucune base légale plutôt
                que d&apos;annoncer une affirmation que nous n&apos;assumeons
                pas encore.
              </PendingNote>
            </Section>

            <Section id="conservation" index={4} title="Durées de conservation">
              <Paragraph>
                Les durées ci-dessous correspondent aux purges automatisées en
                production. La valeur indiquée est celle par défaut,
                paramétrable par l&apos;exploitant.
              </Paragraph>

              <div className="overflow-x-auto">
                <table className="table">
                  <caption className="sr-only">
                    Données conservées, durée et précision
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Donnée</th>
                      <th scope="col">Durée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RETENTION.map((row) => (
                      <tr key={row.data}>
                        <td>
                          <span className="block font-medium text-foreground">
                            {row.data}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted">
                            {row.note}
                          </span>
                        </td>
                        <td className="whitespace-nowrap align-top text-muted">
                          {row.duration}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PendingNote>
                La durée applicable aux annonces, cabinets et candidatures sera
                fixée par notre service juridique. Nous préférons signaler cette
                absence plutôt qu&apos;annoncer une durée que le service
                n&apos;applique pas.
              </PendingNote>
            </Section>

            <Section
              id="suppression"
              index={5}
              title="Suppression de votre compte"
            >
              <Paragraph>
                Vous pouvez demander la suppression de votre compte à tout
                moment depuis votre page profil. La demande est enregistrée,
                puis un e-mail vous envoie un lien de confirmation valable 24
                heures. Ce lien est la preuve de votre identité pour cette
                demande.
              </Paragraph>

              <Subheading>À la confirmation</Subheading>
              <Paragraph>
                La suppression n&apos;est pas un effacement immédiat. Vos
                données sont d&apos;abord anonymisées, puis supprimées :
              </Paragraph>
              <Steps
                items={[
                  "Votre nom, adresse e-mail, photo, numéro RPPS et coordonnées sont remplacés immédiatement",
                  "Le nom et l'adresse de vos cabinets et le contenu de vos annonces sont remplacés",
                  "Les messages et motifs que vous avez écrits sur les annonces d'autres professionnels sont effacés",
                  "Vos candidatures en attente ou présélectionnées quittent le processus de recrutement",
                  "Toutes vos sessions et tous vos moyens de connexion sont révoqués",
                ]}
              />
              <Paragraph>
                Les enregistrements restants sont définitivement supprimés au
                terme d&apos;un délai de grâce de 30 jours. Ce délai est celui
                de la suppression : aucune annulation n&apos;est possible une
                fois la confirmation envoyée, vos identifiants étant révoqués à
                ce moment. Vous pouvez dès à présent recréer un compte avec la
                même adresse e-mail.
              </Paragraph>

              <Subheading>Ce qui est conservé, et pourquoi</Subheading>
              <Paragraph>
                Conformément à l&apos;article 5 du RGPD, nous conservons une
                trace de votre demande pendant 365 jours. Elle ne contient ni
                votre nom ni votre adresse e-mail : uniquement deux empreintes
                non réversibles et les dates. Elle nous permet de prouver que
                votre demande a été traitée sans détenir d&apos;identifiant
                permettant de vous retrouver.
              </Paragraph>

              <Subheading>Pourquoi une demande peut être refusée</Subheading>
              <Paragraph>
                La suppression est refusée tant qu&apos;un autre candidat
                conserve une candidature active sur l&apos;une de vos annonces :
                supprimer votre compte emporterait ces candidatures et les
                données de ces autres professionnels, qui ne nous appartiennent
                pas.
              </Paragraph>
              <Paragraph>
                Vous en êtes averti par e-mail au moment de la demande. Fermer
                ou annuler une annonce termine automatiquement les candidatures
                qu&apos;elle recevait : la voie de sortie reste toujours
                ouverte. Tant que ce point n&apos;est pas réglé, votre compte et
                vos données ne sont pas modifiés.
              </Paragraph>
            </Section>

            <Section id="droits" index={6} title="Vos droits">
              <Paragraph>
                Vous disposez d&apos;un droit d&apos;accès, de rectification,
                d&apos;effacement, de limitation, d&apos;opposition et de
                portabilité de vos données.
              </Paragraph>

              <Subheading>Déjà en place</Subheading>
              <BulletList
                items={[
                  "Accès et rectification : consultables et modifiables depuis votre profil et vos cabinets",
                  "Effacement : décrit dans la section 5, entièrement automatisé",
                  "Retrait d'une candidature : à tout moment depuis la page Mes candidatures",
                ]}
              />

              <PendingNote>
                L&apos;exercice des autres droits, leur délai de réponse et les
                modalités de contact seront précisés par notre service
                juridique. À ce jour, la portabilité des données et le registre
                des consentements ne sont pas mis en œuvre.
              </PendingNote>
            </Section>

            <Section id="sous-traitants" index={7} title="Sous-traitants">
              <Paragraph>
                Kineo fait appel à des sous-traitants pour héberger la base de
                données et acheminer les e-mails transactionnels (vérification
                d&apos;adresse, réinitialisation de mot de passe, changement
                d&apos;adresse, suppression de compte).
              </Paragraph>
              <PendingNote>
                La liste nominative des sous-traitants, leur localisation et les
                garanties associées seront publiées ici. Aucun service tiers
                n&apos;est actuellement utilisé pour l&apos;affichage des cartes
                ou la mesure d&apos;audience.
              </PendingNote>
            </Section>

            <Section id="securite" index={8} title="Sécurité">
              <Paragraph>
                Les mots de passe sont stockés hachés, jamais en clair.
                L&apos;accès aux pages membres est protégé par session et par
                limitation du nombre de tentatives. Les journaux applicatifs ne
                contiennent pas d&apos;adresse e-mail complète : les événements
                liés à une suppression de compte n&apos;enregistrent qu&apos;une
                empreinte non réversible, et un échec d&apos;envoi d&apos;e-mail
                ne conserve que le domaine du destinataire.
              </Paragraph>
            </Section>

            <Section id="contact" index={9} title="Nous contacter">
              <Paragraph>
                Pour toute question sur vos données ou pour exercer un droit,
                écrivez-nous.
              </Paragraph>
              <PendingNote>
                L&apos;adresse de contact, celle du délégué à la protection des
                données et l&apos;autorité de contrôle seront publiées avant la
                mise en production. En attendant, vous pouvez nous écrire depuis
                l&apos;adresse associée à votre compte.
              </PendingNote>
            </Section>
          </div>
        </div>

        <footer className="mt-16 border-t border-border pt-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            ← Retour à l&apos;accueil
          </Link>
        </footer>
      </div>
    </main>
  );
}
