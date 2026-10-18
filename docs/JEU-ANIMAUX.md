# Jeu de connaissances sur les animaux

La page `/fr/jeu` est accessible sans compte, depuis la navigation de bureau et le menu mobile. Elle est distincte du guide Premium. Le jeu, les questions, les options, les explications, les anecdotes, les légendes des images et les métadonnées suivent les six langues de l’application : français, anglais, allemand, espagnol, italien et portugais. Le changement de langue ouvre une nouvelle partie pour éviter de mélanger les textes ou les réponses en cours.

## Contenu

Six banques locales de 200 questions, chacune répartie entre les niveaux facile, moyen et difficile (au moins 40 questions par niveau) : Oiseaux, Reptiles, Insectes, Poissons, Mammifères et Insolite. La dernière comprend notamment amphibiens, arachnides et invertébrés marins. Chaque question comporte quatre choix, une seule réponse correcte, une explication portant sur le sujet demandé et un fait complémentaire sur un autre aspect du même animal. Les niveaux sont éditoriaux : les questions difficiles privilégient des mécanismes ou des distinctions précises, avec des distracteurs plausibles. Les parties libres fonctionnent sans compte ni service de traduction externe. Les parties classées nécessitent un compte et le backend.

Les banques JSON sont dans `frontend/src/lib/quiz/data/`. Les indices `answer` désignent la bonne option **dans l’ordre du fichier**. Le moteur mélange les choix en conservant cet indice. Lors d’une modification éditoriale, contrôler ensemble question, options, indice, explication et « Saviez-vous ? ». Un test de schéma ne constitue pas une validation scientifique : toute nouvelle question doit aussi être relue pour son exactitude, son ambiguïté et les répétitions de sens.

## Images des animaux

Chaque ID de question possède une association dans `data/*-image-subjects.json` : sujet, requête scientifique et légende. Une question sur une espèce précise utilise cette espèce ; pour un groupe général, la légende indique l’espèce représentative. Plusieurs questions concernant le même animal peuvent partager une image. Les questions ne nécessitent pas de reconnaître une photo pour répondre.

Les images sont livrées localement sous `frontend/public/quiz/images/`. Les licences et les auteurs sont conservés dans `frontend/src/lib/quiz/image-assets.json`. Les images retenues ont une licence CC BY, CC BY-SA, CC0, ou une déclaration explicite de domaine public. La source, le titre, l’auteur et le lien vers les conditions sont accessibles dans le jeu. Les illustrations scientifiques sont identifiées comme telles. Les photographies ne sont pas remplacées par une autre espèce en cas d’échec de chargement : le quiz affiche un message et reste utilisable.

La livraison comprend 629 images distinctes pour les 1 200 questions. Les fichiers ont été contrôlés par empreinte SHA-256 et décodage, avec vérification des associations scientifiques et des preuves de provenance. Les crédits restent accessibles avant la réponse ; la légende donnant le nom de l’animal apparaît après la réponse.

Le collecteur `scripts/fetch-quiz-images.py` utilise les images des articles Wikipedia correspondant aux taxons, puis vérifie les métadonnées du fichier sur Wikimedia Commons. Les requêtes sont regroupées, les délais `Retry-After` respectés et le proxy/TLS de l’environnement conservé. La recherche de secours exige le nom scientifique complet, et non des mots séparés : cette distinction évite notamment de confondre *Gekko gecko* et *Gekko chinensis*. Une validation humaine reste nécessaire pour les correspondances et les synonymes.

Après une modification du manifeste ou des associations, reconstruire les petits catalogues chargés à la demande :

```sh
node scripts/build-quiz-images.mjs
python scripts/test_quiz_image_sources.py
```

La première commande refuse de livrer un catalogue incomplet : elle vérifie les 1 200 associations, les licences, les fichiers locaux et leurs empreintes SHA-256. Son option `--allow-missing` sert uniquement aux étapes de développement et ne doit pas être utilisée pour la validation finale. Le manifeste de provenance complet ne fait pas partie du JavaScript initial ; seul le catalogue du thème choisi est chargé au démarrage d’une partie. Les fichiers image sont chargés pour la question affichée.

Les liens « Pour aller plus loin » conduisent aux pages générales d’Animal Diversity Web, base naturaliste de l’Université du Michigan. Ils permettent d’approfondir un thème et ne constituent pas des références précises pour chaque assertion. Les questions sont rédigées pour le jeu, sans reproduire de textes d’encyclopédies. Les réponses ne remplacent pas des recommandations vétérinaires ou des fiches d’entretien propres à chaque espèce.

