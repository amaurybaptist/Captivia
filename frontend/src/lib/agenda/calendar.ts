export type Kind = 'routine' | 'appointment' | 'medication' | 'vaccination';
export type Source = {
  key: string;
  id: string;
  animalId: string;
  kind: Kind;
  title: string;
  name?: string;
  type?: string;
  frequency?: string;
  schedule?: Record<string, unknown>;
  date?: string;
  nextDueDate?: string;
  startDate?: string;
  endDate?: string | null;
  dose?: string;
  unit?: string | null;
  vetName?: string;
  reason?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: string;
  active?: boolean;
};
export type CareEvent = {
  id: string;
  sourceKey: string;
  animalId: string;
  kind: Kind;
  type: string;
  title: string;
  startsAt: string;
  day: string;
  time: string;
  allDay: boolean;
};
export type Agenda = {
  today: string;
  timeZone: string;
  premium: boolean;
  animals: { id: string; name: string }[];
  sources: Source[];
  events: CareEvent[];
  truncated: boolean;
};
const pad = (n: number) => String(n).padStart(2, '0');
export function dayKey(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
export function shiftDay(day: string, amount: number) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + amount);
  return dayKey(d);
}
export function monthCells(month: string) {
  const first = month + '-01',
    weekday = (new Date(first + 'T12:00Z').getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => shiftDay(first, i - weekday));
}
export function shiftMonth(month: string, amount: number) {
  const d = new Date(month + '-01T12:00Z');
  d.setUTCMonth(d.getUTCMonth() + amount);
  return dayKey(d).slice(0, 7);
}
export function zonedInput(iso: string, zone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const value = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}
/** Resolve wall time in the account's zone; reject skipped DST times. */
export function zonedInstant(input: string, zone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) throw new Error('Date ou heure invalide.');
  const target = Date.parse(input + 'Z');
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 16) !== input)
    throw new Error('Date ou heure invalide.');
  const candidates = new Set<number>();
  for (const hours of [-24, 0, 24]) {
    const probe = target + hours * 3600000;
    const offset = Date.parse(zonedInput(new Date(probe).toISOString(), zone) + 'Z') - probe;
    candidates.add(target - offset);
  }
  for (const candidate of [...candidates].sort((a, b) => a - b))
    if (zonedInput(new Date(candidate).toISOString(), zone) === input)
      return new Date(candidate).toISOString();
  throw new Error(
    'Cette heure n’existe pas lors du changement d’heure. Choisissez un autre horaire.',
  );
}
export const KIND_LABELS: Record<Kind, string> = {
  routine: 'Routine',
  appointment: 'Vétérinaire',
  medication: 'Traitement',
  vaccination: 'Vaccin',
};
export const TYPE_LABELS: Record<string, string> = {
  nourrissage: 'Nourrissage',
  entretien: 'Entretien',
  uvb: 'UVB / éclairage',
  controle: 'Contrôle de santé',
};

export function routineSchedule(
  source: Source | undefined,
  originalDay: string,
  date: string,
  time: string,
  frequency: string,
  interval: number,
): Record<string, unknown> {
  const schedule: Record<string, unknown> = { ...source?.schedule, time, recurrence: frequency };
  const previous = source?.schedule?.recurrence || source?.frequency;
  const changed = !source || previous !== frequency || date !== originalDay;
  if (previous !== frequency) {
    delete schedule.hours;
    delete schedule.hour;
  }
  if (frequency === 'once') schedule.date = date;
  if (changed) {
    schedule.startDate = date;
    if (frequency === 'weekly') schedule.days = [new Date(date + 'T12:00Z').getUTCDay()];
    if (frequency === 'monthly') schedule.dayOfMonth = Number(date.slice(8));
  }
  if (frequency === 'hourly') {
    const previousTime =
      typeof source?.schedule?.time === 'string'
        ? source.schedule.time
        : Array.isArray(source?.schedule?.hours)
          ? `${String(source.schedule.hours[0]).padStart(2, '0')}:00`
          : time;
    if (
      Array.isArray(source?.schedule?.hours) &&
      (time !== previousTime || interval !== (Number(source.schedule.intervalHours) || 2))
    ) {
      delete schedule.hours;
      delete schedule.hour;
    }
    schedule.intervalHours = interval;
  }
  return schedule;
}
