/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENTS « SÉCURITÉ » — RÈGLES DÉTERMINISTES (pas de modèle IA)
 *
 * Pourquoi pas d'IA ici : ces décisions portent sur des personnes et de l'argent.
 * Elles doivent être explicables (« 12 échecs de connexion en 10 minutes »),
 * reproductibles et ne jamais envoyer de pièce d'identité à un prestataire IA.
 *
 *   5. document_precheck      : pré-contrôle d'un document du coffre-fort
 *   6. booking_risk_scoring   : score de risque d'une réservation
 *   7. login_anomaly          : connexions suspectes
 *   8. payout_account_review  : nouveau compte de versement d'un partenaire
 *   9. payment_risk_scoring   : échecs de paiement répétés
 *  10. duplicate_photo_check  : photos copiées chez un autre partenaire
 *
 * Tous les seuils ci-dessous sont des points de départ à ajuster avec les données.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { DefinitionAgent, Verdict } from '../types.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ligne = Record<string, any>;

const JOUR = 86_400_000;
const ilYa = (ms: number) => new Date(Date.now() - ms).toISOString();
const ageJours = (d: string | null | undefined) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / JOUR) : null);

/** Transforme une liste de points en verdict. */
function noter(points: Array<[string, number]>, codeParDefaut: string): Verdict {
  const retenus = points.filter(([, p]) => p > 0);
  const score = Math.min(100, retenus.reduce((s, [, p]) => s + p, 0));
  const principal = [...retenus].sort((a, b) => b[1] - a[1])[0];
  return {
    decision: score >= 80 ? 'block' : score >= 40 ? 'flag' : 'pass',
    risk_score: score,
    reason_code: principal?.[0] ?? codeParDefaut,
    summary: retenus.map(([c, p]) => `${c} (+${p})`).join(', ').slice(0, 200),
    flags: retenus.map(([c]) => c),
  };
}

// ─── 5. Pré-contrôle des documents ──────────────────────────────────────────
// L'image n'est PAS analysée ici : elle part chez le fournisseur KYC (session
// ouverte par l'API). On contrôle seulement la cohérence des informations.
export const preControleDocuments: DefinitionAgent = {
  type: 'document_precheck',
  nom: 'Pré-contrôle des documents',
  utiliseLLM: false,

  async charger(ctx, id) {
    const { data: d } = await ctx.base
      .from('user_documents')
      .select('id, user_id, type, mime_type, file_size_bytes, issued_on, expires_on, country_code, profiles(date_of_birth)')
      .eq('id', id)
      .maybeSingle<Ligne>();
    if (!d) return null;
    return {
      faits: {
        type: d.type,
        mime: d.mime_type,
        taille: d.file_size_bytes,
        delivre_le: d.issued_on,
        expire_le: d.expires_on,
        pays: d.country_code,
        date_naissance: d.profiles?.date_of_birth ?? null,
      },
    };
  },

  regles(e) {
    const f = e.faits as Ligne;
    const maintenant = Date.now();
    const expire = f.expire_le ? new Date(f.expire_le).getTime() : null;
    const delivre = f.delivre_le ? new Date(f.delivre_le).getTime() : null;
    const naissance = f.date_naissance ? new Date(f.date_naissance).getTime() : null;
    return noter(
      [
        ['document_expired', expire !== null && expire < maintenant ? 60 : 0],
        ['issued_in_future', delivre !== null && delivre > maintenant ? 60 : 0],
        ['issued_before_birth', delivre !== null && naissance !== null && delivre < naissance ? 70 : 0],
        ['license_before_age_18', f.type?.startsWith('driver_license') && delivre !== null && naissance !== null
          && delivre - naissance < 18 * 365.25 * JOUR ? 50 : 0],
        ['file_too_small', (f.taille ?? 0) > 0 && f.taille < 30_000 ? 30 : 0], // capture d'écran réduite, photo floue
        ['missing_expiry', !f.expire_le ? 15 : 0],
      ],
      'document_consistent',
    );
  },
};