## Traductions

Les cinq traductions de chaque banque sont dans `frontend/src/lib/quiz/data/translations/<locale>/`. Les indices des réponses, les catégories et les niveaux proviennent toujours de la banque française commune ; les choix traduits conservent leur ordre canonique avant leur mélange à l’écran. La langue et le thème choisis sont chargés à la demande. Une traduction manquante provoque une erreur de chargement explicite, sans afficher discrètement du français.

La préparation a utilisé une traduction automatique du contenu éditorial public, suivie d’une relecture et de corrections zoologiques par catégorie dans les cinq langues. Des noms ambigus et des termes anatomiques ont notamment été corrigés. Ce contrôle ne remplace pas une révision éditoriale native exhaustive. Aucun texte de compte utilisateur n’est envoyé au traducteur. Les crédits originaux, noms d’auteurs, titres de fichiers et licences restent dans leur forme d’origine.

`python scripts/check-quiz-content.py` vérifie hors ligne la fraîcheur des traductions par SHA-256 de leur source française, les associations, les choix et la répartition des niveaux, puis génère les petits compteurs de difficulté. `scripts/translate-quiz.py` est un outil éditorial facultatif avec accès réseau et cache dans `/tmp`, jamais un service appelé par l’application. Il conserve les banques à jour et leurs corrections manuelles. Une banque devenue obsolète est refusée par défaut ; `--refresh` régénère volontairement cette banque et nécessite de reprendre les corrections éditoriales avant livraison.

## Règles

- **Découverte** : vingt questions tirées sans répétition, aucune limite de temps.
- **Aléatoire** : mélange des six banques. Chaque groupe de six questions comprend un représentant de chaque thème, dans un ordre mélangé. Une partie découverte explore donc les six catégories, en respectant le niveau choisi.
- **Chronomètre** : départ à 30, 60 ou 90 secondes, au choix. Chaque bonne réponse ajoute exactement cinq secondes ; une mauvaise réponse n’ajoute pas de temps. La période de lecture des explications est suspendue. Le bouton « Question suivante » relance le temps restant.
- Le chronomètre utilise une échéance basée sur `performance.now()`. Une réponse donnée à l’échéance ou après est refusée, même si le rafraîchissement visuel a été retardé. Une double activation ne compte jamais deux réponses ou deux bonus.
- Aucune question n’est répétée dans une partie. La partie s’arrête aussi lorsque la banque est épuisée. La dernière question sans réponse est expliquée à la fin du temps sans compter comme une tentative.
- Le bilan conserve les explications de toutes les questions jouées. Les records sont enregistrés uniquement sur l’appareil, séparément par thème, difficulté, mode et durée. Le jeu continue si le stockage est indisponible. La nouvelle version des records utilise des clés distinctes des anciennes parties de dix questions. Ces records ne modifient ni le grade ni l’abonnement du compte.

Le chien est un SVG original, animé brièvement après la réponse. Les états correct et incorrect disposent aussi de textes explicites et d’icônes. La réduction des animations est respectée. Les banques sont chargées à la demande, uniquement au démarrage d’une partie.

## Classement général et future communauté

Le classement général est implémenté pour les parties Découverte de **20 questions**, avec inscription volontaire avant chaque partie. Les visiteurs peuvent jouer librement. Le chronomètre reste un entraînement non classé, pour comparer des parties de longueur identique. Le tableau sélectionne la catégorie et la difficulté choisies, conserve le meilleur score par compte, affiche les 50 premiers et attribue le même rang aux scores égaux. Les langues partagent le même classement pour une sélection donnée.

Le serveur choisit les identifiants, contrôle chaque réponse par son index d’origine et calcule le score. Le client attend la confirmation avant d’afficher la correction ; une erreur réseau permet de reprendre le même choix sans recompter la réponse. Les réponses sont vérifiées dans l’ordre, une partie expire après deux heures, et un verrou PostgreSQL rend les nouvelles tentatives concurrentes idempotentes. Le tableau public expose un pseudonyme HMAC, jamais l’adresse e-mail ni l’identifiant du compte. Les réponses restent des contenus éducatifs téléchargeables : ce mécanisme contrôle la persistance des scores, sans prétendre empêcher toute consultation des réponses.

