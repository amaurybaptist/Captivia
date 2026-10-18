import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const PROFILES = new Set([
  'leopard',
  'crested',
  'betta',
  'bearded',
  'corn',
  'python',
  'shrimp',
  'marine',
]);
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
  v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length <= max;
const number = (v: unknown, low: number, high: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= low && v <= high;
const tuple = (v: unknown, low: number, high: number) =>
  Array.isArray(v) && v.length === 3 && v.every((n) => number(n, low, high));

/** Bounded data only: no remote asset paths, scripts or URLs are interpreted. */
export function validateHabitatSnapshot(
  input: unknown,
): Prisma.InputJsonObject {
  const fail = (): never => {
    throw new BadRequestException(
      'Le projet d’habitat est invalide ou trop volumineux.',
    );
  };
  if (!record(input)) return fail();
  try {
    if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 80000) return fail();
  } catch {
    return fail();
  }
  if (
    input.version !== 2 ||
    !text(input.profileId, 30) ||
    !PROFILES.has(input.profileId)
  )
    return fail();
  const d = input.dimensions;
  if (
    !record(d) ||
    !['width', 'depth', 'height'].every((key) => number(d[key], 10, 300))
  )
    return fail();
  if (
    !Number.isSafeInteger(input.variant) ||
    !number(input.variant, 0, 99999) ||
    !text(input.animalId, 100) ||
    !text(input.notes, 3000)
  )
    return fail();
  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 80
  )
    return fail();
  if (
    !Array.isArray(input.checked) ||
    input.checked.length > 100 ||
    !input.checked.every((id) => text(id, 100))
  )
    return fail();
  const ids = new Set<string>();
  for (const item of input.items) {
    if (
      !record(item) ||
      !text(item.id, 64) ||
      !/^[a-zA-Z0-9_-]+$/.test(item.id) ||
      ids.has(item.id)
    )
      return fail();
    ids.add(item.id);
    if (
      !text(item.kind, 20) ||
      !KINDS.has(item.kind) ||
      !text(item.label, 80) ||
      !item.label.trim() ||
      !text(item.reason, 400) ||
      !text(item.placement, 160)
    )
      return fail();
    if (
      !tuple(item.position, -5, 5) ||
      !tuple(item.size, 0.005, 5) ||
      !number(item.rotation, -Math.PI * 2, Math.PI * 2)
    )
      return fail();
    if (
      !text(item.color, 7) ||
      !/^#[\da-fA-F]{6}$/.test(item.color) ||
      typeof item.locked !== 'boolean' ||
      typeof item.custom !== 'boolean'
    )
      return fail();
  }
  // Rebuild the payload explicitly, dropping unrecognised and executable-looking properties.
  return {
    version: 2,
    profileId: input.profileId,
    dimensions: {
      width: d.width as number,
      depth: d.depth as number,
      height: d.height as number,
    },
    variant: input.variant,
    animalId: input.animalId,
    notes: input.notes,
    checked: [...new Set(input.checked)],
    items: input.items.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      kind: item.kind as string,
      label: item.label as string,
      reason: item.reason as string,
      placement: item.placement as string,
      position: item.position as number[],
      size: item.size as number[],
      color: item.color as string,
      rotation: item.rotation as number,
      locked: item.locked as boolean,
      custom: item.custom as boolean,
    })),
  };
}
