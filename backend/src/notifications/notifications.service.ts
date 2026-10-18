import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, PushSubscription } from '@prisma/client';
import { createECDH } from 'crypto';
import * as webPush from 'web-push';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_TIME_ZONE,
  insideDeliveryWindow,
  isTypeEnabled,
  localDay,
  validateTypeSchedules,
  validTimeZone,
} from './notification-schedule';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  data?: {
    animalId?: string;
    eventId?: string;
    routineId?: string;
    type?: string;
  };
}
interface PreferenceUpdate {
  types?: Record<string, boolean>;
  typeSchedules?: Record<string, unknown>;
  schedule?: { start: string; end: string };
  snooze?: number;
  timeZone?: string;
  deliveryChannel?: 'push' | 'email' | 'both';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly prisma: PrismaService) {}

  private vapidDetails() {
    const publicKey = process.env.VAPID_PUBLIC_KEY || '';
    const privateKey = process.env.VAPID_PRIVATE_KEY || '';
    const subject = process.env.VAPID_SUBJECT || 'mailto:contact@captivia.com';
    try {
      const pair = createECDH('prime256v1');
      pair.setPrivateKey(Buffer.from(privateKey, 'base64url'));
      if (
        pair.getPublicKey().toString('base64url') !== publicKey ||
        !/^(mailto:|https:\/\/)/.test(subject)
      )
        return null;
      return { publicKey, privateKey, subject };
    } catch {
      return null;
    }
  }

  getCapabilities() {
    const vapid = this.vapidDetails();
    return {
      push: !!vapid,
      email: !!(process.env.MAIL_HOST && process.env.MAIL_FROM),
      publicKey: vapid?.publicKey || null,
    };
  }

  async subscribeToPush(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    if (!this.getCapabilities().push)
      throw new ServiceUnavailableException(
        'Les notifications push ne sont pas configurées.',
      );
    let url: URL;
    try {
      url = new URL(subscription.endpoint);
    } catch {
      throw new BadRequestException('Abonnement push invalide.');
    }
    const host = url.hostname;
    const trusted =
      host === 'fcm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host.endsWith('.push.services.mozilla.com') ||
      host.endsWith('.push.apple.com') ||
      host.endsWith('.notify.windows.com');
    if (
      !trusted ||
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443') ||
      Buffer.from(subscription.keys.p256dh, 'base64url').length !== 65 ||
      Buffer.from(subscription.keys.auth, 'base64url').length !== 16
    ) {
      throw new BadRequestException('Abonnement push invalide.');
    }
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: { userId, ...subscription },
      update: { userId, keys: subscription.keys },
    });
  }

  async unsubscribeFromPush(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { success: true };
  }

  getUserSubscriptions(userId: string) {
    return this.prisma.pushSubscription.findMany({ where: { userId } });
  }

  async sendPushSubscription(
    sub: PushSubscription,
    payload: PushPayload,
  ): Promise<boolean> {
    const vapidDetails = this.vapidDetails();
    if (!vapidDetails)
      throw new ServiceUnavailableException(
        'Les notifications push ne sont pas configurées.',
      );
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as unknown as webPush.PushSubscription['keys'],
        },
        JSON.stringify(payload),
        { vapidDetails, TTL: 3600, timeout: 10000 },
      );
      return true;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await this.prisma.pushSubscription.deleteMany({
          where: { id: sub.id },
        });
        return false;
      }
      // Ne pas journaliser le payload, les clés ou l'endpoint (identifiants privés).
      this.logger.warn(
        `Échec d'envoi push (HTTP ${status || 'indisponible'}).`,
      );
      throw error;
    }
  }

  async sendNotification(userId: string, payload: PushPayload) {
    if (!this.getCapabilities().push)
      throw new ServiceUnavailableException(
        'Les notifications push ne sont pas configurées.',
      );
    const subscriptions = await this.getUserSubscriptions(userId);
    const results = await Promise.allSettled(
      subscriptions.map((sub) => this.sendPushSubscription(sub, payload)),
    );
    return {
      sent: results.filter((r) => r.status === 'fulfilled' && r.value).length,
      failed: results.filter((r) => r.status === 'rejected' || !r.value).length,
    };
  }

  async sendEmail(to: string, payload: PushPayload) {
    if (!this.getCapabilities().email)
      throw new ServiceUnavailableException(
        'Les rappels par email ne sont pas configurés.',
      );
    const transport = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: process.env.MAIL_SECURE === 'true',
      requireTLS:
        process.env.MAIL_REQUIRE_TLS !== 'false' &&
        process.env.NODE_ENV === 'production',
      auth: process.env.MAIL_USER
        ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
        : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    const result = await transport.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: payload.title,
      text: payload.body,
    });
    if (!result.accepted?.length)
      throw new Error('Email refusé par le serveur SMTP.');
  }

  async sendTestNotification(userId: string) {
    const prefs = await this.getNotificationPreferences(userId);
    const capabilities = this.getCapabilities();
    if (
      (prefs.deliveryChannel !== 'email' && !capabilities.push) ||
      (prefs.deliveryChannel !== 'push' && !capabilities.email)
    )
      throw new ServiceUnavailableException(
        'Un canal de réception est indisponible.',
      );
    const payload = {
      title: 'Test Captivia',
      body: 'Vos notifications Captivia sont opérationnelles.',
      icon: '/icon.png',
    };
    let sent = 0;
    let failed = 0;
    if (prefs.deliveryChannel !== 'email') {
      const result = await this.sendNotification(userId, payload);
      sent += result.sent;
      failed += result.failed;
    }
    if (prefs.deliveryChannel !== 'push') {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      });
      try {
        await this.sendEmail(user.email, payload);
        sent++;
      } catch {
        failed++;
        this.logger.warn('La notification email de test n’a pas été acceptée.');
      }
    }
    return { sent, failed };
  }

  getNotificationPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        types: {},
        schedule: { start: '00:00', end: '23:59' },
        snooze: 15,
        deliveryChannel: 'push',
        timeZone: DEFAULT_TIME_ZONE,
      },
    });
  }

  async updateNotificationPreferences(userId: string, data: PreferenceUpdate) {
    const record = (value: unknown): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value);
    if (
      data.timeZone !== undefined &&
      (typeof data.timeZone !== 'string' || !validTimeZone(data.timeZone))
    )
      throw new BadRequestException('Fuseau horaire invalide.');
    if (
      data.deliveryChannel !== undefined &&
      !['push', 'email', 'both'].includes(data.deliveryChannel)
    )
      throw new BadRequestException('Canal de réception invalide.');
    if (
      data.snooze !== undefined &&
      (!Number.isInteger(data.snooze) || data.snooze < 5 || data.snooze > 120)
    )
      throw new BadRequestException('Report invalide (5 à 120 minutes).');
    if (
      data.types !== undefined &&
      (!record(data.types) ||
        Object.entries(data.types).length > 100 ||
        Object.entries(data.types).some(
          ([key, value]) =>
            typeof value !== 'boolean' ||
            !key.trim() ||
            key.length > 120 ||
            ['__proto__', 'constructor', 'prototype'].includes(key),
        ))
    )
      throw new BadRequestException('Types de rappel invalides.');
    if (data.typeSchedules !== undefined) {
      if (!record(data.typeSchedules))
        throw new BadRequestException('Horaires invalides.');
      validateTypeSchedules(data.typeSchedules);
    }
    if (
      data.schedule !== undefined &&
      (!record(data.schedule) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.schedule.start) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.schedule.end))
    )
      throw new BadRequestException('Plage horaire invalide.');
    if (data.deliveryChannel === 'email' || data.deliveryChannel === 'both') {
      if (!this.getCapabilities().email)
        throw new ServiceUnavailableException(
          'Les rappels par email ne sont pas configurés.',
        );
    }
    const existing = await this.getNotificationPreferences(userId);
    const typeSchedules = data.typeSchedules
      ? Object.fromEntries(
          Object.entries(data.typeSchedules).map(([key, value]) => {
            const s = value as Record<string, unknown>;
            const prev = (
              existing.typeSchedules as Record<
                string,
                Record<string, unknown>
              > | null
            )?.[key];
            return [
              key,
              {
                ...s,
                startDate:
                  s.startDate ||
                  prev?.startDate ||
                  localDay(
                    undefined,
                    data.timeZone || existing.timeZone,
                  ).toISODate(),
              },
            ];
          }),
        )
      : undefined;
    return this.prisma.notificationPreference.update({
      where: { userId },
      data: {
        ...data,
        typeSchedules: typeSchedules as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async checkIfShouldNotify(
    userId: string,
    type: string,
    now = new Date(),
  ): Promise<boolean> {
    const prefs = await this.getNotificationPreferences(userId);
    return (
      isTypeEnabled(prefs.types, type) &&
      insideDeliveryWindow(prefs.schedule, now, prefs.timeZone)
    );
  }
}
