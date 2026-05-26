import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Verifies that an animal exists and belongs to the given user.
 * Throws NotFoundException if the animal doesn't exist,
 * ForbiddenException if it belongs to another user.
 */
export async function ensureAnimalOwnership(
  prisma: PrismaService,
  animalId: string,
  userId: string,
) {
  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
  });

  if (!animal) {
    throw new NotFoundException('Animal not found');
  }

  if (animal.userId !== userId) {
    throw new ForbiddenException('Access denied');
  }

  return animal;
}
