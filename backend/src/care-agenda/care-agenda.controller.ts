import {
  Controller,
  Get,
  Header,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CareAgendaService } from './care-agenda.service';
@ApiTags('care-agenda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/care-agenda')
export class CareAgendaController {
  constructor(private readonly service: CareAgendaService) {}
  @Get()
  @Header('Cache-Control', 'private, no-store')
  read(
    @Req() req: { user: { id: string; isPremium: boolean } },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('animalId') animalId?: string,
  ) {
    if (
      typeof from !== 'string' ||
      typeof to !== 'string' ||
      !from ||
      !to ||
      (animalId !== undefined &&
        (typeof animalId !== 'string' || animalId.length > 100))
    )
      throw new BadRequestException('Dates ou animal invalides.');
    return this.service.read(
      req.user.id,
      req.user.isPremium,
      from,
      to,
      animalId,
    );
  }
}
