# Plan — l'API du navigateur d'annonces, refaite proprement

> Contexte rédigé le 2026-10-11, mis à jour après la revue documentaire.
> Deux dépôts : `kineo-nest-backend` (branche `feat/listings-browse-feed`) et
> `kineo-next-frontend` (branche `feat/listings-page`).

---

## 0. État du travail « perdu » — récupéré et posé sur master

La branche `feat/listings-browse-feed` avait été supprimée du dépôt local. Le commit
**`46bcfd4`** était encore dans l'objet store ; il a été restauré puis **cherry-pické
sur `master`** — pas rebasé : `da0c8a2` n'est pas un ancêtre de `master` (la branche
venait de `security/audit-remediation-v2`, mergée ensuite via `c6efe2f`).

```bash
git branch backup/recovered-46bcfd4 46bcfd4   # filet, à ne pas supprimer
git checkout -B feat/listings-browse-feed master
git cherry-pick 46bcfd4                        # → 2832cb2, zéro conflit
```

Le rebase que tu avais lancé rejouait huit commits **déjà dans `c6efe2f`** (le commit
qui *merge* `security/audit-remediation-v2`) et butait sur `.env.example`. Il a été
avorté proprement ; `orig-head` valait `46bcfd4`, donc rien n'était perdu.

**Contenu** — le DTO `ReplacementListing` embarque `practice`, `GET
/replacement-listings/facets` existe, `buildListingsWhere` fusionne `city` et
`isPublic` sur la même clé `practice`.

**Fidélité du report, vérifiée** :

| | |
|---|---|
| 4 fichiers sur 5 | bit-à-bit identiques à l'original |
| `replacementlistings.service.ts` | diffère seulement sur l.422 et l.550 — les hunks de `3fce09c` (master) |
| notre travail (l.221-299) | intact |
| patchs comparés | 497 lignes de part et d'autre, identiques hors hash de blob |
| tests | **375 pass, 0 fail** (36 fichiers) |
| `biome check src prisma` | 137 fichiers, propre |
| `tsc -p tsconfig.build.json` | code 0 |
| poussé ? | **non** — 1 commit d'avance sur `origin/master`, local seulement |

---

## 1. Pourquoi le refaire

`2832cb2` est correct mais confond deux questions qui n'ont pas la même portée. Le
refus est **délibéré et documenté des deux côtés** :

- backend `replacementlistings.service.ts:268` — `const { specialty: _specialty, ...scope } = filters`
- frontend `browse-service.ts:164-173` — `fetchFacets` n'envoie pas `specialty`

> *Un panneau « répartition par spécialité » qui lit « Médecine générale — 12 »
> pendant que le lecteur filtre sur Dermatologie répond à une question que
> personne n'a posée.*

La carte, elle, **doit** respecter la spécialité. Un pin montrant des annonces d'une
autre spécialité pendant que la liste n'en montre aucune est exactement le mensonge
qu'on a passé deux commits à corriger.

**Deux portées différentes ⇒ deux réponses différentes.** `/facets` reste tel quel.

Deux autres manques constatés en même temps :

- **`sort` n'existe pas côté serveur.** `FindReplacementListingsSchema` est `.strict()`
  et n'a pas de champ `sort`. Le tri client ne classe que les lignes affichées :
  « Plus récentes » est présenté comme un réglage global alors qu'il classe dix lignes
  sur quarante-six.
- **La carte se nourrit de la page.** Corrigé côté front (`ee5a579`), mais la bonne
  forme est un endpoint dédié qui rend des *pratiques*, pas des annonces.

---

## 2. Contrat cible

Trois routes, trois questions distinctes.

### 2.1 `GET /replacement-listings` — les lignes

Inchangé, **plus** `sort` :

| param | valeurs | défaut |
|---|---|---|
| `sort` | `recent` \| `urgent` \| `startDate` | `recent` |

`orderBy` **total**, sinon la pagination par offset saute ou répète des lignes :

```
recent    → [{ createdAt: "desc" }, { id: "desc" }]
startDate → [{ startDate: "asc" }, { id: "desc" }]
urgent    → [{ urgent: "desc" }, { startDate: "asc" }, { id: "desc" }]
```

`id` en dernier terme est obligatoire. C'est le piège que signale déjà le commentaire
de `findAll` sur `{createdAt desc}, {id desc}`.

### 2.2 `GET /replacement-listings/facets` — les panneaux

