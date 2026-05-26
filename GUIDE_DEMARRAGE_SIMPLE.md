# 🚀 Guide de Démarrage Ultra-Simple

## ⚠️ Vous avez cette erreur?
```
Error: P1001: Can't reach database server at `localhost:5432`
```

**Solution**: PostgreSQL n'est pas démarré! Suivez ces 3 étapes:

---

## Étape 1: Démarrer Docker Desktop ⚡

### Sur macOS:
1. **Ouvrez Spotlight**: Appuyez sur `Cmd + Space`
2. **Tapez**: `Docker`
3. **Cliquez** sur Docker.app
4. **Attendez** que l'icône Docker dans la barre de menu soit stable (pas d'animation)

### Sur Windows:
1. Cherchez "Docker Desktop" dans le menu Démarrer
2. Lancez-le
3. Attendez qu'il soit complètement démarré

### Vérification:
```bash
docker ps
```
Si ça affiche un tableau → **Docker fonctionne! ✅**

---

## Étape 2: Démarrer PostgreSQL 🐘

```bash
cd /Users/amaurybaptist/Desktop/OnBrain/Captivia
./scripts/start-db.sh
```

Vous devriez voir:
```
✅ PostgreSQL démarré et prêt!
```

---

## Étape 3: Configurer la Base de Données 🗄️

```bash
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..
```

---

## Étape 4: Lancer l'Application 🎉

```bash
npm run dev
```

**Voilà!** Ouvrez votre navigateur:
- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:3000

---

## 🆘 Problèmes?

### "docker: command not found"
➡️ Docker n'est pas installé. Téléchargez-le: https://www.docker.com/products/docker-desktop

### "Cannot connect to the Docker daemon"
➡️ Docker Desktop n'est pas lancé. Voir **Étape 1** ci-dessus.

### "Port 5432 already in use"
```bash
docker stop captivia-postgres
docker rm captivia-postgres
./scripts/start-db.sh
```

### Le seed échoue toujours
Vérifiez que PostgreSQL tourne:
```bash
docker ps | grep captivia
```

Si vous voyez `captivia-postgres` avec status `Up` → c'est bon!
Sinon, relancez `./scripts/start-db.sh`

---

## 📚 Commandes Utiles

```bash
# Voir les conteneurs Docker
docker ps

# Arrêter PostgreSQL
docker stop captivia-postgres

# Redémarrer PostgreSQL
docker start captivia-postgres

# Voir les logs de PostgreSQL
docker logs captivia-postgres

# Supprimer le conteneur (si besoin de recommencer)
docker rm -f captivia-postgres
```

---

## ✨ Checklist Rapide

Avant de lancer `npm run dev`, vérifiez:

- [ ] Docker Desktop est lancé et stable
- [ ] `docker ps` fonctionne sans erreur
- [ ] `./scripts/start-db.sh` a réussi
- [ ] `npx prisma generate` exécuté sans erreur
- [ ] `npx prisma db push` exécuté sans erreur
- [ ] Backend/.env existe (copié depuis .env.example)

**Si tout est coché → Lancez `npm run dev` et profitez! 🎊**
