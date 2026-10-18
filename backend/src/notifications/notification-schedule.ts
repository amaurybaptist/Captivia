import { BadRequestException } from '@nestjs/common';
import { DateTime, IANAZone } from 'luxon';

export const DEFAULT_TIME_ZONE = 'Europe/Brussels';
export const TYPE_LABELS: Record<string, string> = {
  nourrissage: 'Nourrissage',
  entretien: 'Nettoyage',
  nettoyage: 'Nettoyage',
  uvb: 'UVB / éclairage',
  controle: 'Santé',
  sante: 'Santé',
};
const DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];
const FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'once',
  'hourly',
  'every_2_days',
  'every_3_days',
  'custom',
];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validTimeZone(zone: string): boolean {
  return zone === 'UTC' || IANAZone.isValidZone(zone);
}

export function localDay(
  date: string | undefined,
  zone = DEFAULT_TIME_ZONE,
  now = new Date(),
) {
  if (!validTimeZone(zone))
    throw new BadRequestException('Fuseau horaire invalide.');
  const day = date
    ? DateTime.fromISO(date, { zone })
    : DateTime.fromJSDate(now, { zone });
  if (
    !day.isValid ||
    (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || day.toISODate() !== date))
  ) {
    throw new BadRequestException('Date invalide (AAAA-MM-JJ).');
  }
  return day.startOf('day');
}

export function validateTypeSchedules(
  schedules: Record<string, unknown>,
): void {
  if (Object.keys(schedules).length > 100)
    throw new BadRequestException('Trop de rappels.');
  for (const value of Object.values(schedules)) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new BadRequestException('Horaire invalide.');
    const s = value as Record<string, unknown>;
    if (
      typeof s.time !== 'string' ||
      !TIME.test(s.time) ||
      typeof s.recurrence !== 'string' ||
      !FREQUENCIES.includes(s.recurrence)
    ) {
      throw new BadRequestException('Heure ou récurrence invalide.');
    }
    for (const [key, min, max] of [
      ['weekDay', 0, 6],
      ['dayOfMonth', 1, 31],
      ['intervalHours', 1, 24],
    ] as const) {
      if (
        s[key] !== undefined &&
        (!Number.isInteger(s[key]) ||
          Number(s[key]) < min ||
          Number(s[key]) > max)
      ) {
        throw new BadRequestException('Paramètre de récurrence invalide.');
      }
    }
    if (s.recurrence === 'once') {
      if (typeof s.date !== 'string')
        throw new BadRequestException('Date du rappel manquante.');
      localDay(s.date, 'UTC');
    }
    if (s.startDate !== undefined) {
      if (typeof s.startDate !== 'string')
        throw new BadRequestException('Date d’ancrage invalide.');
      localDay(s.startDate, 'UTC');
    }
  }
}

/** Occurrences dans une journée locale; daily suit l'heure murale, hourly la durée écoulée. */
export function scheduleOccurrences(
  raw: unknown,
  frequency: string,
  day: DateTime,
  anchorDate: Date,
  fallbackTime?: string,
): Date[] {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const rec = typeof s.recurrence === 'string' ? s.recurrence : frequency;
  const hourValue =
    typeof s.hour === 'number'
      ? `${String(s.hour).padStart(2, '0')}:00`
      : undefined;
  const legacyHours = Array.isArray(s.hours)
    ? (s.hours as unknown[]).filter(
        (h): h is number =>
          typeof h === 'number' && Number.isInteger(h) && h >= 0 && h <= 23,
      )
    : [];
  const firstLegacyHour = legacyHours[0];
  const time =
    typeof s.time === 'string'
      ? s.time
      : hourValue ||
        (typeof firstLegacyHour === 'number'
          ? `${String(firstLegacyHour).padStart(2, '0')}:00`
          : fallbackTime) ||
        '';
  if (!TIME.test(time) || !FREQUENCIES.includes(rec)) return [];
  const [hour, minute] = time.split(':').map(Number);
  const anchorDay =
    typeof s.startDate === 'string'
      ? localDay(s.startDate, day.zoneName!)
      : DateTime.fromJSDate(anchorDate, { zone: day.zoneName! }).startOf('day');
  // Rappels existants : pas de génération avant leur date de création.
  if (day.toISODate()! < anchorDay.toISODate()! && rec !== 'once') return [];
  const atTime = day.set({ hour, minute }); // Luxon décale les heures inexistantes au passage à l'heure d'été.
  const days = Array.isArray(s.days)
    ? (s.days as unknown[]).map((d) =>
        typeof d === 'number'
          ? d
          : typeof d === 'string'
            ? DAYS.indexOf(d.toLowerCase())
            : -1,
      )
    : [];
  if (
    rec === 'once' &&
    (typeof s.date === 'string' ? s.date.slice(0, 10) : '') !== day.toISODate()
  )
    return [];
  if (
    rec === 'weekly' &&
    !(days.length
      ? days.includes(day.weekday % 7)
      : day.weekday % 7 === Number(s.weekDay ?? s.day ?? anchorDay.weekday % 7))
  )
    return [];
  if (
    rec === 'monthly' &&
    day.day !==
      Math.min(
        Number(s.dayOfMonth ?? s.date ?? anchorDay.day),
        day.daysInMonth!,
      )
  )
    return [];
  if (rec === 'every_2_days' || rec === 'every_3_days') {
    const interval = rec === 'every_2_days' ? 2 : 3;
    if (Math.round(day.diff(anchorDay, 'days').days) % interval !== 0)
      return [];
  }
  if (rec === 'custom')
    return legacyHours.map((h) => day.set({ hour: h, minute }).toJSDate());
  if (rec !== 'hourly') return [atTime.toJSDate()];
  if (legacyHours.length)
    return legacyHours.map((h) => day.set({ hour: h, minute }).toJSDate());
  const interval = Math.max(1, Math.min(24, Number(s.intervalHours) || 2));
  const anchor = anchorDay.set({ hour, minute });
  let occurrence = anchor.plus({
    hours:
      Math.max(0, Math.ceil(day.diff(anchor, 'hours').hours / interval)) *
      interval,
  });
  const dates: Date[] = [];
  const end = day.plus({ days: 1 });
  while (occurrence < end) {
    if (occurrence >= day) dates.push(occurrence.toJSDate());
    occurrence = occurrence.plus({ hours: interval });
  }
  return dates;
}

export function isTypeEnabled(types: unknown, type: string): boolean {
  const values = (types && typeof types === 'object' ? types : {}) as Record<
    string,
    boolean
  >;
  const label = TYPE_LABELS[type] || type;
  return !Object.entries(values).some(
    ([key, enabled]) =>
      (TYPE_LABELS[key] || key) === label && enabled === false,
  );
}

export function insideDeliveryWindow(
  schedule: unknown,
  now: Date,
  zone: string,
): boolean {
  const s = (
    schedule && typeof schedule === 'object' ? schedule : {}
  ) as Record<string, unknown>;
  const time = DateTime.fromJSDate(now, { zone }).toFormat('HH:mm');
  const start =
    typeof s.start === 'string' && TIME.test(s.start) ? s.start : '00:00';
  const end = typeof s.end === 'string' && TIME.test(s.end) ? s.end : '23:59';
  return start <= end
    ? time >= start && time <= end
    : time >= start || time <= end;
}
