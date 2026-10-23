# Plan de refactoring — Audit architectural kineo-next-frontend

> Toutes les étapes sont sans dépendance structurelle entre elles, sauf 4 → 5 (baril) et 2 → 3 (hook commun). Chaque étape est directement vérifiable par `bun test src` + `bun run typecheck` + `bun run lint` (projet : Biome + knip disponibles).

## Étape 1 — Correctifs véritables à faible risque et forte valeur

- **Objectif** : corriger le bug typé C01, la geometry C20, la SSOT C09, dup actions (C19).
- **Fichiers** : `applications/adapters.ts` + `contracts.ts` (+ spec), `header-skeleton.tsx`/`site-header.tsx`/`lib/layout.ts`, `listings/contracts.ts`.
- **Changements** : `countForBucket` type-safe sur `option.status` ; constantes partagées de hauteur de header ; dériver `RECRUITING_STATUSES` du chip.
- **Tests** : `applications` spec (ajouter un cas REFUSED>0), `contracts.spec.ts`, vérification manuelle CLS.
- **Acceptance** : puce « Refusées » montre le total backend ; plus aucun layout-skip entre skeleton et header ; le typecheck sans cast.

## Étape 2 — Extraction des primitives partagées (hooks + actions)

- **Objectif** : finir la consolidation que `use-paginated-resource` a amorcée.
- **Fichiers** : `use-expanded-candidates.ts`, `use-paginated-resource.ts`, `dashboard-container.tsx`, 2 tables organisms, `status-card`/`auth-card`, `inline-retry-banner`.
- **Changements** : `useRaceGuard` (garde générique) ; `useReloadable` ou intégration dashboard au hook ; `useScrollToRow` ; wrapper plein écran uśe.
- **Dépendance** : l'étape 3 réutilise le hook commun.
- **Tests** : sous-t specs des hooks ; visuel : CLS et bannières inchangés.
- **Acceptance** : plus aucun call-site codant requestId+AbortController à la main.

## Étape 3 — Déduplication des containers de console

- **Objectif** : un seul modèle View + une seule règle page-1 (C03) ; un seul « jump to listing » (C02) ; `dashboard-container` de-mixin (dépendance étape 2).
- **Fichiers** : `applications-container`, `my-listings-container`, `listings-container`, `listing-detail-container`, (nouveau) `lib/paged-view.ts` ou extension `use-paginated-resource`.
- **Tests** : `.spec.ts` existants des 3 écrans + scenario « clic popup → liste page N » manuel.
- **Acceptance** : un seul endroit définit `page-1 on filter` et `find page → replace history` ; `listings-container` ≤ ~450 l.

## Étape 4 — Couche erreurs unifiée (C05, C06, C13, C14)

- **Objectif** : un seul classifieur connaissance `error.code` ; copy d'erreurs hors services ; une seule définition « session expirée » ; un seul chemin de lecture `get-session`.
- **Fichiers** : `api-errors.ts`, `listings/service.ts` (→ `listing-errors.ts`), `auth-errors.ts`, `require-member.ts`, `server-auth.ts`/`user-service.ts`, `types` in `contracts.ts`.
- **Tests** : les specs d'erreurs existants (lisite service, auth) — migrated as-is.
- **Acceptance** : `service.ts` ≤ ~250 l. de transport ; tout mapper de domaine devien un dictionnaire.

## Étape 5 — Baril/module données (fin de l'étape 4)

- **Objectif** : adapter dupliqués (C10), labels driftés (C08), set RECRUITING dupliqué (fait étape 1), mapping backend unifié.
- **Fichiers** : `listings/adapters.ts`, `browse-adapters.ts`, `applications/adapters.ts`.

## Étape 6 — Contention des fuites générales (C07, C11, C12)

- **Objectif** : `lib/map` ne dépend plus du domaine listings (types inversés) ; renderer popup injectable ; proxy injecte la table de slimming ; split `browse-contracts` en vue/URL.
- **Risque moyens** : tester sur beastie de carte manuellement.

## Étape 7 — Hygiène transversale (C17, C18, C22-C30)

