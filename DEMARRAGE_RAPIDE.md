# 🚀 Démarrage Rapide - Captivia

> ⚠️ **Erreur P1001?** Consultez [GUIDE_DEMARRAGE_SIMPLE.md](./GUIDE_DEMARRAGE_SIMPLE.md) pour une solution pas-à-pas!

## Prérequis

- Node.js 18+ et npm
- **Docker Desktop** (doit être lancé et en cours d'exécution)
- Git

### ⚡ Important: Docker Desktop
Avant toute chose, **démarrez Docker Desktop** et attendez qu'il soit complètement opérationnel.
Vérifiez avec: `docker ps` (doit afficher un tableau sans erreur)

## Installation Complète (Première fois)

### 1. Démarrer PostgreSQL

```bash
# Option 1: Utiliser le script (recommandé)
./scripts/start-db.sh

# Option 2: Manuellement avec docker-compose
docker-compose up -d

# Option 3: Si vous avez Docker Desktop récent
docker compose up -d
```

Le script détecte automatiquement la commande disponible.

**Informations de connexion:**
- Host: `localhost`
- Port: `5432`
- Database: `captivia`
- User: `user`
- Password: `password`

### 2. Installer toutes les dépendances

```bash
npm run install:all
```

Cette commande installe les dépendances du projet root, du backend et du frontend.

### 3. Configuration Backend

```bash
cd backend

# Créer le fichier .env (copier depuis .env.example)
cp .env.example .env

# Générer le client Prisma
npx prisma generate

# Créer les tables dans la base de données
npx prisma db push

# (Optionnel) Ajouter des données de test
npx prisma db seed

cd ..
```

### 4. Démarrer l'application

```bash
# Depuis la racine du projet
npm run dev
```

Cette commande démarre:
- **Backend** sur http://localhost:3001 (API)
- **Frontend** sur http://localhost:3000 (Next.js)

## Développement Quotidien

### Démarrer tout

```bash
# 1. Démarrer PostgreSQL (si arrêté)
./scripts/start-db.sh

# 2. Démarrer backend + frontend
npm run dev
```

### Arrêter PostgreSQL

```bash
./scripts/stop-db.sh
```

### Commandes Utiles

```bash
# Backend uniquement
npm run dev:backend

# Frontend uniquement
npm run dev:frontend

# Tests
cd frontend && npm test
cd backend && npm test

# Linter
cd frontend && npm run lint
cd backend && npm run lint

# Build production
cd frontend && npm run build
cd backend && npm run build
```

## Structure du Projet

```
Captivia/
├── backend/           # API NestJS (port 3001)
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/          # App Next.js (port 3000)
│   ├── src/
│   │   ├── app/
│   │   │   └── [locale]/    # Routes i18n
│   │   ├── components/
│   │   └── lib/
│   ├── messages/      # Traductions (fr, en, es, de, it, pt)
│   └── package.json
├── scripts/           # Scripts utilitaires
│   ├── start-db.sh   # Démarrer PostgreSQL
│   └── stop-db.sh    # Arrêter PostgreSQL
└── docker-compose.yml # Configuration PostgreSQL
```

## Langues Supportées

- 🇫🇷 Français (par défaut)
- 🇬🇧 Anglais
- 🇪🇸 Espagnol
- 🇩🇪 Allemand
- 🇮🇹 Italien
- 🇵🇹 Portugais

## URLs de Développement

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Documentation API: http://localhost:3001/api (Swagger)

## Fonctionnalités Principales

### ✅ Phase 0 - Authentification
- Inscription / Connexion
- Gestion de profil
- Support multilingue

### ✅ Phase 1 - Recherche d'Espèces
- Recherche via GBIF
- Fiches détaillées (classification, habitat, conservation)
- Informations de santé (maladies, symptômes, prévention)
- Législation (CITES, réglementation EU)
- Recommandations équipement
- Alimentation (Open Pet Food Facts)

### ✅ Phase 2 - Mes Animaux
- Ajout d'animaux personnels
- Profil détaillé (nom, espèce, date de naissance, photos, notes)
- Routines de soins (nourrissage, nettoyage, UVB, santé)
- Historique des actions

### ✅ Phase 3 - Notifications
- Notifications push Web
- Rappels personnalisables
- Préférences par type d'action
- Plages horaires configurables

## Problèmes Courants

### PostgreSQL ne démarre pas

```bash
# Vérifier si un conteneur existe déjà
docker ps -a | grep captivia

# Supprimer l'ancien conteneur si nécessaire
docker rm -f captivia-postgres

# Redémarrer
./scripts/start-db.sh
```

### Erreur "prisma generate"

```bash
cd backend
rm -rf node_modules
npm install
npx prisma generate
```

### Port déjà utilisé

```bash
# Trouver le processus utilisant le port 3000
lsof -i :3000
# ou
lsof -i :3001

# Tuer le processus (remplacer PID par le numéro affiché)
kill -9 PID
```

## Support

- 📖 Documentation: Voir les fichiers `*.md` à la racine
- 🐛 Bugs corrigés: [FIXES_APPLIED.md](./FIXES_APPLIED.md)
- ✅ Tests: [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)

## Technologies

- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, next-intl
- **Backend**: NestJS 11, Prisma 6, PostgreSQL 15
- **Cache**: Redis (optionnel)
- **APIs**: GBIF, Wikipedia, Wikidata, Open Pet Food Facts

---

**Bon développement! 🦎✨**
