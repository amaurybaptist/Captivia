import { PushDispatcher } from '../src/notifications/push-dispatcher';
import { WebPushSender } from '../src/notifications/push-sender';
import { NativePushSender } from '../src/notifications/native-push-sender';
import { NotificationDeliveryService } from '../src/notifications/notification-delivery.service';
import { MailService } from '../src/mail/mail.service';
import { randomUUID } from 'crypto';
import * as webPush from 'web-push';
import { PrismaService } from '../src/prisma/prisma.service';
import { RoutinesService } from '../src/routines/routines.service';
import { GradeService } from '../src/grade/grade.service';
import { NotificationsSchedulerService } from '../src/notifications/notifications-scheduler.service';

jest.mock('web-push', () => ({
  ...jest.requireActual<typeof import('web-push')>('web-push'),
  sendNotification: jest.fn(),
}));
jest.setTimeout(30000);
const prisma = new PrismaService();
const grade = new GradeService(prisma, new RoutinesService(prisma));
const delivery = new NotificationDeliveryService(prisma);
const mail = new MailService();
const scheduler = () => {
  const dispatcher = new PushDispatcher(
    new WebPushSender(prisma, delivery),
    new NativePushSender(prisma, null, delivery),
  );
  return new NotificationsSchedulerService(
    prisma,
    grade,
    mail,
    dispatcher,
    delivery,
  );
};
const speciesId = 2147483001;
const anchor = new Date('2026-01-01T12:00:00Z');
const now = new Date('2026-10-17T10:35:00Z'); // 12:35 en Belgique
let userId: string;
let animalId: string;
let routineId: string;
const keys = webPush.generateVAPIDKeys();
const oldKeys = [process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY];
beforeAll(async () => {
  await prisma.$connect();
  await prisma.speciesProfile.upsert({
    where: { speciesId },
    update: {},
    create: {
      speciesId,
      commonNameFr: 'Espèce de test notifications',
      scientificName: 'Test notification',
      category: 'reptile',
      domesticationType: 'NAC',
    },
  });
});
beforeEach(async () => {
  jest.useFakeTimers({
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'hrtime',
      'performance',
      'queueMicrotask',
    ],
  });
  jest.setSystemTime(now);
  jest.clearAllMocks();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  jest
    .mocked(webPush.sendNotification)
    .mockResolvedValue({ statusCode: 201, body: '', headers: {} });
  const user = await prisma.user.create({
    data: {
      email: `notification-${randomUUID()}@example.test`,
      passwordHash: 'local-test-only',
    },
  });
  userId = user.id;
  const animal = await prisma.animal.create({
    data: { userId, speciesId, name: 'Kiwi', photos: [] },
  });
  animalId = animal.id;
  const routine = await prisma.routine.create({
    data: {
      animalId,
      type: 'nourrissage',
      frequency: 'daily',
      schedule: { time: '12:35', recurrence: 'daily' },
      createdAt: anchor,
    },
  });
  routineId = routine.id;
  await prisma.notificationPreference.create({
    data: {
      userId,
      types: {},
      schedule: { start: '00:00', end: '23:59' },
      timeZone: 'Europe/Brussels',
      createdAt: anchor,
    },
  });
});
afterEach(async () => {
  await prisma.user.delete({ where: { id: userId } });
  jest.useRealTimers();
});
afterAll(async () => {
  await prisma.speciesProfile.delete({ where: { speciesId } });
  await prisma.$disconnect();
  for (const [i, name] of ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'].entries()) {
    if (oldKeys[i] === undefined) delete process.env[name];
    else process.env[name] = oldKeys[i];
  }
});
async function subscribe() {
  await prisma.pushSubscription.create({
    data: {
      userId,
      endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
      keys: {
        p256dh: keys.publicKey,
        auth: Buffer.alloc(16, 1).toString('base64url'),
      },
    },
  });
}
describe('Rappels et livraisons — PostgreSQL réel isolé', () => {
  it('conserve Fait, les points et une suppression après refresh/rechargement', async () => {
    const [first] = await grade.getOrCreateTodayEvents(userId, '2026-10-17');
    expect(first.scheduledAt).toBe('2026-10-17T10:35:00.000Z');
    await grade.setEventStatus(userId, first.id, 'done');
    const [again] = await grade.getOrCreateTodayEvents(
      userId,
      '2026-10-17',
      true,
    );
    expect(again).toMatchObject({
      id: first.id,
      status: 'done',
      pointsAwarded: 2,
    });
    expect(await grade.setEventStatus(userId, first.id, 'done')).toBeNull();
    expect(await grade.deleteEvent(userId, first.id)).toBe(false);
    expect(
      await grade.getOrCreateTodayEvents(userId, '2026-10-17', true),
    ).toHaveLength(1);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).points,
    ).toBe(2);
  });
  it('une création et une attribution uniques même avec des appels concurrents', async () => {
    const batches = await Promise.all(
      Array.from({ length: 4 }, () =>
        grade.getOrCreateTodayEvents(userId, '2026-10-17', true),
      ),
    );
    expect(new Set(batches.map((batch) => batch[0].id)).size).toBe(1);
    const id = batches[0][0].id;
    const results = await Promise.all([
      grade.setEventStatus(userId, id, 'done'),
      grade.setEventStatus(userId, id, 'done'),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).points,
    ).toBe(2);
  });
  it('ajoute une nouvelle routine sans réinitialiser les rappels existants et retire celles désactivées', async () => {
    const [first] = await grade.getOrCreateTodayEvents(userId, '2026-10-17');
    await grade.setEventStatus(userId, first.id, 'skipped');
    const routine = await prisma.routine.create({
      data: {
        animalId,
        type: 'entretien',
        frequency: 'daily',
        schedule: { time: '15:20' },
        createdAt: anchor,
      },
    });
    const second = await grade.getOrCreateTodayEvents(
      userId,
      '2026-10-17',
      true,
    );
    expect(second).toHaveLength(2);
    expect(second.find((e) => e.id === first.id)?.status).toBe('skipped');
    await prisma.routine.update({
      where: { id: routine.id },
      data: { active: false },
    });
    expect(
      await grade.getOrCreateTodayEvents(userId, '2026-10-17', true),
    ).toHaveLength(1);
  });
  it('ne transforme pas un traitement hebdomadaire en rappel quotidien', async () => {
    await prisma.routine.update({
      where: { id: routineId },
      data: { active: false },
    });
    await prisma.medication.create({
      data: {
        animalId,
        name: 'Traitement de test',
        dose: 'Selon ordonnance',
        frequency: 'weekly',
        startDate: new Date('2026-10-16T00:00:00Z'),
      },
    });
    expect(
      await grade.getOrCreateTodayEvents(userId, '2026-10-17'),
    ).toHaveLength(0);
    expect(
      await grade.getOrCreateTodayEvents(userId, '2026-10-23'),
    ).toHaveLength(1);
  });
  it('envoie une seule fois même avec deux workers et plusieurs passages', async () => {
    await subscribe();
    await Promise.all([scheduler().runOnce(now), scheduler().runOnce(now)]);
    await scheduler().runOnce(new Date(now.getTime() + 30000));
    expect(webPush.sendNotification).toHaveBeenCalledTimes(1);
    expect(
      await prisma.notificationDelivery.count({
        where: { event: { userId }, sentAt: { not: null } },
      }),
    ).toBe(1);
  });
  it('reporte un rappel sans envoi anticipé ni double attribution', async () => {
    await subscribe();
    const worker = scheduler();
    await worker.runOnce(now);
    const event = await prisma.notificationEvent.findFirstOrThrow({
      where: { userId },
    });
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    try {
      await grade.snoozeEvent(userId, event.id, 15);
    } finally {
      clock.mockRestore();
    }
    await worker.runOnce(new Date(now.getTime() + 10 * 60000));
    expect(webPush.sendNotification).toHaveBeenCalledTimes(1);
    await worker.runOnce(new Date(now.getTime() + 15 * 60000));
    expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
    await worker.runOnce(new Date(now.getTime() + 16 * 60000));
    expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
  });
  it('réessaie un échec temporaire après son délai sans renvoyer les envois réussis', async () => {
    await subscribe();
    jest
      .mocked(webPush.sendNotification)
      .mockRejectedValueOnce({ statusCode: 503 });
    const worker = scheduler();
    await worker.runOnce(now);
    await worker.runOnce(new Date(now.getTime() + 30000));
    expect(webPush.sendNotification).toHaveBeenCalledTimes(1);
    await worker.runOnce(new Date(now.getTime() + 61000));
    expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
  });
  it('n’envoie pas un rappel supprimé, terminé ou explicitement désactivé par son libellé', async () => {
    await subscribe();
    await prisma.notificationPreference.update({
      where: { userId },
      data: { types: { Nourrissage: false } },
    });
    await scheduler().runOnce(now);
    expect(webPush.sendNotification).not.toHaveBeenCalled();
    await prisma.notificationPreference.update({
      where: { userId },
      data: { types: {} },
    });
    const [event] = await grade.getOrCreateTodayEvents(userId, '2026-10-17');
    await grade.deleteEvent(userId, event.id);
    await scheduler().runOnce(now);
    expect(webPush.sendNotification).not.toHaveBeenCalled();
  });
  it('un rappel futur reporté est retardé, jamais avancé', async () => {
    const [event] = await grade.getOrCreateTodayEvents(userId, '2026-10-17');
    const clock = jest
      .spyOn(Date, 'now')
      .mockReturnValue(now.getTime() - 35 * 60000);
    try {
      const updated = await grade.snoozeEvent(userId, event.id, 15);
      expect(updated?.snoozedUntil).toBe('2026-10-17T10:50:00.000Z');
    } finally {
      clock.mockRestore();
    }
  });
  it('un report de deux heures est livré malgré la fenêtre de rattrapage d’une heure', async () => {
    await subscribe();
    const worker = scheduler();
    await worker.runOnce(now);
    const event = await prisma.notificationEvent.findFirstOrThrow({
      where: { userId },
    });
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    try {
      await grade.snoozeEvent(userId, event.id, 120);
    } finally {
      clock.mockRestore();
    }
    await worker.runOnce(new Date(now.getTime() + 119 * 60000));
    expect(webPush.sendNotification).toHaveBeenCalledTimes(1);
    await worker.runOnce(new Date(now.getTime() + 120 * 60000));
    expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
  });
  it('respecte les minutes exactes et la plage horaire de réception', async () => {
    await subscribe();
    const worker = scheduler();
    await worker.runOnce(new Date(now.getTime() - 1000));
    expect(webPush.sendNotification).not.toHaveBeenCalled();
    await prisma.notificationPreference.update({
      where: { userId },
      data: { schedule: { start: '14:00', end: '22:00' } },
    });
    await worker.runOnce(now);
    expect(webPush.sendNotification).not.toHaveBeenCalled();
    await prisma.notificationPreference.update({
      where: { userId },
      data: { schedule: { start: '00:00', end: '23:59' } },
    });
    await worker.runOnce(now);
    expect(webPush.sendNotification).toHaveBeenCalledTimes(1);
  });
  it('un échec sur un deuxième appareil ne renvoie pas le rappel au premier', async () => {
    await subscribe();
    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: 'https://fcm.googleapis.com/fcm/send/second',
        keys: {
          p256dh: keys.publicKey,
          auth: Buffer.alloc(16, 2).toString('base64url'),
        },
      },
    });
    let failed = false;
    jest.mocked(webPush.sendNotification).mockImplementation((sub) => {
      if (sub.endpoint.endsWith('/second') && !failed) {
        failed = true;
        return Promise.reject(
          Object.assign(new Error('temporary outage'), { statusCode: 503 }),
        );
      }
      return Promise.resolve({ statusCode: 201, body: '', headers: {} });
    });
    const worker = scheduler();
    await worker.runOnce(now);
    expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
    await worker.runOnce(new Date(now.getTime() + 61000));
    expect(webPush.sendNotification).toHaveBeenCalledTimes(3);
  });
  it('le canal email utilise l’adresse du propriétaire et ne déclenche aucun push', async () => {
    const oldHost = process.env.MAIL_HOST;
    const oldFrom = process.env.MAIL_FROM;
    process.env.MAIL_HOST = 'smtp.example.test';
    process.env.MAIL_FROM = 'local@example.test';
    const email = jest
      .spyOn(mail, 'sendCareReminder')
      .mockResolvedValue({ sent: true, simulated: false, attempts: 1 });
    try {
      await subscribe();
      await prisma.notificationPreference.update({
        where: { userId },
        data: { deliveryChannel: 'email' },
      });
      const worker = scheduler();
      await worker.runOnce(now);
      await worker.runOnce(now);
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(email).toHaveBeenCalledTimes(1);
      expect(email).toHaveBeenCalledWith(
        user.email,
        'fr',
        expect.objectContaining({ label: 'Nourrissage', animalName: 'Kiwi' }),
      );
      expect(webPush.sendNotification).not.toHaveBeenCalled();
    } finally {
      email.mockRestore();
      if (oldHost === undefined) delete process.env.MAIL_HOST;
      else process.env.MAIL_HOST = oldHost;
      if (oldFrom === undefined) delete process.env.MAIL_FROM;
      else process.env.MAIL_FROM = oldFrom;
    }
  });
  it('désactiver puis réactiver une routine ne réinitialise pas les réalisations', async () => {
    const [event] = await grade.getOrCreateTodayEvents(userId, '2026-10-17');
    await grade.setEventStatus(userId, event.id, 'done');
    await prisma.routine.update({
      where: { id: routineId },
      data: { active: false },
    });
    expect(
      await grade.getOrCreateTodayEvents(userId, '2026-10-17'),
    ).toHaveLength(0);
    await prisma.routine.update({
      where: { id: routineId },
      data: { active: true },
    });
    const [restored] = await grade.getOrCreateTodayEvents(userId, '2026-10-17');
    expect(restored).toMatchObject({ id: event.id, status: 'done' });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).points,
    ).toBe(2);
  });
});