// ─── 6. Risque d'une réservation ────────────────────────────────────────────
export const risqueReservation: DefinitionAgent = {
  type: 'booking_risk_scoring',
  nom: 'Score de risque des réservations',
  utiliseLLM: false,

  async charger(ctx, id) {
    const { data: b } = await ctx.base
      .from('bookings')
      .select('id, customer_id, total_amount, rental_days, with_delivery, pickup_kind, created_at, pickup_at')
      .eq('id', id)
      .maybeSingle<Ligne>();
    if (!b) return null;

    const [{ data: client }, { count: reservations }, { count: annulations }, { count: signaux }] = await Promise.all([
      ctx.base.from('profiles').select('created_at, kyc_status, phone_verified_at, risk_score, rating_avg').eq('id', b.customer_id).maybeSingle<Ligne>(),
      ctx.base.from('bookings').select('id', { count: 'exact', head: true }).eq('customer_id', b.customer_id).eq('status', 'completed'),
      ctx.base.from('bookings').select('id', { count: 'exact', head: true }).eq('customer_id', b.customer_id)
        .eq('status', 'cancelled_by_customer').gte('created_at', ilYa(90 * JOUR)),
      ctx.base.from('fraud_signals').select('id', { count: 'exact', head: true }).eq('user_id', b.customer_id).gte('created_at', ilYa(180 * JOUR)),
    ]);

    return {
      faits: {
        montant: b.total_amount,
        jours: b.rental_days,
        livraison: b.with_delivery,
        lieu_remise: b.pickup_kind,
        delai_avant_remise_heures: Math.round((new Date(b.pickup_at).getTime() - new Date(b.created_at).getTime()) / 3_600_000),
        anciennete_compte_jours: ageJours(client?.created_at),
        kyc: client?.kyc_status,
        telephone_verifie: Boolean(client?.phone_verified_at),
        locations_terminees: reservations ?? 0,
        annulations_90j: annulations ?? 0,
        signaux_fraude_180j: signaux ?? 0,
      },
    };
  },

  regles(e) {
    const f = e.faits as Ligne;
    const premiere = f.locations_terminees === 0;
    return noter(
      [
        ['new_account_high_value', premiere && (f.anciennete_compte_jours ?? 0) < 3 && f.montant >= 300_000 ? 35 : 0],
        ['long_first_rental', premiere && f.jours >= 14 ? 20 : 0],                 // schéma « location longue puis revente »
        ['delivery_to_non_agency', premiere && f.livraison && f.lieu_remise !== 'agency' ? 15 : 0],
        ['last_minute', f.delai_avant_remise_heures < 3 ? 10 : 0],
        ['phone_not_verified', !f.telephone_verifie ? 15 : 0],
        ['repeated_cancellations', f.annulations_90j >= 3 ? 20 : 0],
        ['previous_fraud_signals', Math.min(40, (f.signaux_fraude_180j ?? 0) * 20)],
      ],
      'booking_normal',
    );
  },
};

// ─── 7. Connexions suspectes ────────────────────────────────────────────────
export const connexionsSuspectes: DefinitionAgent = {
  type: 'login_anomaly',
  nom: 'Surveillance des connexions',
  utiliseLLM: false,

  async charger(ctx, idUtilisateur) {
    const { data: ev } = await ctx.base
      .from('security_events')
      .select('event_type, severity, country, device_hash, created_at')
      .eq('user_id', idUtilisateur)
      .gte('created_at', ilYa(JOUR))
      .order('created_at', { ascending: false })
      .limit(200)
      .returns<Ligne[]>();
    if (!ev?.length) return null;
    const { data: historique } = await ctx.base
      .from('security_events')
      .select('country, device_hash')
      .eq('user_id', idUtilisateur).eq('event_type', 'login.success')
      .lt('created_at', ilYa(JOUR)).gte('created_at', ilYa(90 * JOUR))
      .limit(500)
      .returns<Ligne[]>();
    const paysConnus = new Set((historique ?? []).map((h) => h.country).filter(Boolean));
    const appareilsConnus = new Set((historique ?? []).map((h) => h.device_hash).filter(Boolean));
    const compter = (t: string) => ev.filter((x) => x.event_type === t).length;
    return {
      faits: {
        echecs_24h: compter('login.failed'),
        rafales_24h: compter('login.failed_burst'),
        nouveaux_pays: [...new Set(ev.filter((x) => x.event_type === 'login.success' && x.country && paysConnus.size && !paysConnus.has(x.country)).map((x) => x.country))],
        nouvel_appareil: ev.some((x) => x.event_type === 'login.success' && x.device_hash && appareilsConnus.size && !appareilsConnus.has(x.device_hash)),
        mfa_desactivee: compter('mfa.disabled') > 0,
        email_change: compter('email.changed') > 0,
        mot_de_passe_change: compter('password.changed') > 0,
      },
    };
  },

  regles(e) {
    const f = e.faits as Ligne;
    const changementSensible = f.mfa_desactivee || f.email_change || f.mot_de_passe_change;
    return noter(
      [
        ['credential_stuffing', f.rafales_24h > 0 || f.echecs_24h >= 10 ? 35 : 0],
        ['new_country', f.nouveaux_pays.length ? 25 : 0],
        ['new_device', f.nouvel_appareil ? 10 : 0],
        ['mfa_disabled', f.mfa_desactivee ? 25 : 0],
        // Le cas le plus grave : nouvel appareil/pays PUIS changement sensible = prise de contrôle probable
        ['account_takeover_pattern', changementSensible && (f.nouvel_appareil || f.nouveaux_pays.length) ? 40 : 0],
      ],
      'login_normal',
    );
  },
};

// ─── 8. Compte de versement ajouté ──────────────────────────────────────────
function normaliserNom(n: string | null | undefined): string[] {
  return (n ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\b(sarl|sa|sas|suarl|ets|etablissements?|ste|societe)\b/g, '').split(/[^a-z0-9]+/).filter((m) => m.length > 2);
}

