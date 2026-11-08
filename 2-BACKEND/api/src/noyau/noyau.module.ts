/**
 * NOYAU — fourni à toute l'API : accès à la base, gardes, santé.
 */
import { Global, Module } from '@nestjs/common';
import { BaseService } from './base/supabase.service';
import { SanteController } from './sante/sante.controller';

@Global()
@Module({
  controllers: [SanteController],
  providers: [BaseService],
  exports: [BaseService],
})
export class NoyauModule {}
