import { randomUUID } from 'crypto';
import { Server } from 'http';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
jest.setTimeout(30000);
describe('Agenda — API réelle et données isolées', () => {
  let app: INestApplication,
    db: PrismaService,
    token: string,
    a: string,
    b: string,
    animal: string,
    foreign: string,
    routine: string;
  const speciesId = 2147482300;
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes(':55435/captivia_agenda_test'))
      throw new Error('Base agenda isolée obligatoire.');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
    await db.speciesProfile.create({
      data: {
        speciesId,
        commonNameFr: 'Animal de test',
        scientificName: 'Test animal',
        category: 'mammifère',
        domesticationType: 'domestique',
      },
    });
  });
  beforeEach(async () => {
    a = (
      await db.user.create({
        data: {
          email: `agenda-a-${randomUUID()}@example.test`,
          passwordHash: 'test',
          isPremium: true,
        },
      })
    ).id;
    b = (
      await db.user.create({
        data: {
          email: `agenda-b-${randomUUID()}@example.test`,
          passwordHash: 'test',
        },
      })
    ).id;
    animal = (
      await db.animal.create({ data: { userId: a, speciesId, name: 'Kiwi' } })
    ).id;
    foreign = (
      await db.animal.create({
        data: { userId: b, speciesId, name: 'Secret B' },
      })
    ).id;
    routine = (
      await db.routine.create({
        data: {
          animalId: animal,
          name: 'Repas Kiwi',
          type: 'nourrissage',
          frequency: 'daily',
          schedule: { time: '08:00', startDate: '2026-10-01' },
          createdAt: new Date('2026-10-01T00:00Z'),
        },
      })
    ).id;
    await db.routine.create({
      data: {
        animalId: foreign,
        name: 'Soin secret',
        type: 'entretien',
        frequency: 'daily',
        schedule: { time: '09:00', startDate: '2026-10-01' },
      },
    });
    await db.notificationPreference.create({
      data: {
        userId: a,
        types: {},
        schedule: {},
        snooze: 15,
        timeZone: 'Europe/Brussels',
      },
    });
    await db.medication.create({
      data: {
        animalId: animal,
        name: 'Traitement',
        dose: '1',
        frequency: 'daily',
        startDate: new Date('2026-10-01T00:00Z'),
        endDate: new Date('2026-10-16T00:00Z'),
      },
    });
    await db.vetAppointment.create({
      data: {
        animalId: animal,
        vetName: 'Dr Test',
        date: new Date('2026-10-14T22:30Z'),
      },
    });
    await db.vaccination.create({
      data: {
        animalId: animal,
        name: 'Rage',
        date: new Date('2026-01-01T00:00Z'),
        nextDueDate: new Date('2026-10-15T00:00Z'),
      },
    });
    token = app.get(JwtService).sign({ sub: a });
  });
  afterEach(async () => {
    await db.user.deleteMany({ where: { id: { in: [a, b] } } });
  });
  afterAll(async () => {
    if (db) await db.speciesProfile.delete({ where: { speciesId } });
    if (app) await app.close();
  });
  const get = (query = 'from=2026-10-14&to=2026-10-15') =>
    request(app.getHttpServer() as Server)
      .get('/users/me/care-agenda?' + query)
      .set('Authorization', `Bearer ${token}`);
  type Result = {
    animals: { name: string }[];
    sources: { kind: string; title: string }[];
    events: { kind: string; day: string; time: string; title: string }[];
  };
  it('exige une authentification', async () => {
    await request(app.getHttpServer() as Server)
      .get('/users/me/care-agenda?from=2026-10-14&to=2026-10-15')
      .expect(401);
  });
  it('agrège les soins, respecte le fuseau et n’écrit aucun rappel futur', async () => {
    const response = await get().expect(200);
    const body = response.body as Result;
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(body.animals.map((v) => v.name)).toEqual(['Kiwi']);
    expect(body.sources).toHaveLength(4);
    expect(body.events.find((e) => e.kind === 'appointment')).toMatchObject({
      day: '2026-10-15',
      time: '00:30',
    });
    expect(body.events.filter((e) => e.kind === 'routine')).toHaveLength(2);
    expect(body.events.find((e) => e.kind === 'vaccination')).toMatchObject({
      day: '2026-10-15',
    });
    expect(await db.notificationEvent.count({ where: { userId: a } })).toBe(0);
  });
  it('bloque l’animal d’un autre compte', async () => {
    await get(`from=2026-10-14&to=2026-10-15&animalId=${foreign}`).expect(404);
  });
  it('ne divulgue pas les soins Premium à un compte gratuit', async () => {
    await db.user.update({ where: { id: a }, data: { isPremium: false } });
    const r = await get().expect(200);
    expect((r.body as Result).sources.every((s) => s.kind === 'routine')).toBe(
      true,
    );
  });
  it.each([
    'from=2026-02-30&to=2026-03-01',
    'from=2026-10-14&from=2026-10-15&to=2026-10-16',
    'from=2026-10-15&to=2026-10-14',
    'from=2026-01-01&to=2027-01-01',
  ])('refuse une période invalide %s', async (query) => {
    await get(query).expect(400);
  });
  it('une modification depuis le calendrier se retrouve dans la routine réelle', async () => {
    await request(app.getHttpServer() as Server)
      .patch(`/users/me/animals/${animal}/routines/${routine}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Repas décalé',
        schedule: { time: '10:15', startDate: '2026-10-01' },
      })
      .expect(200);
    const response = await get().expect(200);
    expect(
      (response.body as Result).events
        .filter((e) => e.kind === 'routine')
        .every((e) => e.time === '10:15' && e.title === 'Repas décalé'),
    ).toBe(true);
  });
  it('garde les bornes des traitements et ignore les rendez-vous annulés', async () => {
    await db.vetAppointment.updateMany({
      where: { animalId: animal },
      data: { status: 'cancelled' },
    });
    const response = await get('from=2026-10-17&to=2026-10-18').expect(200);
    expect(
      (response.body as Result).events.every((e) => e.kind === 'routine'),
    ).toBe(true);
  });
});
