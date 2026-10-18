/** Seeds only the disposable database required by the local browser checks. */
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { writeFile } from 'fs/promises';

async function main() {
  const database = new URL(process.env.DATABASE_URL || '');
  if (
    database.hostname !== '127.0.0.1' ||
    database.port !== '55434' ||
    database.pathname !== '/captivia_habitats_test' ||
    process.env.NODE_ENV !== 'test' ||
    process.env.JWT_SECRET !== 'local-habitat-verification-secret'
  )
    throw new Error(
      'Utiliser exclusivement la base isolée et le secret de test documentés.',
    );
  const prisma = new PrismaClient();
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  try {
    const speciesId = 2147482200;
    await prisma.speciesProfile.upsert({
      where: { speciesId },
      update: {},
      create: {
        speciesId,
        commonNameFr: 'Betta de test navigateur',
        scientificName: 'Betta splendens',
        category: 'poisson',
        domesticationType: 'domestique',
      },
    });
    const users: {
      user: { id: string; email: string; locale: string; isPremium: boolean };
      token: string;
    }[] = [];
    for (const label of ['a', 'b']) {
      const row = await prisma.user.create({
        data: {
          email: `habitat-browser-${label}-${Date.now()}@example.test`,
          passwordHash: 'unusable-local-test-only',
          isPremium: true,
        },
      });
      if (!row.email) throw new Error('Expected a registered fixture user');
      users.push({
        user: { id: row.id, email: row.email, locale: 'fr', isPremium: true },
        token: jwt.sign({ sub: row.id }, { expiresIn: '1h' }),
      });
    }
    const freeUser = await prisma.user.create({
      data: {
        email: `habitat-browser-free-${Date.now()}@example.test`,
        passwordHash: 'unusable-local-test-only',
        isPremium: false,
      },
    });
    const free = {
      user: {
        id: freeUser.id,
        email: freeUser.email,
        locale: 'fr',
        isPremium: false,
      },
      token: jwt.sign({ sub: freeUser.id }, { expiresIn: '1h' }),
    };
    const animal = await prisma.animal.create({
      data: { userId: users[0].user.id, speciesId, name: 'Bulle de test' },
    });
    const path = '/tmp/captivia-habitat-browser-users.json';
    await writeFile(
      path,
      JSON.stringify({ users, free, animalId: animal.id }),
      {
        mode: 0o600,
      },
    );
    console.log(`Comptes de test préparés dans ${path}; aucun jeton affiché.`);
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