**Inchangé.** `{ total, urgent, bySpecialty }`, sans `specialty`, 114 octets.
C'est le contrat de `2832cb2`, et il est bon.

### 2.3 `GET /replacement-listings/places` — la carte *(nouveau)*

```jsonc
{
  "places": [
    {
      "practiceId": "cmv…",
      "name": "Centre Dentaire Jean Jaurès",
      "city": "Marseille",
      "latitude": 43.2965,
      "longitude": 5.3698,
      "count": 5,                       // annonces ici dans le résultat filtré
      "listings": [                     // 4 max, dans l'ordre du lecteur
        { "id": "cmv…", "title": "…", "dateRange": "Du 29 oct. au 2 nov." }
      ]
    }
  ],
  "listingIds": ["cmv…", "cmv…"],    // tous les ids filtrés, dans l'ordre du lecteur
  "unlocated": 0,                       // annonces filtrées sans coordonnées
  "truncated": false                    // places — ou ids — au-delà du plafond ?
}
```

Règles :

- **`specialty` est respecté**, contrairement à `/facets`.
- `status: OPEN` + `practice.isPublic: true`, comme `findAll`.
- Places triées par `count` décroissant, plafond `MAX_BROWSE_MAP_PLACES`, `truncated` le dit.
- Aperçus : 4 par practice, dans l'ordre `sort` du lecteur.
- **`listingIds` est indispensable**, pas décoratif — sans lui, le clic popup ne sait
  plus quelle page ouvrir. Voir §4 étape C.
- Route déclarée **avant `:id`**, à côté de `facets` — sinon `:id` répond à la
  chaîne littérale (commentaire déjà dans le contrôleur).
- DTO dérivé : `FindReplacementListingsSchema.omit({ page: true, limit: true })`.
  **Vérifié** : `.omit()` préserve `.strict()` sous le zod du projet — les filtres sont
  définis une seule fois et les clés inconnues restent rejetées.

#### `listingIds`, et pourquoi le popup en dépend

Le popup affiche les 4 premières annonces d'une practice. Un clic sur une entrée doit
amener le lecteur à **la ligne correspondante dans la liste**, qui est paginée. Il faut
donc connaître la position de cette annonce dans la liste filtrée **triée**.

Or les places sont triées par `count` décroissant, et chaque place ne porte que 4
aperçus sur N : la forme ne permet **pas** de dériver cette position. Sans `listingIds`,
le calcul de page renvoie un index arbitraire — et l'erreur est **silencieuse** : on
bascule sur une page où la ligne n'est pas, et le `pendingScrollId` ne trouve rien à
défiler. Pire que l'échec actuel, parce qu'il ne se signale pas.

`listingIds` rend le calcul exact, pour un coût d'environ 25 octets par annonce
correspondante — ~1,2 ko sur le jeu actuel. Si la collection dépasse le plafond, l'id
n'y est pas : on met en évidence sans basculer, et `truncated` l'a déjà dit.

#### Mesures (jeu actuel : 46 annonces, 26 pratiques)

| | payload | requêtes / changement de filtre |
|---|---|---|
| page (10 lignes) | 6 700 o | 1 |
| carte actuelle (`limit=100`) | 31 163 o | +1 |
| `/places` | 9 464 o | +1 |

Le gain est le payload (×3,3) et la justesse du modèle. **L'aller-retour reste** :
c'est le prix d'une portée distincte, et il faut l'assumer.

Toutes les pratiques du jeu actuel sont géocodées (`unlocated: 0`), mais le champ
reste dans le contrat : une pratique jamais géocodée est une ligne normale, pas une
erreur, et elle appartient à la liste et nulle part sur la carte.

#### Pourquoi des *pratiques* et pas des annonces

La carte dessine des pratiques — `groupByLocation` les fusionne. Récupérer 100
*annonces* pour dessiner ~N *pratiques* mélange deux unités : à 5 annonces par
practice (ordre de grandeur banal), une fenêtre de 100 couvre 20 pratiques sur N et
le reste disparaît **sans un mot**. Le tri serveur étant `createdAt desc`, la carte
montre « les 100 plus récentes » — et contrairement à la liste, il n'y a pas de
« page 5 sur 40 » qui le signale.

Mesuré : **46 annonces pour 26 pratiques**, soit 1,8 annonce par practice. Le ratio
monte avec la densité des cabinets.

---

## 3. Implémentation de `/places`

### 3.1 Trois requêtes, zéro SQL brut

