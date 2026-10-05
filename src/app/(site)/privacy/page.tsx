import type { Metadata } from "next";
import { LegalDocument } from "@/components/templates/legal-document";
import {
  BulletList,
  Paragraph,
  PendingCallout,
  PendingNote,
  Section,
  Steps,
  Subheading,
} from "@/components/templates/legal-primitives";
import { ERASURE_RETENTION_FACT } from "@/lib/delete-account-content";
import {
  PENDING_ITEMS,
  PRIVACY_SECTIONS,
  RETENTION_PERIODS,
} from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Kineo",
  description:
    "Politique de confidentialité (RGPD) de la console de remplacement Kineo.",
};

/**
 * Privacy policy.
 *
 * Structure and pending items come from `@/lib/legal/privacy`; the prose
 * vocabulary from `legal-primitives`. What is left here is the composition — and
 * the copy itself, which is the point of the page and has no business in a
 * module about routing.
 */
export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Politique de confidentialité"
      updatedAt="29 septembre 2026"
      backHref="/"
      backLabel="← Retour à l'accueil"
      containerClassName="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14"
    >
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

      <PendingCallout items={PENDING_ITEMS} />

      <div className="mt-12 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <nav
          aria-label="Sommaire"
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <p className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">
            Sommaire
          </p>
          <ol className="space-y-0.5">
            {PRIVACY_SECTIONS.map((section, index) => (
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
          <Section id="responsable" index={1} title="Responsable de traitement">
            <Paragraph>
              L&apos;éditeur de la plateforme Kineo est le responsable du
              traitement des données décrites ci-dessous.
            </Paragraph>
            <PendingNote>
              L&apos;identité légale, l&apos;adresse du siège et les coordonnées
              postales seront renseignées ici avant la mise en production.
            </PendingNote>
          </Section>

          <Section id="donnees" index={2} title="Données collectées">
            <Paragraph>
              Kineo met en relation des professionnels de santé pour organiser
              des remplacements. Les données collectées sont celles nécessaires
              à la création d&apos;un compte, à la publication d&apos;une offre
              et à la gestion des candidatures.
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
              l&apos;exclusion de votre numéro RPPS. Vous pouvez le rendre privé
              depuis votre page profil. Les annonces ouvertes et les
              informations du cabinet associé (nom, adresse, ville) sont
              visibles par tous.
            </Paragraph>
            <Paragraph>
              Vos candidatures ne sont visibles que par vous et par le cabinet
              concerné. Votre message est lu par ce cabinet, qui peut le
              conserver pour traiter votre candidature.
            </Paragraph>
          </Section>

          <Section id="finalites" index={3} title="Finalités et bases légales">
            <Paragraph>
              Chaque traitement repose sur une base légale et une finalité
              déterminées.
            </Paragraph>
            <PendingNote>
              Le tableau des finalités (exécution du service, intérêt légitime,
              consentement) sera complété par notre service juridique. Nous
              n&apos;indiquons ici aucune base légale plutôt que d&apos;annoncer
              une affirmation que nous n&apos;assumeons pas encore.
            </PendingNote>
          </Section>

          <Section id="conservation" index={4} title="Durées de conservation">
            <Paragraph>
              Les durées ci-dessous correspondent aux purges automatisées en
              production. La valeur indiquée est celle par défaut, paramétrable
              par l&apos;exploitant.
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
                  {RETENTION_PERIODS.map((row) => (
                    <tr key={row.data}>
                      {/* `scope="row"`: the first column carries what each
                            row is about, and a screen reader reading cell by
                            cell needs it to name the duration next to it. */}
                      <th scope="row" className="font-normal">
                        <span className="block font-medium text-foreground">
                          {row.data}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted">
                          {row.note}
                        </span>
                      </th>
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
              Vous pouvez demander la suppression de votre compte à tout moment
              depuis votre page profil. La demande est enregistrée, puis un
              e-mail vous envoie un lien de confirmation valable 24 heures. Ce
              lien est la preuve de votre identité pour cette demande.
            </Paragraph>

            <Subheading>À la confirmation</Subheading>
            <Paragraph>
              La suppression n&apos;est pas un effacement immédiat. Vos données
              sont d&apos;abord anonymisées, puis supprimées :
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
              terme d&apos;un délai de grâce de 30 jours. Ce délai est celui de
              la suppression : aucune annulation n&apos;est possible une fois la
              confirmation envoyée, vos identifiants étant révoqués à ce moment.
              Vous pouvez dès à présent recréer un compte avec la même adresse
              e-mail.
            </Paragraph>

            <Subheading>Ce qui est conservé, et pourquoi</Subheading>
            <Paragraph>
              Conformément à l&apos;article 5 du RGPD, nous conservons une trace
              de votre demande pendant 365 jours. Elle ne contient ni votre nom
              ni votre adresse e-mail : {ERASURE_RETENTION_FACT}. Elle nous
              permet de prouver que votre demande a été traitée sans détenir
              d&apos;identifiant permettant de vous retrouver.
            </Paragraph>

            <Subheading>Ce que nous conservons malgré votre demande</Subheading>
            <Paragraph>
              Les candidatures que d&apos;autres professionnels vous ont
              adressées. Elles ne vous appartiennent pas : elles portent leur
              message, votre décision à leur sujet et les dates de
              l&apos;échange. Les effacer à votre demande reviendrait à
              supprimer des données qui ne sont ni les vôtres ni les nôtres, et
              ces professionnels n&apos;en ont pas consenti.
            </Paragraph>
            <Paragraph>
              Votre demande n&apos;est donc jamais refusée pour ce motif. Elle
              aboutit normalement, et nous séparons ces candidatures des
              annonces avant que celles-ci ne soient effacées : vos annonces,
              leur contenu, vos messages et vos coordonnées disparaissent comme
              le reste, tandis que chaque candidat conserve ses données et reste
              seul à y accéder. Ils voient l&apos;annonce comme retirée, sans
              votre nom ni ceux de votre cabinet.
            </Paragraph>
            <Paragraph>
              L&apos;email de confirmation vous indique combien de candidatures
              sont concernées avant que vous ne validiez, et il vous reste
              possible de relire vos annonces jusque-là.
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
              modalités de contact seront précisés par notre service juridique.
              À ce jour, la portabilité des données et le registre des
              consentements ne sont pas mis en œuvre.
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
    </LegalDocument>
  );
}