export const comptesVersement: DefinitionAgent = {
  type: 'payout_account_review',
  nom: 'Contrôle des comptes de versement',
  utiliseLLM: false,

  async charger(ctx, idPartenaire) {
    const [{ data: comptes }, { data: prive }, { data: equipe }] = await Promise.all([
      ctx.base.from('partner_payout_accounts').select('account_holder_name, created_at').eq('partner_id', idPartenaire)
        .order('created_at', { ascending: false }).limit(10).returns<Ligne[]>(),
      ctx.base.from('partner_private').select('legal_name').eq('partner_id', idPartenaire).maybeSingle<Ligne>(),
      ctx.base.from('partner_members').select('user_id').eq('partner_id', idPartenaire).returns<Ligne[]>(),
    ]);
    if (!comptes?.length) return null;
    const membres = (equipe ?? []).map((m) => m.user_id);
    const { count: alertesConnexion } = membres.length
      ? await ctx.base.from('security_events').select('id', { count: 'exact', head: true })
          .in('user_id', membres).gte('severity', 3).gte('created_at', ilYa(7 * JOUR))
      : { count: 0 };
    const nouveau = comptes[0]!;
    return {
      faits: {
        titulaire: nouveau.account_holder_name,
        raison_sociale: prive?.legal_name ?? null,
        comptes_ajoutes_30j: comptes.filter((c) => (ageJours(c.created_at) ?? 99) <= 30).length,
        alertes_connexion_equipe_7j: alertesConnexion ?? 0,
      },
    };
  },

  regles(e) {
    const f = e.faits as Ligne;
    const titulaire = new Set(normaliserNom(f.titulaire));
    const societe = normaliserNom(f.raison_sociale);
    const correspond = !societe.length || societe.some((m) => titulaire.has(m));
    return noter(
      [
        ['holder_name_mismatch', !correspond ? 30 : 0],
        ['multiple_account_changes', f.comptes_ajoutes_30j >= 2 ? 30 : 0],
        ['recent_login_alerts', f.alertes_connexion_equipe_7j > 0 ? 40 : 0], // piratage + changement de compte
      ],
      'payout_account_ok',
    );
  },
};

// ─── 9. Paiements ───────────────────────────────────────────────────────────
export const risquePaiements: DefinitionAgent = {
  type: 'payment_risk_scoring',
  nom: 'Risque des paiements',
  utiliseLLM: false,

  async charger(ctx, idPaiement) {
    const { data: p } = await ctx.base.from('payments').select('payer_id').eq('id', idPaiement).maybeSingle<Ligne>();
    if (!p) return null;
    const { data: recents } = await ctx.base
      .from('payments').select('status, method, amount, failure_reason, created_at')
      .eq('payer_id', p.payer_id).gte('created_at', ilYa(JOUR)).returns<Ligne[]>();
    const echecs = (recents ?? []).filter((x) => x.status === 'failed');
    return {
      faits: {
        echecs_24h: echecs.length,
        moyens_differents: new Set((recents ?? []).map((x) => x.method).filter(Boolean)).size,
        ecarts_de_montant: (recents ?? []).filter((x) => x.failure_reason === 'AMOUNT_MISMATCH').length,
      },
    };
  },

  regles(e) {
    const f = e.faits as Ligne;
    return noter(
      [
        ['card_testing', f.echecs_24h >= 5 ? 40 : f.echecs_24h >= 3 ? 20 : 0],
        ['many_payment_methods', f.moyens_differents >= 3 ? 20 : 0],
        ['amount_tampering', f.ecarts_de_montant > 0 ? 60 : 0],
      ],
      'payments_normal',
    );
  },
};

// ─── 10. Photos copiées ─────────────────────────────────────────────────────
export const photosCopiees: DefinitionAgent = {
  type: 'duplicate_photo_check',
  nom: 'Détection de photos copiées',
  utiliseLLM: false,

  async charger(ctx, idPhoto) {
    const { data, error } = await ctx.base.rpc('find_photo_duplicates', { p_photo_id: idPhoto, p_max_distance: 8 });
    if (error) throw new Error(`find_photo_duplicates: ${error.message}`);
    const doublons = (data ?? []) as Ligne[];
    return {
      faits: {
        doublons_chez_autres_partenaires: doublons.length,
        distance_min: doublons.length ? Math.min(...doublons.map((d) => d.distance)) : null,
        partenaires: [...new Set(doublons.map((d) => d.partner_id))].slice(0, 5),
      },
    };
  },

  regles(e) {
    const f = e.faits as Ligne;
    const d = f.distance_min;
    return noter(
      [
        ['stolen_photo', d !== null && d <= 4 ? 90 : 0],      // quasi identique : annonce clonée
        ['similar_photo', d !== null && d > 4 && d <= 8 ? 45 : 0],
      ],
      'photo_original',
    );
  },
};
