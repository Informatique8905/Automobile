/**
 * SANTÉ — GET /sante : utilisé par Render (healthCheckPath) et la surveillance externe.
 * Ne révèle rien (ni version, ni configuration).
 */
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorateurs';

@Controller('sante')
export class SanteController {
  @Public()
  @SkipThrottle()
  @Get()
  sante() {
    return { statut: 'ok' };
  }
}
