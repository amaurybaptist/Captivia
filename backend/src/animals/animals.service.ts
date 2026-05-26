import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnimalDto, UpdateAnimalDto } from './dto/animal.dto';
import { ensureAnimalOwnership } from '../common/helpers/ownership.helper';

const FREE_ANIMAL_LIMIT = 1;

@Injectable()
export class AnimalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createAnimalDto: CreateAnimalDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { _count: { select: { animals: true } } },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.isPremium && user._count.animals >= FREE_ANIMAL_LIMIT) {
        throw new ForbiddenException(
          'Free users can only have 1 animal. Upgrade to premium for unlimited animals.',
        );
      }

      return tx.animal.create({
        data: {
          userId,
          speciesId: createAnimalDto.speciesId,
          name: createAnimalDto.name,
          birthDate: createAnimalDto.birthDate
            ? new Date(createAnimalDto.birthDate)
            : null,
          sex: createAnimalDto.sex || null,
          photos: createAnimalDto.photos || [],
          notes: createAnimalDto.notes || null,
        },
      });
    });
  }

  async findAll(userId: string) {
    return this.prisma.animal.findMany({
      where: { userId },
      include: {
        routines: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            routines: true,
            history: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: {
        routines: {
          orderBy: { createdAt: 'desc' },
        },
        history: {
          orderBy: { doneAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!animal) {
      throw new NotFoundException('Animal not found');
    }

    if (animal.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return animal;
  }

  async update(id: string, userId: string, updateAnimalDto: UpdateAnimalDto) {
    await ensureAnimalOwnership(this.prisma, id, userId);

    const updateData: Partial<{
      speciesId: number;
      name: string;
      birthDate: Date | null;
      sex: string | null;
      photos: string[];
      notes: string | null;
    }> = {};

    if (updateAnimalDto.speciesId !== undefined) {
      updateData.speciesId = updateAnimalDto.speciesId;
    }
    if (updateAnimalDto.name !== undefined) {
      updateData.name = updateAnimalDto.name;
    }
    if (updateAnimalDto.birthDate !== undefined) {
      updateData.birthDate = updateAnimalDto.birthDate
        ? new Date(updateAnimalDto.birthDate)
        : null;
    }
    if (updateAnimalDto.sex !== undefined) {
      updateData.sex = updateAnimalDto.sex;
    }
    if (updateAnimalDto.photos !== undefined) {
      updateData.photos = updateAnimalDto.photos;
    }
    if (updateAnimalDto.notes !== undefined) {
      updateData.notes = updateAnimalDto.notes;
    }

    return this.prisma.animal.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string, userId: string) {
    await ensureAnimalOwnership(this.prisma, id, userId);

    return this.prisma.animal.delete({
      where: { id },
    });
  }

  async getAnimalCount(userId: string): Promise<number> {
    return this.prisma.animal.count({
      where: { userId },
    });
  }

  /** Get or create public link for QR (Premium only). Returns { slug, url } (url uses placeholder; frontend builds final URL). */
  async getOrCreatePublicLink(
    animalId: string,
    userId: string,
    baseUrl?: string,
  ): Promise<{ slug: string; url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true },
    });
    if (!user?.isPremium) {
      throw new ForbiddenException('Premium subscription required to generate QR code for your animal.');
    }

    await this.findOne(animalId, userId);

    const animal = await this.prisma.animal.findUnique({
      where: { id: animalId },
      select: { publicSlug: true },
    });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }

    let slug = animal.publicSlug;
    if (!slug) {
      slug = randomBytes(12).toString('base64url').replace(/[-_]/g, 'x').slice(0, 16);
      await this.prisma.animal.update({
        where: { id: animalId },
        data: { publicSlug: slug },
      });
    }

    const base = (baseUrl || '').trim() || 'https://captivia.app';
    const url = `${base.replace(/\/$/, '')}/animal-public/${slug}`;
    return { slug, url };
  }
}
