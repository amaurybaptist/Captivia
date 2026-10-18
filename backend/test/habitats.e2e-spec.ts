import { randomUUID } from 'crypto';
import { Server } from 'http';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { AuthModule } from '../src/auth/auth.module';
import { HabitatsModule } from '../src/habitats/habitats.module';
import { assertIsolatedDatabase } from './isolated-database';

jest.setTimeout(30000);
const speciesId = 2147482100;
const snapshot = () => ({
  version: 2,
  profileId: 'betta',
  dimensions: { width: 60, depth: 30, height: 40 },
  variant: 0,
  animalId: '',
  notes: '',
  checked: [],
  items: [
    {
      id: 'filter',
      kind: 'filter',
      label: 'Filtre',
      reason: 'Filtration douce',
      placement: 'Fond',
      position: [-0.228, 0.192, -0.105],
      size: [0.065, 0.196, 0.06],
      color: '#374d4a',
      rotation: 0,
      custom: false,
      locked: true,
    },
    {
      id: 'heater',
      kind: 'heater',
      label: 'Chauffage',
      reason: 'Chauffage régulé',
      placement: 'Fond',
      position: [0.228, 0.192, -0.108],
      size: [0.022, 0.224, 0.022],
      color: '#4e6261',
      rotation: 0,
      custom: false,
      locked: true,
    },
    {
      id: 'lamp',
      kind: 'uvb',
      label: 'Éclairage',
      reason: 'Cycle régulier',
      placement: 'Au-dessus',
      position: [0, 0.425, 0],
      size: [0.456, 0.025, 0.04],
      color: '#dfe6ba',
      rotation: 0,
      custom: false,
      locked: true,
    },
  ],
});

