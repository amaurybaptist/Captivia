---
name: Captivia priorités utilisateur
overview: "Plan détaillé pour Captivia : app de gestion complète et user-friendly. Phase 0 = base de données (seed). Priorité 1 = Mes animaux. Priorité 2 = Paramètres. Priorité 3 = Fiche espèce (guide de soins)."
todos: []
isProject: false
---

# Plan Captivia – App de gestion complète et user-friendly

## Sommaire

1. [Vision et principes](#1-vision-et-principes)
2. [Navigation et parcours utilisateur](#2-navigation-et-parcours-utilisateur)
3. [Phase 0 – Remplir la base de données (seed)](#3-phase-0--remplir-la-base-de-données-seed)
4. [Priorité 1 – Mes animaux](#4-priorité-1--mes-animaux)
5. [Priorité 2 – Paramètres](#5-priorité-2--paramètres)
6. [Priorité 3 – Fiche espèce](#6-priorité-3--fiche-espèce)
7. [Synthèse des livrables et ordre d’exécution](#7-synthèse-des-livrables-et-ordre-dexécution)

---

## 1. Vision et principes

### 1.1 Vision produit

**Captivia** est une application de **gestion complète** des animaux (NAC, reptiles, petits mammifères) qui reste **simple et agréable** à utiliser.

- **Complète** : un seul endroit pour gérer ses animaux, consulter les conseils par espèce (environnement, nourriture, matériel, santé), gérer les rappels et le compte.
- **User-friendly** : navigation évidente, formulaires courts, messages clairs, états vides utiles, pas de jargon.

Objectif utilisateur : en quelques clics, **ajouter un animal**, **voir les conseils personnalisés**, **consulter le guide espèce** (depuis l’accueil ou Mes animaux), et **gérer compte et notifications**.

### 1.2 Principes UX


| Principe            | Application                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| **Clarté**          | Titres et sous-titres explicites ; une idée par bloc ; libellés en français courant.                 |
| **Parcours courts** | Un formulaire pour ajouter un animal ; un hub pour Paramètres (Compte + Notifications).              |
| **Feedback**        | Loading sur chaque action ; toast ou message après création/modification ; erreurs avec explication. |
| **Empty states**    | Jamais de page vide : « Aucun animal » + bouton « Ajouter mon premier animal », etc.                 |
| **Cohérence**       | Même header/nav ; mêmes boutons (primaire = action, secondaire = annuler) ; même style de cartes.    |
| **Accessibilité**   | Contraste, champs labellisés, focus visible, messages d’erreur associés aux champs.                  |


---

## 2. Navigation et parcours utilisateur

### 2.1 Structure de l’app

- **Header** (toutes les pages) : logo Captivia, lien Accueil, lien Mes animaux (si connecté), lien Paramètres (si connecté), sélecteur de langue, compte / Connexion.
- **Accueil** : recherche d’espèce → résultats → clic → **Fiche espèce** (guide complet).
- **Mes animaux** : liste des animaux → clic → **Détail animal** (fiche + conseils + routines) ; bouton « Ajouter un animal ».
- **Paramètres** : hub avec **Compte** (email, mot de passe, langue) et **Notifications** (rappels, horaires).

Liens transverses : depuis la fiche espèce, bouton « Ajouter à Mes animaux » (espèce pré-sélectionnée) ; depuis le détail animal, lien « Voir le guide complet » vers la fiche espèce.

### 2.2 Parcours types

**Premier usage (non connecté)**  
Accueil → recherche (ex. « gecko ») → fiche espèce → lecture environnement, nourriture, santé, matériel → incitation à s’inscrire → inscription → redirection vers Mes animaux (empty state).

**Usage quotidien (connecté)**  
Mes animaux → clic sur un animal → détail (conseils, rappels, lien fiche espèce). Paramètres : modifier compte ou préférences notifications.

**Ajout d’un animal**  
Mes animaux → « Ajouter un animal » → formulaire (nom, espèce autocomplete, date naissance, sexe, notes) → validation → détail de l’animal ou liste + toast « [Nom] a été ajouté ».

---

## 3. Phase 0 – Remplir la base de données (seed)

Sans données en base : l’onglet Matériel est vide, le contenu santé/légal par espèce est vide, et on ne peut pas tester Mes animaux avec un compte. Cette phase est **préalable** au reste.

### 3.1 Fichiers


| Action   | Fichier                  | Détail                                                                                                               |
| -------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Créer    | `backend/prisma/seed.ts` | Script Node/TS qui utilise `PrismaClient` et insère les données ci-dessous.                                          |
| Modifier | `backend/package.json`   | Ajouter dans la racine : `"prisma": { "seed": "ts-node prisma/seed.ts" }` (ou `tsx prisma/seed.ts` selon le projet). |


### 3.2 Données à insérer

#### 3.2.1 RecommendedEquipment (prioritaire)

Pour que l’onglet Matériel affiche des recommandations par espèce (même sans Amazon).

- **Modèle Prisma** : `RecommendedEquipment` (champs : `speciesId`, `category`, `label`, `size`, `searchTerms`, `order`).
- **speciesId** : clés GBIF réelles ou `null` (général). Exemples :
  - Boa constrictor : `2448340`
  - Iguana iguana : `5220648`
  - Eublepharis macularius (gecko léopard) : `5221172`
  - Trachemys scripta (tortue) : `551789`
- **category** : `chauffage`, `uvb`, `substrat`, `alimentation`, `cage`, `gamelle`, `thermostat`, etc.
- **label** : libellé lisible (ex. « Lampe UVB 10.0 », « Câble chauffant », « Substrat coco »).
- **size** : `small`, `medium`, `large` (optionnel).
- **searchTerms** : tableau de mots-clés pour Amazon plus tard (ex. `["lampe uvb reptile", "10.0"]`).
- **order** : entier pour l’ordre d’affichage (0, 1, 2…).

Volume suggéré : 2–3 espèces × 5–8 catégories chacune + 5–10 lignes avec `speciesId: null` (recommandations « tous reptiles »).

#### 3.2.2 SpeciesHealthContent (optionnel)

Pour que l’onglet Santé affiche des maladies avec symptômes.

- **Modèle Prisma** : `SpeciesHealthContent` (champs : `speciesId`, `locale`, `diseases`, `sources`).
- **speciesId** : même clé GBIF que ci-dessus (1–2 espèces).
- **locale** : `fr`.
- **diseases** : JSON array. Chaque élément : `{ name: string, symptoms: string, prevention?: string, whenToConsult?: string }`. Ex. : « Stomatite », « Anorexie », « Parasites internes ».
- **sources** : JSON array. Chaque élément : `{ type: "pubmed" | "lafebervet" | "ivis", url: string, title: string }`.

#### 3.2.3 SpeciesLegislation (optionnel)

Pour que l’onglet Légal affiche des données.

- **Modèle Prisma** : `SpeciesLegislation` (champs : `speciesId`, `country`, `status`, `details`, `sources`).
- **speciesId** : 1–2 espèces (mêmes GBIF).
- **country** : `FR`, `EU` (ou codes ISO).
- **status** : `allowed`, `permit_required`, `prohibited`.
- **details** : JSON avec `citesAppendix`, `euAnnex`, etc.
- **sources** : tableau d’URLs (CITES, EUR-Lex).

#### 3.2.4 User + Animal + NotificationPreference (optionnel)

Pour tester Mes animaux et Paramètres sans créer un compte à la main.

- **User** : 1 enregistrement. `email` (ex. `test@captivia.local`), `passwordHash` = bcrypt hash d’un mot de passe connu (ex. `Test1234!`), `locale`: `fr`.
- **Animal** : 1 enregistrement. `userId` = id du user créé, `speciesId` = une des clés GBIF ci-dessus, `name` (ex. « Rango »), `birthDate`, `sex` optionnels.
- **NotificationPreference** : 1 enregistrement. `userId` = id du user. `types` : JSON ex. `{ nourrissage: true, nettoyage: true, uvb: true, sante: true }`. `schedule` : `{ start: "08:00", end: "22:00" }`. `snooze` : 15.

### 3.3 Commandes

1. PostgreSQL créée, `DATABASE_URL` dans `backend/.env`.
2. `cd backend && npx prisma migrate dev` (ou `npx prisma db push` si pas d’historique de migrations).
3. `cd backend && npx prisma db seed`.

Vérification : `GET /equipment?speciesId=2448340` doit retourner des recommandations. Les fiches espèce pour ces speciesId afficheront matériel (et santé/légal si les données éditoriales ont été insérées).

---

## 4. Priorité 1 – Mes animaux

Objectif : faire de « Mes animaux » le **centre de pilotage** : liste, ajout, détail par animal avec conseils personnalisés et routines.

### 4.1 Liste des animaux

**Fichier** : `frontend/src/app/[locale]/mes-animaux/page.tsx`

- **Vue** : Grille ou liste de cartes. Chaque carte : photo/initiale, nom, espèce (nom lisible), indicateurs (nombre de routines, dernière action).
- **Empty state** : Texte « Vous n’avez pas encore d’animal » + bouton « Ajouter mon premier animal ». Pas de page vide sans explication.
- **Actions** : Bouton « Ajouter un animal » toujours visible. Clic sur une carte → page Détail animal `[locale]/mes-animaux/[id]`.
- **Limite gratuit** : Si non premium et déjà 1 animal : bandeau discret + désactiver ou masquer le bouton d’ajout avec message court.

### 4.2 Formulaire d’ajout d’un animal

**État actuel** : Modal ou page avec placeholder. API backend : `POST /users/me/animals` (existante).

**Champs du formulaire** :


| Champ             | Obligatoire | Détail                                                                                                                                                                                                                  |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom               | Oui         | Placeholder « ex. Rango ».                                                                                                                                                                                              |
| Espèce            | Oui         | **Autocomplete** : l’utilisateur tape (ex. « gecko »), l’app affiche des suggestions (nom vernaculaire + scientifique) via l’API species ; à la sélection, stocker `speciesId` (clé GBIF). Pas de saisie manuelle d’ID. |
| Date de naissance | Non         | Champ date.                                                                                                                                                                                                             |
| Sexe              | Non         | Select ou boutons : Mâle / Femelle / Inconnu.                                                                                                                                                                           |
| Notes             | Non         | Zone de texte courte.                                                                                                                                                                                                   |


**Comportement** : Boutons « Enregistrer » (primaire), « Annuler » (secondaire). Pendant l’envoi : bouton désactivé + indicateur de chargement. Succès : fermer le modal ou rediriger vers le détail de l’animal créé + toast « [Nom] a été ajouté ». Erreur : message sous le formulaire ou toast (ex. « Impossible d’ajouter l’animal. Vérifiez votre connexion. »).

**Lien depuis la fiche espèce** : Sur `species/[id]/page.tsx`, bouton « Ajouter à Mes animaux » (si connecté) qui ouvre le formulaire d’ajout avec l’espèce **pré-sélectionnée** (speciesId et nom scientifique pré-remplis).

### 4.3 Page Détail d’un animal

**Fichier** : `frontend/src/app/[locale]/mes-animaux/[id]/page.tsx` (à créer si absent)

**Contenu** :

- **En-tête** : Nom de l’animal, espèce (nom lisible + lien vers fiche espèce `/species/[speciesId]`), date de naissance, sexe, notes. Bouton « Modifier » (édition des infos de base).
- **Bloc « Conseils pour bien s’en occuper »** :
  - Titre (ex. « Comment prendre soin de [espèce] »).
  - Résumé en 2–4 lignes ou puces (habitat, alimentation, matériel, santé) — texte éditorial par espèce ou extrait des données espèce.
  - Lien « Voir le guide complet » → `/species/[speciesId]`.
- **Routines** : Liste des routines (nourrissage, UVB, nettoyage, etc.) avec prochaine échéance ; bouton « Ajouter une routine » ; lien vers historique si disponible. Empty state : « Aucune routine » + « Créer une routine ».
- **Historique** (optionnel v1) : Dernières actions (date, type, note).

**Navigation** : Retour vers « Mes animaux » (breadcrumb ou bouton).

### 4.4 Implémentation des conseils personnalisés

- **v1** : Afficher le nom de l’espèce (via `api.getSpecies(animal.speciesId)` ou nom stocké) + bloc « Conseils » = résumé court (2–3 lignes par thème) + lien « Voir le guide complet » vers `/species/[speciesId]`. Le résumé peut venir d’un champ éditorial ou d’une première ligne des sections santé/nourriture/matériel.
- **v2 (optionnel)** : Réutiliser les mêmes blocs que la fiche espèce (Environnement, Nourriture, Matériel, Maladies) en lecture seule sur la page Détail animal.

---

## 5. Priorité 2 – Paramètres

Objectif : une **seule entrée « Paramètres »** → hub **Compte** et **Notifications**. Libellés explicites, feedback sur chaque action.

### 5.1 Page hub Paramètres

**Fichier** : `frontend/src/app/[locale]/parametres/page.tsx` (à créer)

- **Contenu** : Deux blocs (ou cartes) cliquables :
  - **Compte** : « Email, mot de passe, langue » → sous-page ou section Compte (voir 5.2).
  - **Notifications** : « Rappels et horaires » → `parametres/notifications/page.tsx` (déjà existante).
- **Navigation** : Lien « Paramètres » dans le header ; breadcrumb « Paramètres > Compte » / « Paramètres > Notifications » sur les sous-pages.

### 5.2 Gestion du compte (Compte)

- **Infos affichées** : Email (lecture seule). Optionnel : « Membre depuis … ».
- **Langue** : Sélecteur (FR, EN, ES, etc.) — frontend (next-intl) et/ou backend (sauvegarder préférence avec feedback « Langue enregistrée »).
- **Changement de mot de passe** (si l’API existe) : Formulaire « Nouveau mot de passe » / « Confirmer » avec validation (longueur, correspondance). Bouton « Modifier le mot de passe ». Succès : toast « Mot de passe modifié ». Erreur : message clair.
- **Déconnexion** : Lien ou bouton « Se déconnecter » bien visible.

### 5.3 Notifications (rappels)

**Fichier existant** : `frontend/src/app/[locale]/parametres/notifications/page.tsx`

- **Améliorations** : Titre clair (« Rappels et notifications »). Explication courte en haut. Sauvegarde avec feedback « Préférences enregistrées ». Si les notifications navigateur ne sont pas autorisées : encart « Autoriser les notifications pour recevoir les rappels » + bouton. Optionnel : activer le service worker pour les push quand le backend est prêt.

---

## 6. Priorité 3 – Fiche espèce

Objectif : depuis l’**accueil** (recherche) ou **Mes animaux** (lien « Voir le guide complet »), la fiche espèce donne **toutes les infos** pour s’occuper de l’animal : environnement, nourriture, matériel, maladies avec symptômes, légal. Lecture claire, disclaimers, CTA « Ajouter à Mes animaux ».

**Fichier principal** : `frontend/src/app/[locale]/species/[id]/page.tsx`

### 6.1 Structure et UX de la fiche

- **En-tête** : Nom scientifique + noms communs, classification, badge IUCN. **Bouton « Ajouter à Mes animaux »** (si connecté) : ouvre le formulaire d’ajout avec cette espèce pré-sélectionnée.
- **Onglets** (déjà en place) : Vue d’ensemble, Santé, Légal, Alimentation, Matériel. Libellés courts et cohérents avec les traductions.
- **Empty states** : Si une section n’a pas de données : « Aucune donnée pour le moment » ou « Données à venir ».
- **Disclaimers** : « Ne remplace pas un avis vétérinaire » (Santé) ; « Indicatif – vérifier localement » (Légal) ; « Lien affilié » sur les produits (Matériel).

### 6.2 Onglet Vue d’ensemble – Environnement / Habitat

- **Objectif** : Répondre à « Où et comment vit cet animal ? » (terrarium, température, humidité, taille, substrat).
- **Source** : Données espèce (GBIF) : habitat, distribution, climat. Déjà partiellement dans l’onglet Overview (classification).
- **À faire** : Ajouter une section **« Environnement / Habitat »** : texte ou cartes (biome, température, humidité, taille d’enclos type) à partir des champs `species` ou d’un endpoint dédié. Si données pauvres : « Données à compléter ».

### 6.3 Onglet Alimentation (Nourriture)

- **État actuel** : Placeholder. Backend : `GET /food/species/:species` (Open Pet Food Facts), `GET /food/search?q=...`.
- **À faire** : Appeler l’API avec le **nom** de l’espèce (ex. `species.canonicalName` ou nom scientifique) : `api.getFoodBySpecies(speciesName)` ou `api.searchFood(speciesName)`. Afficher les produits (nom, composition, nutrition, photo) en cartes ou liste. Titre : « Alimentation recommandée » ; sous-titre optionnel : « Données issues d’Open Pet Food Facts ». Empty state : « Aucun produit référencé pour cette espèce pour le moment ».

### 6.4 Onglet Matériel (équipement)

- **État actuel** : Recommandations + produits (stub Amazon). Backend : taxonomie en base (RecommendedEquipment), Amazon PA non implémenté.
- **À faire** : Garder l’affichage des **recommandations par catégorie** (libellé + produits). Badge « Lien affilié » sur chaque produit ; lien vers la page Transparence en bas. Si pas de produits (Amazon stub) : « Recommandations à venir » ou liste des catégories sans produits.

### 6.5 Onglet Santé – Maladies communes avec symptômes

- **Objectif** : Maladies courantes, **symptômes** repérer, prévention, quand consulter.
- **État actuel** : Disclaimer + articles PubMed ; contenu éditorial `editorial.diseases` non rendu.
- **À faire** : Afficher les **maladies communes** (éditorial) avec pour chacune : **Nom**, **Symptômes** (liste ou paragraphe), **Prévention**, **Quand consulter**. Garder les références PubMed en bas. S’assurer que le backend renvoie `editorial.diseases` avec ces champs (seed ou API health-content). Conserver le disclaimer santé en haut.

### 6.6 Onglet Légal (législation)

- **État actuel** : Données récupérées, affichage = placeholder.
- **À faire** : Afficher les données **CITES / EU** retournées par l’API : statut (autorisé / réglementé / interdit), annexes, liens utiles. Conserver le disclaimer « Indicatif – vérifier localement ».

---

## 7. Synthèse des livrables et ordre d’exécution

### 7.1 Tableau des livrables


| #   | Priorité | Livrable                                                                    | Fichier(s) principal(aux)                                        |
| --- | -------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 0   | Phase 0  | Seed base de données (équipement, optionnel santé/légal/user)               | `backend/prisma/seed.ts`, `backend/package.json`                 |
| 1   | P1       | Liste animaux + empty state + limite gratuit                                | `frontend/src/app/[locale]/mes-animaux/page.tsx`                 |
| 2   | P1       | Formulaire ajout animal (autocomplete espèce, feedback)                     | `mes-animaux/page.tsx` (modal) ou `mes-animaux/nouveau/page.tsx` |
| 3   | P1       | Page Détail animal (infos + conseils + routines)                            | `frontend/src/app/[locale]/mes-animaux/[id]/page.tsx`            |
| 4   | P1       | Bouton « Ajouter à Mes animaux » sur fiche espèce (espèce pré-sélectionnée) | `frontend/src/app/[locale]/species/[id]/page.tsx`                |
| 5   | P2       | Hub Paramètres (Compte + Notifications)                                     | `frontend/src/app/[locale]/parametres/page.tsx`                  |
| 6   | P2       | Section / sous-page Compte (email, langue, mot de passe, déconnexion)       | `parametres/page.tsx` ou `parametres/compte/page.tsx`            |
| 7   | P2       | Notifications (déjà en place, accessible depuis hub)                        | `parametres/notifications/page.tsx`                              |
| 8   | P3       | Fiche espèce – Environnement / Habitat                                      | `species/[id]/page.tsx` (onglet Overview)                        |
| 9   | P3       | Fiche espèce – Nourriture (API + affichage + empty state)                   | `species/[id]/page.tsx` (onglet Food)                            |
| 10  | P3       | Fiche espèce – Maladies + symptômes + disclaimer                            | `species/[id]/page.tsx` (onglet Health)                          |
| 11  | P3       | Fiche espèce – Législation (CITES / EU)                                     | `species/[id]/page.tsx` (onglet Legal)                           |
| 12  | P3       | Fiche espèce – Matériel (recommandations + badge affilié)                   | `species/[id]/page.tsx` (onglet Equipment)                       |


### 7.2 Ordre d’exécution recommandé

1. **Stabiliser le backend** : Démarrer le backend, `.env` (DATABASE_URL, JWT_SECRET), dépendances si besoin.
2. **Phase 0 – Remplir la base de données** : Créer `backend/prisma/seed.ts` (RecommendedEquipment prioritaire, optionnel SpeciesHealthContent, SpeciesLegislation, User/Animal/NotificationPreference). Configurer `prisma.seed` dans `backend/package.json`. Exécuter `npx prisma migrate dev` puis `npx prisma db seed`. Vérifier `GET /equipment?speciesId=2448340`.
3. **Priorité 1 – Mes animaux** : Formulaire ajout animal (autocomplete espèce, feedback) → page Détail animal + conseils personnalisés (lien + résumé) → empty states liste. Bouton « Ajouter à Mes animaux » sur fiche espèce.
4. **Priorité 2 – Paramètres** : Hub Paramètres (Compte + Notifications) → section Compte (email, langue, mot de passe si API, déconnexion). Notifications déjà en place.
5. **Priorité 3 – Fiche espèce** : Environnement (Overview), Nourriture (API + affichage), Maladies (symptômes + éditorial), Législation (CITES/EU), Matériel (déjà partiel).
6. **Cohérence** : Vérifier header/nav sur toutes les pages, feedback (toast/messages), empty states partout.

### 7.3 Prérequis techniques

- **Backend** : Démarré et accessible (URL API configurée dans le frontend).
- **Base de données** : PostgreSQL, schéma appliqué (`prisma migrate`), **seed exécuté** pour données de test.
- **Variables d’environnement** : `DATABASE_URL`, `JWT_SECRET` (obligatoires) ; optionnel : Species+, Open Pet Food Facts, etc.

### 7.4 Cohérence globale (rappel)

- Header identique sur toutes les pages (logo, Accueil, Mes animaux, Paramètres si connecté, langue, compte).
- Boutons : primaire = action, secondaire = annuler ; désactiver + loader pendant les appels API.
- Messages : toast ou message inline après création/modification ; erreurs avec explication.
- Empty states : texte + action (bouton ou lien) sur les listes vides.
- Ton : phrases courtes, français courant, pas de jargon dans l’UI.

