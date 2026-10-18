import { Module } from '@nestjs/common';
import { CareAgendaController } from './care-agenda.controller';
import { CareAgendaService } from './care-agenda.service';
@Module({ controllers: [CareAgendaController], providers: [CareAgendaService] })
export class CareAgendaModule {}
