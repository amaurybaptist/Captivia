import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { DateTime } from 'luxon';
import { writeFile } from 'fs/promises';
async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (
    url.hostname !== '127.0.0.1' ||
    url.port !== '55435' ||
    url.pathname !== '/captivia_agenda_test' ||
    process.env.JWT_SECRET !== 'local-agenda-verification-secret' ||
    process.env.NODE_ENV !== 'test'
  )
    throw new Error('Base agenda locale de test obligatoire.');
  const db = new PrismaClient(),
    jwt = new JwtService({ secret: process.env.JWT_SECRET });
  try {
    const speciesId = 2147482400;
    await db.speciesProfile.upsert({
      where: { speciesId },
      update: {},
      create: {
        speciesId,
        commonNameFr: 'Animal de vérification',
        scientificName: 'Test animal',
        category: 'mammifère',
        domesticationType: 'domestique',
      },
    });
    const user = await db.user.create({
      data: {
        email: `agenda-browser-${Date.now()}@example.test`,
        passwordHash: 'unusable-test-only',
        isPremium: true,
      },
    });
    const free = await db.user.create({
      data: {
        email: `agenda-free-${Date.now()}@example.test`,
        passwordHash: 'unusable-test-only',
      },
    });
    const today = DateTime.now().setZone('Europe/Brussels').startOf('day'),
      date = today.toISODate()!;
    const kiwi = await db.animal.create({
        data: { userId: user.id, speciesId, name: 'Kiwi' },
      }),
      nala = await db.animal.create({
        data: { userId: user.id, speciesId, name: 'Nala' },
      });
    await db.notificationPreference.create({
      data: {
        userId: user.id,
        timeZone: 'Europe/Brussels',
        types: {},
        schedule: {},
        snooze: 15,
      },
    });
    for (const [animal, name] of [
      [kiwi, 'Repas Kiwi'],
      [nala, 'Routine Nala'],
    ] as const)
      await db.routine.create({
        data: {
          animalId: animal.id,
          name,
          type: 'nourrissage',
          frequency: 'daily',
          schedule: { time: '09:00', startDate: date },
          createdAt: today.toJSDate(),
        },
      });
    await db.medication.create({
      data: {
        animalId: kiwi.id,
        name: 'Traitement Kiwi',
        dose: '1',
        frequency: 'daily',
        startDate: new Date(date + 'T00:00Z'),
      },
    });
    const appointment = await db.vetAppointment.create({
      data: {
        animalId: kiwi.id,
        vetName: 'Dr Test',
        reason: 'Visite annuelle',
        date: today.set({ hour: 11, minute: 30 }).toJSDate(),
      },
    });
    await db.vaccination.create({
      data: {
        animalId: kiwi.id,
        name: 'Rage',
        date: today.minus({ years: 1 }).toJSDate(),
        nextDueDate: new Date(date + 'T00:00Z'),
      },
    });
    await writeFile(
      '/tmp/captivia-agenda-browser-users.json',
      JSON.stringify({
        user: { id: user.id, email: user.email, locale: 'fr', isPremium: true },
        token: jwt.sign({ sub: user.id }, { expiresIn: '1h' }),
        today: date,
        nextDay: today.plus({ days: 1 }).toISODate(),
        kiwi: kiwi.id,
        nala: nala.id,
        appointment: appointment.id,
        free: {
          user: {
            id: free.id,
            email: free.email,
            locale: 'fr',
            isPremium: false,
          },
          token: jwt.sign({ sub: free.id }, { expiresIn: '1h' }),
        },
      }),
      { mode: 0o600 },
    );
    console.log('Fixtures agenda enregistrées sans afficher les jetons.');
  } finally {
    await db.$disconnect();
  }
}
void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
