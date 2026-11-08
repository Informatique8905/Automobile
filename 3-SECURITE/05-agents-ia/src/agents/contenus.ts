/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENTS « CONTENUS » — utilisent le modèle IA (texte écrit par des humains)
 *   1. listing_moderation  : annonces (arnaques, prix anormaux, coordonnées)
 *   2. photo_moderation    : photos d'annonces (publiques) — vision
 *   3. message_screening   : messagerie (contournement, hameçonnage, harcèlement)
 *   4. review_moderation   : avis (injures, faux avis, données personnelles)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { DefinitionAgent, Entree, Verdict } from '../types.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ligne = Record<string, any>;

const ANNEE = new Date().getFullYear();

/** Seuils de prix anormalement bas (FCFA) — à ajuster avec les données réelles du marché */
const PRIX_JOUR_MIN_PLAUSIBLE = 8_000;
const PRIX_VENTE_MIN_RECENT = 1_500_000; // véhicule de moins de 5 ans

function joursDepuis(date: string | null | undefined): number | null {
  return date ? Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000) : null;
}

function verdictVide(): Verdict {
  return { decision: 'pass', risk_score: 0, reason_code: 'rules_clean', summary: '', flags: [] };
}

// ─── 1. Annonces ────────────────────────────────────────────────────────────
export const moderationAnnonces: DefinitionAgent = {
  type: 'listing_moderation',
  nom: 'Modération des annonces',
  utiliseLLM: true,
  prompt: 'moderation-annonces',

  async charger(ctx, id) {
    const { data: a } = await ctx.base
      .from('listings')
      .select('id, type, title, description, partner_id, vehicle_id, rental_terms(price_per_day, deposit_amount, with_driver_available), sale_terms(price, warranty_months, is_certified)')
      .eq('id', id)
      .maybeSingle<Ligne>();
    if (!a) return null;

    const [{ data: v }, { data: p }] = await Promise.all([
      ctx.base.from('vehicles').select('model_year, mileage_km, fuel, transmission, vehicle_categories(slug)').eq('id', a.vehicle_id).maybeSingle<Ligne>(),
      ctx.base.from('partners').select('type, verification_status, created_at, completed_bookings').eq('id', a.partner_id).maybeSingle<Ligne>(),
    ]);

    return {
      texteUtilisateur: [a.title, a.description].filter(Boolean).join('\n\n'),
      faits: {
        type_annonce: a.type,
        prix_par_jour_fcfa: a.rental_terms?.price_per_day ?? null,
        caution_fcfa: a.rental_terms?.deposit_amount ?? null,
        prix_vente_fcfa: a.sale_terms?.price ?? null,
        garantie_mois_annoncee: a.sale_terms?.warranty_months ?? null,
        vehicule_certifie: a.sale_terms?.is_certified ?? false,
        annee: v?.model_year ?? null,
        kilometrage: v?.mileage_km ?? null,
        categorie: v?.vehicle_categories?.slug ?? null,
        type_partenaire: p?.type ?? null,
        partenaire_verifie: p?.verification_status === 'approved',
        anciennete_partenaire_jours: joursDepuis(p?.created_at),
        locations_realisees: p?.completed_bookings ?? 0,
      },
    } satisfies Entree;
  },

  regles(e) {
    const f = e.faits as Ligne;
    const flags: string[] = [];
    let score = 0;
    if (f.type_annonce === 'rental' && f.prix_par_jour_fcfa !== null && f.prix_par_jour_fcfa < PRIX_JOUR_MIN_PLAUSIBLE) {
      flags.push('price_too_low'); score += 40;
    }
    if (f.type_annonce === 'sale' && f.prix_vente_fcfa !== null && f.annee >= ANNEE - 5 && f.prix_vente_fcfa < PRIX_VENTE_MIN_RECENT) {
      flags.push('price_too_low'); score += 45;
    }
    if (f.garantie_mois_annoncee > 0 && !f.vehicule_certifie && f.type_partenaire === 'private_seller') {
      flags.push('warranty_claim_unbacked'); score += 20;
    }
    if (!f.partenaire_verifie && (f.anciennete_partenaire_jours ?? 0) < 7) {
      flags.push('new_unverified_partner'); score += 15;
    }
    if (!flags.length) return verdictVide();
    return {
      decision: score >= 70 ? 'block' : score >= 40 ? 'flag' : 'pass',
      risk_score: Math.min(score, 100),
      reason_code: flags[0]!,
      summary: `Règles annonce : ${flags.join(', ')}`,
      flags,
    };
  },
};

