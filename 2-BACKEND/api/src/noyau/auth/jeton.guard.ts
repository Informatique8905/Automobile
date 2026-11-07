/**
 * ═══════════════════════════════════════════════════════════════════
 * GARDE 1 — VÉRIFICATION DU JETON SUPABASE (toutes les routes sauf @Public)
 * ═══════════════════════════════════════════════════════════════════
 * - Signature vérifiée avec les clés PUBLIQUES de Supabase (JWKS), mises en
 *   cache : aucun secret partagé, rotation des clés sans redéploiement.
 * - Émetteur et audience contrôlés : un jeton d'un autre projet est refusé.
 * - Le jeton expiré est refusé : le frontend le renouvelle automatiquement.
 * ═══════════════════════════════════════════════════════════════════
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';
import { CLE_PUBLIC, Utilisateur } from './decorateurs';

const cles = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL), { cooldownDuration: 30_000, cacheMaxAge: 600_000 });

@Injectable()
export class JetonGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const estPublic = this.reflector.getAllAndOverride<boolean>(CLE_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (estPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const entete: string | undefined = req.headers.authorization;
    if (!entete?.startsWith('Bearer ')) throw new UnauthorizedException('AUTH_REQUIRED');
    const jeton = entete.slice(7).trim();

    try {
      const { payload } = await jwtVerify(jeton, cles, {
        issuer: `${env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
      });
      if (!payload.sub) throw new Error('sub absent');
      const utilisateur: Utilisateur = {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        aal: payload.aal === 'aal2' ? 'aal2' : 'aal1',
        jeton,
      };
      req.utilisateur = utilisateur;
      return true;
    } catch {
      throw new UnauthorizedException('INVALID_TOKEN');
    }
  }
}
