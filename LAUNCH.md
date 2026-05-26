# Lancer Captivia

## En local (un clic)

- **Windows** : double-cliquez sur `start.bat`
- **Ligne de commande** : à la racine du projet, exécutez `npm run dev`

Prérequis : avoir fait une fois `npm run install:all` (ou `npm install` dans `backend` et `frontend`).

- Backend (API) : http://localhost:3000  
- Frontend : http://localhost:3001  

Le frontend appelle l’API sur le port 3000. En local, le backend doit tourner sur 3000.

## Via Vercel

1. Déployez le frontend sur Vercel (connexion GitHub + import du repo, ou `vercel` en CLI).
2. Dans le projet Vercel, définissez la variable d’environnement **NEXT_PUBLIC_API_URL** vers l’URL de votre API (backend hébergé ailleurs, ou même `http://localhost:3000` si vous testez en local avec le front Vercel).
3. **Récupérer l’URL de l’app** : connectez-vous sur [vercel.com/dashboard](https://vercel.com/dashboard), ouvrez votre projet Captivia, puis copiez l’URL du déploiement (ex. `https://captivia-xxx.vercel.app`).
4. À la racine du projet, créez un fichier `.env` (ou copiez `.env.example`) et ajoutez :
   ```env
   VERCEL_APP_URL=https://votre-projet.vercel.app
   ```
5. Ouvrir l’app Vercel dans le navigateur : `npm run vercel:open`

Sans `.env`, la commande affiche des instructions pour configurer `VERCEL_APP_URL`.
