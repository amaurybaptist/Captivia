import { habitatSignature } from '../workspace';
import { TextEncoder } from 'node:util';
import { PROFILES, dimensionError, getProfile, matchProfile } from '../planner';
import {
  CATALOG,
  catalogItem,
  clampItem,
  inspectLayout,
  isRequired,
  newSnapshot,
  parseSnapshot,
} from '../workspace';
Object.assign(globalThis, { TextEncoder });

const cases = PROFILES.flatMap((profile) =>
  Array.from({ length: 6 }, (_, variant) => ({ profile, variant })),
);
describe('Habitats — invariants de bien-être et de géométrie', () => {
  it.each(cases)(
    '$profile.id variante $variant reste dans les limites et se sauvegarde sans perte',
    ({ profile, variant }) => {
      for (const dimensions of [
        profile.reference,
        profile.defaults,
        { width: 300, depth: 300, height: 300 },
      ]) {
        const snapshot = newSnapshot(profile.id, dimensions, variant);
        snapshot.notes = 'Notes avec accents, <balise> et caractères 🦎';
        expect(inspectLayout(snapshot).filter((issue) => issue.severity === 'error')).toEqual([]);
        expect(parseSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
        expect(new Set(snapshot.items.map((item) => item.id)).size).toBe(snapshot.items.length);
      }
    },
  );
  it('ne substitue pas la hauteur à la longueur du gradient', () => {
    const leopard = PROFILES[0];
    expect(dimensionError({ width: 46, depth: 46, height: 120 }, leopard)).not.toBeNull();
    expect(dimensionError({ width: NaN, depth: 60, height: 60 }, leopard)).not.toBeNull();
  });
  it('refuse une espèce inconnue plutôt que lui attribuer un reptile générique', () => {
    expect(matchProfile('Testudo hermanni')).toBeUndefined();
    expect(matchProfile('Betta splendens')).toMatchObject({ id: 'betta' });
    expect(matchProfile('Rhacodactylus ciliatus')).toMatchObject({ id: 'crested' });
  });
  it('ne prescrit pas un chauffage systématique aux Neocaridina', () => {
    const shrimp = PROFILES.find((profile) => profile.id === 'shrimp')!;
    expect(
      newSnapshot(shrimp.id, shrimp.defaults).items.some((item) => item.kind === 'heater'),
    ).toBe(false);
  });
  it('refuse un import supprimant une fonction essentielle', () => {
    const snapshot = newSnapshot('betta', { width: 60, depth: 30, height: 40 });
    snapshot.items = snapshot.items.filter((item) => item.kind !== 'filter');
    expect(parseSnapshot(snapshot)).toBeNull();
  });
  it('bloque un objet dépassant la cuve après rotation', () => {
    const snapshot = newSnapshot('leopard', PROFILES[0].defaults);
    const item = snapshot.items[0];
    item.rotation = Math.PI / 4;
    item.position[0] = 0.59;
    expect(
      inspectLayout(snapshot).some(
        (issue) => issue.severity === 'error' && issue.itemId === item.id,
      ),
    ).toBe(true);
  });
  it('ramène un décor trop grand et tourné dans la cuve sans modifier la source', () => {
    const profile = PROFILES[0],
      snapshot = newSnapshot(profile.id, profile.defaults);
    const item = {
      ...snapshot.items[0],
      size: [5, 5, 5] as [number, number, number],
      position: [5, -5, 5] as [number, number, number],
      rotation: Math.PI / 4,
    };
    const clamped = clampItem(item, profile.defaults, profile);
    expect(item.size).toEqual([5, 5, 5]);
    expect(
      inspectLayout({ ...snapshot, items: [clamped, ...snapshot.items.slice(1)] }).filter(
        (issue) => issue.severity === 'error',
      ),
    ).toEqual([]);
  });
  it('autorise le retrait de l’écumeur optionnel, mais pas celui du filtre', () => {
    const profile = PROFILES.find((p) => p.id === 'marine')!;
    const snapshot = newSnapshot(profile.id, profile.defaults);
    expect(isRequired(snapshot.items.find((i) => i.kind === 'skimmer')!, profile)).toBe(false);
    expect(isRequired(snapshot.items.find((i) => i.kind === 'filter')!, profile)).toBe(true);
  });
  it('n’ajoute pas une plante terrestre au modèle marin', () => {
    const profile = PROFILES.find((p) => p.id === 'marine')!;
    expect(
      catalogItem(
        CATALOG.find((entry) => entry.key === 'foliage')!,
        newSnapshot(profile.id, profile.defaults),
      ),
    ).toBeNull();
  });
  it.each([null, {}, { version: 99 }, { version: 2, profileId: 'unsupported' }])(
    'refuse le fichier malformé %j',
    (input) => {
      expect(parseSnapshot(input)).toBeNull();
    },
  );
  it('refuse doublons et coordonnées non finies', () => {
    const snapshot = newSnapshot('leopard', PROFILES[0].defaults);
    snapshot.items.push({ ...snapshot.items[0] });
    expect(parseSnapshot(snapshot)).toBeNull();
    snapshot.items.pop();
    snapshot.items[0].position[1] = Infinity;
    expect(parseSnapshot(snapshot)).toBeNull();
  });
  it('refuse les dimensions encodées comme texte, comme l’API de sauvegarde', () => {
    const snapshot = newSnapshot('leopard', PROFILES[0].defaults);
    expect(
      parseSnapshot({ ...snapshot, dimensions: { ...snapshot.dimensions, width: '120' } }),
    ).toBeNull();
  });
});

describe('project dirty state after a database round trip', () => {
  it('ignores key order and floating-point transport noise', () => {
    const snapshot = newSnapshot('leopard', getProfile('leopard')!.defaults);
    const roundTrip = JSON.parse(
      JSON.stringify(snapshot, (_key, value: unknown) =>
        typeof value === 'number' ? Math.round(value * 1e12) / 1e12 : value,
      ),
    ) as typeof snapshot;
    roundTrip.items = roundTrip.items.map(
      (item) => Object.fromEntries(Object.entries(item).reverse()) as typeof item,
    );
    expect(habitatSignature('Mon habitat', snapshot)).toBe(
      habitatSignature('Mon habitat', roundTrip),
    );
  });
  it('still detects a millimetre edit or a changed name/note', () => {
    const snapshot = newSnapshot('leopard', getProfile('leopard')!.defaults);
    const changed = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
    changed.items[0].position[0] += 0.001;
    expect(habitatSignature('Mon habitat', snapshot)).not.toBe(
      habitatSignature('Mon habitat', changed),
    );
    expect(habitatSignature('Mon habitat', snapshot)).not.toBe(
      habitatSignature('Autre nom', snapshot),
    );
    expect(habitatSignature('Mon habitat', snapshot)).not.toBe(
      habitatSignature('Mon habitat', { ...snapshot, notes: 'À vérifier' }),
    );
  });
});
