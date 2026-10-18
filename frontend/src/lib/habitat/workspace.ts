import {
  dimensionError,
  generateLayout,
  getProfile,
  isAquatic,
  type Dimensions,
  type HabitatItem,
  type HabitatProfile,
  type ProfileId,
} from './planner';

/** Identifiers are not credentials; getRandomValues also works on local HTTP devices. */
export function clientId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export type HabitatSnapshot = {
  version: 2;
  profileId: ProfileId;
  dimensions: Dimensions;
  variant: number;
  animalId: string;
  items: HabitatItem[];
  checked: string[];
  notes: string;
};
export type HabitatProject = {
  id: string;
  name: string;
  snapshot: HabitatSnapshot;
  revision: number;
  updatedAt: string;
};
// Compare semantic fields, allowing sub-nanometre serialization differences through Prisma/JSONB.
export const habitatSignature = (name: string, snapshot: HabitatSnapshot) =>
  JSON.stringify(
    {
      name,
      profileId: snapshot.profileId,
      dimensions: [
        snapshot.dimensions.width,
        snapshot.dimensions.depth,
        snapshot.dimensions.height,
      ],
      variant: snapshot.variant,
      animalId: snapshot.animalId,
      notes: snapshot.notes,
      checked: [...snapshot.checked].sort(),
      items: snapshot.items.map((item) => [
        item.id,
        item.kind,
        item.label,
        item.reason,
        item.placement,
        item.position,
        item.size,
        item.color,
        item.rotation,
        item.locked,
        item.custom,
      ]),
    },
    (_key, value: unknown) => (typeof value === 'number' ? Math.round(value * 1e9) / 1e9 : value),
  );
export type LayoutIssue = { severity: 'error' | 'warning'; message: string; itemId?: string };
export function newSnapshot(
  profileId: ProfileId,
  dimensions: Dimensions,
  variant = 0,
  animalId = '',
): HabitatSnapshot {
  const profile = getProfile(profileId)!;
  return {
    version: 2,
    profileId,
    dimensions: { ...dimensions },
    variant,
    animalId,
    items: generateLayout(profile, dimensions, variant),
    checked: [],
    notes: '',
  };
}
export const floorHeight = (profile: HabitatProfile) => (isAquatic(profile) ? 0.04 : 0.06);
export const isExternal = (item: HabitatItem) =>
  !item.custom && (item.kind === 'lamp' || item.kind === 'uvb');
export const isRequired = (item: HabitatItem, profile: HabitatProfile) =>
  !item.custom &&
  item.kind !== 'rock' &&
  item.kind !== 'skimmer' &&
  (item.kind !== 'plant' || profile.layout === 'arboreal');
