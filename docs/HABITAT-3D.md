# Concepteur d’habitat 3D

## Accès Premium

Le concepteur complet (génération, édition 2D/3D, sauvegardes locales/compte,
imports et exports) est réservé aux membres Premium. Le statut existant du compte
est réutilisé ; aucune migration supplémentaire ni modification du prix n’est nécessaire.

- `/guide` présente aux visiteurs et aux comptes gratuits les avantages du concepteur
  et un lien vers la page d’abonnement. Les modèles 3D et l’éditeur ne sont pas montés.
- Le statut est vérifié auprès de `/auth/me` sans cache avant d’ouvrir l’atelier.
  Une valeur `isPremium` modifiée dans le stockage navigateur ne suffit pas.
  Une vérification indisponible propose de réessayer sans ouvrir le concepteur.
- Vérification à la reprise de l’onglet ; un refus `PREMIUM_REQUIRED` de l’API
  referme l’éditeur. Les réponses d’un ancien compte sont ignorées.
- Chaque route de projets utilise `JwtAuthGuard` puis `PremiumGuard`. L’authentification
  relit le compte en base à chaque requête ; une révocation bloque donc même un JWT
  encore valide. Les opérateurs conservent leur Premium effectif existant.
- Les projets déjà sauvegardés ne sont pas supprimés lors d’une révocation.
- La navigation et le lien depuis l’animal affichent « Premium ». Le concepteur est
  ajouté aux bénéfices de l’abonnement dans les six traductions existantes.

Le paiement en ligne est actuellement désactivé dans le dépôt (`POST /users/me/subscription`
retourne 501). Ce changement réserve la fonction aux comptes Premium existants,
sans activer ni simuler un encaissement. Les activations administratives restent disponibles.

## Fonctionnalités intégrées

Accès : `/fr/guide`, « Guide 3D » dans les navigations ordinateur/mobile, ou
« Concevoir son habitat » depuis la fiche d’un animal compatible.

- Huit modèles : gecko léopard, gecko à crête, agame barbu, serpent des blés,
  python royal, betta seul, groupe de Neocaridina et **plan technique marin**.
- Dimensions intérieures L × P × H (10–300 cm), référence propre au modèle,
  génération automatique et six variantes symétriques avec décalages.
- Sélection dans la scène, le plan ou la liste ; explication de chaque emplacement.
- Déplacement et rotation via poignées 3D, coordonnées numériques en cm,
  dimensions des objets, verrouillage, réinitialisation, ajout de décor adapté au
  milieu et retrait des éléments optionnels. Les fonctions indispensables du
  modèle ne peuvent pas être supprimées par l’éditeur.
- Limites de cuve tenant compte de la rotation ; avertissements de chevauchement
  de volumes solides, de refuge chaud éloigné du chauffage et de volume brut.
- Annuler/rétablir (50 étapes), vue 2D utilisable au clavier et repli si WebGL échoue.
- Modèles naturels texturés CC0, matériaux de sol 1K, modes léger/équilibré/détaillé,
  ombres optionnelles, grille et recentrage.
- Exports PNG, GLB avec matériaux incorporés, plan coté SVG avec légende,
  impression/PDF et liste de préparation CSV.
- Fichiers de projet JSON réimportables : validation bornée, pas d’import de code,
  URL ou modèle arbitraire ; association à un animal retirée lors de l’import.
- Bibliothèques locale et par compte, nommage, ouverture, copie, suppression
  confirmée, brouillon local différé après modification et reprise de l’ancien v1.
- Notes, checklist de matériel et liens marchands existants. Aucun stock ni prix
  fabriqué. Les produits ne s’affichent que si l’API retourne des références réelles.
- Identification de l’espèce par nom scientifique, sans attribuer un modèle
  approximatif à une espèce inconnue. Affichage de la fiche habitat existante
  quand elle est disponible et lien vers la fiche complète.

Les paramètres de cuve en cours de modification n’altèrent pas silencieusement le
projet : « Générer » les applique. Le plan, les objets et la sauvegarde portent sur
le dernier agencement généré. Une nouvelle génération peut être annulée.

## Sauvegarde et données

`HabitatSnapshot` v2 contient profil, dimensions, variante, animalId, objets,
positions/tailles en mètres, rotation Y en radians, verrouillages, checklist et notes.
`HabitatProject` ajoute id, nom, révision et date de mise à jour.

- Local : `captivia:habitats:v2:<userId|guest>`, jusqu’à 50 projets par espace.
- Brouillon : `captivia:habitat-draft:v2:<userId|guest>`, différé de 1,5 seconde.
  Il n’écrase pas un brouillon antérieur à la simple ouverture de la page.
