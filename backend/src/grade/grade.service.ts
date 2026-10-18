import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import {
  DEFAULT_TIME_ZONE,
  TYPE_LABELS,
  localDay,
  scheduleOccurrences,
} from '../notifications/notification-schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RoutinesService } from '../routines/routines.service';

/** Seules les routines (rappels liés à une routine) donnent des points. 2 pts par routine effectuée. */
const POINTS_PER_ROUTINE_DONE = 2;

const GRADE_THRESHOLDS: { grade: string; minPoints: number }[] = [
  { grade: 'bronze', minPoints: 0 },
  { grade: 'silver', minPoints: 500 },
  { grade: 'gold', minPoints: 1500 },
  { grade: 'platinum', minPoints: 3000 },
  { grade: 'diamond', minPoints: 5000 },
];

function pointsToGrade(points: number): string {
  let current = GRADE_THRESHOLDS[0];
  for (const t of GRADE_THRESHOLDS) {
    if (points >= t.minPoints) current = t;
  }
  return current.grade;
}

function getNextGrade(currentGrade: string): string | null {
  const i = GRADE_THRESHOLDS.findIndex((t) => t.grade === currentGrade);
  if (i < 0 || i >= GRADE_THRESHOLDS.length - 1) return null;
  return GRADE_THRESHOLDS[i + 1].grade;
}

function getProgress(points: number): {
  currentGrade: string;
  nextGrade: string | null;
  pointsInCurrent: number;
  pointsNeededForNext: number;
  progressPercent: number;
} {
  const currentGrade = pointsToGrade(points);
  const currentIndex = GRADE_THRESHOLDS.findIndex(
    (t) => t.grade === currentGrade,
  );
  const currentMin = GRADE_THRESHOLDS[currentIndex].minPoints;
  const nextGrade = getNextGrade(currentGrade);
  const nextMin = nextGrade
    ? GRADE_THRESHOLDS[GRADE_THRESHOLDS.findIndex((t) => t.grade === nextGrade)]
        .minPoints
    : currentMin;
  const pointsInCurrent = points - currentMin;
  const pointsNeededForNext = nextMin - currentMin;
  const progressPercent =
    pointsNeededForNext > 0
      ? Math.min(100, (pointsInCurrent / pointsNeededForNext) * 100)
      : 100;
  return {
    currentGrade,
    nextGrade,
    pointsInCurrent,
    pointsNeededForNext,
    progressPercent,
  };
}

