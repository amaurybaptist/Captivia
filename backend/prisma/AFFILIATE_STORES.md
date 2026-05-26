# Magasins / liens d'affiliation

Les magasins partenaires (liens d’affiliation) sont stockés dans la table **AffiliateStore** et servent à :

- **Page Magasin** (accueil) : liste de tous les magasins, avec filtre par type d’animal.
- **Fiche espèce** : onglet **Magasin** qui n’affiche que les magasins dont la catégorie correspond à l’espèce (ex. pas de magasin reptile pour un chien).

## Données actuelles

Le seed (`prisma/seed.ts`) crée des magasins **exemples** avec des URL placeholder.  
Pour utiliser vos vrais liens issus du document **Affiliation_animaux_NAC_FR_BE.docx** :

1. Ouvrez `backend/prisma/seed.ts` et repérez la section `Magasins / liens d'affiliation`.
2. Remplacez les entrées du tableau `affiliateStores` par vos données :
   - **name** : nom du magasin ou de l’offre
   - **url** : lien d’affiliation (ex. croquettes chien, matériel reptile)
   - **description** : courte description
   - **categories** : tableau des catégories d’espèces concernées :  
     `mammifère`, `reptile`, `oiseau`, `poisson`, `amphibien`, `insecte`, `arachnide`
   - **types** : `alimentation`, `materiel`, `general`
   - **order** : ordre d’affichage (0, 1, 2…)

3. Relancez le seed :  
   `cd backend && npx prisma db seed`

Exemple pour un partenaire « Chien – croquettes » :

```ts
{
  name: 'Mon Partenaire Croquettes Chien',
  url: 'https://partenaire.fr/chiens?ref=CAPTIVIA',
  description: 'Croquettes et alimentation pour chien',
  categories: ['mammifère'],
  types: ['alimentation', 'materiel'],
  order: 0,
},
```

Un magasin peut apparaître pour plusieurs catégories (ex. `['reptile', 'amphibien']`).