// ─── 2. Photos d'annonces (vision) ──────────────────────────────────────────
export const moderationPhotos: DefinitionAgent = {
  type: 'photo_moderation',
  nom: 'Modération des photos',
  utiliseLLM: true,
  prompt: 'moderation-photos',

  async charger(ctx, id) {
    const { data: ph } = await ctx.base
      .from('vehicle_photos')
      .select('id, storage_path, angle, vehicles(model_year, vehicle_makes(name), vehicle_models(name))')
      .eq('id', id)
      .maybeSingle<Ligne>();
    if (!ph) return null;
    // Bucket PUBLIC « vehicle-photos » uniquement : jamais de document privé envoyé au modèle
    const { data } = ctx.base.storage.from('vehicle-photos').getPublicUrl(ph.storage_path);
    return {
      faits: {
        angle_declare: ph.angle,
        vehicule_declare: `${ph.vehicles?.vehicle_makes?.name ?? ''} ${ph.vehicles?.vehicle_models?.name ?? ''} ${ph.vehicles?.model_year ?? ''}`.trim(),
      },
      images: [data.publicUrl],
    };
  },
};

// ─── 3. Messagerie ──────────────────────────────────────────────────────────
export const filtrageMessages: DefinitionAgent = {
  type: 'message_screening',
  nom: 'Filtrage de la messagerie',
  utiliseLLM: true,
  prompt: 'filtrage-messages',

  async charger(ctx, id) {
    const { data: m } = await ctx.base
      .from('messages')
      .select('id, body, sender_id, conversation_id, risk_flags, conversations(subject, customer_id, partner_id, booking_id, bookings(status))')
      .eq('id', id)
      .maybeSingle<Ligne>();
    if (!m || !m.body) return null;
    const c = m.conversations ?? {};
    const reservationConfirmee = ['confirmed', 'in_progress', 'completed'].includes(c.bookings?.status);
    return {
      texteUtilisateur: m.body,
      faits: {
        sujet: c.subject,
        expediteur: m.sender_id === c.customer_id ? 'client' : 'partenaire',
        reservation_confirmee: reservationConfirmee,
        indices_deja_detectes_par_la_base: m.risk_flags ?? [],
      },
    };
  },
};

// ─── 4. Avis ────────────────────────────────────────────────────────────────
export const moderationAvis: DefinitionAgent = {
  type: 'review_moderation',
  nom: 'Modération des avis',
  utiliseLLM: true,
  prompt: 'moderation-avis',

  async charger(ctx, id) {
    const { data: r } = await ctx.base
      .from('reviews')
      .select('id, rating, comment, direction, author_id, booking_id, created_at')
      .eq('id', id)
      .maybeSingle<Ligne>();
    if (!r) return null;
    const { count } = await ctx.base
      .from('reviews').select('id', { count: 'exact', head: true })
      .eq('author_id', r.author_id).gte('created_at', new Date(Date.now() - 86_400_000).toISOString());
    return {
      texteUtilisateur: r.comment ?? '',
      faits: {
        note: r.rating,
        sens: r.direction,
        lie_a_une_location_reelle: Boolean(r.booking_id),
        avis_du_meme_auteur_24h: count ?? 0,
      },
    };
  },
};