- Migration locale en lecture de `captivia:habitat:v1:<userId|guest>` : reconstruction
  de l’agencement de l’ancien prototype, sans supprimer l’ancienne entrée.
- Compte : table `HabitatProject`, 50 projets, snapshot limité à 80 000 octets,
  80 objets, notes de 3 000 caractères. Les listes sont séparées par propriétaire.
- Modification et suppression vérifient la révision. Une mise à jour concurrente
  retourne 409, conserve l’édition courante et invite à recharger ou enregistrer une copie.
- Les réponses asynchrones d’un autre compte ne remplacent pas l’espace courant.
- Les listes privées portent `Cache-Control: private, no-store` et les requêtes
  de projets désactivent le cache navigateur.
- Après vérification Premium, une panne de l’API de projets laisse disponibles les sauvegardes locales et les exports.
  Les requêtes de projets ont un délai maximal de 15 secondes.

Le brouillon n’est pas un historique de toutes les sessions. Un navigateur peut
vider son stockage et les quotas peuvent être atteints : les exports et la
bibliothèque du compte servent à conserver durablement les projets.

## API et mise en service

Routes JWT et Premium, toutes filtrées par `req.user.id` :

| Méthode | Route                                 | Fonction                               |
| ------- | ------------------------------------- | -------------------------------------- |
| GET     | `/users/me/habitats`                  | Jusqu’à 50 projets du compte           |
| POST    | `/users/me/habitats`                  | Créer `{name, snapshot}`               |
| PATCH   | `/users/me/habitats/:uuid`            | Remplacer `{name, snapshot, revision}` |
| DELETE  | `/users/me/habitats/:uuid?revision=N` | Supprimer la révision attendue         |

La migration **`20261017180000_habitat_projects`** est préparée dans le dépôt.
Elle doit être appliquée sur l’environnement de déploiement avant l’utilisation
de la sauvegarde par compte. Aucune base de production n’a été modifiée.

Déploiement habituel, après approbation :

1. Installer les dépendances avec les lockfiles existants.
2. Depuis `backend`, `npm run migrate:deploy`, puis `npm run build`.
3. Depuis `frontend`, `npm run build` avec le bon `NEXT_PUBLIC_API_URL` HTTPS.
4. Déployer backend et frontend, puis valider le parcours sur les appareils cibles.

`getApiBase()` donne désormais priorité au backend explicitement configuré ;
il ne remplace plus une URL de production par l’adresse locale sur le port 3001.
Aucune nouvelle clé de service n’est nécessaire pour Three.js ou les modèles.
La bibliothèque marchande actuelle peut renvoyer des produits vides : cela ne
signifie pas qu’un catalogue marchand complet ou un paiement ont été intégrés.

## Rendu et ressources

- Three.js, React Three Fiber 9 et Drei 10, chargés uniquement à l’ouverture du guide.
- Décors réalistes Poly Haven : `rock_07`, `dead_quiver_branch_01`, `fern_02`.
  Conversion des fichiers glTF en GLB avec textures JPEG 1K embarquées ; géométrie
  et images sources inchangées, contrôles MD5 de l’API puis SHA256 des sorties.
- Textures de sol ambientCG converties en WebP 1K. Provenance et SHA256 des
  archives/sorties : `public/textures/habitat/provenance.json`.
- Cinq modèles Kenney légers conservés, notamment pour le mode économique,
  les plantes aquatiques schématiques et les refuges.
- Licences et provenance détaillées dans `public/models/habitat/` et
  `public/textures/habitat/`. Tous ces fichiers sont **CC0 1.0**.
- Aucun CDN, HDRI, modèle externe ou décodeur de géométrie distant au rendu.
- Rendu à la demande, sans animation continue ; densité maximale de pixels
  1,5 en mode équilibré et 2 en mode détaillé. Ombres uniquement en mode détaillé.
- Le défilement tactile reste natif hors mode exploration explicite.
- CSP : `blob:` dans `connect-src` permet le décodage des textures intégrées aux GLB.
  Les fichiers statiques disposent d’un cache HTTP d’un jour avec revalidation différée.

## Sources de soins

Références consultées le **17 octobre 2026** :

- https://reptifiles.com/leopard-gecko-care/ : point chaud publié 90–95 °F,
  soit environ 32–35 °C ; la plage ne désigne pas tout le terrarium.
