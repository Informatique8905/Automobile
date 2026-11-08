import { Module } from '@nestjs/common';
import { CommunModule } from '../modules/commun/commun.module';
import { TachesController } from './taches.controller';
import { OrchestrateurService } from './orchestrateur.service';

@Module({
  imports: [CommunModule],
  controllers: [TachesController],
  providers: [OrchestrateurService],
})
export class TachesModule {}
