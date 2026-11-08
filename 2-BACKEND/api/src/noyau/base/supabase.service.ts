/**
 * ═══════════════════════════════════════════════════════════════════
 * ACCÈS À LA BASE SUPABASE — deux clients, deux usages
 * ═══════════════════════════════════════════════════════════════════
 *  pourUtilisateur(jeton) : agit AU NOM de l'utilisateur → la RLS s'applique.
 *                           À utiliser PAR DÉFAUT (paiement, documents, factures…).
 *  admin                  : clé secrète → contourne la RLS.
 *                           Réservé aux webhooks, tâches de fond, agents IA et
 *                           opérations serveur explicites (ex. enregistrer le lien Jeko).
 * Règle : si une opération peut se faire avec le jeton de l'utilisateur, elle
 * DOIT se faire avec. Chaque usage de « admin » est justifié par un commentaire.
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const OPTIONS = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

@Injectable()
export class BaseService {
  /** Client serveur (clé secrète). Ne jamais l'exposer, ne jamais le passer au frontend. */
  readonly admin: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, OPTIONS);

  /** Client « au nom de l'utilisateur » : toutes les règles RLS s'appliquent. */
  pourUtilisateur(jeton: string): SupabaseClient {
    // Clé PUBLIQUE + jeton de l'utilisateur : exactement les droits qu'il aurait depuis son navigateur
    return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
      ...OPTIONS,
      accessToken: async () => jeton,
    });
  }
}
