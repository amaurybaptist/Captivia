# Guide de Démarrage Rapide - Captivia

## 🚀 Démarrage en 3 minutes

### Étape 1: Installer les dépendances

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Étape 2: Configurer l'environnement

```bash
# Backend - Créez le fichier .env
cd backend
cp .env.example .env
# Éditez .env et configurez DATABASE_URL si vous utilisez PostgreSQL local
```

### Étape 3: Lancer l'application

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Étape 4: Tester

1. Allez sur `http://localhost:3000` (frontend)
2. Essayez une recherche (ex: "boa", "iguana")
3. Cliquez sur une espèce pour voir les détails
4. Consultez la galerie média et le statut IUCN

## 📝 API Test

```bash
# Recherche d'espèces
curl http://localhost:3000/species/search?q=boa

# Détails d'une espèce
curl http://localhost:3000/species/2444498
```

## 🎯 Fonctionnalités

- ✅ Recherche d'espèces par nom
- ✅ Fiches détaillées avec informations taxonomiques
- ✅ Galerie média
- ✅ Statut IUCN
- ✅ Design responsive
- ✅ Mode sombre

## 🌐 Déploiement Vercel

Voir le guide complet dans `DEPLOYMENT.md`

## 📚 Documentation

- `README.md` - Documentation complète
- `DEPLOYMENT.md` - Guide de déploiement
- `PROJECT_SUMMARY.md` - Résumé du projet

## ⚠️ Notes

- L'API GBIF est gratuite mais avec des limites (5 req/s)
- Pour une base de données locale, installez PostgreSQL
- Les données proviennent de GBIF - vérifiez toujours la législation locale

## 🆘 Support

Si vous rencontrez des problèmes:
1. Vérifiez que les ports 3000 sont disponibles
2. Assurez-vous que les dépendances sont installées
3. Consultez les logs dans le terminal