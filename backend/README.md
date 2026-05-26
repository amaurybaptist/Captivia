# Captivia Backend API

API RESTful pour le projet Captivia - une application de gestion et de découverte d'espèces animales.

## Architecture

Le backend est construit avec NestJS et suit une architecture modulaire propre avec séparation des responsabilités :

```
src/
├── dto/                 # Data Transfer Objects pour la validation
│   └── species.dto.ts
├── external/            # Services d'intégration API externes
│   └── gbif.service.ts
├── prisma/              # Module Prisma pour l'accès base de données
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── repositories/        # Repositories pour l'accès aux données
│   └── species.repository.ts
├── species/             # Module principal pour les espèces
│   ├── species.controller.ts
│   ├── species.module.ts
│   └── species.service.ts
└── app.module.ts        # Module racine
```

## Caractéristiques

- **Caching intelligent** : Données stockées localement via PostgreSQL pour réduire les appels API externes
- **Architecture Repository** : Séparation claire entre les données et la logique métier
- **Validation des données** : Utilisation de DTOs avec class-validator
- **Intégration GBIF** : Appels API avec gestion des erreurs et retry automatique
- **Modulaire** : Code organisé et maintenable

## Installation

```bash
npm install
```

## Configuration

Créez un fichier `.env` basé sur `.env.example` :

```bash
cp .env.example .env
```

Configuration requise :
- DATABASE_URL : URL de connexion PostgreSQL
- PORT : Port du serveur (défaut : 3000)

## Base de données

Utilisez Prisma pour gérer la base de données :

```bash
# Génération du client Prisma
npx prisma generate

# Création des tables
npx prisma db push

# Mise à jour des migrations
npx prisma migrate dev
```

## Exécution

```bash
# Développement (watch mode)
npm run start:dev

# Production
npm run start:prod

# Tests
npm run test
npm run test:e2e
npm run test:cov
```

## API Endpoints

### Espèces

- `GET /species/search?q=query&limit=20&offset=0` - Recherche d'espèces
- `GET /species/:id` - Détails de l'espèce
- `GET /species/:id/vernacular` - Noms vernaculaires
- `GET /species/:id/iucn` - Statut IUCN
- `GET /species/:id/distributions` - Données de distribution
- `GET /species/:id/media` - Médias (photos)
- `GET /species/:id/metrics` - Métriques
- `GET /species/:id/occurrences/count` - Comptage des occurrences

## Modules

### SpeciesModule
Gère les opérations sur les espèces, incluant la recherche, les détails, les médias, etc.

### PrismaModule
Module global pour l'accès à la base de données PostgreSQL via Prisma.

### GbifService
Service pour l'intégration avec l'API GBIF (Global Biodiversity Information Facility).

## Technologies

- NestJS
- Prisma ORM
- PostgreSQL
- Axios
- class-validator
- Swagger/OpenAPI

## Développement

Voir [DEVELOPMENT.md](../DEVELOPMENT.md) pour plus de détails sur le développement.