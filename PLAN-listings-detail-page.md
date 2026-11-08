# Page publique `/listings/[id]` — état et suite

## Ce qui existe maintenant

- Route : `src/app/(site)/listings/[id]/page.tsx`
- Lecture : `fetchBrowseListing(id)` → `GET /replacement-listings/:id`
- Contrat : `BrowseListingDetail` (`BrowseListing` + `status`)
- Adaptateur : `adaptBrowseListingDetail`
- Affichage minimal :
  - retour vers `/listings` ;
  - titre, badge « Urgent » et badge de statut ;
  - cabinet, lieu, spécialité, période, candidats, publication ;
  - description complète ;
  - 404 via `requireExisting` si l'annonce n'existe pas ou n'est plus accessible.

## Ce qui restait à faire (non bloquant)

- **Candidature** : fait — section `ApplyToListing` sur la page détail
  (`src/components/organisms/apply-to-listing.tsx`), servie par `POST
  /applications` (`applyToListing` dans `lib/applications/service.ts`, messages
  d'erreur dans `apply-errors.ts`). La page détail éclide qui voit quoi : lien
  de connexion pour l'anonyme, lien « Créez votre profil » pour un membre sans
  profil, rien pour un profil `INSTALLED`, formulaire pour les autres.
- **Carte** : afficher la localisation du cabinet sur une carte (réutiliser
  `ListingsMap` ou un composant plus léger), avec un lien « Voir sur la carte ».
- **Mise en page** : passer à une page plus riche (en-tête collant, sections
  « L'annonce », « Le cabinet », « Candidatures »), en réutilisant les primitives
  existantes (`Card`, `FactList`, `Panel`).
- **Métadonnées dynamiques** : `generateMetadata` pour un titre et une description
  propres à l'annonce (attention à ne pas doubler la lecture).
- **Partage** : bouton « Copier le lien » et éventuellement Open Graph.
- **Annonces liées** : proposer d'autres annonces du même cabinet ou de la même
  spécialité.
- **Mobile** : vérifier que la carte de `/listings` et la page de détail restent
  lisibles avec des descriptions longues.

## Comportement des listes

- `/listings` : la ligne du tableau est entièrement cliquable vers `/listings/[id]`.
  Le bouton du titre reste le contrôle « voir sur la carte » et n'est pas intercepté
  par la navigation.
- `/listings/mine` : la ligne du tableau et la carte mobile sont entièrement
  cliquables vers `/listings/mine/[id]`. L'expansion « Voir » et ses actions en
  ligne ont été supprimées ; la gestion des candidatures et les actions
  Clôturer/Annuler vivent uniquement sur la page de détail.
