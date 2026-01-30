# Guide de Déploiement - Captivia

Ce guide vous explique comment déployer Captivia sur Vercel.

## Prérequis

- Compte Vercel
- Git installé
- Node.js 18+
- npm

## Déploiement du Backend

### Option 1: Vercel Serverless Functions

1. **Créez un nouveau projet sur Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "Add New" → "Project"
   - Importez le dossier `backend`

2. **Configurez les variables d'environnement**
   - `DATABASE_URL` - URL de votre base de données PostgreSQL
   - `JWT_SECRET` - Une clé secrète forte pour JWT
   - `PORT` - 3000

3. **Déployez**
   - Cliquez sur "Deploy"
   - Attendez que le déploiement soit terminé

### Option 2: Vercel Postgres (Recommandé)

1. **Créez une base de données Vercel Postgres**
   - Dans votre projet Vercel, allez sur "Storage"
   - Cliquez sur "Create Database"
   - Sélectionnez "Postgres"
   - Suivez les instructions

2. **Configurez la DATABASE_URL**
   - Vercel vous fournira l'URL de connexion
   - Copiez-la dans les variables d'environnement du backend

## Déploiement du Frontend

1. **Créez un nouveau projet sur Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "Add New" → "Project"
   - Importez le dossier `frontend`

2. **Configurez les variables d'environnement**
   - `NEXT_PUBLIC_API_URL` - URL de votre backend (ex: `https://api-captivia.vercel.app`)

3. **Déployez**
   - Cliquez sur "Deploy"
   - Attendez que le déploiement soit terminé

## Configuration de l'API URL

### En développement

```bash
cd frontend
cp .env.example .env
# Éditez .env et ajoutez:
# NEXT_PUBLIC_API_URL=http://localhost:3000
npm run dev
```

### En production

```bash
cd frontend
cp .env.example .env
# Éditez .env et ajoutez:
# NEXT_PUBLIC_API_URL=https://api-captivia.vercel.app
npm run build
npm run start
```

## Vérification du déploiement

1. **Testez le backend**
   ```bash
   curl https://votre-api.vercel.app/species/search?q=boa
   ```

2. **Testez le frontend**
   - Allez sur `https://votre-app.vercel.app`
   - Essayez une recherche
   - Consultez les détails d'une espèce

## Surveillance et Logs

### Vercel Dashboard

- **Logs**: Vérifiez les logs en temps réel dans le dashboard Vercel
- **Analytics**: Consultez les statistiques d'utilisation
- **Deployments**: Suivez les déploiements et les retours

### Alertes

Configurez des alertes pour:
- Erreurs 500
- Taux de requêtes élevés
- Erreurs d'intégration GBIF

## Optimisations

### Caching

Le backend utilise déjà un système de caching avec:
- TTL de 24h pour les appels GBIF
- Rate limiting (5 req/s)

### CDN

Vercel fournit automatiquement un CDN pour:
- Les images
- Les assets statiques
- L'interface utilisateur

### Base de données

Pour la base de données:
- Utilisez Vercel Postgres pour la simplicité
- Configurez des backups automatiques
- Surveillez les requêtes lentes

## Problèmes courants

### "API_URL not defined"

Assurez-vous que la variable d'environnement `NEXT_PUBLIC_API_URL` est configurée correctement dans le frontend.

### "Rate limited by GBIF"

Le backend a un rate limiting intégré. Si vous rencontrez des erreurs 429:
- Vérifiez que le cache fonctionne correctement
- Réduisez le nombre de requêtes simultanées

### Base de données non connectée

Assurez-vous que la variable `DATABASE_URL` est correctement configurée et que la base de données existe.

## Support

Pour toute question de déploiement:
- Consultez les logs Vercel
- Vérifiez les variables d'environnement
- Testez l'API localement d'abord

## Next Steps

Une fois déployé:

1. ✅ Testez toutes les fonctionnalités
2. ✅ Configurez les domaines personnalisés
3. ✅ Activez les analytics
4. ✅ Configurez les backups
5. ✅ Mettez en place la surveillance