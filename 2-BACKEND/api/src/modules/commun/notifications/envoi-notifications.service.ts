/**
 * ═══════════════════════════════════════════════════════════════════
 * ENVOI DES NOTIFICATIONS (e-mail, SMS, WhatsApp, push)
 * ═══════════════════════════════════════════════════════════════════
 * La base crée les notifications et les lignes d'envoi (notification_deliveries,
 * statut « queued ») selon les préférences de chacun. Ce service les envoie par
 * le bon canal puis met à jour le statut (sent / delivered / failed).
 * - E-mails par API HTTP (les ports SMTP sont bloqués sur Render gratuit).
 * - WhatsApp : modèles de messages approuvés par Meta (WhatsApp Business Platform).
 * - Les notifications de catégorie « security » partent toujours par e-mail.
 * ═══════════════════════════════════════════════════════════════════
 */
import { Injectable, Logger } from '@nestjs/common';
import { BaseService } from '../../../noyau/base/supabase.service';

@Injectable()
export class EnvoiNotificationsService {
  private readonly journal = new Logger('Notifications');

  constructor(private readonly base: BaseService) {}

  /** Envoie les notifications en attente (appelé par l'orchestrateur toutes les 5 min). */
  async envoyerEnAttente(limite = 100) {
    // Clé secrète justifiée : tâche serveur lisant les envois de tous les utilisateurs
    const { data, error } = await this.base.admin
      .from('notification_deliveries')
      .select('id, channel, notification_id')
      .eq('status', 'queued')
      .limit(limite);
    if (error) throw error;
    // À DÉVELOPPER : pour chaque envoi, charger la notification, appeler canaux/<canal>.ts,
    // puis mettre à jour le statut. Ne jamais journaliser le contenu ni le destinataire.
    return { en_attente: data?.length ?? 0 };
  }

  /** E-mail aux administrateurs (synthèse sécurité, alertes graves). */
  async envoyerAuxAdministrateurs(titre: string, _texte: string) {
    this.journal.log(`À envoyer aux administrateurs : ${titre}`);
    // À DÉVELOPPER : lire les e-mails des user_roles « admin » et appeler canaux/email.ts
  }
}
