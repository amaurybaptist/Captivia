import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Medication, VetAppointment, Vaccination } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import {
  localDay,
  scheduleOccurrences,
  TYPE_LABELS,
  DEFAULT_TIME_ZONE,
} from '../notifications/notification-schedule';

@Injectable()
export class CareAgendaService {
  constructor(private readonly prisma: PrismaService) {}
  async read(
    userId: string,
    premium: boolean,
    from: string,
    to: string,
    animalId?: string,
  ) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
      select: { timeZone: true },
    });
    const timeZone = prefs?.timeZone || DEFAULT_TIME_ZONE;
    const start = localDay(from, timeZone),
      end = localDay(to, timeZone);
    if (end < start || end.diff(start, 'days').days > 61)
      throw new BadRequestException(
        'Choisissez une période de 62 jours au maximum.',
      );
    const animals = await this.prisma.animal.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    if (animalId && !animals.some((a) => a.id === animalId))
      throw new NotFoundException('Animal introuvable.');
    const animal = { userId, ...(animalId ? { id: animalId } : {}) };
    const range = {
      gte: start.toJSDate(),
      lt: end.plus({ days: 1 }).toJSDate(),
    };
    const [routines, medications, appointments, vaccinations] =
      await Promise.all([
        this.prisma.routine.findMany({
          where: { active: true, animal },
          take: 1001,
        }),
        premium
          ? this.prisma.medication.findMany({
              where: { active: true, animal },
              take: 1001,
            })
          : Promise.resolve<Medication[]>([]),
        premium
          ? this.prisma.vetAppointment.findMany({
              where: { animal, date: range, status: { not: 'cancelled' } },
              take: 1001,
            })
          : Promise.resolve<VetAppointment[]>([]),
        premium
          ? this.prisma.vaccination.findMany({
              where: { animal, nextDueDate: { not: null } },
              take: 1001,
            })
          : Promise.resolve<Vaccination[]>([]),
      ]);
    if (
      [routines, medications, appointments, vaccinations].some(
        (rows) => rows.length > 1000,
      )
    )
      throw new BadRequestException('Trop de soins : sélectionnez un animal.');
    const sources = [
      ...routines.map((r) => ({
        key: `routine:${r.id}`,
        kind: 'routine',
        ...r,
        title: r.name || TYPE_LABELS[r.type] || r.type,
      })),
      ...medications.map((m) => ({
        key: `medication:${m.id}`,
        kind: 'medication',
        ...m,
        title: m.name,
      })),
      ...appointments.map((a) => ({
        key: `appointment:${a.id}`,
        kind: 'appointment',
        ...a,
        title: a.reason || `Visite chez ${a.vetName}`,
      })),
      ...vaccinations.map((v) => ({
        key: `vaccination:${v.id}`,
        kind: 'vaccination',
        ...v,
        title: `Rappel ${v.name}`,
      })),
    ];
    const events: {
      id: string;
      sourceKey: string;
      animalId: string;
      kind: string;
      type: string;
      title: string;
      startsAt: string;
      day: string;
      time: string;
      allDay: boolean;
    }[] = [];
    const clock = new Intl.DateTimeFormat('fr-BE', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const add = (
      sourceKey: string,
      animalId: string,
      kind: string,
      type: string,
      title: string,
      at: Date,
      allDay = false,
    ) => {
      const local = DateTime.fromJSDate(at, { zone: timeZone });
      const day = local.toISODate()!;
      if (day < from || day > to) return;
      const instant = at.toISOString();
      events.push({
        id: `${sourceKey}:${instant}`,
        sourceKey,
        animalId,
        kind,
        type,
        title,
        startsAt: instant,
        day,
        time: clock.format(at),
        allDay,
      });
    };
    for (const a of appointments)
      add(
        `appointment:${a.id}`,
        a.animalId,
        'appointment',
        'appointment',
        a.reason || `Visite chez ${a.vetName}`,
        a.date,
      );
    for (const v of vaccinations)
      if (v.nextDueDate)
        add(
          `vaccination:${v.id}`,
          v.animalId,
          'vaccination',
          'vaccination',
          `Rappel ${v.name}`,
          localDay(
            v.nextDueDate.toISOString().slice(0, 10),
            timeZone,
          ).toJSDate(),
          true,
        );
    let truncated = false;
    for (let day = start; day <= end; day = day.plus({ days: 1 })) {
      for (const r of routines)
        for (const at of scheduleOccurrences(
          r.schedule,
          r.frequency,
          day,
          r.createdAt,
          '08:00',
        ))
          add(
            `routine:${r.id}`,
            r.animalId,
            'routine',
            r.type,
            r.name || TYPE_LABELS[r.type] || r.type,
            at,
          );
      for (const m of medications) {
        const first = m.startDate.toISOString().slice(0, 10),
          last = m.endDate?.toISOString().slice(0, 10);
        if (day.toISODate() < first || (last && day.toISODate() > last))
          continue;
        const frequency =
          m.frequency === 'every_x_hours' ? 'hourly' : m.frequency;
        for (const at of scheduleOccurrences(
          {
            time: '08:00',
            recurrence: frequency,
            intervalHours: m.intervalHours,
            startDate: first,
          },
          frequency,
          day,
          m.startDate,
        ))
          add(
            `medication:${m.id}`,
            m.animalId,
            'medication',
            'medication',
            `${m.name} · ${m.dose}${m.unit ? ' ' + m.unit : ''}`,
            at,
          );
      }
      if (events.length > 5000) {
        truncated = true;
        break;
      }
    }
    events.sort(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id),
    );
    return {
      today: DateTime.now().setZone(timeZone).toISODate(),
      timeZone,
      premium,
      animals,
      sources,
      events: events.slice(0, 5000),
      truncated,
    };
  }
}
