/**
 * ═══════════════════════════════════════════════════════════════════
 * GARDE 2 — RÔLES ET DOUBLE AUTHENTIFICATION
 * ═══════════════════════════════════════════════════════════════════
 * - Les rôles sont lus dans la table user_roles (jamais dans le jeton seul :
 *   un rôle retiré prend effet en moins d'une minute, sans attendre l'expiration).
 * - Rôles de l'équipe (admin, moderator, support) : session « aal2 » exigée,
 *   exactement comme dans la base (private.staff_session_ok). Double verrou.
 * ═══════════════════════════════════════════════════════════════════
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BaseService } from '../base/supabase.service';
import { CLE_PUBLIC, CLE_ROLES, Role, ROLES_EQUIPE, Utilisateur } from './decorateurs';

const CACHE_MS = 60_000;

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly cache = new Map<string, { roles: Role[]; expire: number }>();

  constructor(
    private readonly reflector: Reflector,
    private readonly base: BaseService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const cibles = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLE_PUBLIC, cibles)) return true;
    const exiges = this.reflector.getAllAndOverride<Role[]>(CLE_ROLES, cibles);
    if (!exiges?.length) return true;

    const req = ctx.switchToHttp().getRequest();
    const u: Utilisateur = req.utilisateur;
    const roles = await this.rolesDe(u.id);
    u.roles = roles;

    const autorise = exiges.some((r) => roles.includes(r) && (!ROLES_EQUIPE.includes(r) || u.aal === 'aal2'));
    if (!autorise) {
      throw new ForbiddenException(exiges.some((r) => ROLES_EQUIPE.includes(r)) && u.aal !== 'aal2' ? 'MFA_REQUIRED' : 'FORBIDDEN');
    }
    return true;
  }

  private async rolesDe(id: string): Promise<Role[]> {
    const enCache = this.cache.get(id);
    if (enCache && enCache.expire > Date.now()) return enCache.roles;
    const { data, error } = await this.base.admin.from('user_roles').select('role').eq('user_id', id);
    if (error) throw new ForbiddenException('ROLES_UNAVAILABLE');
    const roles = (data ?? []).map((r) => r.role as Role);
    this.cache.set(id, { roles, expire: Date.now() + CACHE_MS });
    return roles;
  }
}