export function footprint(item: HabitatItem): [number, number] {
  const c = Math.abs(Math.cos(item.rotation)),
    s = Math.abs(Math.sin(item.rotation));
  return [item.size[0] * c + item.size[2] * s, item.size[2] * c + item.size[0] * s];
}
export function clampItem(item: HabitatItem, d: Dimensions, profile: HabitatProfile): HabitatItem {
  const size = [...item.size] as [number, number, number];
  size[0] = Math.min(size[0], d.width / 100 - 0.02);
  size[2] = Math.min(size[2], d.depth / 100 - 0.02);
  size[1] = Math.min(size[1], d.height / 100 - floorHeight(profile) - 0.01);
  let result = { ...item, size };
  const [fw, fd] = footprint(result);
  const ratio = Math.min(1, (d.width / 100 - 0.02) / fw, (d.depth / 100 - 0.02) / fd);
  if (ratio < 1) result = { ...result, size: [size[0] * ratio, size[1], size[2] * ratio] };
  const [rw, rd] = footprint(result);
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  result.position = [
    clamp(item.position[0], -d.width / 200 + rw / 2 + 0.005, d.width / 200 - rw / 2 - 0.005),
    isExternal(item)
      ? item.position[1]
      : clamp(item.position[1], floorHeight(profile) + size[1] / 2, d.height / 100 - size[1] / 2),
    clamp(item.position[2], -d.depth / 200 + rd / 2 + 0.005, d.depth / 200 - rd / 2 - 0.005),
  ];
  return result;
}
export function inspectLayout(snapshot: HabitatSnapshot): LayoutIssue[] {
  const p = getProfile(snapshot.profileId);
  if (!p) return [{ severity: 'error', message: 'Profil inconnu.' }];
  const dimensionProblem = dimensionError(snapshot.dimensions, p);
  if (dimensionProblem) return [{ severity: 'error', message: dimensionProblem }];
  const issues: LayoutIssue[] = [];
  const base = generateLayout(p, snapshot.dimensions, snapshot.variant);
  for (const required of base.filter((item) => isRequired(item, p))) {
    if (
      !snapshot.items.some(
        (item) => item.id === required.id && item.kind === required.kind && !item.custom,
      )
    )
      issues.push({
        severity: 'error',
        message: `Élément indispensable manquant : ${required.label}.`,
      });
  }
  const { width, depth, height } = snapshot.dimensions;
  for (const item of snapshot.items) {
    const [fw, fd] = footprint(item),
      [x, y, z] = item.position;
    if (
      Math.abs(x) + fw / 2 > width / 200 + 0.002 ||
      Math.abs(z) + fd / 2 > depth / 200 + 0.002 ||
      (!isExternal(item) &&
        (y - item.size[1] / 2 < -0.002 || y + item.size[1] / 2 > height / 100 + 0.002))
    )
      issues.push({
        severity: 'error',
        message: `${item.label} dépasse les limites de la cuve.`,
        itemId: item.id,
      });
    if (isExternal(item) && y - item.size[1] / 2 < height / 100)
      issues.push({
        severity: 'error',
        message: `${item.label} doit rester à l’extérieur de la cuve.`,
        itemId: item.id,
      });
  }
  const opaque = snapshot.items.filter((i) =>
    ['hide', 'rock', 'water', 'filter', 'heater', 'pump', 'skimmer'].includes(i.kind),
  );
  for (let a = 0; a < opaque.length; a++)
    for (let b = a + 1; b < opaque.length; b++) {
      const first = opaque[a],
        second = opaque[b],
        [aw, ad] = footprint(first),
        [bw, bd] = footprint(second);
      if (
        Math.abs(first.position[0] - second.position[0]) < (aw + bw) / 2 - 0.012 &&
        Math.abs(first.position[2] - second.position[2]) < (ad + bd) / 2 - 0.012 &&
        Math.abs(first.position[1] - second.position[1]) <
          (first.size[1] + second.size[1]) / 2 - 0.012
      )
        issues.push({
          severity: 'warning',
          message: `Chevauchement possible : ${first.label} / ${second.label}. Vérifiez l’espace réel.`,
          itemId: first.id,
        });
    }
  const warm = snapshot.items.find((i) => i.id === 'warm-hide'),
    lamp = snapshot.items.find((i) => i.id === 'lamp');
  if (
    warm &&
    lamp &&
    p.layout === 'terrestrial' &&
    Math.abs(warm.position[0] - lamp.position[0]) > width / 400
  )
    issues.push({
      severity: 'warning',
      message: 'Le refuge chaud est éloigné du chauffage : vérifier le gradient réel.',
      itemId: warm.id,
    });
  if (isAquatic(p))
    issues.push({
      severity: 'warning',
      message:
        'Volume brut uniquement : soustraire sol, décor et marge d’air. Cyclage et paramètres d’eau à vérifier avant introduction.',
    });
  return issues.slice(0, 20);
}
const KINDS = new Set([
  'rock',
  'plant',
  'branch',
  'hide',
  'water',
  'filter',
  'heater',
  'lamp',
  'uvb',
  'probe',
  'pump',
  'skimmer',
]);
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const tuple = (v: unknown, low: number, high: number): v is [number, number, number] =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= low && n <= high);
export function parseSnapshot(input: unknown): HabitatSnapshot | null {
  if (!record(input) || input.version !== 2 || !text(input.profileId, 30)) return null;
  const profile = getProfile(input.profileId);
  if (
    !profile ||
    !record(input.dimensions) ||
    ![input.dimensions.width, input.dimensions.depth, input.dimensions.height].every(
      (value) => typeof value === 'number',
    )
  )
    return null;
  const d = {
    width: Number(input.dimensions.width),
    depth: Number(input.dimensions.depth),
    height: Number(input.dimensions.height),
  };
  if (
    dimensionError(d, profile) ||
    !Number.isSafeInteger(input.variant) ||
    Number(input.variant) < 0 ||
    Number(input.variant) > 99999 ||
    !text(input.animalId, 100) ||
    !text(input.notes, 3000)
  )
    return null;
  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 80 ||
    !Array.isArray(input.checked) ||
    input.checked.length > 100 ||
    !input.checked.every((id) => text(id, 100))
  )
    return null;
  const items: HabitatItem[] = [],
    ids = new Set<string>();
  for (const item of input.items) {
    if (
      !record(item) ||
      !text(item.id, 64) ||
      !/^[a-zA-Z0-9_-]+$/.test(item.id) ||
      ids.has(item.id) ||
      !text(item.kind, 20) ||
      !KINDS.has(item.kind)
    )
      return null;
    if (
      !text(item.label, 80) ||
      !item.label.trim() ||
      !text(item.reason, 400) ||
      !text(item.placement, 160) ||
      !text(item.color, 7) ||
      !/^#[\da-fA-F]{6}$/.test(item.color)
    )
      return null;
    if (
      !tuple(item.position, -5, 5) ||
      !tuple(item.size, 0.005, 5) ||
      typeof item.rotation !== 'number' ||
      !Number.isFinite(item.rotation) ||
      Math.abs(item.rotation) > Math.PI * 2 ||
      typeof item.locked !== 'boolean' ||
      typeof item.custom !== 'boolean'
    )
      return null;
    ids.add(item.id);
    items.push({
      id: item.id,
      kind: item.kind as HabitatItem['kind'],
      label: item.label,
      reason: item.reason,
      placement: item.placement,
      color: item.color,
      position: [...item.position],
      size: [...item.size],
      rotation: item.rotation,
      locked: item.locked,
      custom: item.custom,
    });
  }
  const snapshot: HabitatSnapshot = {
    version: 2,
    profileId: profile.id,
    dimensions: d,
    variant: Number(input.variant),
    animalId: input.animalId,
    notes: input.notes,
    items,
    checked: [...new Set(input.checked as string[])],
  };
  if (new TextEncoder().encode(JSON.stringify(snapshot)).byteLength > 80000) return null;
  return inspectLayout(snapshot).some((issue) => issue.severity === 'error') ? null : snapshot;
}
export type CatalogEntry = {
  key: string;
  kind: HabitatItem['kind'];
  label: string;
  size: [number, number, number];
  color: string;
  environments: HabitatProfile['layout'][];
};
export const CATALOG: CatalogEntry[] = [
  {
    key: 'rock',
    kind: 'rock',
    label: 'Roche stable',
    size: [0.18, 0.1, 0.14],
    color: '#94836b',
    environments: ['terrestrial', 'arboreal', 'freshwater', 'marine'],
  },
  {
    key: 'branch',
    kind: 'branch',
    label: 'Branche / racine',
    size: [0.28, 0.1, 0.08],
    color: '#826346',
    environments: ['terrestrial', 'arboreal', 'freshwater'],
  },
  {
    key: 'foliage',
    kind: 'plant',
    label: 'Plante compatible à choisir',
    size: [0.18, 0.3, 0.18],
    color: '#527c4a',
    environments: ['terrestrial', 'arboreal', 'freshwater'],
  },
  {
    key: 'hide',
    kind: 'hide',
    label: 'Refuge supplémentaire',
    size: [0.2, 0.13, 0.17],
    color: '#887455',
    environments: ['terrestrial', 'arboreal', 'freshwater', 'marine'],
  },
  {
    key: 'water',
    kind: 'water',
    label: 'Coupelle supplémentaire',
    size: [0.14, 0.025, 0.14],
    color: '#88b8bb',
    environments: ['terrestrial', 'arboreal'],
  },
  {
    key: 'probe',
    kind: 'probe',
    label: 'Sonde de contrôle',
    size: [0.025, 0.045, 0.025],
    color: '#3b645b',
    environments: ['terrestrial', 'arboreal', 'freshwater', 'marine'],
  },
];
export function catalogItem(entry: CatalogEntry, snapshot: HabitatSnapshot): HabitatItem | null {
  if (snapshot.items.length >= 80) return null;
  const profile = getProfile(snapshot.profileId)!;
  if (!entry.environments.includes(profile.layout)) return null;
  const item: HabitatItem = {
    id: `custom-${clientId()}`,
    kind: entry.kind,
    label: entry.label,
    reason:
      'Choisir un matériau ou une espèce végétale réellement compatible avec l’animal et le milieu.',
    placement: 'Position personnalisée',
    size: [...entry.size],
    position: [0, floorHeight(profile) + entry.size[1] / 2, 0],
    rotation: 0,
    locked: false,
    custom: true,
    color: entry.color,
  };
  for (const z of [0.22, -0.25, 0, 0.36])
    for (const x of [0, -0.25, 0.25, -0.38, 0.38]) {
      const candidate = clampItem(
        {
          ...item,
          position: [
            (x * snapshot.dimensions.width) / 100,
            item.position[1],
            (z * snapshot.dimensions.depth) / 100,
          ],
        },
        snapshot.dimensions,
        profile,
      );
      const probe = inspectLayout({ ...snapshot, items: [...snapshot.items, candidate] });
      if (
        !probe.some(
          (issue) =>
            issue.itemId === candidate.id ||
            (issue.severity === 'warning' && issue.message.includes(candidate.label)),
        )
      )
        return candidate;
    }
  return null;
}
export function checklistFor(
  snapshot: HabitatSnapshot,
): { id: string; label: string; detail: string }[] {
  const profile = getProfile(snapshot.profileId)!;
  return [
    ...snapshot.items.map((item) => ({ id: item.id, label: item.label, detail: item.reason })),
    {
      id: 'support',
      label: 'Support stable et dimensionné',
      detail:
        'Tenir compte du poids de la cuve, du décor et de l’eau. Vérifier la charge admissible du meuble et du sol.',
    },
    ...(isAquatic(profile)
      ? [
          {
            id: 'prepared-water',
            label:
              profile.layout === 'marine'
                ? 'Eau osmosée, sel marin et mesure de salinité'
                : 'Eau préparée pour la population',
            detail:
              profile.layout === 'marine'
                ? 'Utiliser un sel aquariophile adapté et un instrument de salinité calibré ; ne pas doser à l’œil.'
                : 'Vérifier la source d’eau, les paramètres adaptés et le traitement éventuel du chlore ou des chloramines.',
          },
        ]
      : []),
    ...(profile.layout === 'marine'
      ? [
          {
            id: 'evaporation',
            label: 'Compensation de l’évaporation',
            detail:
              'Compenser avec de l’eau douce adaptée : le sel ne s’évapore pas avec l’eau. Contrôler la salinité.',
          },
        ]
      : []),
    ...(isAquatic(profile)
      ? [
          {
            id: 'water-tests',
            label: 'Tests d’eau adaptés au milieu',
            detail:
              'Ammoniac, nitrites, nitrates et paramètres propres à la population ; salinité en eau de mer.',
          },
          {
            id: 'cycle',
            label: 'Cyclage et acclimatation',
            detail:
              'Vérifier les mesures avant introduction ; un calendrier seul ne valide pas le cycle.',
          },
          {
            id: 'maintenance',
            label: 'Matériel d’entretien',
            detail: 'Siphon, seau réservé au bac et accès libre aux vitres et à la filtration.',
          },
          {
            id: 'cover',
            label: 'Couvercle / protection adaptés',
            detail: 'Limiter les évasions en maintenant les échanges gazeux.',
          },
        ]
      : [
          {
            id: 'thermostat',
            label:
              profile.layout === 'arboreal'
                ? 'Thermostat si un chauffage est nécessaire'
                : 'Thermostat pour tout chauffage',
            detail: 'Compatible avec le chauffage, sonde sécurisée et réglages contrôlés.',
          },
          {
            id: 'climate-meter',
            label: 'Mesure température / humidité',
            detail: 'Mesures dans plusieurs zones et vérification du gradient réel.',
          },
          {
            id: 'ventilation',
            label: 'Ventilation et fermeture sécurisée',
            detail: 'Échanges d’air suffisants, sans permettre la fuite de l’animal.',
          },
          {
            id: 'fixings',
            label: 'Fixations et supports',
            detail: 'Chaque élément porteur doit résister au poids de l’animal sans basculer.',
          },
        ]),
  ];
}
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