```ts
// 1 — quelles pratiques, et combien d'annonces chacune
groupBy({ by: ["practiceId"], where, _count: true })
  → tri JS par count desc, puis take du plafond

// 2 — les coordonnées
practice.findMany({ where: { id: { in: ids } },
                    select: { id, name, city, latitude, longitude } })

// 3 — les aperçus, dans le même ordre que la liste
findMany({ where: { ...where, practiceId: { in: ids } },
           select: { id, title, startDate, endDate, practiceId } })
  → regroupement JS, 4 conservés par practice
```

**Pourquoi cet assemblage et pas `ROW_NUMBER()`.** Le premier obstacle est une limite
documentée : dans Prisma 7, `groupBy` ne sait pas ordonner par un agrégat. La
référence est formelle — *« Lets you order the returned list by any property that is
also present in `by` »*. (L'API chaînée de `@prisma/orm-postgres`, avec
`.orderBy((u) => u.posts.count().desc())`, le permet ; c'est Prisma 8, pas 7.9.1.)
D'où le tri en JavaScript, borné par le **nombre de practices distinctes** — un chiffre
qu'on peut énoncer, contrairement au nombre d'annonces.

Le second obstacle est le nôtre : `buildListingsWhere` rend un
`Prisma.ReplacementListingWhereInput`, pas du SQL. Une requête `ROW_NUMBER()` obliged
à réécrire les mêmes filtres en SQL — une **seconde définition**, qui diverge. Les
trois requêtes ci-dessus restent dans le query builder, donc il n'existe qu'**une**
définition des filtres, et la divergence n'a nulle part où naître.

Le surcoût est de tirer plus de lignes qu'on n'en rend, borné par le plafond de
practices et réduit par le `select` à cinq colonnes. Sur le jeu actuel : 46 lignes.

### 3.2 Escalade documentée : TypedSQL

Le jour où ce surcoût devient réel, la voie officielle existe et n'est pas
`$queryRaw` artisanal. La page *Raw queries* de Prisma commence par :

> We recommend using TypedSQL for type-safe SQL queries **instead of** the raw
> queries described below.

`previewFeatures = ["typedSql"]`, un dossier `prisma/sql/`, `prisma generate --sql`,
puis `$queryRawTyped(placesPreviews(ids))` — types générés **pour les paramètres et
pour le résultat**, tableaux via `ANY($1)`. Le SQL devient un fichier relisible et
revue-able au lieu d'être enfoui dans du `Prisma.sql`.

### 3.3 Le plafond, dans l'env

`MAX_BROWSE_MAP_PLACES`, défaut 200, dans un bloc `browse` **et pas** dans `limits.*` :

```ts
// ---- Browse feed ----
// How many distinct practices the /listings map is drawn from.
//
// A guard on the payload, not a product quota, which is why it does not live
// in `limits.*`: that block is documented as "undefined = unlimited", and an
// unbounded map is the one outcome this endpoint exists to prevent.
browse: {
  mapPlaces: positiveInteger(
    process.env.MAX_BROWSE_MAP_PLACES,
    200,
    "MAX_BROWSE_MAP_PLACES",
  ),
},
```

`positiveInteger` et non `optionalPositiveInteger` : la famille 2 de la
configuration (throttle, rétention, `PORT`), qui a toujours une valeur. La famille 1
(`limits.*`) rend `undefined` = illimité, exactement le défaut qui casse la carte.

Trois endroits, plus un piège :

1. **La factory** ci-dessus.
2. **`envValidationSchema`** — c'est lui qui valide au boot :
   `MAX_BROWSE_MAP_PLACES: z.coerce.number().int().positive().default(200)`.
3. **`.env.example`** — commenté en anglais, valeur posée comme les autres
   (`MAX_PRACTICES_PER_PROFILE=5`, …).
4. **Le service** lit, ne redéfinit pas : `this.config.get<number>("browse.mapPlaces")`.

> **Le piège.** Toutes les specs du service fabriquent leur `ConfigService` par
> `{ get: () => undefined } as unknown as ConfigService`. Pour `limits.*` c'est
> inoffensif — `undefined` y *vaut* « illimité », ce que ces tests veulent. Pour
> `browse.mapPlaces`, ça rendrait le plafond **incommensurable silencieusement** : un
> test affirmant `truncated === false` passerait non parce que le endpoint est juste,
> mais parce que le stub a désactivé la limite. Les specs de `/places` doivent donc
> rendre une vraie valeur :
>
> ```ts
> const config = {
>   get: (key: string) => (key === "browse.mapPlaces" ? 200 : undefined),
> } as unknown as ConfigService;
> ```

Un plafond piloté par l'env signifie que deux déploiements peuvent rendre `truncated`
différent pour les mêmes données. **C'est précisément ce que `truncated` est là pour** :
le client ne connaît pas le chiffre, il lit le drapeau. Les deux vont ensemble — le
plafond est réglable, le drapeau le rend réglable sans risque.

#### Ce qui reste en dur, et pourquoi

`src/common/pagination.ts` porte la borne d'en face, et son commentaire dit pourquoi :

```ts
export const MAX_RESULTS = 10_000;
```
> *it exists so a client cannot ask the database for a million rows by asking for a
> small `limit` at a high `page`, and a copy that drifted would have quietly removed
> that bound for one resource.*

Ce n'est pas un réglage, c'est une **borne de défense** contre l'entrée hostile. La
rendre paramétrable l'affaiblirait pour tout le monde à la fois, silencieusement.
Idem `MAX_TIMER_MS` et le plafond de `PORT`.

**La règle** : ce qui limite ce qu'un appelant peut exiger reste en dur ; ce qui
limite ce qu'on choisit de rendre va dans l'env.

---

## 4. Le frontend, dans l'ordre

### Étape A — `sort` serveur

- `BrowseFilters` gagne `sort` ; `BrowseView` l'hérite.
- `toBrowseView(filters, page, sort)` émet toujours un `sort` concret.
- **`DEFAULT_BROWSE_VIEW` gagne `sort: "recent"`** et `isDefaultBrowseView` le compare.
  *Si cet ajout est oublié, la vue `{page:1, sort:"urgent"}` passe pour la vue par
  défaut et `usePaginatedResource` restaure `initialData` : le lecteur choisit
  « Urgentes d'abord » et reçoit les lignes d'origine, sans erreur.* ← le piège le
  plus coûteux du chantier.
- `BrowseSort` remonte de `listings-toolbar.tsx` vers `browse-contracts.ts` : c'est
  désormais un paramètre d'API, pas un détail de composant. Les libellés `BROWSE_SORTS`
  restent dans le composant.
- `onSortChange` remet la page à 1, comme `applyFilters`.
- Suppression du `sorted` côté client **et du commentaire `listings-container.tsx:116-122`**
  (« Sorting is deliberately absent »). Il rendait la décision auditable ; le commit
  doit annoncer qu'elle est renversée, pas la laisser périmée.
- Effet secondaire : `pickListing` calcule la page cible via `mapListings.findIndex`
  sous la garde `sort === "recent"`. Les deux appels envoyant le même `sort`, cette
  garde disparaît au profit d'un invariant plus fort — carte et liste dans le même
  ordre par construction.

### Étape B — `MapPlace.count`

Invisible à l'écran aujourd'hui (`count === listings.length` par construction), c'est
ce qui la rend sans risque, et c'est le préalable technique de l'étape C.

`MapPlace.listings.length` est lu en **12 endroits** — 11 dans `use-map-markers.ts`
(l.127, 215, 223, 226, 258, 450, 452, 460, 506, 509, 510) et 1 dans
`listings-map.tsx:71`. Dès que l'endpoint plafonne les aperçus à 4, `length` devient
un mensonge :

| site | ce qu'il afficherait |
|---|---|
| badge du cluster (l.215, 223) | « 4 » au lieu de « 9 » |
| libellé accessible (l.226) | « 4 annonces » |
| sélection auto (l.258) | une practice à 5 annonces passe pour isolée |
| titre / en-tête du popup (l.450, 452, 460) | « 4 annonces » |
| ligne « +N autres » (l.506-510) | **ne s'affiche plus jamais** |
| `unlocatedCount` (l.71) | `4×N − Σlength` devient négatif |

`MapPlace` porte donc `count`, et tous ces sites basculent dessus. Bonus : la signature
de reconstruction (l.127) devient plus juste qu'avant.

`unlocatedCount` devient exact quand `/places` renvoie `unlocated` directement.

### Étape C — la carte sur `/places`

L'indépendance de la pagination est acquise depuis `ee5a579`. Ce qui reste faux, c'est
**l'unité récupérée** : la carte tire des *annonces* alors qu'elle dessine des
*pratiques*. L'étape C remplace l'unité, pas l'indépendance.

```
page.tsx          Promise.all([ fetchBrowseListings, fetchBrowsePlaces ])
                        │                        └── pratiques, pas annonces
                        ▼
container    initialPlaces ──► useState ──►  { places, listingIds, unlocated, truncated }
             effet sur [filters, sort] ──► fetchBrowsePlaces(filters, sort)
                        ▼
ListingsMap  places={places}            ← MapPlace[]
             unlocated={unlocated}       ← lu, plus déduit
                        ▼
use-map-markers   clusterPlaces(places, viewport)  ← inchangé
                  popupContent(place, onPick)
```

**L'état du conteneur est la réponse entière, pas le tableau.** `unlocated`,
`listingIds` et `truncated` sont au-dessus de `places` dans la réponse ; un
`MapPlace[]` ne peut pas les porter. Le conteneur garde l'objet et le démembre au
moment de rendre — il ne transforme rien.

**La carte ignore la forme du endpoint.** `ListingsMap` reçoit deux props plates et ne
sait rien des ids ni du drapeau :

```ts
interface ListingsMapProps {
  places: MapPlace[];
  unlocated: number;
  activeListingId?: string | null;
  onActiveListingChange?: (id: string | null) => void;
  onListingPick?: (id: string) => void;
  className?: string;
}
```

C'est la même frontière qu'aujourd'hui — un organisme qui ne connaît que des places et
un compte. `listingIds` et `truncated` ne sortent pas de la couche qui les a demandés,
le conteneur, seule à avoir une notion de page.

Quatre changements :

**1. `fetchBrowseLocations` et `BROWSE_MAP_LIMIT` disparaissent**, remplacés par
`fetchBrowsePlaces`, qui rend la réponse entière (`BrowsePlacesData`), pas un tableau.

**2. La prop de `ListingsMap` passe de `listings: BrowseListing[]` à
`places: MapPlace[]`, et `groupByLocation` sort du front.** Le serveur groupe par
`practiceId` — c'est *exact*, là où le front arrondissait les coordonnées à trois
décimales (~100 m). L'approximation n'a plus lieu d'être.

Conséquence : **`groupByLocation` devient du code mort, et ses tests dans
`browse.spec.ts` (`describe("groupByLocation")`) disparaissent avec elle.** Ce n'est
pas un oubli à rattraper, c'est une suppression à faire.

Une ligne de plus, oubliée jusqu'ici : `map-camera.ts:29` cite `groupByLocation` dans
son commentaire (*« `groupByLocation` skips ungeocoded postings, so this cannot happen on
the… »*). La fonction disparaissant, le commentaire devient faux — à corriger dans le
même commit, sinon le fichier cite un symbole qui n'existe plus.

Ce qui **survit**, et qu'il ne faut pas emporter par erreur :

- `clusterPlaces` dans `use-map-markers.ts` — c'est le regroupement par *viewport*
  (rayon 44 px, recalculé à chaque déplacement). Le serveur ne peut pas le faire : il
  ne sait pas où regarde le lecteur.
- les marqueurs, le clustering écran et les popups ne bougent pas d'une ligne.
  `MapPlace` a déjà la forme dont ils ont besoin.

**3. `unlocatedCount` est lu**, plus déduit de `listings.length`
(`listings-map.tsx:70-71`) : le déduit cède la place à la prop `unlocated`, et la
condition d'affichage devient `unlocated > 0`.

**4. `pickListing` s'appuie sur `listingIds`.** Le calcul actuel :

```ts
const position = mapListings.findIndex((listing) => listing.id === id);
if (position >= 0 && sort === "recent") setPage(Math.floor(position / BROWSE_PAGE_SIZE) + 1);
```

marche parce que `mapListings` est aujourd'hui la collection entière dans l'ordre du
serveur. Les places ne le sont plus. Avec `listingIds`, la position redevient
`listingIds.indexOf(id)` — juste par construction, et la garde `sort === "recent"`
devient inutile puisque l'ordre du lecteur est déjà celui des ids.

Si `indexOf` rend `-1` — annonce hors plafond — on met en évidence sans basculer, et
`truncated` l'a déjà annoncé.

**Un adaptateur neuf, `adaptBrowsePlaces`**, et les types de réponse qui vont avec
dans `src/lib/types/api.ts`. Une correction sur ce point : le plan disait
`adaptFacets`, ce qui est faux — `adaptFacets` transforme `ApiListingFacets` en
`BrowseFacets` (`total`, `urgent`, `bySpecialty`), les panneaux. Elle n'a aucun rapport
avec `MapPlace`.

**Comportement à acter** : l'effet de la carte est clé sur `[filters, sort]`, donc un
changement de tri recharge la carte. Mêmes places, aperçus réordonnés dans l'ordre du
lecteur. C'est le comportement voulu ; il est écrit ici pour être trouvé plutôt que
découvert.

---

## 4 bis. Fichiers à toucher

Chaque fonction ci-dessus a une adresse. Rien ne se décide au clavier pendant
l'exécution.

### Backend — `kineo-nest-backend`

| fichier | quoi |
|---|---|
| `dto/find-replacementlistings.dto.ts` | `sort` dans le schéma ; `FindPlacesDto` dérivé par `.omit({ page, limit })` |
| `entities/replacementlisting.entity.ts` | `ListingPlacesSchema`, `ListingPlaceSchema`, `ListingPlaceListingSchema` |
| `replacementlistings.service.ts` | `orderBy` de `sort` ; `findPlaces` |
| `replacementlistings.controller.ts` | `@Get("places")`, **avant `@Get(":id")`** |
| `config/configuration.ts` | bloc `browse.mapPlaces` + entrée dans `envValidationSchema` |
| `.env.example` | `MAX_BROWSE_MAP_PLACES=200`, commenté en anglais |

Aucun schéma Prisma, aucune migration, aucune dépendance.

### Frontend — `kineo-next-frontend`

| fichier | quoi |
|---|---|
| `lib/types/api.ts` | `ApiReplacementPlaces`, `ApiListingPlace` — **la réponse du nouvel endpoint n'a pas encore de type ici** |
| `lib/listings/browse-contracts.ts` | `BrowsePlacesData`, `sort` dans `BrowseFilters`, `count` sur `MapPlace`, `DEFAULT_BROWSE_VIEW.sort` |
| `lib/listings/browse-adapters.ts` | `adaptBrowsePlaces` ; suppression de `groupByLocation` |
| `lib/listings/browse-service.ts` | `sort` dans `fetchBrowseListings` ; `fetchBrowsePlaces` à la place de `fetchBrowseLocations` |
| `lib/listings/browse.spec.ts` | tests des nouveaux services/adaptateurs ; **suppression de `describe("groupByLocation")`** ; mise à jour de `describe("isDefaultBrowseView")` |
| `lib/hooks/use-map-markers.ts` | rien — voir l'avertissement ci-dessous |
| `components/organisms/listings-map.tsx` | prop `places` + `unlocated`, plus `groupByLocation` ni le déduit |
| `components/templates/listings-container.tsx` | état `placesData`, `pickListing` sur `listingIds`, `onSortChange` remet la page à 1 |
| `components/templates/listings-view.tsx` | rien, si la forme des props tient |
| `components/molecules/listings-toolbar.tsx` | `BrowseSort` **remonte** dans les contrats ; `BROWSE_SORTS` reste ici |
| `app/(site)/listings/page.tsx` | `fetchBrowsePlaces` dans le `Promise.all` |
| `lib/listings/map-camera.ts` | une ligne de commentaire (§4, étape C) |

### Avertissement

Trois commits sont arrivés sur `feat/listings-page` depuis la première version de ce
plan, dont `dde4b55` qui ajoute **324 lignes à `use-map-markers.ts`**. L'étape C y
affirme que marqueurs et popups ne bougent pas — c'était vrai à la rédaction.

Vérifié à jour : `ListingsMap` garde sa prop `listings`, `unlocatedCount` est toujours
aux l.69-71, `groupByLocation` toujours appelé en l.55. Les points de suture tiennent.
Mais **relire les 324 lignes avant d'y toucher**, plutôt que de s'y fier.

## 5. Séquence de commits

| # | dépôt | commit | visible ? | état |
|---|---|---|---|---|
| 0 | backend | `feat(listings): … schemas with practice details and facets counting` | oui | **fait** (`2832cb2`) |
| 1 | backend | `feat(listings): order by the endpoint, not the page` | oui | à faire |
| 2 | frontend | `feat(listings): order by the endpoint, not the page` | oui | à faire |
| 3 | frontend | `refactor(map): give a place its own count` | **non** | à faire |
| 4 | backend | `feat(listings): one endpoint for the map's places` | oui | à faire |
| 5 | frontend | `feat(map): draw from the places endpoint` | oui | à faire |

Le commit 3 est invisible et le 5 est le seul qui change ce que le lecteur voit : les
garder séparés rend chaque étape réversible seule.

---

## 6. Vérification

### Commandes

Ce chantier ne touche **ni au schéma Prisma, ni aux migrations, ni aux dépendances** :
`sort` est un paramètre de requête sur un DTO zod, `/places` une route et une méthode
de service. Aucun CLI de génération n'est donc nécessaire.

Ce qui tourne, c'est de la vérification :

```bash
# backend
bun run test          # 375 tests, 36 fichiers
bun run lint          # biome check src prisma
bun run typecheck     # tsc --noEmit
bun run db:check      # migrate diff --exit-code — la porte de dérive
bun run test:e2e      # 10 suites

# frontend
bun run test && bun run lint && npx tsc --noEmit
```

`db:check` n'est pas décoratif : c'est le garde-fou qui dirait si le schéma et les
migrations ont divergé. Il doit rester vert malgré tout, puisque rien ne change.

**`db:push` ne doit pas être utilisé.** Le script existe, et c'est exactement l'outil
qui produit un état correct en local en ayant dé synchronisé l'historique des
migrations. Ici il n'y a rien à pousser — donc rien à risquer.

### Ce qu'il faut prouver

**Backend** — 375 tests passent. Ajouter : chaque `sort` (et surtout que `urgent` seul
n'est pas déterministe), `/places` avec et sans `specialty`, le plafond avec
`truncated` dans les deux sens, `unlocated`, `listingIds` dans l'ordre du `sort`, et la
route 404 avant `:id`. Plus une spec qui vérifie que le stub de `ConfigService` rend
bien `browse.mapPlaces` — sans quoi le plafond est absent et les tests passent.

**Frontend** — `bun run test` (22 tests), `lint`, `tsc`.

**Navigateur** (`/tmp/opencode/`, Chromium) — la suite existante plus :

- `independ.mjs` : les 4 pages parcourues, la carte ne bouge pas, le filtre spécialité
  la suit
- un test « popup → annonce hors page » : changement de page + ligne centrée. **Il
  existe déjà** (`pick3.mjs`) et c'est lui qui attrape le trou du calcul de page.
- un test par `sort` : l'ordre des lignes **et** l'ordre du popup correspondent
- après l'étape B : aucune régression visuelle (c'est le but de l'étape)
- l'indicateur « N annonces sans coordonnées » avec une pratique non géocodée, pour
  vérifier que `unlocated` est lu et non plus déduit

---

## 7. PostGIS — différé, recette prête

Hors périmètre, par décision explicite. Les étapes ci-dessous ne touchent à aucune
colonne de coordonnées : `groupBy(['practiceId'])` survit intact, et la future colonne
spatiale serait lue par `ST_X`/`ST_Y` dans un `SELECT` — sans affecter les trois
requêtes de `§3.1`.

### Ce que l'investigation a changé

**La recherche par rayon n'est appelée par personne.** `GET /practices?lat&lng&radiusKm`
existe, complète, testée — 258 lignes d'e2e — mais `grep` ne trouve **aucun appelant**,
et la page `/practices` **n'existe pas** côté front alors que `navigation.ts:25,34` la
propose et que `proxy.ts:30` la protège. Le lien « Mes cabinets » mène à un 404.

**Les coordonnées sont des centres-ville, pas des adresses.** `prisma/seed.ts:40-54`,
12 villes avec le commentaire *« Rough city centers so geo searches spread across
France instead of clustering around Paris »*. Un rayon de 5 km autour de Lyon trouve les
cabinets dont la ville est Lyon, quel que soit leur quartier — la précision que PostGIS
apporterait n'a rien où s'appliquer.

Donc : aucune des trois conditions n'est remplie.

| | aujourd'hui |
|---|---|
| coordonnées d'adresse réelles | non — centres-ville du seed |
| recherche par rayon utilisée | non — zéro appelant |
| page de gestion des cabinets | non — 404 |

### Séquence recommandée, quand le moment viendra

1. **La page `/practices` d'abord.** Elle crée le besoin : une adresse réelle remplace
   les centroïdes.
2. **La recherche par rayon devient alors une fonctionnalité**, avec un appelant réel.
3. **PostGIS ensuite**, et son bénéfice devient concret.

### La recette

**Sources officielles**

- Prisma, `extensions` (champ `datasource`, **GA en v7** — ce n'est plus un preview
  flag) : <https://www.prisma.io/docs/orm/reference/prisma-schema-reference#datasource>
- Prisma, types non supportés + `dbgenerated` :
  <https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/unsupported-database-features>
- Prisma, migrations personnalisées :
  <https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/customizing-migrations>
- Prisma, **SafeQL** — *« to work around features not natively supported by Prisma, such
  as PostGIS »* : <https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/safeql>
- PostGIS, geography vs geometry :
  <https://postgis.net/docs/using_postgis_dbmanagement.html#PostGIS_GeographyVSGeometry>
- `ST_DWithin` : <https://postgis.net/docs/ST_DWithin.html> ·
  `ST_MakeEnvelope` : <https://postgis.net/docs/ST_MakeEnvelope.html>
- Image : `postgis/postgis:18-3.6-alpine` (le dépôt est sur `postgres:18-alpine`)

**Le piège** — la doc Prisma est explicite :

> You must install the extension **as part of a migration**. Do not install the
> extension manually, because it is also required by the shadow database.

`CREATE EXTENSION postgis` lancé à la main dans `psql` ne suffit pas : la shadow
database de `migrate dev` ne l'aura pas et la migration échouera sur
`type "geography" does not exist`. Ordre : `--create-only`, puis le `CREATE` dans le
fichier généré.

**Colonne générée plutôt que double écriture** — `latitude`/`longitude` restent des
`Float?` (Prisma continue de les lire et écrire), `location` en dérive :

```sql
location geography(POINT,4326) GENERATED ALWAYS AS (
  CASE
    WHEN latitude IS NOT NULL AND longitude IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
    ELSE NULL
  END
) STORED
```

Le `CASE` n'est pas décoratif : `ST_MakePoint(NULL, NULL)` lève et les coordonnées
sont nullables. Index `USING GIST (location)` — PostGIS crée seul un index sphérique
sur une colonne `geography`.

**Le contrat HTTP ne bouge pas** : on projette `ST_X(location), ST_Y(location)` dans
le `SELECT`, `ZodSerializerDto` et le front n'y voient rien.

**Ce que ça supprime dans `src/practices/geo-query.ts`** : `haversineKm` au profit de
`ST_DWithin`, et surtout `longitudeWindow` — PostGIS n'a « aucune notion de la ligne
de changement de date » (ch. 4.3.4.2). `longitude-range.ts` (33 l.) et ses tests
n'ont plus d'objet.

**Non traité par PostGIS :** le regroupement côté serveur. `ST_SnapToGrid` /
`ST_ClusterDBSCAN` sont à résolution fixe alors que le client regroupe déjà par
*viewport* (`clusterPlaces`, rayon 44 px, recalculé à chaque déplacement). Un
regroupement serveur ferait deux regroupements. `/places` rend donc des pratiques
distinctes, non regroupées.

---

## 8. Décisions encore ouvertes

1. **`limit.max(100)` dans `paginationQueryShape` — env ou en dur ?** Le seul cas
   vraiment ambigu. C'est un plafond par requête, et `MAX_RESULTS` protège déjà la
   combinaison `page × limit` ; il penche donc vers une préférence, donc vers l'env.
   Mais `MAX_RESULTS` reste en dur (borne de défense). Si on le met dans l'env, il faut
   le nommer `MAX_DEFAULT_PAGE_SIZE` plutôt que `MAX_PAGE_SIZE`, pour ne pas le
   confondre avec le plafond global.
2. **Filtrage par la vue courante** (« n'afficher que ce qui est à l'écran ») :
   **hors périmètre, recommandé**. `fitToPlaces` recadre déjà sur toute la collection à
   l'arrivée et à chaque changement de filtres. Ce qui manque est le *retour* — un
   bouton « Recentrer sur les résultats » qui rappelle `fitToPlaces` : une quinzaine de
   lignes, aucune requête, aucun couplage. Le filtrage par la vue est une
   fonctionnalité, pas une correction : elle suppose de trancher si la liste suit, ce
   que devient la pagination et ce que devient le total — c'est-à-dire recoupler liste
   et carte, ce qu'on vient de défaire. Condition de réexamen : un deuxième
   consommateur de la carte, ou des retours de lecteurs sur le bruit à l'échelle
   nationale.
3. **`applications/service.ts:175-178`** garde un tri client « kept as a guard »
   suivant l'`orderBy` du backend — même schéma, autre écran. Hors périmètre ici, à
   traiter dans le même temps si on veut aligner les deux.
4. **Le lien « Mes cabinets » vers un 404** — à retirer ou la page à construire. Sans
   rapport avec PostGIS, mais adjacent et reproductible en deux minutes.