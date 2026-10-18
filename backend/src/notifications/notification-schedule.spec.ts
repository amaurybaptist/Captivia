import { DateTime } from 'luxon';
import {
  insideDeliveryWindow,
  isTypeEnabled,
  localDay,
  scheduleOccurrences,
  validateTypeSchedules,
} from './notification-schedule';

const zone = 'Europe/Brussels';
const anchor = new Date('2026-01-01T00:00:00Z');
function dates(
  date: string,
  schedule: Record<string, unknown>,
  start = anchor,
) {
  return scheduleOccurrences(
    schedule,
    typeof schedule.recurrence === 'string' ? schedule.recurrence : 'daily',
    localDay(date, zone),
    start,
  );
}
describe('Occurrences en heure locale', () => {
  it('08:30 reste 08:30 en hiver et en été', () => {
    expect(dates('2026-01-20', { time: '08:30' })[0].toISOString()).toBe(
      '2026-01-20T07:30:00.000Z',
    );
    expect(dates('2026-07-20', { time: '08:30' })[0].toISOString()).toBe(
      '2026-07-20T06:30:00.000Z',
    );
  });
  it('gère les journées de 23 et 25 heures sans décaler le rappel quotidien', () => {
    for (const date of ['2026-03-29', '2026-10-25']) {
      const [value] = dates(date, { time: '08:30' });
      expect(DateTime.fromJSDate(value, { zone }).toFormat('HH:mm')).toBe(
        '08:30',
      );
    }
    expect(
      localDay('2026-03-29', zone)
        .plus({ days: 1 })
        .diff(localDay('2026-03-29', zone), 'hours').hours,
    ).toBe(23);
    expect(
      localDay('2026-10-25', zone)
        .plus({ days: 1 })
        .diff(localDay('2026-10-25', zone), 'hours').hours,
    ).toBe(25);
  });
  it('décale une heure inexistante au passage à l’heure d’été sans perdre le rappel', () => {
    expect(
      DateTime.fromJSDate(dates('2026-03-29', { time: '02:30' })[0], {
        zone,
      }).toFormat('HH:mm'),
    ).toBe('03:30');
  });
  it('conserve les minutes et l’intervalle horaire à travers minuit', () => {
    const schedule = {
      time: '23:35',
      recurrence: 'hourly',
      intervalHours: 3,
      startDate: '2026-07-01',
    };
    expect(
      dates('2026-07-02', schedule).map((d) =>
        DateTime.fromJSDate(d, { zone }).toFormat('HH:mm'),
      ),
    ).toEqual([
      '02:35',
      '05:35',
      '08:35',
      '11:35',
      '14:35',
      '17:35',
      '20:35',
      '23:35',
    ]);
  });
  it('ancre tous les deux jours à la date choisie, pas à l’époque Unix', () => {
    const schedule = {
      time: '08:00',
      recurrence: 'every_2_days',
      startDate: '2026-07-02',
    };
    expect(dates('2026-07-02', schedule)).toHaveLength(1);
    expect(dates('2026-07-03', schedule)).toHaveLength(0);
    expect(dates('2026-07-04', schedule)).toHaveLength(1);
  });
  it('respecte les jours du seed et les récurrences ponctuelles', () => {
    expect(
      dates('2026-07-03', {
        time: '19:00',
        recurrence: 'weekly',
        days: ['tuesday', 'friday'],
      }),
    ).toHaveLength(1);
    expect(
      dates('2026-07-04', {
        time: '19:00',
        recurrence: 'weekly',
        days: ['tuesday', 'friday'],
      }),
    ).toHaveLength(0);
    expect(
      dates('2026-07-04', {
        time: '09:00',
        recurrence: 'once',
        date: '2026-07-04',
      }),
    ).toHaveLength(1);
    expect(
      dates('2026-07-05', {
        time: '09:00',
        recurrence: 'once',
        date: '2026-07-04',
      }),
    ).toHaveLength(0);
  });
  it('un rappel mensuel du 31 tombe le dernier jour des mois courts', () => {
    expect(
      dates('2026-02-28', {
        time: '10:00',
        recurrence: 'monthly',
        dayOfMonth: 31,
      }),
    ).toHaveLength(1);
    expect(
      dates('2026-02-27', {
        time: '10:00',
        recurrence: 'monthly',
        dayOfMonth: 31,
      }),
    ).toHaveLength(0);
  });
  it('rejette les dates, heures et fuseaux invalides', () => {
    expect(() => localDay('2026-02-30', zone)).toThrow();
    expect(() => localDay('2026-01-01', 'Not/AZone')).toThrow();
    expect(() =>
      validateTypeSchedules({ x: { time: '25:00', recurrence: 'daily' } }),
    ).toThrow();
    expect(() =>
      validateTypeSchedules({
        x: { time: '08:00', recurrence: 'hourly', intervalHours: 0 },
      }),
    ).toThrow();
  });
  it('reconnaît les alias du frontend et accepte une fenêtre qui traverse minuit', () => {
    expect(isTypeEnabled({ Nettoyage: false }, 'entretien')).toBe(false);
    expect(isTypeEnabled({}, 'controle')).toBe(true);
    expect(
      insideDeliveryWindow(
        { start: '22:00', end: '06:00' },
        new Date('2026-07-02T21:00:00Z'),
        zone,
      ),
    ).toBe(true);
    expect(
      insideDeliveryWindow(
        { start: '22:00', end: '06:00' },
        new Date('2026-07-02T10:00:00Z'),
        zone,
      ),
    ).toBe(false);
  });
  it('conserve 23 et 25 occurrences horaires aux changements d’heure', () => {
    const schedule = {
      time: '00:00',
      recurrence: 'hourly',
      intervalHours: 1,
      startDate: '2026-01-01',
    };
    expect(dates('2026-03-29', schedule)).toHaveLength(23);
    const autumn = dates('2026-10-25', schedule);
    expect(autumn).toHaveLength(25);
    expect(new Set(autumn.map((date) => date.toISOString())).size).toBe(25);
  });
});