API : `POST /quiz/runs`, `POST /quiz/runs/:id/answers` (authentifiés), `GET /quiz/leaderboard?category=all&difficulty=medium` (public). La copie compacte des réponses backend est générée par `node scripts/generate-quiz-bank.cjs` depuis `backend/`. La migration `20261018100000_quiz_leaderboard` doit être appliquée lors du déploiement autorisé ; elle a été testée uniquement sur une base locale jetable. Aucune base existante n’a été migrée pour ce travail.

L’onglet **Amis** présente son état à venir, sans personnes ni scores fictifs. Son activation dépendra des profils communautaires et de relations d’amitié acceptées, vérifiées côté serveur. Elle réutilisera les parties classées, le filtrage catégorie/niveau et les pseudonymes/profils, avec visibilité réservée aux amis autorisés. Les records locaux ne seront pas importés comme des résultats vérifiés.

## Vérifications locales

Depuis `frontend/` :

```sh
npm test -- --runInBand
./node_modules/.bin/eslint src/lib/quiz src/components/quiz 'src/app/[locale]/jeu/page.tsx' src/components/AppHeader.tsx
npm run build
./node_modules/.bin/next start -H localhost -p 4318
```

Dans un autre terminal :

```sh
QUIZ_BASE_URL=http://localhost:4318 node scripts/check-quiz-local.mjs
QUIZ_BROWSER=webkit QUIZ_BASE_URL=http://localhost:4318 node scripts/check-quiz-local.mjs
```

Installer préalablement les navigateurs Playwright et leurs bibliothèques système si nécessaires. `PLAYWRIGHT_BROWSERS_PATH` permet d’utiliser une installation temporaire. Le script refuse les URL autres que la boucle locale et utilise seulement une session factice interceptée pour vérifier la navigation connectée ; aucun compte réel, aucune écriture serveur.

Le script couvre : catégories, six thèmes du mode aléatoire, réponses correctes et incorrectes, images chargées et créditées, chien, bilan, relecture, record, refus du stockage, clavier, appui tactile, temps additionnel, pause de lecture, expiration, thèmes clair/sombre, réduction des animations et largeurs de 320 à 1 920 px. Les captures sont placées dans `/tmp/captivia-quiz-browser-results`. Chromium et WebKit sont des vérifications de navigateurs ; elles ne remplacent pas un essai sur un téléphone Android ou un iPhone physique.

Ces vérifications sont locales. Les changements ne doivent pas être poussés, fusionnés ou déployés avant l’accord de l’utilisateur ; aucune CI n’est déclenchée par ce travail.

Dernière validation locale : 205 tests frontend, 220 tests unitaires backend (dont 7 pour le classement) et 11 tests du collecteur réussis. Les compilations frontend/backend passent. Les parcours Chromium et WebKit couvrent les six langues et les trois niveaux, les images, les appuis tactiles et les dimensions de 320 à 1 920 px. Le test API avec PostgreSQL réel vérifie les réponses concurrentes, la confidentialité, les égalités, la sélection et l’expiration ; le parcours classé de 20 réponses est aussi vérifié depuis le navigateur, avec une erreur réseau suivie d’une reprise.

## Rejouer les tests du classement en isolation

Utiliser exclusivement une base PostgreSQL jetable locale, sur `127.0.0.1:55439`, nommée `captivia_quiz_test`. Les scripts refusent les autres destinations. Ne jamais leur fournir une base existante. Appliquer les migrations à cette base avec `DATABASE_URL` défini pour cette commande, puis lancer le backend compilé sur le port 4319 avec `NODE_ENV=test`, `NOTIFICATIONS_SCHEDULER_ENABLED=false`, `REDIS_ENABLED=false`, un `JWT_SECRET` de test et `CORS_ORIGIN=http://localhost:4318`.

Depuis `backend/`, avec `QUIZ_TEST_DATABASE_URL` pointant explicitement vers cette base :

```sh
node scripts/check-quiz-api-local.mjs
node scripts/check-quiz-ranked-browser-local.mjs
QUIZ_BROWSER=webkit node scripts/check-quiz-ranked-browser-local.mjs
```

