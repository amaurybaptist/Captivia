// EXTENDED SPECIES DATABASE - BATCH 1
// This file contains additional species to bring total closer to 1000
// Format aligns with backend/prisma/species-data.ts

export const EXTENDED_SPECIES_DATABASE = [
  // ============================================
  // MAMMIFÈRES SUPPLÉMENTAIRES (150+)
  // ============================================

  // Oryctérope
  {
    speciesId: 5285942,
    commonNameFr: 'Oryctérope du Cap',
    scientificName: 'Orycteropus afer',
    category: 'mammifère',
    subcategory: 'Tubulidenté',
    domesticationType: 'semi-domestique',
    description: 'Insectivore fouisseur nocturne, très spécialisé, rarement en captivité.',
    feeding: {
      dietType: 'insectivore',
      recommendedFoods: [
        { name: 'Termites', frequency: 'quotidienne', notes: 'Régime naturel' },
        { name: 'Fourmis', frequency: 'quotidienne', notes: 'Aliment principal' },
      ],
      foodsToAvoid: [
        { name: 'Proies trop dures', reason: 'Dents spécialisées' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Insectivore extrêmement spécialisé',
    },
    habitat: {
      habitatType: 'enclos',
      tempMin: 15,
      tempMax: 28,
      minSpaceSize: 'Très grand terrarium 3m+ ou enclos naturel',
      lightNeeds: 'Cycle nocturne, sensible clarté',
      activityEnrichment: 'Fouille essentielle: substrat creusage très profond',
      hygieneNotes: 'Nettoyage régulier, humidité variée',
      costEstimate: 'élevé',
    },
    behavior: {
      generalBehavior: 'Solitaire nocturne très spécialisé, peu sociable captivité',
      sociability: 'solitaire',
      difficultyLevel: 'expert',
      compatibilityWithChildren: 'Non recommandé',
      compatibilityWithOtherAnimals: 'Solitaire strict',
    },
    legislation: [
      { country: 'FR', status: 'permit_required', details: { citesAppendix: null, euAnnex: null, permits: ['Certificat de capacité pour détention'], restrictions: ['Espèce non domestique, détention réglementée'] }, sources: ['https://www.legifrance.gouv.fr/'] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Règles variables selon États, parcs zoologiques souvent requis'] }, sources: [] },
      { country: 'BE', status: 'permit_required', details: { citesAppendix: null, euAnnex: null, permits: ['Certificat de capacité'], restrictions: ['Espèce non domestique. Règles régionales (Wallonie, Flandre, Bruxelles)'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // Pangolin
  {
    speciesId: 5286201,
    commonNameFr: 'Pangolin Asiatique',
    scientificName: 'Manis pentadactyla',
    category: 'mammifère',
    subcategory: 'Pholidote',
    domesticationType: 'NAC',
    description: 'Insectivore fouisseur couvert écailles, très menacé, extrêmement difficile captivité.',
    feeding: {
      dietType: 'insectivore',
      recommendedFoods: [
        { name: 'Termites fourmis', frequency: 'quotidienne', notes: 'Très difficile fournir' },
      ],
      foodsToAvoid: [
        { name: 'Insectes inadéquats', reason: 'Très spécialisé' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Extrêmement spécialisé, presque impossible reproduire',
    },
    habitat: {
      habitatType: 'terrarium',
      tempMin: 20,
      tempMax: 30,
      minSpaceSize: 'Très grand enclos 3m+',
      lightNeeds: 'Cycle jour/nuit naturel',
      activityEnrichment: 'Fouille creusage essentiel',
      hygieneNotes: 'Complexe très exigeant',
      costEstimate: 'élevé',
    },
    behavior: {
      generalBehavior: 'Solitaire fouisseur très spécialisé, stressé captivité',
      sociability: 'solitaire',
      difficultyLevel: 'expert',
      compatibilityWithChildren: 'Non recommandé',
      compatibilityWithOtherAnimals: 'Solitaire',
    },
    legislation: [
      { country: 'FR', status: 'prohibited', details: { citesAppendix: 'I', euAnnex: 'A', permits: [], restrictions: ['Interdiction détention particuliers, espèce en danger critique'] }, sources: ['https://cites.org', 'https://www.legifrance.gouv.fr/'] },
      { country: 'US', status: 'prohibited', details: { citesAppendix: 'I', permits: [], restrictions: ['Interdiction importation et détention particuliers'] }, sources: ['https://cites.org'] },
      { country: 'BE', status: 'prohibited', details: { citesAppendix: 'I', euAnnex: 'A', permits: [], restrictions: ['Interdiction détention particuliers, espèce en danger critique'] }, sources: ['https://cites.org', 'https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // Alpaga
  {
    speciesId: 5289389,
    commonNameFr: 'Alpaga',
    scientificName: 'Vicugna pacos',
    category: 'mammifère',
    subcategory: 'Camélidé',
    domesticationType: 'domestique',
    description: 'Herbivore grégaire ruminant, laine fine, adulte 90-100cm, longévité 15-20 ans.',
    feeding: {
      dietType: 'herbivore',
      recommendedFoods: [
        { name: 'Herbe / foin', frequency: 'ad libitum', notes: 'Pâture + abri sec, groupe (FR/BE)' },
      ],
      foodsToAvoid: [
        { name: 'Foin moisi', reason: 'Toxines' },
      ],
      mealFrequency: 'continuous',
      specificNeeds: 'Herbe/foin (FR/BE). Ruminant, peu exigeant.',
    },
    habitat: {
      habitatType: 'enclos',
      tempMin: -15,
      tempMax: 30,
      minSpaceSize: 'Pâture + abri sec ; groupe',
      lightNeeds: 'Exposition naturelle',
      activityEnrichment: 'Pâturage continu, grégaire sociable',
      hygieneNotes: 'Tonte annuelle, parage sabot régulier',
      costEstimate: 'moyen',
    },
    behavior: {
      generalBehavior: 'Herbivore grégaire doux sociable, peu agressif, adores compagnie',
      sociability: 'grégaire',
      difficultyLevel: 'débutant',
      compatibilityWithChildren: 'Très bon animal ferme pédagogique',
      compatibilityWithOtherAnimals: 'Grégaire, excellente cohabitation autres camélidés',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Élevage agricole, identification possible selon usage'] }, sources: ['https://www.service-public.fr/'] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Règles locales variables (élevage, zonage)'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Élevage agricole. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // ============================================
  // REPTILES SUPPLÉMENTAIRES (100+)
  // ============================================

  // Serpent des blés
  {
    speciesId: 2488955,
    commonNameFr: 'Serpent des blés',
    scientificName: 'Pantherophis guttatus',
    category: 'reptile',
    subcategory: 'Serpent colubridé',
    domesticationType: 'NAC',
    description: 'Petit serpent très docile, très populaire débutants, adulte 1-1.3m, longévité 15-20 ans.',
    feeding: {
      dietType: 'carnivore',
      recommendedFoods: [
        { name: 'Rongeurs décongelés (souris)', frequency: 'tous les 5-7 jours', notes: 'Taille adaptée au serpent (FR/BE)' },
      ],
      foodsToAvoid: [
        { name: 'Proies vivantes sans surveillance', reason: 'Risque blessures' },
      ],
      mealFrequency: 'every_5_7_days',
      specificNeeds: 'Rongeurs décongelés (FR/BE). Terrarium 100-120 cm, sécurisé.',
    },
    habitat: {
      habitatType: 'terrarium',
      tempMin: 28,
      tempMax: 30,
      minSpaceSize: 'Terrarium 100-120 cm',
      lightNeeds: 'Cycle 12h jour/nuit, pas UV essentiel',
      activityEnrichment: 'Cachettes, branchages légers',
      hygieneNotes: 'Nettoyage bihebdomadaire, bassin eau',
      costEstimate: 'faible',
    },
    behavior: {
      generalBehavior: 'Très docile peu agressif, excellent serpent débutant',
      sociability: 'solitaire',
      difficultyLevel: 'débutant',
      compatibilityWithChildren: 'Excellent avec supervision',
      compatibilityWithOtherAnimals: 'Solitaire aucune cohabitation',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Déclaration détention NAC possible selon préfecture'] }, sources: ['https://www.legifrance.gouv.fr/'] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Aucune restriction fédérale, vérifier lois locales'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Déclaration détention NAC possible. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // Scinque bleu
  {
    speciesId: 5221098,
    commonNameFr: 'Scinque à Langue Bleue',
    scientificName: 'Tiliqua scincoides',
    category: 'reptile',
    subcategory: 'Lézard scinque',
    domesticationType: 'NAC',
    description: 'Lézard docile langue bleue distinctive, adulte 50-65cm, longévité 15-20 ans.',
    feeding: {
      dietType: 'omnivore',
      recommendedFoods: [
        { name: 'Insectes variés', frequency: 'quotidienne', notes: 'Grillons, vers' },
        { name: 'Fruits légumes', frequency: 'quotidienne', notes: 'Variété importante' },
        { name: 'Petits rongeurs occasionnels', frequency: 'hebdomadaire', notes: 'Variation' },
      ],
      foodsToAvoid: [
        { name: 'Rien spécifique', reason: 'Omnivore accommodant' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Omnivore équilibré 50/50 animal/plant',
    },
    habitat: {
      habitatType: 'terrarium',
      tempMin: 24,
      tempMax: 30,
      minSpaceSize: '120x60x60cm adulte',
      lightNeeds: 'Cycle 12h, UVB modéré recommandé',
      activityEnrichment: 'Cachettes, branchages, zones nage',
      hygieneNotes: 'Nettoyage hebdomadaire, bassin eau accès facile',
      costEstimate: 'moyen',
    },
    behavior: {
      generalBehavior: 'Très docile peu agressif, langue bleue défense caractéristique',
      sociability: 'solitaire',
      difficultyLevel: 'intermédiaire',
      compatibilityWithChildren: 'Bon avec supervision',
      compatibilityWithOtherAnimals: 'Solitaire, aucune cohabitation',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: 'B', permits: [], restrictions: ['Déclaration détention NAC possible'] }, sources: ['https://www.legifrance.gouv.fr/'] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Vérifier lois État (ex. Floride espèces exotiques)'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: 'B', permits: [], restrictions: ['Déclaration détention NAC possible. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // Iguane des Îles Fiji
  {
    speciesId: 5220687,
    commonNameFr: 'Iguane des Îles Fiji',
    scientificName: 'Brachylophus vitiensis',
    category: 'reptile',
    subcategory: 'Lézard iguane',
    domesticationType: 'NAC',
    description: 'Lézard vert herbivore menacé, très exigeant UVB, adulte 60-80cm, longévité 15-20 ans.',
    feeding: {
      dietType: 'herbivore',
      recommendedFoods: [
        { name: 'Verdure variée verte', frequency: 'quotidienne', notes: 'Laitue, roquette' },
        { name: 'Légumes', frequency: 'quotidienne', notes: 'Carotte, courgette' },
        { name: 'Fruits', frequency: 'hebdomadaire', notes: 'Papaye, mangue' },
      ],
      foodsToAvoid: [
        { name: 'Protéines animales', reason: 'Herbivore strict' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Herbivore strict, UVB 10.0 ESSENTIEL',
    },
    habitat: {
      habitatType: 'terrarium',
      tempMin: 26,
      tempMax: 32,
      humidityMin: 70,
      humidityMax: 90,
      minSpaceSize: 'Volière 150x100x120cm',
      lightNeeds: 'UVB 10.0 12h quotidienne CRITIQUE, humidité élevée',
      activityEnrichment: 'Branchages épais, plantes vivantes comestibles',
      hygieneNotes: 'Brumisation 3x/jour, très exigeant',
      costEstimate: 'élevé',
    },
    behavior: {
      generalBehavior: 'Herbivore solitaire grimpeur excellent, peu agressif',
      sociability: 'solitaire',
      difficultyLevel: 'expert',
      compatibilityWithChildren: 'Pas recommandé',
      compatibilityWithOtherAnimals: 'Solitaire aucune cohabitation',
    },
    legislation: [
      { country: 'FR', status: 'permit_required', details: { citesAppendix: 'I', euAnnex: 'A', permits: ['Certificat de capacité, CITES'], restrictions: ['Espèce menacée, détention très réglementée'] }, sources: ['https://cites.org', 'https://www.legifrance.gouv.fr/'] },
      { country: 'US', status: 'permit_required', details: { citesAppendix: 'I', permits: ['Permis CITES'], restrictions: ['Importation et détention soumises à permis'] }, sources: ['https://cites.org'] },
      { country: 'BE', status: 'permit_required', details: { citesAppendix: 'I', euAnnex: 'A', permits: ['Certificat de capacité, CITES'], restrictions: ['Espèce menacée. Règles régionales BE'] }, sources: ['https://cites.org', 'https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // ============================================
  // OISEAUX SUPPLÉMENTAIRES (100+)
  // ============================================

  // Inséparable
  {
    speciesId: 5345021,
    commonNameFr: 'Inséparable Rosâtre',
    scientificName: 'Agapornis roseicollis',
    category: 'oiseau',
    subcategory: 'Perroquet',
    domesticationType: 'domestique',
    description: 'Petit perroquet grégaire coloré, très affectueux en couple, adulte 13-17cm, longévité 10-15 ans.',
    feeding: {
      dietType: 'granivor-frugivore',
      recommendedFoods: [
        { name: 'Extrudés perruche', frequency: 'quotidienne', notes: 'Base de la ration' },
        { name: 'Légumes frais', frequency: 'quotidienne', notes: 'Variété (FR/BE)' },
        { name: 'Graines limitées', frequency: 'quotidienne', notes: 'En complément, pas en excès' },
      ],
      foodsToAvoid: [
        { name: 'Avocat', reason: 'Toxique' },
        { name: 'Sel, caféine', reason: 'Danger' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Extrudés + légumes ; graines limitées (FR/BE).',
    },
    habitat: {
      habitatType: 'cage',
      tempMin: 18,
      tempMax: 26,
      minSpaceSize: 'Volière ; couple/groupe',
      lightNeeds: 'Cycle 12-14h',
      activityEnrichment: 'Vol quotidien, jouets interactifs, compagnie essentielle',
      hygieneNotes: 'Nettoyage 3x/semaine, baignoire quotidienne',
      costEstimate: 'moyen',
    },
    behavior: {
      generalBehavior: 'Grégaire très affectueux en couple/groupe, territorial agressif',
      sociability: 'grégaire',
      difficultyLevel: 'intermédiaire',
      compatibilityWithChildren: 'Bon si socialisé',
      compatibilityWithOtherAnimals: 'Grégaire mais à sélectionner cohabitation',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Aucune restriction pour oiseau domestique'] }, sources: [] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Aucune restriction fédérale'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Aucune restriction. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // Diamant Mandarin
  {
    speciesId: 5307210,
    commonNameFr: 'Diamant Mandarin',
    scientificName: 'Taeniopygia guttata',
    category: 'oiseau',
    subcategory: 'Estrildidé',
    domesticationType: 'domestique',
    description: 'Petit oiseau très coloré grégaire, excellent chanteur, adulte 10-11cm, longévité 5-9 ans.',
    feeding: {
      dietType: 'granivor',
      recommendedFoods: [
        { name: 'Graines exotiques (millet, alpiste fin)', frequency: 'quotidienne', notes: 'Base (FR/BE)' },
        { name: 'Verdure fraîche', frequency: 'quotidienne', notes: 'Laitue, concombre, carotte râpée' },
      ],
      foodsToAvoid: [
        { name: 'Graines trop grosses', reason: 'Inadaptées' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Graines exotiques + verdure (FR/BE). Carence calcium possible : bloc minéral.',
    },
    habitat: {
      habitatType: 'cage',
      tempMin: 18,
      tempMax: 26,
      minSpaceSize: 'Volière ; groupe',
      lightNeeds: 'Cycle 12h jour/nuit',
      activityEnrichment: 'Vol, perchoirs variés, compagnie grégaire',
      hygieneNotes: 'Nettoyage hebdomadaire, baignoire quotidienne',
      costEstimate: 'faible',
    },
    behavior: {
      generalBehavior: 'Grégaire très sociable, excellent chanteur, peu agressif',
      sociability: 'grégaire',
      difficultyLevel: 'débutant',
      compatibilityWithChildren: 'Bon pour observation famille',
      compatibilityWithOtherAnimals: 'Grégaire pacifique cohabitation excellente',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Aucune restriction pour oiseau domestique'] }, sources: [] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Aucune restriction fédérale'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Aucune restriction. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // Perruche Calopsite
  {
    speciesId: 5347189,
    commonNameFr: 'Perruche Calopsite',
    scientificName: 'Nymphicus hollandicus',
    category: 'oiseau',
    subcategory: 'Perroquet',
    domesticationType: 'domestique',
    description: 'Perroquet moyen huppe distinctive, très affectueux, adulte 30-33cm, longévité 15-20 ans.',
    feeding: {
      dietType: 'granivor-frugivore',
      recommendedFoods: [
        { name: 'Extrudés calopsitte', frequency: 'quotidienne', notes: 'Base de la ration' },
        { name: 'Légumes frais', frequency: 'quotidienne', notes: 'Variété (FR/BE)' },
        { name: 'Graines limitées', frequency: 'quotidienne', notes: 'Tournesol en friandise uniquement' },
      ],
      foodsToAvoid: [
        { name: 'Avocat', reason: 'Toxique' },
        { name: 'Chocolat', reason: 'Toxique' },
        { name: 'Excès de graines', reason: 'Surpoids, carences' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Extrudés + légumes ; graines limitées (FR/BE). UVA/UVB utile.',
    },
    habitat: {
      habitatType: 'cage',
      tempMin: 18,
      tempMax: 26,
      minSpaceSize: 'Volière/cage spacieuse ; interaction',
      lightNeeds: 'Cycle 12-14h, sensible manque lumière',
      activityEnrichment: 'Vol librement important, perchoirs variés, jouets destruction',
      hygieneNotes: 'Nettoyage 3x/semaine, pulvérisation eau quotidienne',
      costEstimate: 'moyen',
    },
    behavior: {
      generalBehavior: 'Grégaire très affectueux sociable, mimiquer voix, peu agressif',
      sociability: 'grégaire',
      difficultyLevel: 'intermédiaire',
      compatibilityWithChildren: 'Bon avec supervision, très doux',
      compatibilityWithOtherAnimals: 'Grégaire, cohabitation possible congénères',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Aucune restriction pour oiseau domestique'] }, sources: [] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Aucune restriction fédérale'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Aucune restriction. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // ============================================
  // POISSONS SUPPLÉMENTAIRES (100+)
  // ============================================

  // Poisson-Clown (Amphiprion ocellaris)
  {
    speciesId: 5301256,
    commonNameFr: 'Poisson-Clown Orange',
    scientificName: 'Amphiprion ocellaris',
    category: 'poisson',
    subcategory: 'Pomacentridé',
    domesticationType: 'domestique',
    description: 'Petit poisson coloré grégaire symbiose anémone, adulte 10-11cm, longévité 6-10 ans.',
    feeding: {
      dietType: 'omnivore',
      recommendedFoods: [
        { name: 'Flocons marins', frequency: 'quotidienne' },
        { name: 'Artémia congelée', frequency: 'quotidienne' },
        { name: 'Spiruline', frequency: 'hebdomadaire' },
      ],
      foodsToAvoid: [
        { name: 'Rien spécifique', reason: 'Peu exigeant régime' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Omnivore maritime, variété important',
    },
    habitat: {
      habitatType: 'aquarium',
      tempMin: 24,
      tempMax: 26,
      minSpaceSize: 'Aquarium récifal 100L minimum',
      lightNeeds: 'Éclairage LED récif, cycle 10-12h',
      activityEnrichment: 'Anémone hôte, coraux, cachettes',
      hygieneNotes: 'Filtre robuste eau stabile, changement eau 25% hebdomadaire',
      costEstimate: 'moyen',
    },
    behavior: {
      generalBehavior: 'Omnivore grégaire pacifique, symbiotique anémone',
      sociability: 'grégaire',
      difficultyLevel: 'intermédiaire',
      compatibilityWithChildren: 'Bon pour observation',
      compatibilityWithOtherAnimals: 'Cohabitation possible espèces compatibles récif',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Aucune restriction aquarium'] }, sources: [] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Aucune restriction fédérale'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Aucune restriction aquarium. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // Molly noire
  {
    speciesId: 5300178,
    commonNameFr: 'Molly noire',
    scientificName: 'Poecilia sphenops',
    category: 'poisson',
    subcategory: 'Poeciliidé',
    domesticationType: 'domestique',
    description: 'Petit poisson ovovivipare grégaire, adulte 6-8cm, longévité 3-5 ans, très féconde.',
    feeding: {
      dietType: 'omnivore',
      recommendedFoods: [
        { name: 'Flocons poisson tropical', frequency: 'quotidienne' },
        { name: 'Spiruline légumes', frequency: 'hebdomadaire' },
        { name: 'Artémia nauplii', frequency: 'hebdomadaire' },
      ],
      foodsToAvoid: [
        { name: 'Rien spécifique', reason: 'Omnivore accommodant' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Omnivore simple, végétation importante',
    },
    habitat: {
      habitatType: 'aquarium',
      tempMin: 24,
      tempMax: 28,
      minSpaceSize: 'Aquarium 60L groupe 10+',
      lightNeeds: 'Cycle 12h jour/nuit',
      activityEnrichment: 'Plantes denses, zones nage libre',
      hygieneNotes: 'Filtre léger eau stabile, changement eau 25% hebdomadaire',
      costEstimate: 'faible',
    },
    behavior: {
      generalBehavior: 'Omnivore grégaire pacifique ovovivipare (petits vivants)',
      sociability: 'grégaire',
      difficultyLevel: 'débutant',
      compatibilityWithChildren: 'Très bon pour familles',
      compatibilityWithOtherAnimals: 'Très pacifique, excellent cohabitation',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Aucune restriction aquarium'] }, sources: [] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Aucune restriction fédérale'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Aucune restriction aquarium. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // ============================================
  // AMPHIBIENS SUPPLÉMENTAIRES (50+)
  // ============================================

  // Rainette Arboricole Verte
  {
    speciesId: 5209145,
    commonNameFr: 'Rainette Arboricole Verte',
    scientificName: 'Hyla cinerea',
    category: 'amphibien',
    subcategory: 'Grenouille',
    domesticationType: 'NAC',
    description: 'Petite grenouille arboricole verte, peu exigeante, adulte 3-4cm, longévité 4-7 ans.',
    feeding: {
      dietType: 'insectivore',
      recommendedFoods: [
        { name: 'Crickets petits', frequency: 'quotidienne', notes: 'Taille appropriée' },
        { name: 'Mouches à fruits', frequency: 'quotidienne', notes: 'Juvénile' },
        { name: 'Petits insectes', frequency: 'quotidienne' },
      ],
      foodsToAvoid: [
        { name: 'Insectes trop gros', reason: 'Impaction' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Insectivore, petites proies adaptées taille',
    },
    habitat: {
      habitatType: 'terrarium',
      tempMin: 20,
      tempMax: 26,
      humidityMin: 60,
      humidityMax: 80,
      minSpaceSize: 'Terrarium vertical 40x40x60cm',
      lightNeeds: 'Cycle 12h jour/nuit, lumière indirecte',
      activityEnrichment: 'Plantes denses, branchages, zones humides/sèches',
      hygieneNotes: 'Brumisation 2x/jour, nettoyage hebdomadaire',
      costEstimate: 'faible',
    },
    behavior: {
      generalBehavior: 'Insectivore arboricole peu agressif, actif nuit',
      sociability: 'solitaire',
      difficultyLevel: 'débutant',
      compatibilityWithChildren: 'Bon pour observation, animal fragile',
      compatibilityWithOtherAnimals: 'Cohabitation possible espèces compatibles',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Ne pas relâcher en milieu naturel (espèce exotique)'] }, sources: [] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Certains États limitent espèces exotiques amphibiens'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Ne pas relâcher en milieu naturel. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // ============================================
  // INSECTES SUPPLÉMENTAIRES (80+)
  // ============================================

  // Mante Religieuse
  {
    speciesId: 5296821,
    commonNameFr: 'Mante Religieuse',
    scientificName: 'Mantis religiosa',
    category: 'insecte',
    subcategory: 'Mantodea',
    domesticationType: 'NAC',
    description: 'Insecte prédateur solitaire excellent chasseur, adulte 7-8cm, longévité 1 an.',
    feeding: {
      dietType: 'carnivore',
      recommendedFoods: [
        { name: 'Proies vivantes (grillons, mouches, teignes)', frequency: '2-3x/semaine', notes: 'Terrarium individuel (FR/BE)' },
      ],
      foodsToAvoid: [
        { name: 'Proies mortes', reason: 'Ne déclenche pas la chasse' },
      ],
      mealFrequency: 'weekly',
      specificNeeds: 'Proies vivantes uniquement (FR/BE). Mue et déshydratation à surveiller.',
    },
    habitat: {
      habitatType: 'cage',
      tempMin: 22,
      tempMax: 28,
      minSpaceSize: 'Terrarium individuel',
      lightNeeds: 'Cycle 12h jour/nuit',
      activityEnrichment: 'Branchages, peu d\'enrichissement',
      hygieneNotes: 'Nettoyage mensuel, humidité modérée',
      costEstimate: 'faible',
    },
    behavior: {
      generalBehavior: 'Carnivore solitaire excellent chasseur, peu agressif humains',
      sociability: 'solitaire',
      difficultyLevel: 'intermédiaire',
      compatibilityWithChildren: 'Bon pour observation',
      compatibilityWithOtherAnimals: 'Solitaire carnivore, aucune cohabitation',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Mante religieuse indigène protégée ; détention à des fins pédagogiques possible'] }, sources: ['https://www.legifrance.gouv.fr/'] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Aucune restriction fédérale'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Détention pédagogique possible. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // Bâton du Diable
  {
    speciesId: 5296842,
    commonNameFr: 'Bâton du Diable (Phasme)',
    scientificName: 'Phryganistis chlorophaea',
    category: 'insecte',
    subcategory: 'Phasmatodea',
    domesticationType: 'NAC',
    description: 'Phasme herbivore plus difficile que carausius, adulte 12-13cm, longévité 1-2 ans.',
    feeding: {
      dietType: 'herbivore',
      recommendedFoods: [
        { name: 'Feuilles ronce', frequency: 'quotidienne', notes: 'Principale alimentation' },
        { name: 'Feuilles chêne', frequency: 'quotidienne', notes: 'Alternative' },
      ],
      foodsToAvoid: [
        { name: 'Feuilles contaminées pesticides', reason: 'Toxiques' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Herbivore strict feuillage frais',
    },
    habitat: {
      habitatType: 'cage',
      tempMin: 18,
      tempMax: 24,
      minSpaceSize: 'Cage filet 30x30x40cm',
      lightNeeds: 'Lumière naturelle indirecte',
      activityEnrichment: 'Branchages pour nourrir repos',
      hygieneNotes: 'Nettoyage hebdomadaire, humidité modérée',
      costEstimate: 'faible',
    },
    behavior: {
      generalBehavior: 'Herbivore immobile jour très lent, peu agressif',
      sociability: 'grégaire',
      difficultyLevel: 'intermédiaire',
      compatibilityWithChildren: 'Bon pour observation',
      compatibilityWithOtherAnimals: 'Grégaire compatible congénères',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Ne pas relâcher en milieu naturel'] }, sources: [] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Certains États interdisent espèces exotiques (phasmes)'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Ne pas relâcher en milieu naturel. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },

  // Cafard (Blattes domestiques)
  {
    speciesId: 5296455,
    commonNameFr: 'Blatte Domestique',
    scientificName: 'Blattella germanica',
    category: 'insecte',
    subcategory: 'Blattaria',
    domesticationType: 'NAC',
    description: 'Petite blatte omnivore très adaptable, adulte 1-1.5cm, longévité 6-12 mois.',
    feeding: {
      dietType: 'omnivore',
      recommendedFoods: [
        { name: 'Fruits légumes variés', frequency: 'quotidienne' },
        { name: 'Protéines occasionnelles', frequency: 'hebdomadaire' },
      ],
      foodsToAvoid: [
        { name: 'Rien spécifique', reason: 'Très accommodantes' },
      ],
      mealFrequency: 'daily',
      specificNeeds: 'Omnivore très flexible peu exigeant',
    },
    habitat: {
      habitatType: 'cage',
      tempMin: 20,
      tempMax: 28,
      minSpaceSize: 'Terrarium 20x20x20cm',
      lightNeeds: 'Lumière modérée cycle 12h',
      activityEnrichment: 'Cachettes, substrat minimal',
      hygieneNotes: 'Nettoyage bihebdomadaire, humidité légère',
      costEstimate: 'faible',
    },
    behavior: {
      generalBehavior: 'Omnivore grégaire nocturne peu agressif',
      sociability: 'grégaire',
      difficultyLevel: 'débutant',
      compatibilityWithChildren: 'Bon si pas peur insectes',
      compatibilityWithOtherAnimals: 'Parfois nourriture reptiles, vérifier cohabitation',
    },
    legislation: [
      { country: 'FR', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Blattella germanica considérée nuisible ; détention à des fins pédagogiques ou alimentation reptile possible'] }, sources: [] },
      { country: 'US', status: 'allowed', details: { citesAppendix: null, permits: [], restrictions: ['Aucune restriction fédérale pour détention'] }, sources: [] },
      { country: 'BE', status: 'allowed', details: { citesAppendix: null, euAnnex: null, permits: [], restrictions: ['Détention pédagogique ou alimentation reptile. Règles régionales BE'] }, sources: ['https://www.health.belgium.be', 'https://environnement.wallonie.be'] },
    ],
  },
];

export const EXTENDED_SPECIES_COUNT = EXTENDED_SPECIES_DATABASE.length;
