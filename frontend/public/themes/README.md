# Images de Fond Thématiques

Ce dossier contient les images de fond pour chaque catégorie animale.

## Images nécessaires

### ✅ Reptile
- **Fichier**: `reptile-scales.png`
- **Type**: Écailles de reptile (vert, texture écailleuse)
- **Statut**: Image fournie ✅

### 🎨 Oiseau
- **Fichier**: `bird-feathers.svg` → remplacer par `bird-feathers.png` ou `.jpg`
- **Type**: Plumes d'oiseau (bleu, jaune, blanc, coloré)
- **Statut**: SVG placeholder (remplacer par vraie image pour un meilleur rendu)

### 🎨 Mammifère
- **Fichier**: `mammal-fur.svg` → remplacer par `mammal-fur.png` ou `.jpg`
- **Type**: Fourrure (beige, brun, texture poilue douce)
- **Statut**: SVG placeholder (remplacer par vraie image)

### 🎨 Amphibien
- **Fichier**: `amphibian-skin.svg` → remplacer par `amphibian-skin.png` ou `.jpg`
- **Type**: Peau humide (vert, teal, aspect mouillé avec taches)
- **Statut**: SVG placeholder (remplacer par vraie image)

### 🎨 Poisson
- **Fichier**: `fish-scales.svg` → remplacer par `fish-scales.png` ou `.jpg`
- **Type**: Écailles de poisson (bleu, cyan, brillant, irisé)
- **Statut**: SVG placeholder (remplacer par vraie image)

### 🎨 Insecte
- **Fichier**: `insect-exoskeleton.svg` → remplacer par `insect-exoskeleton.png` ou `.jpg`
- **Type**: Exosquelette (rouge-orange, structure hexagonale)
- **Statut**: SVG placeholder (remplacer par vraie image)

## Spécifications techniques

- **Format**: PNG avec transparence si possible
- **Taille recommandée**: 1920x1080px minimum
- **Poids**: Optimisé pour le web (< 500 Ko)
- **Utilisation**: Image de fond en `background-size: cover` avec opacité réduite (0.25-0.3)

## Comment remplacer une image placeholder

1. Trouvez ou créez votre image (PNG, JPG)
2. Placez-la dans ce dossier (`frontend/public/themes/`)
3. Nommez-la **exactement** selon la catégorie :
   - `bird-feathers.png` (ou `.jpg`)
   - `mammal-fur.png` (ou `.jpg`)
   - `amphibian-skin.png` (ou `.jpg`)
   - `fish-scales.png` (ou `.jpg`)
   - `insect-exoskeleton.png` (ou `.jpg`)
4. Si vous utilisez `.jpg`, mettez à jour le fichier CSS (`frontend/src/styles/animal-themes.css`) pour changer `.svg` en `.jpg`
5. Rechargez le frontend pour voir le changement

**Note**: Les fichiers SVG actuels sont des placeholders temporaires. Remplacez-les par de vraies photos/textures pour un rendu optimal !
