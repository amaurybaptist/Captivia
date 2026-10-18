# Notifications et rappels

Les rappels de l’application et les envois partagent les mêmes occurrences persistées.
Une lecture, un rafraîchissement ou un redémarrage conserve les réalisations, les points et les suppressions. Les nouvelles routines sont ajoutées sans effacer celles déjà traitées.

## Configuration serveur

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` : paire Web Push P-256 valide. Générer localement avec `node -e "console.log(require('web-push').generateVAPIDKeys())"` depuis `backend/`, puis enregistrer les valeurs dans les secrets de l’hébergement. Ne pas les commiter. La clé publique est fournie aux utilisateurs authentifiés par `/users/me/notification-capabilities`.
- `VAPID_SUBJECT` : contact `mailto:` ou URL HTTPS du responsable.
- `MAIL_HOST`, `MAIL_PORT` (587 par défaut), `MAIL_FROM`, et si nécessaire `MAIL_USER`/`MAIL_PASS` : serveur SMTP. `MAIL_SECURE=true` pour le TLS implicite sur 465. En production, STARTTLS est exigé sur un transport non implicitement TLS; ne désactiver `MAIL_REQUIRE_TLS` que pour un relais local de confiance.
- `NOTIFICATIONS_SCHEDULER_ENABLED=false` permet de mettre les envois automatiques en pause. Sinon un passage se déroule chaque minute. Le worker est toujours désactivé sous Jest (`NODE_ENV=test`).

Un canal manquant est signalé comme indisponible et ne produit aucun faux résultat « envoyé ». Le bouton de test envoie uniquement à l’utilisateur connecté selon les canaux enregistrés. Les tests du dépôt utilisent des destinataires `.test`, des transports contrôlés et un serveur SMTP local; ils n’envoient rien à des personnes réelles.

## Activation sur un appareil

Le site doit être servi en HTTPS (localhost est autorisé pour le développement). Dans Paramètres → Notifications, l’utilisateur clique pour autoriser le navigateur. L’activation enregistre `/sw.js` et un abonnement PushManager associé au compte connecté. Une simple permission navigateur ne suffit pas à afficher l’état actif. La déconnexion désabonne ce navigateur; un abonnement expiré est retiré après une réponse 404/410 du fournisseur.

Sur iPhone/iPad, ouvrir la web app ajoutée à l’écran d’accueil avec une version d’iOS compatible Web Push (16.4 ou ultérieure). Les autres canaux et les rappels dans l’application restent disponibles si le navigateur ne prend pas en charge Web Push. Le dépôt actuel est une application web/PWA; il ne contient pas d’intégration native APNs/FCM indépendante du navigateur.

## Horaires et fiabilité

Le fuseau IANA choisi est enregistré avec les préférences. Le défaut historique est `Europe/Brussels`. Une récurrence quotidienne conserve son heure locale lors des changements d’heure. Une heure inexistante au printemps est déplacée à la première heure correspondante après le saut; une récurrence horaire suit les heures réellement écoulées. Les minutes sont conservées et les intervalles horaires traversent minuit. Les intervalles de deux/trois jours ont une date d’ancrage. Un rappel mensuel du 31 utilise le dernier jour d’un mois plus court.

Le worker respecte les types désactivés (y compris les anciennes clés techniques), les canaux et la fenêtre de réception. Il rattrape une heure d’interruption. Les rappels plus anciens restent dans la liste sans déclencher une rafale d’envois au redémarrage. Un report utilise le délai configuré (5 à 120 minutes) et une nouvelle version de livraison.

Chaque occurrence a une clé unique en base. Chaque appareil/canal et chaque report possède aussi une livraison unique avec un bail partagé entre workers, jusqu’à cinq tentatives et un délai croissant. Un appareil ayant déjà reçu le rappel n’est pas renotifié lors d’un nouvel essai sur un autre appareil. Une rupture réseau après l’acceptation par un fournisseur peut toutefois empêcher de savoir si l’envoi a été accepté; aucun système push/SMTP ne garantit une réception exactement une fois dans ce cas.

La migration transforme les anciens horaires UTC muraux en heures belges et conserve les statuts. Elle fusionne les anciennes occurrences strictement identiques en gardant d’abord celles marquées faites. Elle ne recalcule pas rétroactivement les points déjà gagnés avant cette correction.

## Vérification locale

Appliquer les migrations dans une base PostgreSQL de test isolée, puis exécuter les tests de notifications :

```sh
npm --prefix backend test -- --runInBand src/notifications test/notifications.e2e-spec.ts
npm --prefix frontend test -- --runInBand src/lib/__tests__/push-notifications.test.ts src/lib/__tests__/notification-worker.test.ts src/app/__tests__/notification-settings.test.tsx src/app/__tests__/notification-reminders.test.tsx
```

La base est choisie par `DATABASE_URL`; ne jamais utiliser une base de production pour ces tests. Les tests couvrent les changements d’heure, les fréquences, la concurrence entre workers, les points, les suppressions, les reports, les échecs/abonnements expirés, l’activation navigateur et une livraison SMTP réellement acceptée par un serveur local. Une validation de réception sur appareil physique avec la configuration de l’hébergement reste nécessaire avant une mise en service.

Pour vérifier l’interface dans Chromium sur ordinateur et sur 320 px, démarrer un serveur frontend local sur `localhost:4317` après le build, puis lancer `npm --prefix frontend run test:notifications:local`. Le script nécessite le Chromium de Playwright (`playwright install chromium`); `NOTIFICATION_TEST_URL` permet de changer l’adresse locale. L’API, la permission et PushManager sont simulés pour empêcher tout envoi externe; le service worker, les formulaires, le rechargement et les fichiers d’installation sont réellement exécutés dans le navigateur. Les captures sont enregistrées dans le répertoire temporaire du système. Ce contrôle ne prétend pas vérifier la réception d’une notification par le système d’exploitation.

Validation locale du 17 octobre 2026 : 213 tests unitaires backend, 14 tests d’intégration des notifications en PostgreSQL isolé, 12 tests API existants (routines, traitements et vaccins) et 50 tests frontend réussis. Builds frontend/backend, TypeScript, lint des fichiers concernés et validation Prisma réussis. Migration contrôlée sur une base vierge et sur des anciennes occurrences en doublon. Le contrôle Chromium est passé en 1280 et 320 px avec les simulations décrites ci-dessus. Aucune CI ni publication déclenchée.
