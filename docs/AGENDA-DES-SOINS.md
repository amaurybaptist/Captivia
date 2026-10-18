# Agenda des soins — calendrier interactif

Les modifications restent dans le dépôt local. Aucune CI, fusion, publication ou
modification de la base de production n’a été déclenchée.

## Parcours

- `/agenda` et `/fr/agenda` : nouvel accès « Agenda » dans les navigations ordinateur
  et mobile. Le suivi des rappels existant propose aussi un lien vers le calendrier.
- Calendrier de six semaines, du lundi au dimanche, vue mois ou jour, flèches de
  navigation, choix direct du mois, accès à une date et retour à aujourd’hui.
- Indicateur du jour courant selon le fuseau du compte, nombre de soins dans chaque
  case et aperçu des soins sur ordinateur. Sur téléphone, les cases restent compactes
  et une sélection conduit au détail de la journée.
- Filtres par animal réellement enregistré et type de soin ; panneau du jour avec
  horaires, animal et catégorie. Navigation au clavier avec les flèches dans la grille.
- Cliquer sur un soin ouvre son éditeur. Le formulaire sauvegarde les **données
  existantes** de la fiche de l’animal, sans créer une copie indépendante.
- Une routine récurrente s’édite pour toute sa série, avec une explication dans le
  formulaire. Les jours multiples et le 31 mensuel sont conservés lorsqu’on modifie
  uniquement le nom ou l’heure. Un soin ponctuel peut être créé pour le jour sélectionné.
- Les rendez-vous peuvent être créés, déplacés, marqués effectués ou annulés depuis
  le formulaire. Les rappels de vaccins et les dates des traitements existants sont
  modifiables ; les doses et les horaires du moteur de traitements restent conservés.
- Une erreur d’enregistrement laisse le formulaire ouvert. Les doubles envois sont
  bloqués pendant l’écriture. Les données d’un ancien compte ne restent pas affichées
  après un changement de session.
- Interface française, thèmes clair/sombre, adaptations téléphone/tablette/ordinateur,
  préférence de réduction des animations et formulaire modal avec gestion du focus.

L’édition détaillée de plusieurs horaires personnalisés reste disponible dans la
fiche de l’animal. L’agenda ne fournit pas de recommandation de posologie.

## API et cohérence

`GET /users/me/care-agenda?from=AAAA-MM-JJ&to=AAAA-MM-JJ&animalId=UUID`

- JWT obligatoire, données filtrées par le propriétaire en base ; un animal d’un autre
  compte est refusé. Aucune donnée clinique Premium n’est retournée à un compte gratuit.
  Les routines restent accessibles selon les droits déjà présents dans l’application.
- Calcul en lecture seule à partir de `Routine`, `Medication`, `VetAppointment` et
  `Vaccination`. Réutilisation du moteur de récurrence des notifications, avec le fuseau
  `NotificationPreference.timeZone` (Europe/Brussels par défaut).
- Les rendez-vous apparaissent à leur vraie date et heure ; les vaccins à la date de
  leur prochain rappel. Les rendez-vous annulés et les routines inactives sont exclus.
- Aucune génération ni réinitialisation d’événements de notification lors de la
  consultation d’un mois futur. Les états des rappels existants sont conservés.
- Consultation limitée à 62 jours par requête, 42 pour la grille. Au-delà de 5 000
  occurrences, un avertissement demande d’affiner par animal. Les réponses et requêtes
  privées désactivent le cache.
- Les écritures réutilisent les routes des routines et du carnet de santé avec leurs
  contrôles de propriété et de Premium. Aucune nouvelle table ou migration nécessaire.
- Les dates saisies pour les rendez-vous sont converties dans le fuseau du compte.
  Une heure inexistante au changement d’heure est refusée ; un horaire ambigu inchangé
  conserve son instant d’origine.

## Validation locale — 18 octobre 2026

- 140 tests frontend, dont 16 nouveaux tests du calendrier et de l’éditeur.
- 213 tests unitaires backend.
- 10 tests HTTP de l’agenda sur PostgreSQL isolé : authentification, agrégation,
  conversion de fuseau, propriété, droits Premium, dates et paramètres invalides,
  écriture dans la vraie routine et absence de notifications créées à la consultation.
- Compilations de production et ESLint ciblé réussis.
- Chromium : modification puis relecture d’une routine, filtre par animal, ajout sur
  un jour précis, déplacement et annulation de rendez-vous, février bissextile,
  choix du mois, mode jour et navigation au clavier.
- Chromium et WebKit : largeurs 1440, 1280, 1024, 768, 390 et 320 px, thèmes clair/sombre,
  sélection du jour, absence de débordement et compte gratuit isolé.
- Ces essais mobiles sont des émulations sous Linux, pas des tests sur des téléphones
  Android/iPhone physiques. Les anciennes suites E2E non concernées n’ont pas été certifiées.

## Rejouer les essais

Créer une base jetable distincte :

```sh
docker run --rm --name captivia-agenda-verify -e POSTGRES_PASSWORD=local-agenda-tests -e POSTGRES_DB=captivia_agenda_test -p 127.0.0.1:55435:5432 -d postgres:15-alpine
export DATABASE_URL=postgresql://postgres:local-agenda-tests@127.0.0.1:55435/captivia_agenda_test
export JWT_SECRET=local-agenda-verification-secret
export NODE_ENV=test REDIS_ENABLED=false NOTIFICATIONS_SCHEDULER_ENABLED=false
```

Depuis `backend` :

```sh
npx prisma migrate deploy
npx jest --runInBand --runTestsByPath test/care-agenda.e2e-spec.ts
npx ts-node scripts/seed-agenda-browser-local.ts
npm run build
CORS_ORIGIN=http://localhost:4318 PORT=3001 node dist/src/main.js
```

Les fixtures refusent une autre base ou un autre secret. Leurs jetons sont écrits
uniquement dans `/tmp/captivia-agenda-browser-users.json`, permissions 0600.

Depuis `frontend`, dans un autre terminal :

```sh
npm test -- --runInBand
npm run build
npx next start -H localhost -p 4318
```

Puis avec les navigateurs Playwright installés :

```sh
node scripts/check-agenda-local.mjs
AGENDA_BROWSER=webkit AGENDA_SMOKE=1 node scripts/check-agenda-local.mjs
```

Le contrôle complet modifie les fixtures : les recréer avant de rejouer ce contrôle.
Captures : `/tmp/captivia-agenda-browser-results/`. Arrêter ensuite uniquement les
serveurs et le conteneur de test, puis supprimer le fichier temporaire de jetons.
