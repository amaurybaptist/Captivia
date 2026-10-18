/** The generator places a single adult's equipment. It is not a thermal simulation. */
export type ProfileId =
  | 'leopard'
  | 'crested'
  | 'betta'
  | 'bearded'
  | 'corn'
  | 'python'
  | 'shrimp'
  | 'marine';
export type Dimensions = { width: number; depth: number; height: number };
export type ItemKind =
  | 'rock'
  | 'plant'
  | 'branch'
  | 'hide'
  | 'water'
  | 'filter'
  | 'heater'
  | 'lamp'
  | 'uvb'
  | 'probe'
  | 'pump'
  | 'skimmer';
export type HabitatItem = {
  id: string;
  kind: ItemKind;
  label: string;
  reason: string;
  placement: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation: number;
  locked: boolean;
  custom: boolean;
};
export type HabitatProfile = {
  id: ProfileId;
  name: string;
  scientificNames: string[];
  layout: 'terrestrial' | 'arboreal' | 'freshwater' | 'marine';
  occupancy: string;
  parameters: { label: string; value: string; context: string }[];
  habitat: string;
  category: string;
  defaults: Dimensions;
  reference: Dimensions;
  climate: string;
  care: string;
  substrate: string;
  substrateColor: string;
  source: { title: string; url: string };
};
export const PROFILES: HabitatProfile[] = [
  {
    id: 'leopard',
    layout: 'terrestrial',
    occupancy: 'Un adulte seul',
    parameters: [
      {
        label: 'Point chaud',
        value: '32–35 °C',
        context: 'Température de surface du point de chauffe, pas de tout le terrarium.',
      },
      {
        label: 'Refuges',
        value: 'Chaud · frais · humide',
        context: 'Préserver le choix du microclimat.',
      },
    ],
    name: 'Gecko léopard',
    scientificNames: ['Eublepharis macularius'],
    habitat: 'Terrarium terrestre',
    category: 'reptile',
    defaults: { width: 120, depth: 60, height: 60 },
    reference: { width: 92, depth: 46, height: 46 },
    climate: 'Un gradient thermique, un refuge humide et une zone fraîche.',
    care: 'Chauffage régulé par thermostat, UVB adaptés et températures mesurées aux points utiles. La distance des lampes dépend de leur notice et du grillage.',
    substrate:
      'Substrat adapté à l’âge et à l’état de santé ; décor stable, posé avant le substrat.',
    substrateColor: '#bca27b',
    source: {
      title: 'ReptiFiles — Leopard Gecko Care',
      url: 'https://reptifiles.com/leopard-gecko-care/',
    },
  },
  {
    id: 'crested',
    layout: 'arboreal',
    occupancy: 'Un adulte seul',
    parameters: [
      {
        label: 'Zone tempérée',
        value: '24–27 °C',
        context:
          'Repère de zone chaude publié 75–80 °F ; préserver une zone plus fraîche et éviter la surchauffe.',
      },
      {
        label: 'Humidité',
        value: '60–80 %',
        context:
          'Repère général publié ; prévoir une baisse entre les brumisations et une ventilation adaptée.',
      },
      {
        label: 'Priorité',
        value: 'Éviter la surchauffe',
        context: 'Mesurer les températures dans le feuillage et contrôler la ventilation.',
      },
      {
        label: 'Cycle de brumisation',
        value: 'Humide / plus sec',
        context: 'Laisser redescendre entre les brumisations ; contrôler avec un hygromètre.',
      },
    ],
    name: 'Gecko à crête',
    scientificNames: ['Correlophus ciliatus', 'Rhacodactylus ciliatus'],
    habitat: 'Vivarium arboricole',
    category: 'reptile',
    defaults: { width: 60, depth: 60, height: 120 },
    reference: { width: 60, depth: 60, height: 120 },
    climate:
      'Un volume vertical, des refuges feuillus et une humidité qui redescend entre les brumisations.',
    care: 'Éviter la surchauffe. Ventilation, hygromètre et thermomètre indispensables ; tout chauffage éventuel doit être régulé.',
    substrate:
      'Substrat retenant l’humidité sans rester détrempé ; drainage selon le type de plantation.',
    substrateColor: '#574635',
    source: {
      title: 'ReptiFiles — Crested Gecko Care',
      url: 'https://reptifiles.com/crested-gecko-care/',
    },
  },
  {
    id: 'betta',
    layout: 'freshwater',
    occupancy: 'Un betta seul, sans cohabitation proposée',
    parameters: [
      {
        label: 'Courant',
        value: 'Faible',
        context: 'Protéger l’aspiration du filtre et conserver une surface accessible.',
      },
      {
        label: 'Avant introduction',
        value: 'Bac cyclé',
        context: 'Vérifier ammoniac et nitrites, pas seulement la durée de mise en eau.',
      },
    ],
    name: 'Combattant — un individu',
    scientificNames: ['Betta splendens'],
    habitat: 'Aquarium d’eau douce',
    category: 'poisson',
    defaults: { width: 60, depth: 30, height: 40 },
    reference: { width: 60, depth: 30, height: 30 },
    climate:
      'Une eau chauffée et filtrée avec un faible courant, des refuges et une surface accessible.',
    care: 'Cycler l’aquarium avant introduction et contrôler les paramètres de l’eau. Prévoir un couvercle avec accès à l’air, sans obstacle en surface. Pas de cohabitation proposée.',
    substrate:
      'Sol adapté aux plantes, sans arêtes coupantes. Volume utile inférieur au volume brut affiché.',
    substrateColor: '#766b50',
    source: {
      title: 'OATA — Fiches de soins des poissons',
      url: 'https://ornamentalfish.org/what-we-do/advice-information/care-sheets/',
    },
  },
  {
    id: 'bearded',
    name: 'Agame barbu',
    scientificNames: ['Pogona vitticeps'],
    layout: 'terrestrial',
    occupancy: 'Un adulte seul',
    habitat: 'Terrarium désertique',
    category: 'reptile',
    defaults: { width: 180, depth: 60, height: 90 },
    reference: { width: 180, depth: 60, height: 90 },
    climate: 'Un point de chauffe de surface, une zone fraîche et un éclairage UVB adapté.',
    care: 'UVB indispensables : distance selon le modèle, le grillage et la mesure UV. Ne pas appliquer la température du point de chauffe à toute la cuve.',
    substrate:
      'Décor porteur stable, reliefs accessibles et substrat adapté à l’âge et à la santé.',
    substrateColor: '#c5a178',
    parameters: [
      {
        label: 'Point de chauffe',
        value: '41–46 °C',
        context: 'Repère de surface pour un adulte, à mesurer au thermomètre infrarouge.',
      },
      {
        label: 'UVB',
        value: 'Indispensables',
        context: 'Préserver une zone ombragée et remplacer la lampe selon sa notice.',
      },
    ],
    source: {
      title: 'ReptiFiles — Bearded Dragon Care',
      url: 'https://reptifiles.com/bearded-dragon-care/',
    },
  },
  {
    id: 'corn',
    name: 'Serpent des blés',
    scientificNames: ['Pantherophis guttatus', 'Elaphe guttata'],
    layout: 'terrestrial',
    occupancy: 'Un adulte seul',
    habitat: 'Terrarium semi-arboricole',
    category: 'reptile',
    defaults: { width: 150, depth: 60, height: 90 },
    reference: { width: 150, depth: 60, height: 60 },
    climate: 'Des refuges aux deux extrémités du gradient et des branches sécurisées.',
    care: 'La longueur utile doit au moins permettre au serpent de s’étendre : augmenter la référence si sa taille le nécessite. Fermeture anti-évasion et chauffage régulé.',
    substrate: 'Substrat permettant de fouir, cachettes ajustées et support de grimpe stable.',
    substrateColor: '#9b805b',
    parameters: [
      {
        label: 'Point chaud',
        value: '29–32 °C',
        context: 'Repère de zone chauffée, avec une zone fraîche séparée.',
      },
      {
        label: 'Humidité',
        value: '40–60 %',
        context: 'Repère général à adapter à la mue et à la ventilation.',
      },
    ],
    source: {
      title: 'ReptiFiles — Corn Snake Care',
      url: 'https://reptifiles.com/corn-snake-care-guide/',
    },
  },
  {
    id: 'python',
    name: 'Python royal',
    scientificNames: ['Python regius'],
    layout: 'terrestrial',
    occupancy: 'Un adulte seul',
    habitat: 'Terrarium tropical terrestre',
    category: 'reptile',
    defaults: { width: 150, depth: 70, height: 90 },
    reference: { width: 150, depth: 70, height: 60 },
    climate: 'Des refuges ajustés, une humidité contrôlée et des supports de grimpe solides.',
    care: 'Agrandir la cuve si le serpent dépasse la longueur de référence. Ne pas obtenir l’humidité en supprimant la ventilation ; contrôler les surfaces et réguler tout chauffage.',
    substrate:
      'Substrat retenant l’humidité sans être détrempé et coupelle d’eau stable adaptée au gabarit.',
    substrateColor: '#725c45',
    parameters: [
      {
        label: 'Point chaud',
        value: '30–32 °C',
        context: 'Repère de zone chauffée, avec possibilité de retrait vers une zone fraîche.',
      },
      {
        label: 'Humidité',
        value: '60–80 %',
        context: 'À mesurer ; éviter la condensation permanente et un sol détrempé.',
      },
    ],
    source: {
      title: 'ReptiFiles — Ball Python Care',
      url: 'https://reptifiles.com/ball-python-care-guide/',
    },
  },
  {
    id: 'shrimp',
    name: 'Crevettes Neocaridina',
    scientificNames: ['Neocaridina davidi', 'Neocaridina heteropoda'],
    layout: 'freshwater',
    occupancy: 'Groupe monospécifique, effectif à adapter au bac',
    habitat: 'Aquarium planté d’eau douce',
    category: 'poisson',
    defaults: { width: 60, depth: 30, height: 40 },
    reference: { width: 45, depth: 30, height: 30 },
    climate: 'Un bac mature et planté avec une filtration douce et une aspiration protégée.',
    care: 'Acclimatation progressive, paramètres stables et absence de produits contenant du cuivre non adaptés aux invertébrés. Le chauffage n’est pas systématique : le choisir selon la pièce et la souche.',
    substrate: 'Sol compatible avec les paramètres de la souche ; mousses et supports à biofilm.',
    substrateColor: '#5e5949',
    parameters: [
      {
        label: 'Filtration',
        value: 'Aspiration protégée',
        context: 'Une mousse fine protège notamment les juvéniles.',
      },
      {
        label: 'Priorité',
        value: 'Stabilité de l’eau',
        context: 'Contrôler les paramètres et éviter les variations brutales.',
      },
    ],
    source: {
      title: 'OATA — Fiches invertébrés d’eau douce',
      url: 'https://ornamentalfish.org/what-we-do/advice-information/care-sheets/',
    },
  },
  {
    id: 'marine',
    name: 'Aquarium marin — plan technique',
    scientificNames: [],
    layout: 'marine',
    occupancy: 'Population à définir avant tout achat d’animaux',
    habitat: 'Aquarium d’eau de mer',
    category: 'poisson',
    defaults: { width: 100, depth: 50, height: 50 },
    reference: { width: 80, depth: 40, height: 40 },
    climate: 'Une base technique avec circulation d’eau, filtration et roches stables.',
    care: 'Ce modèle n’attribue aucune population automatiquement. Choisir poissons, coraux et invertébrés avant de fixer le volume, le brassage et l’éclairage ; vérifier leur compatibilité avec un spécialiste.',
    substrate:
      'Roches compatibles avec l’eau de mer, structure stable et accès au nettoyage des vitres.',
    substrateColor: '#c8c6ae',
    parameters: [
      {
        label: 'Avant introduction',
        value: 'Cycle et stabilité',
        context: 'Mesurer salinité, température, ammoniac, nitrites et nitrates.',
      },
      {
        label: 'Éclairage',
        value: 'Selon la population',
        context:
          'Un bac avec coraux exige un dimensionnement différent d’un bac de poissons seuls.',
      },
    ],
    source: {
      title: 'OATA — Installation d’un aquarium marin',
      url: 'https://ornamentalfish.org/what-we-do/advice-information/care-sheets/',
    },
  },
];
export const isAquatic = (profile: HabitatProfile) =>
  profile.layout === 'freshwater' || profile.layout === 'marine';