- Move `use-resend-verification` → `lib/hooks/` ; reclasser `listings-toolbar` en organisme + extraire le popover ; extraire `useAccountActions` de `profile-view` ; retirer les `"use client"` inutiles (signup-view, applications-view, auth-page-footer, danger-panel) ; rename `reactivity.ts` → `response-rate.ts`, `dashboard/actions.ts` → `dashboard/action-links.ts` ; trancher la divergence `info→primary` documentée dans `inline-alert.tsx:8-13` ; composables `isAddressChangeFlow` de la vue au module flow.

---

## Références des constats cités

| ID | Priorité | Fichier et lignes | Problème |
|---|---|---|---|
| C01 | P1 | `src/lib/applications/adapters.ts:327-334` + `contracts.ts:38,68-71` + `types/api.ts:287-290` | Puce « Refusées » lit `counts["REFUSED"]` sur un objet keyé par `ApplicationStatus` (`REJECTED`) → toujours 0 |
| C02 | P1 | `src/components/templates/listings-container.tsx:392-524` (blocs jumeaux 431-444 / 502-518 ; DOM 497-500) | 636 l. : fetch + coordination table/carte + accès DOM + politique d'historique |
| C03 | P2 | `my-listings-container.tsx` ↔ `applications-container.tsx` ; règle « setPage(1) » ×3 | Modèle View + règles pagination dupliqués entre écrans frères |
| C05 | P2 | `listings/service.ts:60-86, 89-120, 343-453` | 6 responsabilités : reads, writes, contrats, codes miroir backend, copy FR, étiquetage d'erreurs |
| C06 | P2 | `api-errors.ts:96-115` vs `listings/service.ts:380-430`, `auth-errors.ts` | `classifyError` ignore `error.code` → chaque domaine recode son dispatch code→phrase |
| C07 | P2 | `lib/map/{camera.ts:3, markers.ts:5, popup.ts:4, clustering.ts:2}` + `popup.ts:208-332` | Kit map générique dépend du domaine listings ; popup = couche Vue complète |
| C08 | P2 | `listings/adapters.ts:30-61` vs `applications/adapters.ts:28-77` | Tables de labels driftées + 4 compteurs de bucket dans 2 fichiers |
| C09 | P2 | `listings/contracts.ts:217-246` | Le set `RECRUITING` réécrit à la main 3 fois alors que la table est déclarée SSOT |
| C10 | P2 | `adapters.ts:69-85` vs `browse-adapters.ts:49-77` | ~12 lignes de mapping de base identiques mot pour mot |
| C11 | P2 | `browse-contracts.ts:172-305, 454-565` | Un fichier « contracts » qui contient sérialisation URL, validation query, calendrier, copy de badge |
| C12 | P2 | `backend-proxy.ts:2,88-110` + `list-slimming.ts:75-81` | La couche transport connaît quel endpoint renvoie quelles données |
| C13 | P2 | `api-errors.ts:54` vs `require-member.ts:26` | « Session expirée = 401 » défini 2× |
| C14 | P2 | `server-auth.ts:50-54` vs `user-service.ts:11-17` | Deux voies d'accès au même endpoint `get-session` |
| C17 | P2 | `molecules/listings-toolbar.tsx` (436 l.) + `listings-toolbar-card.tsx:15-28,107-118` | Organisme déguisé en molecule + tunnel de 10 props |
| C18 | P2 | `templates/profile-view.tsx:14-19,54-81` | Vue qui appelle 3 fonctions de service + mapping d'erreur + wording + refresh |
| C19 | P2 | `listing-detail-container` ↔ `my-listings-container.tsx:192-205` | Recettes verbe/participe/messages d'action dupliquées 2× |
| C20 | P3 | `header-skeleton.tsx:21` vs `site-header.tsx:75` | Géométrie header driftée (0,25/0,75 rem) → CLS réel |
| C22-C30 | P3 | Voir rapport complet | Hygiène : placement de hooks, `"use client"` inutiles, nommages trompeurs, micro-duplications |
