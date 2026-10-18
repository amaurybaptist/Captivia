# Publication Netlify

Le dépôt contient plusieurs projets. Le site Next.js se trouve dans `frontend`, tandis que le `package.json` racine sert à lancer les projets en développement.

La configuration versionnée dans `netlify.toml` définit :

- Base directory : `frontend`.
- Build command : `npm run build`.
- Publish directory : `.next`, relatif à la base, donc `frontend/.next` dans le dépôt.
- Node.js : version 22.

Les valeurs du fichier remplacent les réglages correspondants dans l’interface Netlify. Netlify installe ainsi les dépendances du frontend et détecte Next.js dans son véritable dossier. L’adaptateur officiel `@netlify/plugin-nextjs` est déclaré explicitement et installé dans le frontend. Sur ce site, l’activation automatique ne générait aucune fonction ni règle de routage : une compilation réussie aboutissait donc à des erreurs 404. Le plugin prépare les fonctions, le routage SSR, les assets et les en-têtes nécessaires à Next.js. Sa version est verrouillée dans le lockfile du frontend ; la mettre à jour régulièrement.

Le site doit rester connecté au dépôt `amaurybaptist/Captivia`, branche de production `main`, avec les builds automatiques activés. Une fusion doit alors déclencher un nouveau déploiement. Si le dernier build correspond encore à un ancien commit, lancer « Retry deploy » sur le dernier commit depuis l’onglet Deploys.

Conserver les variables Netlify existantes. `NEXT_PUBLIC_API_URL` doit désigner l’URL HTTPS du backend de production. `NEXT_PUBLIC_SENTRY_DSN` est facultatif. Cette configuration publie le frontend ; elle ne déploie pas le backend NestJS et n’applique pas ses migrations de production.

## Validation

- `npm run build` à la racine délègue au script du frontend.
- `cd frontend && npm run build` correspond à la commande réellement exécutée par Netlify.
- Résolution vérifiée avec l’outil officiel `@netlify/config` 25.2.7 : contextes production, deploy-preview et branch-deploy, y compris avec les anciens réglages UI (`npm run build`, `.next` à la racine). Le dossier de travail résolu est `frontend` et la publication est `frontend/.next`.

Références : [configuration Netlify](https://docs.netlify.com/build/configure-builds/file-based-configuration/) et [Next.js sur Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