Le parcours navigateur nécessite aussi le frontend compilé sur `localhost:4318` et les navigateurs Playwright installés pour le frontend. Il redirige les appels quiz et profil vers le backend local de test. Les scripts créent leurs propres comptes de test puis les suppriment, avec leurs parties. Exécuter les deux parcours navigateur successivement sur une base vide pour garder leurs assertions de classement indépendantes. Arrêter les serveurs et retirer uniquement le conteneur de test créé pour cette vérification après usage.

## Nouveau jeu : reconnaître l’animal sur une photo

Le sélecteur en haut de l’onglet Jeu ouvre soit le quiz connaissances, soit le défi photo. Ce second jeu comporte **200 espèces distinctes et 200 photographies distinctes** tirées de la photothèque locale créditée. La sélection privilégie des animaux moins familiers tout en conservant quelques silhouettes accessibles pour débuter : saola, chat pêcheur, ménure, tortue mata mata, poisson-fantôme arlequin, cécilie, etc. Les photos ont été examinées en planches : plusieurs spécimens mal cadrés, un crâne et des illustrations ont été exclus du catalogue de ce jeu.

Répartition éditoriale : **59 faciles, 79 moyens, 62 difficiles**. Une partie tire 20 animaux sans répétition dans le niveau choisi. Les choix faciles proviennent de grands groupes différents; les choix moyens restent dans le même grand groupe; les choix difficiles privilégient des silhouettes apparentées lorsqu’elles sont disponibles dans le catalogue. Les quatre réponses et leur ordre sont mélangés. Le niveau est une intention pédagogique, pas une mesure issue de statistiques de joueurs.

Après chaque réponse, le jeu révèle le nom courant, le nom scientifique, des caractéristiques à observer et un « Saviez-vous ? ». Les anecdotes ont été relues par comparaison avec les anciennes anecdotes associées au même taxon; le contrôle automatique empêche une reprise textuelle, sans prétendre prouver à lui seul une différence de sens. Les liens vers les 200 articles d’espèces ont été contrôlés, mais restent des références générales pour approfondir, pas des citations précises pour chaque phrase.

Les noms, descriptions, anecdotes, métadonnées et commandes sont disponibles dans les six langues. La préparation automatique a été suivie de corrections de noms et de contresens, notamment des noms pris pour des plantes ou des objets. Les fichiers de langue sont le contenu éditorial de référence; ne pas écraser leurs corrections sans revue.

Les images sont affichées sans recadrage forcé, avec un agrandissement modal accessible au clavier et au toucher. Les réponses restent désactivées tant que la photo n’a pas chargé; une erreur permet de la recharger sans compter une réponse. L’auteur et la licence restent visibles avant de répondre. Le nom scientifique, le titre du fichier et le lien original ne sont dévoilés qu’après la réponse pour éviter de livrer l’identification dans la légende.

Les records du défi photo sont locaux et séparés par niveau (`captivia.photoquiz.v1`); ils ne sont pas envoyés au classement général du quiz connaissances. Le bilan permet de relire les 20 corrections et anecdotes. Ce jeu ne nécessite ni compte ni nouvel endpoint backend.

Données : `frontend/src/lib/quiz/photo/animals.json`, `images.json`, `translations/<locale>.json` et `locales/<locale>.json`. Les images elles-mêmes restent dans `frontend/public/quiz/images/`, sans duplication des fichiers. Après une modification du contenu, utiliser :

```sh
cd frontend
python scripts/check-photo-quiz.py
npm test -- --runInBand
npm run build
```

Le contrôle hors ligne vérifie les espèces uniques, les 200 associations d’images, les fichiers et SHA-256, les crédits, les distracteurs, les six langues et leurs empreintes de source. Les caractéristiques visibles et l’exactitude des anecdotes nécessitent toujours une relecture éditoriale.

Avec le frontend compilé sur `localhost:4318`, les parcours suivants vérifient une partie de 20 réponses, les six langues et les trois niveaux, l’agrandissement et sa fermeture au clavier, les erreurs d’image, les records et la relecture, le toucher, le thème sombre et les largeurs de 320 à 1 440 px :

```sh
node scripts/check-photo-quiz-local.mjs
QUIZ_BROWSER=webkit node scripts/check-photo-quiz-local.mjs
```

Les scripts refusent les hôtes distants et interceptent le classement public initial avec un tableau vide; aucun compte ni résultat serveur n’est créé par ces parcours photo. Aucune CI ni publication n’est autorisée sans nouveau feu vert de l’utilisateur.