- https://reptifiles.com/leopard-gecko-care/leopard-gecko-terrarium-size/ :
  référence 36 × 18 × 18 pouces, arrondie à 92 × 46 × 46 cm.
- https://reptifiles.com/crested-gecko-care/ et
  https://reptifiles.com/crested-gecko/care-guide/crested-gecko-terrarium-size-cohabitation :
  besoin de volume vertical et comparaison d’habitats. Le modèle utilise une
  référence éditoriale de 60 × 60 × 120 cm, pas un minimum universel attribué à la source.
- https://reptifiles.com/bearded-dragon-care/ : point de chauffe publié 105–115 °F,
  soit environ 41–46 °C ; le modèle réserve 180 × 60 × 90 cm.
- https://reptifiles.com/corn-snake-care-guide/ : point chaud 85–90 °F et humidité
  40–60 % ; référence éditoriale du modèle 150 × 60 × 60 cm.
- https://reptifiles.com/ball-python-care-guide/ : point chaud 86–90 °F et humidité
  60–80 % ; référence éditoriale du modèle 150 × 70 × 60 cm.
- https://ornamentalfish.org/what-we-do/advice-information/care-sheets/ : fiches
  poissons, invertébrés et aquariums marins. Les dimensions des modèles aquatiques
  sont des choix éditoriaux du concepteur, pas des minima numériques attribués à OATA.

La longueur réelle du serpent, le stade de vie et les besoins particuliers peuvent
imposer un habitat plus grand. Les seuils de génération sont des références de
conception ; ils ne constituent pas des minima légaux belges ni une certification
vétérinaire de chaque installation.

## Limites à conserver dans le produit

- Aucune simulation thermique, UVB, mécanique, chimique ou hydrodynamique.
- Le contrôle géométrique utilise des volumes englobants : un avertissement peut
  correspondre à un croisement visuel acceptable. Il ne calcule pas les fixations,
  les charges, la toxicité des plantes ou la stabilité des roches réelles.
- Les dimensions et distances de pose des équipements doivent être vérifiées
  dans leurs notices. Le matériel dessiné n’est pas une référence marchande exacte.
- Le modèle marin prépare une implantation technique ; aucune espèce ni
  population récifale n’est validée automatiquement.
- Pas de génération de cohabitation, de capacité biologique ou de plan multi-cuves.
- Interface du concepteur en français (`lang=fr`), navigation disponible dans les six
  langues existantes. Les fiches de soins sources ne sont pas traduites automatiquement.
- Les données `SpeciesHabitat` existantes sont affichées comme repères de fiche,
  sans convertir automatiquement leurs dimensions en texte en contraintes fiables.

## Validation locale — 18 octobre 2026

Les tests restent locaux. Aucune CI, aucun push, aucune publication et aucune migration
sur la base de production ne sont déclenchés.

- Frontend : 124 tests passent, dont 74 pour le concepteur et son accès Premium. Les 8 modèles × 6 variantes
  sont contrôlés aux dimensions de référence, par défaut et maximales (144 agencements).
- Backend : 213 tests unitaires passent, ainsi que 17 tests HTTP du concepteur avec JWT
  réel et PostgreSQL isolé. Ces derniers vérifient le CRUD, les notes, la séparation des
  comptes, les animaux, les conflits concurrents, le quota concurrent, les entrées invalides et les droits Premium (gratuit, révocation, opérateur).
- Toutes les migrations s’appliquent sur une base PostgreSQL 15 neuve dédiée au test.
  Suppression d’un animal : le projet est conservé ; suppression du compte : cascade.
- Compilation de production frontend/backend et ESLint ciblé réussis.

Essais navigateur réussis, avec la scène et l’API réelles :

- Contrôle Premium : visiteur, gratuit et gratuit avec cache Premium falsifié, aux formats
  1440 et 320 px. Aucun concepteur, modèle 3D ni appel à l’API de projets pour ces comptes.
  Compte Premium avec cache gratuit périmé : accès au concepteur conservé après vérification.
  L’avantage du concepteur est visible sur la page d’abonnement.

- Chromium ordinateur : génération des 8 modèles, chargement des 3 décors réalistes,
  déplacement réel avec les poignées 3D, rotation numérique, verrouillage, retrait,
  annulation/rétablissement, sauvegardes locale/compte, réouverture, brouillon,
  imports valides/invalides et sélection depuis un animal enregistré.
- Exports PNG, GLB, SVG, CSV et PDF générés et vérifiés. Le texte du PDF contient le plan,
  les dimensions et les repères ; le PNG a été inspecté visuellement.