export const getProfile = (id: string) => PROFILES.find((p) => p.id === id);
export function matchProfile(scientificName: string): HabitatProfile | undefined {
  const name = scientificName.trim().toLowerCase();
  return PROFILES.find((p) =>
    p.scientificNames.some(
      (n) => name === n.toLowerCase() || name.startsWith(`${n.toLowerCase()} `)
    )
  );
}
export function dimensionError(d: Dimensions, profile: HabitatProfile): string | null {
  if ([d.width, d.depth, d.height].some((n) => !Number.isFinite(n) || n < 10 || n > 300))
    return 'Entrez trois dimensions comprises entre 10 et 300 cm.';
  const r = profile.reference;
  // The thermal gradient and swimming lane run along the entered length.
  const fitsFloor = d.width >= r.width && d.depth >= r.depth;
  if (!fitsFloor || d.height < r.height)
    return `Ce modèle nécessite au moins ${r.width} × ${r.depth} × ${r.height} cm (L × P × H). Ce sont les dimensions de référence du concepteur, pas un seuil légal universel.`;
  return null;
}
export function generateLayout(
  profile: HabitatProfile,
  d: Dimensions,
  variant: number
): HabitatItem[] {
  if (dimensionError(d, profile)) return [];
  const w = d.width / 100,
    h = d.height / 100,
    z = d.depth / 100;
  const floor = isAquatic(profile) ? 0.04 : 0.06;
  const mirror = variant % 2 === 0 ? 1 : -1;
  const offset = ((Math.floor(variant / 2) % 3) - 1) * 0.025;
  const items: HabitatItem[] = [];
  const add = (
    id: string,
    kind: ItemKind,
    label: string,
    reason: string,
    placement: string,
    x: number,
    depth: number,
    size: [number, number, number],
    color: string,
    elevation?: number
  ) => {
    items.push({
      id,
      kind,
      label,
      reason,
      placement,
      position: [x === 0 ? 0 : x * w * mirror, elevation ?? floor + size[1] / 2, depth * z],
      size,
      color,
      rotation: 0,
      locked: ['lamp', 'uvb', 'probe', 'filter', 'heater', 'pump', 'skimmer'].includes(kind),
      custom: false,
    });
  };
  if (profile.layout === 'terrestrial') {
    const hide: [number, number, number] = [
      Math.min(w * 0.22, 0.27),
      0.12,
      Math.min(z * 0.28, 0.2),
    ];
    add(
      'warm-hide',
      'hide',
      'Refuge chaud',
      'Un refuge opaque dans la zone chauffée.',
      'Au sol, côté chaud',
      -0.3,
      -0.22 + offset,
      hide,
      '#887455'
    );
    add(
      'cool-hide',
      'hide',
      'Refuge frais',
      'Permet de choisir une température plus basse.',
      'Au sol, à l’opposé du chauffage',
      0.3,
      -0.22,
      hide,
      '#9a8a70'
    );
    add(
      'humid-hide',
      'hide',
      'Refuge humide',
      'Un microclimat humide pour la mue.',
      'Au centre, accessible',
      0,
      0.03 + offset,
      hide,
      '#716852'
    );
    add(
      'water',
      'water',
      'Coupelle d’eau',
      'De l’eau propre, dans une coupelle stable.',
      'Avant, côté frais',
      0.31,
      0.29,
      [0.14, 0.025, 0.11],
      '#88b8bb'
    );
    add(
      'basking-rock',
      'rock',
      'Pierre stable',
      'Support sous la zone chauffée ; stabilité à vérifier.',
      'Avant, côté chaud',
      -0.3,
      0.26,
      [Math.min(w * 0.24, 0.3), 0.065, Math.min(z * 0.28, 0.18)],
      '#94836b'
    );
    add(
      'lamp',
      'lamp',
      'Chauffage + thermostat',
      'Installation hors d’atteinte ; puissance et distance à déterminer selon le matériel.',
      'Au-dessus, côté chaud',
      -0.3,
      -0.18,
      [0.12, 0.08, 0.12],
      '#c99c5c',
      h + 0.09
    );
    add(
      'uvb',
      'uvb',
      'Rampe UVB adaptée',
      'Créer une zone éclairée et préserver des refuges ombragés.',
      'Extérieur, au-dessus de la cuve',
      -0.12,
      -0.3,
      [w * 0.46, 0.025, 0.04],
      '#eee6ba',
      h + 0.025
    );
    add(
      'probe',
      'probe',
      'Sondes et thermostat',
      'Contrôler réellement les températures ; la 3D ne les simule pas.',
      'Zone chaude et contrôle côté frais',
      -0.34,
      -0.4,
      [0.025, 0.045, 0.025],
      '#3b645b'
    );
  } else if (profile.layout === 'arboreal') {
    add(
      'branch-a',
      'branch',
      'Réseau de branches',
      'Des chemins de grimpe à plusieurs hauteurs.',
      'De bas en haut, vers le fond',
      -0.18,
      -0.1,
      [w * 0.47, h * 0.64, z * 0.18],
      '#826346',
      h * 0.43
    );
    add(
      'branch-b',
      'branch',
      'Perchoir transversal',
      'Relier les refuges sans imposer de saut.',
      'À mi-hauteur',
      0.08,
      0.08 + offset,
      [w * 0.7, 0.055, 0.065],
      '#957552',
      h * 0.56
    );
    add(
      'plant-left',
      'plant',
      'Feuillage protecteur',
      'Des refuges visuels dans le volume supérieur.',
      'Arrière gauche',
      -0.28,
      -0.27,
      [w * 0.32, h * 0.5, z * 0.3],
      '#49754b',
      h * 0.65
    );
    add(
      'plant-right',
      'plant',
      'Végétation basse',
      'Des feuilles pour s’abriter à différents niveaux.',
      'Arrière droit',
      0.28,
      -0.22,
      [w * 0.3, h * 0.43, z * 0.34],
      '#5b8250'
    );
    add(
      'hide',
      'hide',
      'Refuge en hauteur',
      'Un abri sécurisé et solidement fixé.',
      'Fond, partie supérieure',
      0.2,
      -0.28,
      [w * 0.28, 0.12, z * 0.25],
      '#7d6852',
      h * 0.76
    );
    add(
      'feeding',
      'water',
      'Plateforme de nourrissage',
      'Un point de nourrissage accessible depuis les branches.',
      'Côté, à mi-hauteur',
      0.35,
      0.22,
      [0.1, 0.025, 0.09],
      '#94a98a',
      h * 0.55
    );
    add(
      'probe',
      'probe',
      'Thermomètre / hygromètre',
      'Mesurer les conditions et adapter brumisation et ventilation.',
      'Fond, hors contact avec la brumisation',
      -0.35,
      -0.4,
      [0.04, 0.07, 0.025],
      '#3b645b',
      h * 0.63
    );
    add(
      'uvb',
      'uvb',
      'Éclairage adapté',
      'Cycle jour/nuit et UVB selon la fiche de soins ; éviter la surchauffe.',
      'À l’extérieur, au-dessus du grillage',
      0,
      -0.2,
      [w * 0.64, 0.025, 0.04],
      '#eee6ba',
      h + 0.025
    );
  } else {
    add(
      'filter',
      'filter',
      'Filtre à faible courant',
      'Filtration biologique ; protéger l’aspiration et limiter le courant.',
      'Fond, dans un angle',
      -0.38,
      -0.35,
      [0.065, h * 0.49, 0.06],
      '#374d4a',
      h * 0.48
    );
    add(
      'heater',
      'heater',
      'Chauffage régulé',
      'Respecter l’immersion et la position autorisées par le fabricant.',
      'Fond, près de la circulation d’eau',
      0.38,
      -0.36,
      [0.022, h * 0.56, 0.022],
      '#4e6261',
      h * 0.48
    );
    add(
      'plant-left',
      'plant',
      'Plantes d’arrière-plan',
      'Refuges visuels, sans condamner la surface.',
      'Arrière gauche',
      -0.22,
      -0.2,
      [w * 0.23, h * 0.64, z * 0.28],
      '#527c4a'
    );
    add(
      'plant-right',
      'plant',
      'Plantes à feuilles souples',
      'Préserver les nageoires et créer des zones de repos.',
      'Arrière droit',
      0.22,
      -0.17,
      [w * 0.25, h * 0.56, z * 0.3],
      '#65904e'
    );
    add(
      'rock',
      'rock',
      'Roche lisse',
      'Décor stable, non coupant, sans passage où rester coincé.',
      'Au centre, vers le fond',
      0.02,
      -0.16 + offset,
      [w * 0.24, h * 0.22, z * 0.32],
      '#8d8c7b'
    );
    add(
      'rest',
      'plant',
      'Repos près de la surface',
      'Un support souple sous la surface avec accès libre à l’air.',
      'Côté, partie supérieure',
      0.3,
      0.18,
      [0.1, 0.05, 0.08],
      '#7a9c5a',
      h * 0.76
    );
    add(
      'lamp',
      'uvb',
      'Éclairage pour les plantes',
      'Un cycle régulier ; choisir une intensité adaptée aux plantes.',
      'Au-dessus du couvercle',
      0,
      0,
      [w * 0.76, 0.025, 0.04],
      '#dfe6ba',
      h + 0.025
    );
  }
  if (profile.id === 'corn' || profile.id === 'python') {
    for (const item of items.filter((i) => i.kind === 'hide')) {
      item.size = [Math.min(w * 0.24, 0.36), 0.16, Math.min(z * 0.31, 0.28)];
      item.position[1] = floor + 0.08;
    }
    const water = items.find((i) => i.id === 'water');
    if (water) {
      water.size = [0.25, 0.045, 0.18];
      water.position[1] = floor + 0.0225;
    }
    const rock = items.findIndex((i) => i.id === 'basking-rock');
    if (rock >= 0) items.splice(rock, 1);
    add(
      'climbing',
      'branch',
      'Branche solidement fixée',
      'Support adapté au poids de l’animal, sans risque d’écrasement.',
      'Fond, entre les refuges',
      0,
      -0.3,
      [w * 0.55, 0.12, 0.08],
      '#826346',
      h * 0.45
    );
  }
  if (profile.id === 'bearded') {
    const humid = items.findIndex((i) => i.id === 'humid-hide');
    if (humid >= 0) items.splice(humid, 1);
    const uvb = items.find((i) => i.id === 'uvb');
    if (uvb) uvb.size[0] = w * 0.6;
    const stone = items.find((i) => i.id === 'basking-rock');
    if (stone) {
      stone.size = [Math.min(w * 0.3, 0.5), 0.12, Math.min(z * 0.32, 0.25)];
      stone.position[1] = floor + 0.06;
    }
  }
  if (profile.id === 'shrimp') {
    const heater = items.findIndex((i) => i.id === 'heater');
    if (heater >= 0) items.splice(heater, 1);
    const rest = items.find((i) => i.id === 'rest');
    if (rest) {
      rest.label = 'Mousse et support à biofilm';
      rest.reason = 'Refuges pour les juvéniles et surface de pâturage.';
      rest.placement = 'Au sol, en zone abritée';
      rest.position[1] = floor + 0.025;
    }
    const filter = items.find((i) => i.id === 'filter');
    if (filter) {
      filter.label = 'Filtre avec aspiration protégée';
      filter.reason = 'Mousse fine et courant modéré pour protéger les juvéniles.';
    }
  }
  if (profile.layout === 'marine') {
    for (let i = items.length - 1; i >= 0; i--)
      if (items[i].kind === 'plant' || items[i].id === 'rock') items.splice(i, 1);
    const filtration = items.find((i) => i.id === 'filter');
    if (filtration) {
      filtration.label = 'Filtration biologique adaptée';
      filtration.reason =
        'Système à dimensionner selon le volume utile et la population ; maintenir l’accès d’entretien.';
    }
    add(
      'rock-left',
      'rock',
      'Roches de structure',
      'Structure stable ; conserver des passages pour le brassage et le nettoyage.',
      'Fond gauche',
      -0.22,
      -0.13,
      [w * 0.23, h * 0.42, z * 0.32],
      '#aaa99b'
    );
    add(
      'rock-right',
      'rock',
      'Îlot rocheux',
      'Ne pas appuyer le décor contre les vitres.',
      'Fond droit',
      0.22,
      -0.1,
      [w * 0.21, h * 0.34, z * 0.3],
      '#aaa99b'
    );
    add(
      'pump',
      'pump',
      'Pompe de brassage protégée',
      'Débit à dimensionner selon les animaux accueillis ; éviter les zones mortes.',
      'Paroi, partie supérieure',
      0.39,
      0.28,
      [0.07, 0.07, 0.07],
      '#40585d',
      h * 0.64
    );
    add(
      'skimmer',
      'skimmer',
      'Écumeur selon le système',
      'Prévoir un compartiment technique et un accès d’entretien ; dimensionner selon le bac.',
      'Fond, emplacement technique indicatif',
      0,
      -0.37,
      [0.08, h * 0.5, 0.09],
      '#6c8a8c',
      h * 0.48
    );
    const lighting = items.find((i) => i.id === 'lamp');
    if (lighting) {
      lighting.label = 'Éclairage marin à dimensionner';
      lighting.reason = 'Puissance et spectre dépendent de la présence et des besoins des coraux.';
    }
  }
  return items;
}
export type SavedHabitat = {
  version: 1;
  profileId: ProfileId;
  dimensions: Dimensions;
  variant: number;
  animalId: string;
  savedAt: string;
};
export function parseSavedHabitat(raw: string): SavedHabitat | null {
  try {
    const d = JSON.parse(raw) as SavedHabitat;
    const p = getProfile(d.profileId);
    if (
      d.version !== 1 ||
      !p ||
      !d.dimensions ||
      dimensionError(d.dimensions, p) ||
      !Number.isSafeInteger(d.variant) ||
      d.variant < 0 ||
      d.variant > 99999 ||
      typeof d.animalId !== 'string' ||
      typeof d.savedAt !== 'string'
    )
      return null;
    return d;
  } catch {
    return null;
  }
}
