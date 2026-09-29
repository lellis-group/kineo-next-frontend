import type { Metadata } from "next";
import Link from "next/link";
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
 *   sub-processor list, DPO, supervisory authority, hosting location). They
 *   are marked as pending rather than filled with plausible text, because a
 *   privacy notice that invents those facts is worse than one that admits it
 *   is incomplete.
 *
 * The `LEGAL_PENDING` badge is how the second kind is rendered.
 */

const BODY = "text-sm leading-relaxed text-foreground/85 sm:text-[0.925rem]";
const MUTED = "text-sm leading-relaxed text-foreground/70 sm:text-[0.925rem]";

/** Marks a section the legal team has still to settle. */
function LegalPending() {
  return (
    <p className="mt-2 inline-flex items-center rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
      En attente de validation juridique
    </p>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/85 sm:text-[0.925rem]"
        >
          <span
            aria-hidden="true"
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Label / duration / legal-basis row. */
function RetentionRow({
  data,
  duration,
  note,
}: {
  data: string;
  duration: string;
  note?: string;
}) {
  return (
    <div className="border-b border-border py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium text-foreground">{data}</span>
        <span className="text-sm text-muted">{duration}</span>
      </div>
      {note && (
        <p className="mt-1 text-xs leading-relaxed text-muted">{note}</p>
      )}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground sm:px-6 sm:py-14">
      <article className="mx-auto w-full max-w-2xl">
        <header className="mb-10 flex flex-col items-center gap-7 text-center">
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

        <p className={BODY}>
          Cette page décrit la manière dont Kineo traite les données
          personnelles de ses utilisateurs. Elle est publiée en deux temps. Les
          sections 1 à 5 décrivent le fonctionnement réel de la plateforme et
          s&apos;appliquent dès aujourd&apos;hui. Les sections 6 à 9 restent à
          valider par notre service juridique et sont signalées comme telles.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">
            1. Responsable de traitement
          </h2>
          <p className={`mt-3 ${BODY}`}>
            L&apos;éditeur de la plateforme Kineo est le responsable du
            traitement des données décrites ci-dessous.
          </p>
          <LegalPending />
          <p className={`mt-3 ${MUTED}`}>
            L&apos;identité légale, l&apos;adresse du siège et les coordonnées
            Postales seront renseignées ici avant la mise en production.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">2. Données collectées</h2>
          <p className={`mt-3 ${BODY}`}>
            Kineo est une plateforme de mise en relation entre professionnels de
            santé. Les données collectées sont celles nécessaires à la création
            d&apos;un compte, à la publication d&apos;une offre de remplacement
            et à la gestion des candidatures.
          </p>

          <h3 className="mt-5 text-sm font-bold">Compte et authentification</h3>
          <BulletList
            items={[
              "Adresse e-mail, nom et photo de profil",
              "Empreinte du mot de passe (hachage, jamais le mot de passe en clair)",
              "Jeton de session, adresse IP et agent utilisateur des connexions actives",
              "Jetons d'accès des éventuels comptes tiers de connexion (OAuth)",
              "Jeton à usage unique des e-mails de vérification, de réinitialisation de mot de passe et de suppression de compte",
            ]}
          />

          <h3 className="mt-5 text-sm font-bold">Profil professionnel</h3>
          <BulletList
            items={[
              "Numéro RPPS, spécialité et type de profil (remplaçant, installé ou les deux)",
              "Ville et coordonnées géographiques du profil",
              "Statut de vérification de l'identité professionnelle",
              "Cabinets : nom, adresse, ville et coordonnées",
            ]}
          />

          <h3 className="mt-5 text-sm font-bold">
            Contenu publié et candidatures
          </h3>
          <BulletList
            items={[
              "Annonces : titre, description, dates, spécialité, caractère urgent et nombre maximal de candidatures",
              "Candidatures : message au cabinet, statut, motif de refus ou de retrait, dates de consultation et de réponse",
            ]}
          />

          <h3 className="mt-5 text-sm font-bold">Visibilité de ces données</h3>
          <p className={`mt-3 ${BODY}`}>
            Votre profil est public dans l&apos;annuaire par défaut, à
            l&apos;exclusion de votre numéro RPPS. Vous pouvez le rendre privé
            depuis votre page profil. Les annonces ouvertes et les informations
            du cabinet associé (nom, adresse, ville) sont visibles par tous.
          </p>
          <p className={`mt-3 ${BODY}`}>
            Vos candidatures ne sont visibles que par vous et par le cabinet
            concerné. Votre message au cabinet est lu par ce cabinet, qui peut
            le conserver et l&apos;utiliser pour traiter votre candidature.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">3. Base légale et finalités</h2>
          <p className={`mt-3 ${BODY}`}>
            Chaque traitement repose sur une base légale et une finalité
            déterminées.
          </p>
          <LegalPending />
          <p className={`mt-3 ${MUTED}`}>
            Le tableau des finalités (exécution du service, intérêt légitime,
            consentement) sera complété par notre service juridique. Nous
            n&apos;indiquons ici aucune base légale par défaut pour ne pas
            .publish une affirmation que nous n&apos;assumeons pas encore.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">4. Durées de conservation</h2>
          <p className={`mt-3 ${BODY}`}>
            Les durées ci-dessous correspondent aux purges automatisées en
            production. Elles sont exprimées en jours et paramétrables par
            l&apos;exploitant, la valeur indiquée étant celle par défaut.
          </p>

          <div className="mt-4">
            <RetentionRow
              data="Sessions de connexion expirées"
              duration="Purge à l'échéance"
              note="Supprimées par le balayage horaire, qui porte notamment sur le jeton, l'adresse IP et l'agent utilisateur."
            />
            <RetentionRow
              data="Jetons de vérification expirés"
              duration="Purge à l'échéance"
              note="Ces lignes contiennent l'adresse e-mail en clair tant qu'elles sont valides. Le balayage horaire les supprime à l'expiration, y compris les demandes de suppression de compte abandonnées."
            />
            <RetentionRow
              data="Trace d'une demande de suppression exécutée"
              duration="365 jours"
              note="Deux empreintes non réversibles et des horodatages uniquement. Aucune adresse e-mail, aucun nom. Permet de prouver le traitement sans conserver d'identifiant."
            />
            <RetentionRow
              data="Trace d'une demande de suppression jamais confirmée"
              duration="30 jours"
              note="Une demande non confirmée n'a enregistré qu'une intention : elle est supprimée au terme de ce délai."
            />
            <RetentionRow
              data="Compte anonymisé"
              duration="30 jours après anonymisation"
              note="Délai de grâce pendant lequel les lignes résiduelles sont supprimées en cascade. Voir la section 5."
            />
            <RetentionRow
              data="Annonces, cabinets et candidatures"
              duration="Non définies"
              note="Aucune purge automatique n'est en place sur ces données tant qu'elles sont liées à un compte actif."
            />
          </div>

          <div className="mt-5">
            <LegalPending />
            <p className={`mt-3 ${MUTED}`}>
              La durée applicable aux annonces, cabinets et candidatures sera
              fixée par notre service juridique. Nous preferons signaler cette
              absence plutot que d&apos;annoncer une durée que le service
              n&apos;applique pas.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">
            5. Suppression de votre compte
          </h2>
          <p className={`mt-3 ${BODY}`}>
            Vous pouvez demander la suppression de votre compte à tout moment
            depuis votre page profil. La demande est enregistrée, puis un e-mail
            vous envoie un lien de confirmation valable 24 heures. Ce lien est
            la preuve de votre identité pour cette demande.
          </p>

          <h3 className="mt-5 text-sm font-bold">
            Ce qui se passe à la confirmation
          </h3>
          <p className={`mt-3 ${BODY}`}>
            La suppression n&apos;est pas un effacement immédiat. Vos données
            personnelles sont d&apos;abord anonymisées, puis supprimées. À la
            confirmation :
          </p>
          <BulletList
            items={[
              "Votre nom, votre adresse e-mail, votre photo, votre numéro RPPS et vos coordonnées sont remplacés immédiatement",
              "Le nom et l'adresse de vos cabinets et le contenu de vos annonces sont remplacés",
              "Les messages et motifs que vous avez écrits sur les annonces d'autres professionnels sont effacés",
              "Vos candidatures en attente ou présélectionnées quittent le processus de recrutement",
              "Toutes vos sessions et tous vos moyens de connexion sont révoqués : vous êtes déconnecté de tous vos appareils",
            ]}
          />
          <p className={`mt-3 ${BODY}`}>
            Les enregistrements restants sont définitivement supprimés au terme
            d&apos;un délai de grâce de 30 jours. Passé ce délai, un balayage
            automatique supprime votre compte ainsi que vos profil, cabinets,
            annonces et candidatures. Vous pouvez dès à présent recréer un
            compte avec la même adresse e-mail.
          </p>

          <h3 className="mt-5 text-sm font-bold">
            Ce qui est conservé, et pourquoi
          </h3>
          <p className={`mt-3 ${BODY}`}>
            Conformément à l&apos;article 5 du RGPD, nous conservons une trace
            de votre demande pendant 365 jours. Cette trace ne contient ni votre
            nom, ni votre adresse e-mail : uniquement deux empreintes non
            réversibles et les dates de la demande. Elle nous permet de prouver
            que votre demande a bien été traitée, sans détenir
            d&apos;identifiant permettant de vous retrouver.
          </p>

          <h3 className="mt-5 text-sm font-bold">
            Pourquoi une demande peut être refusée
          </h3>
          <p className={`mt-3 ${BODY}`}>
            La suppression est refusée tant qu&apos;un autre candidat conserve
            une candidature active sur l&apos;une de vos annonces : la
            suppression de votre compte emporterait ces candidatures et les
            données de ces autres professionnels, qui ne nous appartiennent pas.
          </p>
          <p className={`mt-3 ${BODY}`}>
            Vous en êtes averti par e-mail au moment de la demande. Fermer ou
            annuler une annonce termine automatiquement les candidatures
            qu&apos;elle recevait : la voie de sortie est toujours ouverte. Tant
            que ce point n&apos;est pas réglé, votre compte et vos données ne
            sont pas modifiés.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">6. Vos droits</h2>
          <p className={`mt-3 ${BODY}`}>
            Vous disposez d&apos;un droit d&apos;accès, de rectification,
            d&apos;effacement, de limitation, d&apos;opposition et de
            portabilité de vos données.
          </p>

          <h3 className="mt-5 text-sm font-bold">Droits déjà en place</h3>
          <BulletList
            items={[
              "Accès et rectification :consultables et modifiables depuis votre page profil et vos cabinets",
              "Effacement : décrit dans la section 5, entièrement automatisé",
              "Retirer une candidature : à tout moment depuis la page Mes candidatures",
            ]}
          />

          <div className="mt-5">
            <LegalPending />
            <p className={`mt-3 ${MUTED}`}>
              L&apos;exercice des autres droits, leur délai de réponse et les
              modalités de contact seront précisés par notre service juridique.
              À ce jour, la portabilité des données et le registre des
              consentements ne sont pas mis en œuvre.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">7. Sous-traitants</h2>
          <p className={`mt-3 ${BODY}`}>
            Kineo fait appel à des sous-traitants pour héberger la base de
            données et acheminer les e-mails transactionnels (vérification
            d&apos;adresse, réinitialisation de mot de passe, changement
            d&apos;adresse, suppression de compte).
          </p>
          <LegalPending />
          <p className={`mt-3 ${MUTED}`}>
            La liste nominative des sous-traitants, leur localisation et les
            garanties associées seront publiées ici. Aucun service tiers
            n&apos;est actuellement utilisé pour l&apos;affichage des cartes ou
            la mesure d&apos;audience.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">8. Sécurité</h2>
          <p className={`mt-3 ${BODY}`}>
            Les mots de passe sont stockés hachés, jamais en clair. L&apos;accès
            aux pages members est protégé par session et par limitation du
            nombre de tentatives. Les journaux applicatifs ne contiennent pas
            d&apos;adresse e-mail complète : les événements liés à une
            suppression de compte n&apos;enregistrent qu&apos;une empreinte non
            réversible, et un échec d&apos;envoi d&apos;e-mail ne conserve que
            le domaine du destinataire.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">9. Nous contacter</h2>
          <p className={`mt-3 ${BODY}`}>
            Pour toute question sur vos données ou pour exercer un droit,
            écrivez-nous.
          </p>
          <LegalPending />
          <p className={`mt-3 ${MUTED}`}>
            L&apos;adresse de contact, celle du délégué à la protection des
            données et l&apos;autorité de contrôle seront publiées avant la mise
            en production. En attendant, vous pouvez nous écrire depuis
            l&apos;adresse associée à votre compte.
          </p>
        </section>

        <footer className="mt-14 border-t border-border pt-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            ← Retour à l&apos;accueil
          </Link>
        </footer>
      </article>
    </main>
  );
}
