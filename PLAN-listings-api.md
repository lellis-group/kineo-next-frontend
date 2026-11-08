# Plan — l'API du navigateur d'annonces

> Contexte rédigé le 2026-10-11, ne gardant que ce qui reste à faire le 2026-10-16.
> Le chantier lui-même est livré : les six étapes décrites dans les versions
> précédentes de ce document sont passées, des deux côtés du fil. Ce qui reste
> ci-dessous est différé ou non tranché.

---

## 1. Ce qui est passé, pour mémoire

| étape | où |
|---|---|
| `sort` serveur, `orderBy` total avec tiebreak `id` | backend `4cae2dc`, front idem |
| `MapPlace.count` distinct de `listings.length` | front |
| `GET /replacement-listings/places` + `browse.mapPlaces` | backend `817a564`, `5a8b268` |
| la carte tire les practices, plus les annonces | front |
| `q` en recherche libre sur le flux | backend `5e64641` |

Deux points où le code a dissent de ce plan, pour qu'on ne le relise pas de travers :

- **`listingIds` n'a jamais existé sur la réponse.** Le plan le présentait comme
  indispensable au clic dans le popup ; il a été remplacé par `fetchListingPageOf`,
  qui ne demande la page cible qu'au moment où le lecteur la demande.
  `BrowsePlacesData` ne porte donc ni les ids ni leur ordre.
- **Le plafond `browse.mapPlaces` vit dans `src/replacementlistings/browse.ts`**
  (`MAX_BROWSE_MAP_PLACES = 200`) et non dans un `.env` par déploiement : la
  configuration s'en sert comme défaut, et `envValidationSchema` le rend optionnel.

---

## 2. Décisions encore ouvertes

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

---

## 3. PostGIS — différé, recette prête

Hors périmètre, par décision explicite. Les étapes ci-dessous ne touchent à aucune
colonne de coordonnées : `findPlaces` groupe toujours par `practiceId`, et la future
colonne spatiale serait lue par `ST_X`/`ST_Y` dans un `SELECT`.

### Ce que l'investigation a changé

**La recherche par rayon n'est appelée par personne.** `GET /practices?lat&lng&radiusKm`
existe, complète, testée — 258 lignes d'e2e — mais `grep` ne trouve **aucun appelant**,
et la page `/practices` n'existe pas côté front. Le lien qui la menait a été retiré
(`navigation.ts`, l'action du dashboard, le matcher du proxy) : on ne garde plus un
bouton vers un 404.

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
| page de gestion des cabinets | non — rien ne la lie |

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

**Le contrat HTTP ne bouge pas** : on projette `ST_X(location), ST_Y(location)` dans le
`SELECT`, `ZodSerializerDto` et le front n'y voient rien.

**Ce que ça supprime dans `src/practices/geo-query.ts`** : `haversineKm` au profit de
`ST_DWithin`, et surtout `longitudeWindow` — PostGIS n'a « aucune notion de la ligne
de changement de date » (ch. 4.3.4.2). `longitude-range.ts` (33 l.) et ses tests
n'ont plus d'objet.

**Non traité par PostGIS :** le regroupement côté serveur. `ST_SnapToGrid` /
`ST_ClusterDBSCAN` sont à résolution fixe alors que le client regroupe déjà par
*viewport* (`clusterPlaces`, rayon 44 px, recalculé à chaque déplacement). Un
regroupement serveur ferait deux regroupements. `/places` rend donc des pratiques
distinctes, non regroupées.