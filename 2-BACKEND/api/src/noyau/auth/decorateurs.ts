/**
 * ═══════════════════════════════════════════════════════════════════
 * DÉCORATEURS D'ACCÈS — à poser sur les contrôleurs et les routes
 * ═══════════════════════════════════════════════════════════════════
 *   @Public()                  route sans jeton (webhooks signés, santé, tâches internes à secret)
 *   @Roles('partner')          réservé à un rôle (lu dans user_roles)
 *   @Roles('admin')            les rôles de l'équipe exigent en plus une session « aal2 »
 *   @UtilisateurCourant() u    récupère l'utilisateur vérifié dans un paramètre
 * ═══════════════════════════════════════════════════════════════════
 */
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export type Role = 'client' | 'partner' | 'moderator' | 'support' | 'admin';
export const ROLES_EQUIPE: Role[] = ['admin', 'moderator', 'support'];

export const CLE_PUBLIC = 'acces:public';
export const CLE_ROLES = 'acces:roles';

export const Public = () => SetMetadata(CLE_PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(CLE_ROLES, roles);

export interface Utilisateur {
  id: string;
  email?: string;
  /** aal1 = mot de passe seul ; aal2 = second facteur validé */
  aal: 'aal1' | 'aal2';
  /** Jeton d'origine : sert à appeler Supabase AU NOM de l'utilisateur (la RLS s'applique) */
  jeton: string;
  roles?: Role[];
}

export const UtilisateurCourant = createParamDecorator((_: unknown, ctx: ExecutionContext): Utilisateur => {
  return ctx.switchToHttp().getRequest().utilisateur;
});
