import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Persistent per-device/channel claims, shared by web, native and email delivery. */
@Injectable()
export class NotificationDeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async send(
    eventId: string,
    version: number,
    channel: string,
    work: () => Promise<void>,
    now = new Date(),
  ): Promise<boolean> {
    const delivery = await this.prisma.notificationDelivery.upsert({
      where: { eventId_channel_version: { eventId, channel, version } },
      create: { eventId, channel, version, nextAttemptAt: now },
      update: {},
    });
    if (delivery.sentAt) return true;
    const claimed = await this.prisma.notificationDelivery.updateMany({
      where: {
        id: delivery.id,
        sentAt: null,
        attempts: { lt: 5 },
        nextAttemptAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: {
        leaseUntil: new Date(now.getTime() + 300_000),
        attempts: { increment: 1 },
      },
    });
    if (!claimed.count) return false;
    const event = await this.prisma.notificationEvent.findFirst({
      where: { id: eventId, status: 'pending', deliveryVersion: version },
    });
    if (!event) {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { leaseUntil: null },
      });
      return false;
    }
    try {
      await work();
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { sentAt: now, leaseUntil: null },
      });
      return true;
    } catch (error) {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          leaseUntil: null,
          nextAttemptAt: new Date(
            now.getTime() + Math.min(15, 2 ** delivery.attempts) * 60_000,
          ),
        },
      });
      throw error;
    }
  }
}
