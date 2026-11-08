/**
 * ═══════════════════════════════════════════════════════════════════
 * MODULE RACINE — l'API est découpée comme le frontend
 * ═══════════════════════════════════════════════════════════════════
 *   NoyauModule           configuration, accès base, gardes, erreurs, santé
 *   ClientModule          /client/...          actions du client
 *   VendeurModule         /vendeur/...         actions du partenaire
 *   AdministrateurModule  /administrateur/...  actions de l'équipe (aal2 obligatoire)
 *   CommunModule          intégrations partagées (Jeko, FNE, KYC, notifications, PDF, images, IA)
 *   TachesModule          /interne/taches/...  tâches de fond (secret partagé)
 *
 * Gardes appliquées à TOUTES les routes, dans cet ordre :
 *   1. limites de requêtes  2. jeton Supabase vérifié  3. rôles (+ aal2 pour l'équipe)
 * Une route sans jeton doit être marquée explicitement @Public().
 * ═══════════════════════════════════════════════════════════════════
 */
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LIMITES } from '@plateforme/securite-applicative';
import { NoyauModule } from './noyau/noyau.module';
import { JetonGuard } from './noyau/auth/jeton.guard';
import { RolesGuard } from './noyau/auth/roles.guard';
import { FiltreErreurs } from './noyau/erreurs/filtre-erreurs';
import { CommunModule } from './modules/commun/commun.module';
import { ClientModule } from './modules/client/client.module';
import { VendeurModule } from './modules/vendeur/vendeur.module';
import { AdministrateurModule } from './modules/administrateur/administrateur.module';
import { TachesModule } from './taches/taches.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', limit: LIMITES.public.limite, ttl: LIMITES.public.fenetreSecondes * 1000 }]),
    NoyauModule,
    CommunModule,
    ClientModule,
    VendeurModule,
    AdministrateurModule,
    TachesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JetonGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: FiltreErreurs },
  ],
})
export class AppModule {}
