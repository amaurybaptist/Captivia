import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { NotificationEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GradeService } from '../grade/grade.service';
import { NotificationsService } from './notifications.service';
import { insideDeliveryWindow, isTypeEnabled } from './notification-schedule';

@Injectable()
export class NotificationsSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationsSchedulerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly grade: GradeService,
  ) {}

  onModuleInit() {
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.NOTIFICATIONS_SCHEDULER_ENABLED === 'false'
    )
      return;
    this.timer = setInterval(() => {
      void this.checkRoutinesAndSendNotifications().catch(() =>
        this.logger.error('Échec du traitement des rappels.'),
      );
    }, 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async checkRoutinesAndSendNotifications(now = new Date()) {
    if (this.running) return;
    const capabilities = this.notifications.getCapabilities();
    if (!capabilities.push && !capabilities.email) return;
    this.running = true;
    try {
      let cursor: string | undefined;
      do {
        const users = await this.prisma.user.findMany({
          where: {
            OR: [
              { pushSubscriptions: { some: {} } },
              {
                notificationPreferences: {
                  some: { deliveryChannel: { in: ['email', 'both'] } },
                },
              },
            ],
          },
          select: { id: true, email: true },
          orderBy: { id: 'asc' },
          take: 100,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        for (const user of users) {
          try {
            await this.processUser(user, now);
          } catch {
            this.logger.warn('Un utilisateur n’a pas pu recevoir ses rappels.');
          }
        }
        cursor = users.length === 100 ? users[users.length - 1].id : undefined;
      } while (cursor);
    } finally {
      this.running = false;
    }
  }

  private async processUser(user: { id: string; email: string }, now: Date) {
    const prefs = await this.notifications.getNotificationPreferences(user.id);
    if (!insideDeliveryWindow(prefs.schedule, now, prefs.timeZone)) return;
    const localNow = DateTime.fromJSDate(now, { zone: prefs.timeZone });
    const since = new Date(now.getTime() - 60 * 60000); // rattrapage d'une heure après un arrêt bref
    await this.grade.getOrCreateTodayEvents(user.id, localNow.toISODate()!);
    const previousDate = DateTime.fromJSDate(since, {
      zone: prefs.timeZone,
    }).toISODate()!;
    if (previousDate !== localNow.toISODate())
      await this.grade.getOrCreateTodayEvents(user.id, previousDate);
    const due = { gte: since, lte: now };
    const events = await this.prisma.notificationEvent.findMany({
      where: {
        userId: user.id,
        status: 'pending',
        OR: [{ snoozedUntil: null, scheduledAt: due }, { snoozedUntil: due }],
      },
      include: { animal: { select: { name: true } } },
    });
    const capabilities = this.notifications.getCapabilities();
    const subs =
      capabilities.push && prefs.deliveryChannel !== 'email'
        ? await this.notifications.getUserSubscriptions(user.id)
        : [];
    for (const event of events) {
      if (!isTypeEnabled(prefs.types, event.type)) continue;
      const payload = {
        title: 'Rappel Captivia',
        body: `${event.label || event.type}${event.animal ? ` pour ${event.animal.name}` : ''}`,
        icon: '/icon.png',
        data: {
          eventId: event.id,
          ...(event.animalId ? { animalId: event.animalId } : {}),
        },
      };
      for (const sub of subs) {
        await this.deliver(event, `push:${sub.id}`, now, () =>
          this.notifications.sendPushSubscription(sub, payload),
        );
      }
      if (capabilities.email && prefs.deliveryChannel !== 'push') {
        await this.deliver(event, 'email', now, async () => {
          await this.notifications.sendEmail(user.email, payload);
          return true;
        });
      }
    }
  }

  /** Bail persistant : deux workers ne peuvent pas traiter le même canal simultanément. */
  private async deliver(
    event: NotificationEvent,
    channel: string,
    now: Date,
    send: () => Promise<boolean>,
  ) {
    const delivery = await this.prisma.notificationDelivery.upsert({
      where: {
        eventId_channel_version: {
          eventId: event.id,
          channel,
          version: event.deliveryVersion,
        },
      },
      create: {
        eventId: event.id,
        channel,
        version: event.deliveryVersion,
        nextAttemptAt: now,
      },
      update: {},
    });
    const claim = await this.prisma.notificationDelivery.updateMany({
      where: {
        id: delivery.id,
        sentAt: null,
        attempts: { lt: 5 },
        nextAttemptAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: {
        leaseUntil: new Date(now.getTime() + 300000),
        attempts: { increment: 1 },
      },
    });
    if (!claim.count) return;
    // Vérifier une dernière fois une réalisation, une suppression ou un report intervenu pendant la réconciliation.
    const current = await this.prisma.notificationEvent.findFirst({
      where: {
        id: event.id,
        status: 'pending',
        deliveryVersion: event.deliveryVersion,
      },
    });
    if (!current) {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { leaseUntil: null },
      });
      return;
    }
    try {
      const sent = await send();
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: sent
          ? { sentAt: now, leaseUntil: null }
          : { attempts: 5, leaseUntil: null },
      });
    } catch {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          leaseUntil: null,
          nextAttemptAt: new Date(
            now.getTime() + Math.min(15, 2 ** delivery.attempts) * 60000,
          ),
        },
      });
      this.logger.warn('Livraison reportée après un échec temporaire.');
    }
  }
}
