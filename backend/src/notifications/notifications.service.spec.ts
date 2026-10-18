import { createECDH, randomBytes } from 'crypto';
import * as webPush from 'web-push';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

jest.mock('web-push', () => ({
  ...jest.requireActual<typeof import('web-push')>('web-push'),
  sendNotification: jest.fn(),
}));
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
const sendMail = jest.fn();
const keys = webPush.generateVAPIDKeys();
const client = createECDH('prime256v1');
client.generateKeys();
const subscription = {
  id: 'subscription',
  userId: 'user',
  endpoint: 'https://fcm.googleapis.com/fcm/send/example',
  keys: {
    p256dh: client.getPublicKey().toString('base64url'),
    auth: randomBytes(16).toString('base64url'),
  },
  createdAt: new Date(),
};
const prefs = {
  id: 'pref',
  userId: 'user',
  types: { Nourrissage: true },
  typeSchedules: {},
  schedule: { start: '08:00', end: '22:00' },
  snooze: 15,
  timeZone: 'Europe/Brussels',
  deliveryChannel: 'push',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};
const prisma = {
  pushSubscription: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  notificationPreference: { upsert: jest.fn(), update: jest.fn() },
  user: { findUniqueOrThrow: jest.fn() },
};
const payload = { title: 'Rappel Captivia', body: 'Nettoyage pour Kiwi' };
let service: NotificationsService;
const original = {
  public: process.env.VAPID_PUBLIC_KEY,
  private: process.env.VAPID_PRIVATE_KEY,
  host: process.env.MAIL_HOST,
  from: process.env.MAIL_FROM,
};
beforeEach(() => {
  jest.clearAllMocks();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  delete process.env.MAIL_HOST;
  delete process.env.MAIL_FROM;
  prisma.pushSubscription.findMany.mockResolvedValue([subscription]);
  prisma.pushSubscription.upsert.mockResolvedValue(subscription);
  prisma.notificationPreference.upsert.mockResolvedValue(prefs);
  prisma.notificationPreference.update.mockImplementation(
    ({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...prefs, ...data }),
  );
  jest
    .mocked(webPush.sendNotification)
    .mockResolvedValue({ statusCode: 201, body: '', headers: {} });
  jest
    .mocked(nodemailer.createTransport)
    .mockReturnValue({ sendMail } as unknown as ReturnType<
      typeof nodemailer.createTransport
    >);
  sendMail.mockResolvedValue({ accepted: ['recipient@example.test'] });
  service = new NotificationsService(prisma as unknown as PrismaService);
});
afterAll(() => {
  for (const [name, value] of Object.entries({
    VAPID_PUBLIC_KEY: original.public,
    VAPID_PRIVATE_KEY: original.private,
    MAIL_HOST: original.host,
    MAIL_FROM: original.from,
  })) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
describe('Envois réels et préférences', () => {
  it('appelle Web Push avec une charge JSON et ne compte que les envois acceptés', async () => {
    expect(await service.sendNotification('user', payload)).toEqual({
      sent: 1,
      failed: 0,
    });
    expect(webPush.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: subscription.endpoint }),
      JSON.stringify(payload),
      expect.objectContaining({
        vapidDetails: {
          publicKey: keys.publicKey,
          privateKey: keys.privateKey,
          subject: process.env.VAPID_SUBJECT || 'mailto:contact@captivia.com',
        },
        timeout: 10000,
      }),
    );
  });
  it('ne prétend pas avoir envoyé si les clés serveur manquent', async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    expect(service.getCapabilities().push).toBe(false);
    await expect(service.sendNotification('user', payload)).rejects.toThrow();
    expect(webPush.sendNotification).not.toHaveBeenCalled();
  });
  it('retourne zéro si aucun appareil n’est abonné', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([]);
    expect(await service.sendNotification('user', payload)).toEqual({
      sent: 0,
      failed: 0,
    });
  });
  it('supprime les abonnements expirés et les compte en échec', async () => {
    jest
      .mocked(webPush.sendNotification)
      .mockRejectedValue({ statusCode: 410 });
    expect(await service.sendNotification('user', payload)).toEqual({
      sent: 0,
      failed: 1,
    });
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { id: subscription.id },
    });
  });
  it('conserve un abonnement lors d’une erreur temporaire', async () => {
    jest
      .mocked(webPush.sendNotification)
      .mockRejectedValue({ statusCode: 503 });
    expect(await service.sendNotification('user', payload)).toEqual({
      sent: 0,
      failed: 1,
    });
    expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });
  it('rattache un appareil au compte actuellement connecté', async () => {
    await service.subscribeToPush('new-user', {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });
    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: subscription.endpoint },
      create: {
        userId: 'new-user',
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      update: { userId: 'new-user', keys: subscription.keys },
    });
  });
  it('rejette les endpoints arbitraires et les clés invalides', async () => {
    await expect(
      service.subscribeToPush('user', {
        endpoint: 'https://localhost/private',
        keys: subscription.keys,
      }),
    ).rejects.toThrow();
    await expect(
      service.subscribeToPush('user', {
        endpoint: subscription.endpoint,
        keys: { p256dh: 'bad', auth: 'bad' },
      }),
    ).rejects.toThrow();
    expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled();
  });
  it('envoie le canal email au destinataire sans inclure de HTML interpolé', async () => {
    process.env.MAIL_HOST = 'smtp.example.test';
    process.env.MAIL_FROM = 'Captivia <test@example.test>';
    await service.sendEmail('recipient@example.test', payload);
    expect(sendMail).toHaveBeenCalledWith({
      from: process.env.MAIL_FROM,
      to: 'recipient@example.test',
      subject: payload.title,
      text: payload.body,
    });
  });
  it('refuse le canal email quand SMTP n’est pas configuré', async () => {
    await expect(
      service.updateNotificationPreferences('user', {
        deliveryChannel: 'email',
      }),
    ).rejects.toThrow();
    expect(prisma.notificationPreference.update).not.toHaveBeenCalled();
  });
  it('ne compte pas comme livré un email refusé par SMTP', async () => {
    process.env.MAIL_HOST = 'smtp.example.test';
    process.env.MAIL_FROM = 'test@example.test';
    sendMail.mockResolvedValue({
      accepted: [],
      rejected: ['recipient@example.test'],
    });
    await expect(
      service.sendEmail('recipient@example.test', payload),
    ).rejects.toThrow();
  });
  it('valide le fuseau et les récurrences avant toute sauvegarde', async () => {
    await expect(
      service.updateNotificationPreferences('user', { timeZone: 'Mars/Test' }),
    ).rejects.toThrow();
    await expect(
      service.updateNotificationPreferences('user', {
        typeSchedules: { Test: { time: '99:00', recurrence: 'daily' } },
      }),
    ).rejects.toThrow();
    expect(prisma.notificationPreference.update).not.toHaveBeenCalled();
  });
  it('reconnaît les libellés normalisés et la plage horaire locale', async () => {
    prisma.notificationPreference.upsert.mockResolvedValue({
      ...prefs,
      types: { Nettoyage: false },
    });
    expect(
      await service.checkIfShouldNotify(
        'user',
        'entretien',
        new Date('2026-07-02T08:00:00Z'),
      ),
    ).toBe(false);
    expect(
      await service.checkIfShouldNotify(
        'user',
        'controle',
        new Date('2026-07-02T08:00:00Z'),
      ),
    ).toBe(true);
  });
  it('rejette les champs explicitement nuls au lieu d’une erreur base de données', async () => {
    for (const field of [
      'timeZone',
      'types',
      'typeSchedules',
      'schedule',
      'snooze',
      'deliveryChannel',
    ]) {
      await expect(
        service.updateNotificationPreferences('user', {
          [field]: null,
        } as Parameters<
          NotificationsService['updateNotificationPreferences']
        >[1]),
      ).rejects.toThrow();
    }
    expect(prisma.notificationPreference.update).not.toHaveBeenCalled();
  });
  it('rapporte un échec email partiel sans masquer le push déjà accepté', async () => {
    process.env.MAIL_HOST = 'smtp.example.test';
    process.env.MAIL_FROM = 'local@example.test';
    prisma.notificationPreference.upsert.mockResolvedValue({
      ...prefs,
      deliveryChannel: 'both',
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      email: 'recipient@example.test',
    });
    sendMail.mockRejectedValue(new Error('SMTP unavailable'));
    expect(await service.sendTestNotification('user')).toEqual({
      sent: 1,
      failed: 1,
    });
  });
  it('construit une vraie requête Web Push chiffrée et signée, sans réseau externe', async () => {
    jest
      .mocked(webPush.sendNotification)
      .mockImplementation((subscription, body, options) => {
        if (typeof body !== 'string')
          throw new Error('La charge doit être sérialisée en JSON.');
        const request = webPush.generateRequestDetails(
          subscription,
          body,
          options,
        );
        expect(request.headers['Content-Encoding']).toBe('aes128gcm');
        expect(request.headers.Authorization).toMatch(/^vapid /);
        if (!Buffer.isBuffer(request.body))
          throw new Error('Charge push non chiffrée');
        expect(request.body.includes(Buffer.from(payload.body))).toBe(false);
        return Promise.resolve({ statusCode: 201, body: '', headers: {} });
      });
    expect(await service.sendNotification('user', payload)).toEqual({
      sent: 1,
      failed: 0,
    });
  });
});
