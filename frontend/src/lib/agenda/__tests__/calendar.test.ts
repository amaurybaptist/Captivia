import {
  monthCells,
  shiftDay,
  shiftMonth,
  zonedInput,
  zonedInstant,
  routineSchedule,
  type Source,
} from '../calendar';
it('compose une grille de 42 jours commençant le lundi, y compris à cheval sur les années', () => {
  const cells = monthCells('2027-01');
  expect(cells).toHaveLength(42);
  expect(cells[0]).toBe('2026-12-28');
  expect(cells[41]).toBe('2027-02-07');
});
it('respecte février bissextile et les changements de mois', () => {
  expect(shiftDay('2024-02-28', 1)).toBe('2024-02-29');
  expect(shiftDay('2024-02-29', 1)).toBe('2024-03-01');
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
});
it.each([
  ['2026-01-15T09:30', '2026-01-15T08:30:00.000Z'],
  ['2026-07-15T09:30', '2026-07-15T07:30:00.000Z'],
])('convertit %s dans le fuseau du compte', (input, iso) => {
  expect(zonedInstant(input, 'Europe/Brussels')).toBe(iso);
  expect(zonedInput(iso, 'Europe/Brussels')).toBe(input);
});
it('refuse une heure inexistante au passage à l’heure d’été', () => {
  expect(() => zonedInstant('2026-03-29T02:30', 'Europe/Brussels')).toThrow('n’existe pas');
});
it('résout de façon déterministe l’heure répétée en automne', () => {
  expect(zonedInstant('2026-10-25T02:30', 'Europe/Brussels')).toBe('2026-10-25T00:30:00.000Z');
});
it('refuse les dates impossibles', () => {
  expect(() => zonedInstant('2026-02-30T08:00', 'Europe/Brussels')).toThrow();
});
const source = (schedule: Record<string, unknown>, frequency: string): Source => ({
  id: 'r',
  key: 'routine:r',
  kind: 'routine',
  animalId: 'a',
  title: 'Soin',
  frequency,
  schedule,
});
it('conserve les multiples jours d’une routine hebdomadaire en modifiant son nom ou son heure', () => {
  const r = source({ days: [1, 3, 5], time: '08:00', startDate: '2026-01-01' }, 'weekly');
  expect(routineSchedule(r, '2026-10-14', '2026-10-14', '09:00', 'weekly', 2)).toMatchObject({
    days: [1, 3, 5],
    time: '09:00',
    startDate: '2026-01-01',
  });
});
it('ne transforme pas le 31 du mois en 28 lors d’une édition depuis février', () => {
  const r = source({ dayOfMonth: 31 }, 'monthly');
  expect(routineSchedule(r, '2026-02-28', '2026-02-28', '08:00', 'monthly', 2).dayOfMonth).toBe(31);
});
it('adapte le jour de la série lorsque la date est explicitement modifiée', () => {
  const r = source({ days: [1, 3] }, 'weekly');
  expect(routineSchedule(r, '2026-10-14', '2026-10-15', '08:00', 'weekly', 2)).toMatchObject({
    days: [4],
    startDate: '2026-10-15',
  });
});
it('retire les anciennes heures personnalisées lors d’un changement explicite de récurrence', () => {
  const r = source({ hours: [8, 12] }, 'custom');
  expect(routineSchedule(r, '2026-10-14', '2026-10-14', '09:00', 'daily', 2)).not.toHaveProperty(
    'hours',
  );
  expect(r.schedule).toEqual({ hours: [8, 12] });
});
it('applique un nouvel intervalle horaire sans laisser les anciennes heures prendre le dessus', () => {
  const r = source({ hours: [8, 14], time: '08:00' }, 'hourly');
  const result = routineSchedule(r, '2026-10-14', '2026-10-14', '08:00', 'hourly', 3);
  expect(result.intervalHours).toBe(3);
  expect(result).not.toHaveProperty('hours');
});
