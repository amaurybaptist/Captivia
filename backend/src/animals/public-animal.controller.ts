import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('public')
@Controller('public/animal')
export class PublicAnimalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':slug')
  @ApiOperation({
    summary: 'Get public animal profile by slug (for QR code scan). No auth.',
  })
  @ApiParam({ name: 'slug', description: 'Public slug of the animal' })
  async getBySlug(@Param('slug') slug: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { publicSlug: slug },
      include: {
        healthRecords: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!animal) {
      throw new NotFoundException('Animal not found');
    }

    return {
      id: animal.id,
      name: animal.name,
      speciesId: animal.speciesId,
      birthDate: animal.birthDate,
      sex: animal.sex,
      photos: animal.photos,
      notes: animal.notes,
      healthRecords: animal.healthRecords.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        date: r.date,
        notes: r.notes,
        details: r.details,
      })),
    };
  }
}
