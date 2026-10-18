import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHabitatDto, UpdateHabitatDto } from './habitat.dto';
import { validateHabitatSnapshot } from './habitat-validation';

@Injectable()
export class HabitatsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.habitatProject.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  private async prepare(userId: string, dto: CreateHabitatDto) {
    const name = dto.name.trim();
    if (!name || name.length > 80)
      throw new BadRequestException(
        'Donnez un nom au projet (80 caractères maximum).',
      );
    const snapshot = validateHabitatSnapshot(dto.snapshot);
    const animalId = (snapshot.animalId as string) || null;
    if (
      animalId &&
      !(await this.prisma.animal.findFirst({
        where: { id: animalId, userId },
        select: { id: true },
      }))
    ) {
      throw new BadRequestException(
        'Cet animal n’est pas disponible dans votre compte.',
      );
    }
    return { name, snapshot, animalId };
  }

  async create(userId: string, dto: CreateHabitatDto) {
    const data = await this.prepare(userId, dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`habitats:${userId}`}, 0))::text`;
      if ((await tx.habitatProject.count({ where: { userId } })) >= 50)
        throw new BadRequestException(
          'Vous pouvez conserver jusqu’à 50 projets dans votre compte.',
        );
      return tx.habitatProject.create({ data: { ...data, userId } });
    });
  }

  async update(userId: string, id: string, dto: UpdateHabitatDto) {
    const data = await this.prepare(userId, dto);
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.habitatProject.updateMany({
        where: { id, userId, revision: dto.revision },
        data: { ...data, revision: { increment: 1 } },
      });
      if (!changed.count) {
        if (
          !(await tx.habitatProject.findFirst({
            where: { id, userId },
            select: { id: true },
          }))
        )
          throw new NotFoundException('Projet introuvable.');
        throw new ConflictException(
          'Ce projet a été modifié sur un autre appareil. Rechargez-le ou enregistrez une copie.',
        );
      }
      return tx.habitatProject.findFirstOrThrow({ where: { id, userId } });
    });
  }

  async remove(userId: string, id: string, revision: number) {
    const result = await this.prisma.habitatProject.deleteMany({
      where: { id, userId, revision },
    });
    if (!result.count) {
      const exists = await this.prisma.habitatProject.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (exists)
        throw new ConflictException(
          'Ce projet a changé. Rechargez la liste avant de le supprimer.',
        );
      throw new NotFoundException('Projet introuvable.');
    }
    return { deleted: true };
  }
}