@Injectable()
export class GradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routinesService: RoutinesService,
  ) {}

  async getGrade(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, grade: true },
    });
    if (!user) return null;
    const progress = getProgress(user.points);
    return {
      points: user.points,
      grade: progress.currentGrade,
      nextGrade: progress.nextGrade,
      pointsInCurrent: progress.pointsInCurrent,
      pointsNeededForNext: progress.pointsNeededForNext,
      progressPercent: Math.round(progress.progressPercent * 10) / 10,
    };
  }

  /** Réconcilie les occurrences sans effacer les réalisations ni les suppressions. */
  async getOrCreateTodayEvents(
    userId: string,
    dateStr?: string,
    _refresh = false,
  ) {
    // Paramètre historique conservé pour les clients qui envoient refresh=1.
    void _refresh;
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    const zone = prefs?.timeZone || DEFAULT_TIME_ZONE;
    const day = localDay(dateStr, zone);
    const today = day.toISODate();
    const candidates = new Map<
      string,
      Prisma.NotificationEventCreateManyInput
    >();
    const add = (
      data: Omit<Prisma.NotificationEventCreateManyInput, 'userId'>,
    ) => {
      const source = data.routineId
        ? `routine:${data.routineId}`
        : data.medicationId
          ? `medication:${data.medicationId}`
          : data.appointmentId
            ? `vet_appointment:${data.appointmentId}`
            : data.vaccinationId
              ? `vaccination:${data.vaccinationId}`
              : `type:${data.type}`;
      const key = `${userId}:${source}:${new Date(data.scheduledAt).toISOString()}`;
      candidates.set(key, { ...data, userId, occurrenceKey: key });
    };
    const types = (prefs?.types || {}) as Record<string, boolean>;
    const schedules = (prefs?.typeSchedules || {}) as Record<string, unknown>;
    const window = (prefs?.schedule || {}) as { start?: string };
    for (const [type, enabled] of Object.entries(types)) {
      if (!enabled) continue;
      for (const scheduledAt of scheduleOccurrences(
        schedules[type],
        'daily',
        day,
        prefs!.createdAt,
        window.start || '08:00',
      )) {
        add({ type, label: TYPE_LABELS[type] || type, scheduledAt });
      }
    }
    for (const routine of await this.routinesService.getActiveRoutines(
      userId,
    )) {
      for (const scheduledAt of scheduleOccurrences(
        routine.schedule,
        routine.frequency,
        day,
        routine.createdAt,
      )) {
        add({
          type: routine.type,
          label: routine.name || TYPE_LABELS[routine.type] || routine.type,
          scheduledAt,
          routineId: routine.id,
          animalId: routine.animalId,
        });
      }
    }
    for (const med of await this.prisma.medication.findMany({
      where: { active: true, animal: { userId } },
    })) {
      const start = med.startDate.toISOString().slice(0, 10);
      const end = med.endDate?.toISOString().slice(0, 10);
      if (start > today || (end && end < today)) continue;
      const anchor = DateTime.fromISO(start, { zone }).toJSDate();
      const recurrence =
        med.frequency === 'every_x_hours' ? 'hourly' : med.frequency;
      for (const scheduledAt of scheduleOccurrences(
        {
          time: '08:00',
          recurrence,
          intervalHours: med.intervalHours,
          startDate: start,
        },
        recurrence,
        day,
        anchor,
      )) {
        add({
          type: 'medication',
          label: `💊 ${med.name} (${med.dose})`,
          scheduledAt,
          medicationId: med.id,
          animalId: med.animalId,
        });
      }
    }
    for (const appt of await this.prisma.vetAppointment.findMany({
      where: { status: 'scheduled', animal: { userId } },
    })) {
      const apptDay = DateTime.fromISO(appt.date.toISOString().slice(0, 10), {
        zone,
      });
      const daysBefore = Math.round(apptDay.diff(day, 'days').days);
      if (daysBefore !== 0 && !(appt.reminderDays || []).includes(daysBefore))
        continue;
      add({
        type: 'vet_appointment',
        label:
          daysBefore === 0
            ? `🏥 RDV ${appt.vetName}`
            : `🔔 ${appt.vetName} (J-${daysBefore})`,
        scheduledAt: day.set({ hour: 8 }).toJSDate(),
        appointmentId: appt.id,
        animalId: appt.animalId,
      });
    }
    for (const vac of await this.prisma.vaccination.findMany({
      where: { animal: { userId } },
    })) {
      if (vac.nextDueDate?.toISOString().slice(0, 10) !== today) continue;
      add({
        type: 'vaccination',
        label: `💉 Rappel vaccin ${vac.name}`,
        scheduledAt: day.set({ hour: 8 }).toJSDate(),
        vaccinationId: vac.id,
        animalId: vac.animalId,
      });
    }
    const range = { gte: day.toJSDate(), lt: day.plus({ days: 1 }).toJSDate() };
    const events = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))::text`;
        const keys = [...candidates.keys()];
        await tx.notificationEvent.updateMany({
          where: {
            userId,
            status: 'pending',
            scheduledAt: range,
            occurrenceKey: { notIn: keys },
          },
          data: { status: 'obsolete' },
        });
        await tx.notificationEvent.updateMany({
          where: { userId, status: 'obsolete', occurrenceKey: { in: keys } },
          data: { status: 'pending' },
        });
        const existing = await tx.notificationEvent.findMany({
          where: { userId, scheduledAt: range },
          select: { id: true, occurrenceKey: true, label: true },
        });
        if (candidates.size)
          await tx.notificationEvent.createMany({
            data: [...candidates.values()],
            skipDuplicates: true,
          });
        for (const event of existing) {
          const candidate = event.occurrenceKey
            ? candidates.get(event.occurrenceKey)
            : undefined;
          if (candidate && candidate.label !== event.label)
            await tx.notificationEvent.update({
              where: { id: event.id },
              data: { label: candidate.label },
            });
        }
        return tx.notificationEvent.findMany({
          where: {
            userId,
            scheduledAt: range,
            status: { notIn: ['dismissed', 'obsolete'] },
            occurrenceKey: { in: keys },
          },
          orderBy: { scheduledAt: 'asc' },
        });
      },
      { timeout: 15000 },
    );
    return events.map((event) => this.eventView(event));
  }

  private eventView(event: {
    id: string;
    type: string;
    label: string | null;
    scheduledAt: Date;
    status: string;
    pointsAwarded: number;
    routineId: string | null;
    medicationId: string | null;
    appointmentId: string | null;
    vaccinationId: string | null;
    snoozedUntil: Date | null;
  }) {
    return {
      ...event,
      scheduledAt: event.scheduledAt.toISOString(),
      snoozedUntil: event.snoozedUntil?.toISOString() || null,
    };
  }

  async setEventStatus(
    userId: string,
    eventId: string,
    status: 'done' | 'skipped',
  ) {
    const event = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.notificationEvent.findFirst({
        where: { id: eventId, userId, status: 'pending' },
      });
      if (!existing) return null;
      const points =
        status === 'done' && existing.routineId ? POINTS_PER_ROUTINE_DONE : 0;
      const claimed = await tx.notificationEvent.updateMany({
        where: { id: eventId, userId, status: 'pending' },
        data: { status, pointsAwarded: points },
      });
      if (!claimed.count) return null;
      if (points) {
        const user = await tx.user.update({
          where: { id: userId },
          data: { points: { increment: points } },
        });
        await tx.user.update({
          where: { id: userId },
          data: { grade: pointsToGrade(user.points) },
        });
      }
      return tx.notificationEvent.findUniqueOrThrow({ where: { id: eventId } });
    });
    return event
      ? { event: this.eventView(event), grade: await this.getGrade(userId) }
      : null;
  }

  async snoozeEvent(userId: string, eventId: string, minutes?: number) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    const delay = Math.min(120, Math.max(5, minutes ?? prefs?.snooze ?? 15));
    const existing = await this.prisma.notificationEvent.findFirst({
      where: { id: eventId, userId, status: 'pending' },
    });
    if (!existing) return null;
    const base = Math.max(
      Date.now(),
      existing.scheduledAt.getTime(),
      existing.snoozedUntil?.getTime() || 0,
    );
    const result = await this.prisma.notificationEvent.updateMany({
      where: {
        id: eventId,
        userId,
        status: 'pending',
        deliveryVersion: existing.deliveryVersion,
      },
      data: {
        snoozedUntil: new Date(base + delay * 60000),
        deliveryVersion: { increment: 1 },
      },
    });
    if (!result.count) return null;
    return this.eventView(
      await this.prisma.notificationEvent.findUniqueOrThrow({
        where: { id: eventId },
      }),
    );
  }

  /** Trace de suppression : le prochain chargement ne recrée pas ce rappel. */
  async deleteEvent(userId: string, eventId: string): Promise<boolean> {
    const deleted = await this.prisma.notificationEvent.updateMany({
      where: {
        id: eventId,
        userId,
        status: { notIn: ['dismissed', 'obsolete'] },
      },
      data: { status: 'dismissed' },
    });
    return deleted.count > 0;
  }
}
