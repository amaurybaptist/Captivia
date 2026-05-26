import { Injectable } from '@nestjs/common';
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
  const currentIndex = GRADE_THRESHOLDS.findIndex((t) => t.grade === currentGrade);
  const currentMin = GRADE_THRESHOLDS[currentIndex].minPoints;
  const nextGrade = getNextGrade(currentGrade);
  const nextMin = nextGrade
    ? GRADE_THRESHOLDS[GRADE_THRESHOLDS.findIndex((t) => t.grade === nextGrade)].minPoints
    : currentMin;
  const pointsInCurrent = points - currentMin;
  const pointsNeededForNext = nextMin - currentMin;
  const progressPercent =
    pointsNeededForNext > 0 ? Math.min(100, (pointsInCurrent / pointsNeededForNext) * 100) : 100;
  return {
    currentGrade,
    nextGrade,
    pointsInCurrent,
    pointsNeededForNext,
    progressPercent,
  };
}

const ROUTINE_TYPE_LABELS: Record<string, string> = {
  nourrissage: 'Nourrissage',
  entretien: 'Nettoyage',
  uvb: 'UVB / éclairage',
  controle: 'Santé',
};

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
    // Mettre à jour le grade stocké si besoin
    if (user.grade !== progress.currentGrade) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { grade: progress.currentGrade },
      });
    }
    return {
      points: user.points,
      grade: progress.currentGrade,
      nextGrade: progress.nextGrade,
      pointsInCurrent: progress.pointsInCurrent,
      pointsNeededForNext: progress.pointsNeededForNext,
      progressPercent: Math.round(progress.progressPercent * 10) / 10,
    };
  }

  async getOrCreateTodayEvents(userId: string, dateStr?: string, refresh = false): Promise<
    {
      id: string;
      type: string;
      label: string | null;
      scheduledAt: string;
      status: string;
      pointsAwarded: number;
    }[]
  > {
    const date = dateStr ? new Date(dateStr + 'T12:00:00Z') : new Date();
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    let events = await this.prisma.notificationEvent.findMany({
      where: { userId, scheduledAt: { gte: start, lte: end } },
      orderBy: { scheduledAt: 'asc' },
    });

    if (refresh && events.length > 0) {
      await this.prisma.notificationEvent.deleteMany({
        where: { userId, scheduledAt: { gte: start, lte: end } },
      });
      events = [];
    }

    if (events.length === 0) {
      const todayStr = date.toISOString().slice(0, 10);
      const dayOfWeek = date.getUTCDay();
      const dayOfMonth = date.getUTCDate();
      const daysSinceEpoch = Math.floor(date.getTime() / 86400000);

      const prefs = await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });
      if (prefs?.types && typeof prefs.types === 'object' && prefs.typeSchedules && typeof prefs.typeSchedules === 'object') {
        const types = prefs.types as Record<string, boolean>;
        const schedules = prefs.typeSchedules as Record<
          string,
          { time?: string; recurrence?: string; date?: string; weekDay?: number; dayOfMonth?: number; intervalHours?: number }
        >;

        for (const [type, enabled] of Object.entries(types)) {
          if (!enabled) continue;
          const sch = schedules[type];
          if (!sch?.time) continue;
          const rec = sch.recurrence || 'daily';

          if (rec === 'once') {
            if (sch.date !== todayStr) continue;
          } else if (rec === 'weekly') {
            const wanted = sch.weekDay ?? 0;
            if (dayOfWeek !== wanted) continue;
          } else if (rec === 'monthly') {
            const wanted = sch.dayOfMonth ?? 1;
            if (dayOfMonth !== wanted) continue;
          } else if (rec === 'every_2_days') {
            if (daysSinceEpoch % 2 !== 0) continue;
          } else if (rec === 'every_3_days') {
            if (daysSinceEpoch % 3 !== 0) continue;
          }

          if (rec === 'hourly') {
            const interval = Math.max(1, Math.min(24, sch.intervalHours ?? 2));
            const [startH] = (sch.time || '08:00').split(':').map(Number);
            for (let hour = startH; hour < 24; hour += interval) {
              const scheduledAt = new Date(date);
              scheduledAt.setUTCHours(hour, 0, 0, 0);
              const created = await this.prisma.notificationEvent.create({
                data: {
                  userId,
                  type,
                  label: type,
                  scheduledAt,
                  status: 'pending',
                },
              });
              events = [...events, created];
            }
          } else {
            const [h, m] = (sch.time || '08:00').split(':').map(Number);
            const scheduledAt = new Date(date);
            scheduledAt.setUTCHours(h, m || 0, 0, 0);
            const created = await this.prisma.notificationEvent.create({
              data: {
                userId,
                type,
                label: type,
                scheduledAt,
                status: 'pending',
              },
            });
            events = [...events, created];
          }
        }

      // Événements depuis les routines (associées aux animaux)
      const activeRoutines = await this.routinesService.getActiveRoutines(userId);
      for (const routine of activeRoutines) {
        const sch = (routine.schedule as { time?: string; recurrence?: string; date?: string; weekDay?: number; dayOfMonth?: number; intervalHours?: number }) || {};
        const time = sch.time || (routine as any).schedule?.time;
        if (!time) continue;
        const rec = sch.recurrence || routine.frequency || 'daily';

        if (rec === 'once') {
          if (sch.date !== todayStr) continue;
        } else if (rec === 'weekly') {
          const wanted = sch.weekDay ?? 0;
          if (dayOfWeek !== wanted) continue;
        } else if (rec === 'monthly') {
          const wanted = sch.dayOfMonth ?? 1;
          if (dayOfMonth !== wanted) continue;
        } else if (rec === 'every_2_days') {
          if (daysSinceEpoch % 2 !== 0) continue;
        } else if (rec === 'every_3_days') {
          if (daysSinceEpoch % 3 !== 0) continue;
        } else if (rec === 'custom') {
          continue;
        }

          const typeLabel = routine.name || ROUTINE_TYPE_LABELS[routine.type] || routine.type;
          const animal = (routine as any).animal;

          if (rec === 'hourly') {
            const interval = Math.max(1, Math.min(24, sch.intervalHours ?? 2));
            const [startH] = (time || '08:00').split(':').map(Number);
            for (let hour = startH; hour < 24; hour += interval) {
              const scheduledAt = new Date(date);
              scheduledAt.setUTCHours(hour, 0, 0, 0);
              const created = await this.prisma.notificationEvent.create({
                data: {
                  userId,
                  type: routine.type,
                  label: typeLabel,
                  scheduledAt,
                  status: 'pending',
                  routineId: routine.id,
                  animalId: routine.animalId,
                },
              });
              events = [...events, created];
            }
          } else {
            const [h, m] = (time || '08:00').split(':').map(Number);
            const scheduledAt = new Date(date);
            scheduledAt.setUTCHours(h, m || 0, 0, 0);
            const created = await this.prisma.notificationEvent.create({
              data: {
                userId,
                type: routine.type,
                label: typeLabel,
                scheduledAt,
                status: 'pending',
                routineId: routine.id,
                animalId: routine.animalId,
              },
            });
            events = [...events, created];
          }
      }

      }
      events.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    }

    return events.map((e) => ({
      id: e.id,
      type: e.type,
      label: e.label,
      scheduledAt: e.scheduledAt.toISOString(),
      status: e.status,
      pointsAwarded: e.pointsAwarded,
      routineId: e.routineId ?? undefined,
    }));
  }

  async setEventStatus(
    userId: string,
    eventId: string,
    status: 'done' | 'skipped',
  ): Promise<{ event: unknown; grade: unknown } | null> {
    const ev = await this.prisma.notificationEvent.findFirst({
      where: { id: eventId, userId },
    });
    if (!ev || ev.status !== 'pending') return null;

    // Seules les routines (ev.routineId) donnent des points. Les notifications seules n'en donnent pas.
    const pointsToAdd =
      status === 'done' && ev.routineId ? POINTS_PER_ROUTINE_DONE : 0;
    await this.prisma.notificationEvent.update({
      where: { id: eventId },
      data: { status, pointsAwarded: pointsToAdd },
    });

    if (pointsToAdd > 0) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
      const newPoints = (user?.points ?? 0) + pointsToAdd;
      const newGrade = pointsToGrade(newPoints);
      await this.prisma.user.update({
        where: { id: userId },
        data: { points: newPoints, grade: newGrade },
      });
    }

    const updated = await this.prisma.notificationEvent.findUnique({
      where: { id: eventId },
    });
    const grade = await this.getGrade(userId);
    return {
      event: updated
        ? {
            id: updated.id,
            type: updated.type,
            label: updated.label,
            scheduledAt: updated.scheduledAt.toISOString(),
            status: updated.status,
            pointsAwarded: updated.pointsAwarded,
            routineId: updated.routineId ?? undefined,
          }
        : null,
      grade,
    };
  }

  /**
   * Supprime uniquement le rappel du jour (l'événement affiché).
   * Ne supprime pas la routine ni les préférences de notification.
   */
  async deleteEvent(userId: string, eventId: string): Promise<boolean> {
    const deleted = await this.prisma.notificationEvent.deleteMany({
      where: { id: eventId, userId },
    });
    return deleted.count > 0;
  }
}
