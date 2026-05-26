# ⚡ Captivia - Démarrage en 5 Minutes

## 🚀 Installation Ultra-Rapide

### Option 1: Tout en Une Commande

```bash
# À la racine du projet
npm run install:all && npm run dev
```

### Option 2: Étape par Étape

**1. Backend (Terminal 1)**
```bash
cd backend

# Configuration DB
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/captivia"
JWT_SECRET="captivia-secret-2026"
PORT=3000
CACHE_TYPE="memory"' > .env

# Setup Prisma
npx prisma generate
npx prisma migrate dev --name init

# Démarrer
npm run start:dev
```

**2. Frontend (Terminal 2)**
```bash
cd frontend

# Configuration
echo 'NEXT_PUBLIC_API_URL=http://localhost:3000' > .env.local

# Démarrer
npm run dev:local
```

**3. Ouvrir**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api

---

## ✅ Vérification Rapide

**Backend actif?**
```bash
curl http://localhost:3000/monitoring/health
# Doit retourner: { "status": "healthy", ... }
```

**Frontend actif?**
- Ouvrir http://localhost:3001
- Voir la page d'accueil Captivia
- Tester le sélecteur de langue

**Tester auth?**
```bash
# S'inscrire
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@captivia.com","password":"password123"}'
```

---

## 🎯 Fonctionnalités à Tester

### Sans compte (Public)
1. Rechercher "boa constrictor"
2. Cliquer sur une fiche espèce
3. Explorer les onglets: Santé, Légal, Alimentation, Matériel
4. Consulter la page Transparence
5. Changer de langue

### Avec compte
1. S'inscrire sur /register
2. Se connecter
3. Accéder à "Mes animaux"
4. Ajouter un animal
5. Créer des routines
6. Configurer les notifications

---

## 🔧 Troubleshooting

**Erreur "Cannot connect to database"?**
```bash
# Vérifier PostgreSQL actif
pg_isready

# Créer la DB si nécessaire
createdb captivia
```

**Erreur "Module not found"?**
```bash
# Réinstaller dépendances
cd backend && npm install
cd ../frontend && npm install
```

**Port 3000 déjà utilisé?**
```bash
# Changer dans backend/.env
PORT=3001
```

---

## 📚 Documentation Complète

- [README.md](README.md) - Vue d'ensemble
- [DEPLOYMENT.md](DEPLOYMENT.md) - Déploiement production
- [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) - Tests complets
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Structure détaillée
- [VALIDATION_REPORT.md](VALIDATION_REPORT.md) - Rapport validation
- [CHALLENGE_WON.md](CHALLENGE_WON.md) - Preuve du défi 100%

---

## 🎉 C'est Parti!

Votre plateforme Captivia est **100% fonctionnelle** et prête à l'emploi!

**Prochaine étape:** Créer votre premier compte et ajouter votre premier animal! 🐾
