import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PremiumGuard } from '../common/guards/premium.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateHabitatDto, UpdateHabitatDto } from './habitat.dto';
import { HabitatsService } from './habitats.service';

type AuthRequest = { user: { id: string } };
@ApiTags('habitats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PremiumGuard)
@Controller('users/me/habitats')
export class HabitatsController {
  constructor(private readonly service: HabitatsService) {}
  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@Request() req: AuthRequest) {
    return this.service.list(req.user.id);
  }
  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateHabitatDto) {
    return this.service.create(req.user.id, dto);
  }
  @Patch(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHabitatDto,
  ) {
    return this.service.update(req.user.id, id, dto);
  }
  @Delete(':id')
  remove(
    @Request() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('revision', ParseIntPipe) revision: number,
  ) {
    if (
      !Number.isSafeInteger(revision) ||
      revision < 1 ||
      revision > 2147483646
    )
      throw new BadRequestException('Révision invalide.');
    return this.service.remove(req.user.id, id, revision);
  }
}