- Chromium en émulation tactile 320, 390 et 768 px : glissement natif au-dessus de la scène,
  absence de débordement, alternance 2D/3D, secours 2D après perte réelle du contexte WebGL.
  Une panne provoquée de l’API de projets laisse la sauvegarde locale disponible.
- WebKit en émulation mobile 320, 390 et 768 px : génération, édition 2D et absence
  d’erreur d’hydratation ou de débordement. Les formats 390 px utilisent le thème sombre ;
  la préférence de réduction des animations est activée.
- Stockage local plein simulé : message explicite, projet et export conservés.

Ces essais utilisent Chromium avec SwiftShader et WebKit sur Linux. Ils ne remplacent
pas une validation sur Android/iPhone physiques, notamment du pincement, du clavier natif,
des téléchargements du système et de ses restrictions mémoire. La 3D WebKit n’est pas
certifiée par les essais 2D ci-dessus.

### Corrections issues des essais

- Un import ne peut plus convertir silencieusement des dimensions textuelles en nombres :
  la validation est cohérente avec l’API.
- Les centres générés évitent le zéro négatif, normalisé différemment par JSON.
- La comparaison des projets ignore l’ordre des clés et le bruit numérique de transport
  Prisma/JSONB, tout en détectant une modification d’un millimètre, du nom ou des notes.
- Les titres SVG sont rendus comme une seule chaîne : pas d’erreur d’hydratation React.
- Les exports attendent la disponibilité effective de la scène, y compris après une réouverture 3D.
- Le libellé des notes reste distinct de leur contenu après réouverture d’un projet.
- La libération normale d’une ancienne scène ne doit pas déclencher le secours 2D ;
  une perte réelle du contexte WebGL doit conserver le plan accessible.

### Rejouer les contrôles

Les fichiers `frontend/scripts/check-habitats-local.mjs` et
`frontend/scripts/check-habitats-webkit-local.mjs` ne ciblent que des URL de boucle locale.
Le premier nettoie les projets des deux comptes de test préparés ci-dessous ; il refuse
les comptes dont l’adresse n’a pas le préfixe de fixture prévu.

Créer une base jetable distincte, sans employer la base habituelle du développeur :

```sh
docker run --rm --name captivia-habitats-verify -e POSTGRES_PASSWORD=local-habitat-tests -e POSTGRES_DB=captivia_habitats_test -p 127.0.0.1:55434:5432 -d postgres:15-alpine
export DATABASE_URL=postgresql://postgres:local-habitat-tests@127.0.0.1:55434/captivia_habitats_test
export JWT_SECRET=local-habitat-verification-secret
export NODE_ENV=test REDIS_ENABLED=false NOTIFICATIONS_SCHEDULER_ENABLED=false
```

Depuis `backend`, appliquer `npx prisma migrate deploy`, puis lancer :

```sh
npx jest --runInBand --testPathPattern='/src/'
npx jest --runInBand --runTestsByPath test/habitats.e2e-spec.ts
npx ts-node scripts/seed-habitat-browser-local.ts
npm run build
CORS_ORIGIN=http://localhost:4318 PORT=3001 node dist/src/main.js
```

Le générateur de fixtures refuse une autre base, un autre port ou un autre secret.
Il écrit des jetons de test temporaires dans `/tmp/captivia-habitat-browser-users.json`
avec les permissions `0600`, sans les afficher.

Depuis `frontend`, utiliser l’API locale `http://localhost:3001`, lancer les tests unitaires,
compiler, puis démarrer le serveur sur `localhost:4318` :

```sh
npm test -- --runInBand
npm run build
npx next start -H localhost -p 4318
```

Dans un autre terminal du frontend, avec les navigateurs Playwright et leurs dépendances
installés sur la machine :

```sh
node scripts/check-habitat-premium-local.mjs
node scripts/check-habitats-local.mjs
node scripts/check-habitats-webkit-local.mjs
```

Captures et exports de contrôle : `/tmp/captivia-habitat-browser-results/`.
Arrêter ensuite les deux serveurs de test et uniquement le conteneur
`captivia-habitats-verify`, puis supprimer le fichier temporaire de jetons.

La commande globale `npm test` du backend embarque aussi les anciennes suites E2E.
Son lancement sans variables a produit des erreurs de configuration (base/secret absents) ;
les résultats ci-dessus distinguent les unités et la nouvelle suite isolée, qui ont été
relancées avec leur configuration appropriée. Ce contrôle ne certifie pas les anciennes
suites E2E ni des appareils Android/iPhone physiques.