describe('Habitats — HTTP/JWT/PostgreSQL réel isolé', () => {
  let app: INestApplication, prisma: PrismaService, jwt: JwtService;
  let a: { id: string; email: string | null },
    b: { id: string; email: string | null },
    tokenA: string,
    tokenB: string;
  const api = '/users/me/habitats';
  const body = (response: request.Response) =>
    response.body as {
      id: string;
      name: string;
      snapshot: ReturnType<typeof snapshot>;
    };
  beforeAll(async () => {
    assertIsolatedDatabase('55434', 'captivia_habitats_test');
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        HabitatsModule,
      ],
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
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    await prisma.speciesProfile.create({
      data: {
        speciesId,
        commonNameFr: 'Betta de vérification',
        scientificName: 'Betta splendens',
        category: 'poisson',
        domesticationType: 'domestique',
      },
    });
  });
  beforeEach(async () => {
    const create = () =>
      prisma.user.create({
        data: {
          email: `habitat-${randomUUID()}@example.test`,
          passwordHash: 'local-test-only',
          isPremium: true,
        },
      });
    [a, b] = await Promise.all([create(), create()]);
    tokenA = jwt.sign({ sub: a.id });
    tokenB = jwt.sign({ sub: b.id });
  });
  afterEach(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { id: { in: [a?.id, b?.id].filter((id): id is string => !!id) } },
      });
    }
  });
  afterAll(async () => {
    if (prisma) await prisma.speciesProfile.delete({ where: { speciesId } });
    if (app) await app.close();
  });
  const auth = (token: string) => `Bearer ${token}`;
  const createProject = () =>
    request(app.getHttpServer() as Server)
      .post(api)
      .set('Authorization', auth(tokenA))
      .send({ name: 'Mon bac', snapshot: snapshot() })
      .expect(201);

  it('refuse la lecture et les écritures sans authentification', async () => {
    await request(app.getHttpServer() as Server)
      .get(api)
      .expect(401);
    await request(app.getHttpServer() as Server)
      .post(api)
      .send({ name: 'Bac', snapshot: snapshot() })
      .expect(401);
  });
  it('refuse toutes les routes aux comptes gratuits, même avec un JWT qui prétend être Premium', async () => {
    const project = await createProject();
    await prisma.user.update({
      where: { id: b.id },
      data: { isPremium: false },
    });
    const forgedClaim = jwt.sign({ sub: b.id, isPremium: true });
    for (const call of [
      () => request(app.getHttpServer() as Server).get(api),
      () =>
        request(app.getHttpServer() as Server)
          .post(api)
          .send({ name: 'Gratuit', snapshot: snapshot() }),
      () =>
        request(app.getHttpServer() as Server)
          .patch(`${api}/${body(project).id}`)
          .send({ name: 'Gratuit', snapshot: snapshot(), revision: 1 }),
      () =>
        request(app.getHttpServer() as Server).delete(
          `${api}/${body(project).id}?revision=1`,
        ),
    ]) {
      const response = await call()
        .set('Authorization', auth(forgedClaim))
        .expect(403);
      expect(response.body).toMatchObject({ code: 'PREMIUM_REQUIRED' });
    }
    expect(await prisma.habitatProject.count({ where: { userId: b.id } })).toBe(
      0,
    );
  });
  it('une révocation bloque immédiatement le même JWT sans effacer les projets', async () => {
    const project = await createProject();
    await prisma.user.update({
      where: { id: a.id },
      data: { isPremium: false },
    });
    await request(app.getHttpServer() as Server)
      .get(api)
      .set('Authorization', auth(tokenA))
      .expect(403);
    await request(app.getHttpServer() as Server)
      .patch(`${api}/${body(project).id}`)
      .set('Authorization', auth(tokenA))
      .send({ name: 'Non autorisé', snapshot: snapshot(), revision: 1 })
      .expect(403);
    await request(app.getHttpServer() as Server)
      .delete(`${api}/${body(project).id}?revision=1`)
      .set('Authorization', auth(tokenA))
      .expect(403);
    expect(await prisma.habitatProject.count({ where: { userId: a.id } })).toBe(
      1,
    );
    await prisma.user.update({
      where: { id: a.id },
      data: { isPremium: true },
    });
    const restored = await request(app.getHttpServer() as Server)
      .get(api)
      .set('Authorization', auth(tokenA))
      .expect(200);
    expect(restored.body).toHaveLength(1);
  });
  it('conserve l’accès des opérateurs selon la règle Premium existante', async () => {
    await prisma.user.update({ where: { id: b.id }, data: { isPremium: false, role: 'OPERATOR' } });
    await request(app.getHttpServer() as Server)
      .get(api)
      .set('Authorization', auth(tokenB))
      .expect(200);
  });
  it('crée, relit, modifie et supprime un projet sans perte de notes', async () => {
    const first = await createProject();
    const list = await request(app.getHttpServer() as Server)
      .get(api)
      .set('Authorization', auth(tokenA))
      .expect(200);
    expect(list.headers['cache-control']).toBe('private, no-store');
    expect(list.body).toHaveLength(1);
    expect(
      (list.body as { snapshot: ReturnType<typeof snapshot> }[])[0].snapshot,
    ).toEqual(snapshot());
    const modified = { ...snapshot(), notes: 'Éclairage réglé, contrôle 🐟' };
    const updated = await request(app.getHttpServer() as Server)
      .patch(`${api}/${body(first).id}`)
      .set('Authorization', auth(tokenA))
      .send({ name: 'Bac final', snapshot: modified, revision: 1 })
      .expect(200);
    expect(updated.body).toMatchObject({
      revision: 2,
      name: 'Bac final',
      snapshot: { notes: modified.notes },
    });
    await request(app.getHttpServer() as Server)
      .delete(`${api}/${body(first).id}?revision=2`)
      .set('Authorization', auth(tokenA))
      .expect(200);
    expect(await prisma.habitatProject.count({ where: { userId: a.id } })).toBe(
      0,
    );
  });
  it('isole lecture, modification et suppression entre comptes', async () => {
    const first = await createProject();
    const other = await request(app.getHttpServer() as Server)
      .get(api)
      .set('Authorization', auth(tokenB))
      .expect(200);
    expect(other.body).toEqual([]);
    await request(app.getHttpServer() as Server)
      .patch(`${api}/${body(first).id}`)
      .set('Authorization', auth(tokenB))
      .send({ name: 'Tentative', snapshot: snapshot(), revision: 1 })
      .expect(404);
    await request(app.getHttpServer() as Server)
      .delete(`${api}/${body(first).id}?revision=1`)
      .set('Authorization', auth(tokenB))
      .expect(404);
    expect(
      (
        await prisma.habitatProject.findUniqueOrThrow({
          where: { id: body(first).id },
        })
      ).revision,
    ).toBe(1);
  });
  it('n’accepte pas l’animal d’un autre compte', async () => {
    const animal = await prisma.animal.create({
      data: { userId: b.id, speciesId, name: 'Animal B' },
    });
    await request(app.getHttpServer() as Server)
      .post(api)
      .set('Authorization', auth(tokenA))
      .send({
        name: 'Tentative',
        snapshot: { ...snapshot(), animalId: animal.id },
      })
      .expect(400);
  });
  it('conserve le projet quand son animal est supprimé', async () => {
    const animal = await prisma.animal.create({
      data: { userId: a.id, speciesId, name: 'Animal A' },
    });
    const created = await request(app.getHttpServer() as Server)
      .post(api)
      .set('Authorization', auth(tokenA))
      .send({ name: 'Bac', snapshot: { ...snapshot(), animalId: animal.id } })
      .expect(201);
    await prisma.animal.delete({ where: { id: animal.id } });
    expect(
      (
        await prisma.habitatProject.findUniqueOrThrow({
          where: { id: body(created).id },
        })
      ).animalId,
    ).toBeNull();
  });
  it('deux modifications concurrentes donnent un succès et un conflit sans écrasement', async () => {
    const created = await createProject();
    const responses = await Promise.all(
      ['A', 'B'].map((name) =>
        request(app.getHttpServer() as Server)
          .patch(`${api}/${body(created).id}`)
          .set('Authorization', auth(tokenA))
          .send({ name, snapshot: snapshot(), revision: 1 }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const winner = responses.find((r) => r.status === 200)!;
    expect(
      await prisma.habitatProject.findUniqueOrThrow({
        where: { id: body(created).id },
      }),
    ).toMatchObject({ name: body(winner).name, revision: 2 });
  });
  it('une suppression avec révision périmée ne détruit pas la nouvelle version', async () => {
    const created = await createProject();
    await request(app.getHttpServer() as Server)
      .patch(`${api}/${body(created).id}`)
      .set('Authorization', auth(tokenA))
      .send({ name: 'Modifié', snapshot: snapshot(), revision: 1 })
      .expect(200);
    await request(app.getHttpServer() as Server)
      .delete(`${api}/${body(created).id}?revision=1`)
      .set('Authorization', auth(tokenA))
      .expect(409);
    expect(
      await prisma.habitatProject.count({ where: { id: body(created).id } }),
    ).toBe(1);
  });
  it('le quota reste à 50 sous créations concurrentes', async () => {
    await prisma.habitatProject.createMany({
      data: Array.from({ length: 49 }, (_, i) => ({
        userId: a.id,
        name: `Bac ${i}`,
        snapshot: snapshot(),
      })),
    });
    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(app.getHttpServer() as Server)
          .post(api)
          .set('Authorization', auth(tokenA))
          .send({ name: 'Dernier', snapshot: snapshot() }),
      ),
    );
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 400)).toHaveLength(2);
    expect(await prisma.habitatProject.count({ where: { userId: a.id } })).toBe(
      50,
    );
  });
  it.each([
    { version: 99 },
    { dimensions: { width: '60', depth: 30, height: 40 } },
    { notes: 'x'.repeat(3001) },
    { items: [{ ...snapshot().items[0], position: [900, 0, 0] }] },
    { items: [snapshot().items[0], snapshot().items[0]] },
    { items: [] },
  ])('rejette le payload invalide n°%# sans créer de projet', async (patch) => {
    await request(app.getHttpServer() as Server)
      .post(api)
      .set('Authorization', auth(tokenA))
      .send({ name: 'Invalide', snapshot: { ...snapshot(), ...patch } })
      .expect(400);
    expect(await prisma.habitatProject.count({ where: { userId: a.id } })).toBe(
      0,
    );
  });
});
