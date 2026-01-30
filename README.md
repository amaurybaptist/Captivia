# Captivia - Guide de la Détention en Captivité

Application web complète pour la gestion et l'information sur la détention d'espèces animales en captivité.

## 🌟 Fonctionnalités

- ✅ **Recherche d'espèces** par nom commun ou scientifique
- ✅ **Fiches détaillées** avec informations taxonomiques
- ✅ **Statut IUCN** avec indicateur de menace
- ✅ **Galerie média** (photos, vidéos)
- ✅ **Distribution géographique**
- ✅ **Mode sombre** intégré
- ✅ **Interface responsive** pour mobile et desktop
- ✅ **Intégration API GBIF** pour les données taxonomiques

## 🏗️ Architecture

### Backend (NestJS)
- API RESTful avec endpoints pour les espèces
- Intégration avec l'API GBIF
- Système de caching avec rate limiting
- Gestion des données taxonomiques

### Frontend (Next.js + React)
- Interface utilisateur moderne et responsive
- Recherche en temps réel
- Affichage détaillé des espèces
- Mode sombre automatique

## 📋 Prérequis

- Node.js 18+ 
- PostgreSQL (optionnel, pour la base de données locale)
- npm ou yarn

## 🚀 Installation

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configurez votre DATABASE_URL dans .env
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📦 Scripts disponibles

### Backend
```bash
npm run start:dev    # Développement
npm run build        # Build production
npm run start:prod   # Production
npm run test         # Tests
```

### Frontend
```bash
npm run dev          # Développement
npm run build        # Build production
npm run start        # Production
npm run lint         # Linting
```

## 🌐 API Endpoints

### Espèces
- `GET /species/search?q=query` - Recherche d'espèces
- `GET /species/:id` - Détails d'une espèce
- `GET /species/:id/vernacular` - Noms vernaculaires
- `GET /species/:id/iucn` - Statut IUCN
- `GET /species/:id/distributions` - Distribution
- `GET /species/:id/media` - Médias
- `GET /species/:id/metrics` - Métriques
- `GET /species/:id/occurrences/count` - Occurrences par pays

## 🎨 Technologies utilisées

### Backend
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Axios
- Rate limiting

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Dark mode natif

## 📊 Base de données

Le projet utilise Prisma avec PostgreSQL pour la persistance des données. Le schéma inclut:

- **Species** - Informations principales des espèces
- **SpeciesDetails** - Informations détaillées
- **Maintenance** - Exigences de maintenance
- **Media** - Galerie média
- **Legal** - Réglementations
- **User** - Utilisateurs et authentification
- **UserSpecies** - Espèces sauvegardées par les utilisateurs

## 🌐 Déploiement

### Vercel (Recommandé)

#### Backend (Vercel Serverless)

1. Créez un nouveau projet sur Vercel
2. Importez le dossier `backend`
3. Configurez les variables d'environnement:
   - `DATABASE_URL` - URL de votre base de données
   - `JWT_SECRET` - Clé secrète pour JWT
   - `PORT` - Port (3000)

#### Frontend (Vercel)

1. Créez un nouveau projet sur Vercel
2. Importez le dossier `frontend`
3. Configurez la variable d'environnement:
   - `NEXT_PUBLIC_API_URL` - URL du backend (ex: https://api.captivia.com)

### Variables d'environnement

```env
# Backend
DATABASE_URL="postgresql://user:password@localhost:5432/captivia"
JWT_SECRET="your-secret-key"
PORT=3000

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

## 📚 Intégration GBIF

Le projet intègre l'API GBIF (Global Biodiversity Information Facility) pour:

- Recherche taxonomique
- Noms communs
- Statut IUCN
- Distribution géographique
- Médias (photos, vidéos)
- Métriques taxonomiques

## 🤝 Contribution

Les contributions sont les bienvenues! Veuillez suivre ces étapes:

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Licence

Ce projet est sous licence MIT.

## 👥 Auteurs

- **Équipe Captivia** - *Travail initial*

## 🙏 Remerciements

- GBIF pour l'API et les données
- NestJS et Next.js pour les frameworks
- Tous les contributeurs

## 📞 Contact

Pour toute question, contactez l'équipe de développement à captivia@example.com

## 🗺️ Roadmap

- [ ] Ajout du module de maintenance
- [ ] Module législation par pays
- [ ] Système d'authentification utilisateur
- [ ] Sauvegarde d'espèces favorites
- [ ] Carte de distribution interactive
- [ ] Mode hors-ligne (PWA)
- [ ] Application mobile native (Flutter)
- [ ] API publique pour les développeurs