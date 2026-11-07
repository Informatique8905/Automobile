-- =============================================================================
-- DONNÉES DE DÉPART (référentiels). Exécuté par « supabase db reset » en local.
-- En production : relançable sans risque (rien n'est écrasé), puis gestion via le back-office.
-- ⚠️ Les montants (assurances, options, commissions) sont des VALEURS D'EXEMPLE à ajuster.
-- Coordonnées GPS approximatives (centre des villes / communes).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Réglages plateforme
-- -----------------------------------------------------------------------------
insert into public.platform_settings (key, value, description, is_public) values
  ('vat_rate',                          '0.18', 'Taux de TVA (Côte d''Ivoire, taux normal)', true),
  ('prices_include_tax',                'true', 'Les prix affichés par les partenaires sont TTC', true),
  ('service_fee_rate',                  '0.05', 'Frais de service plateforme facturés au client (location)', true),
  ('commission_rate',                   '0.15', 'Commission plateforme par défaut sur la part loueur', false),
  ('sale_commission_rate',              '0',    'Commission sur les ventes conclues (0 au lancement)', false),
  ('booking_payment_window_minutes',    '30',   'Délai pour payer une réservation avant expiration', true),
  ('partner_response_hours',            '24',   'Délai du loueur pour accepter une demande', true),
  ('deposit_hold_hours_after_return',   '72',   'Délai avant libération de la caution après retour', true),
  ('min_photos_per_listing',            '4',    'Nombre minimum de photos pour soumettre une annonce', true),
  ('ai_auto_publish_max_risk',          '30',   'Score de risque IA maximum pour publication automatique', false),
  ('legal_driving_age',                 '18',   'Âge légal minimum pour conduire', true),
  ('support_phone',                     '"+2250000000000"', 'Numéro vert (à remplacer)', true),
  ('support_whatsapp',                  '"+2250000000000"', 'WhatsApp Business (à remplacer)', true)
on conflict (key) do nothing;   -- ne jamais écraser un réglage modifié en production

-- -----------------------------------------------------------------------------
-- Villes et communes
-- -----------------------------------------------------------------------------
insert into public.cities (name, slug, region, latitude, longitude, sort_order) values
  ('Abidjan',       'abidjan',       'District autonome d''Abidjan',       5.359952, -4.008256, 1),
  ('Yamoussoukro',  'yamoussoukro',  'District autonome de Yamoussoukro',  6.827623, -5.289343, 2),
  ('Bouaké',        'bouake',        'Gbêkê',                              7.690630, -5.039060, 3),
  ('San-Pédro',     'san-pedro',     'San-Pédro',                          4.748500, -6.636300, 4),
  ('Grand-Bassam',  'grand-bassam',  'Sud-Comoé',                          5.211800, -3.738800, 5),
  ('Assinie-Mafia', 'assinie',       'Sud-Comoé',                          5.133300, -3.283300, 6),
  ('Korhogo',       'korhogo',       'Poro',                               9.458000, -5.629600, 7),
  ('Daloa',         'daloa',         'Haut-Sassandra',                     6.877400, -6.450200, 8),
  ('Man',           'man',           'Tonkpi',                             7.412500, -7.553800, 9),
  ('Gagnoa',        'gagnoa',        'Gôh',                                6.131900, -5.950600, 10)
on conflict (slug) do nothing;

insert into public.districts (city_id, name, slug, latitude, longitude)
select c.id, d.name, d.slug, d.lat, d.lng
  from public.cities c
  join (values
    ('Cocody',      'cocody',      5.360000, -3.967000),
    ('Plateau',     'plateau',     5.323700, -4.019300),
    ('Marcory',     'marcory',     5.303000, -3.983000),
    ('Treichville', 'treichville', 5.292000, -4.006000),
    ('Yopougon',    'yopougon',    5.345000, -4.080000),
    ('Adjamé',      'adjame',      5.357000, -4.023000),
    ('Abobo',       'abobo',       5.420000, -4.020000),
    ('Koumassi',    'koumassi',    5.297000, -3.948000),
    ('Port-Bouët',  'port-bouet',  5.256000, -3.926000),
    ('Attécoubé',   'attecoube',   5.337000, -4.042000),
    ('Bingerville', 'bingerville', 5.355000, -3.885000),
    ('Anyama',      'anyama',      5.495000, -4.052000),
    ('Songon',      'songon',      5.310000, -4.260000)
  ) as d(name, slug, lat, lng) on true
 where c.slug = 'abidjan'
on conflict (city_id, slug) do nothing;

-- -----------------------------------------------------------------------------
-- Catégories visuelles
-- -----------------------------------------------------------------------------
insert into public.vehicle_categories (slug, name, icon, sort_order) values
  ('citadine',   'Citadine',          'car',          1),
  ('berline',    'Berline',           'car',          2),
  ('suv',        'SUV',               'car-suv',      3),
  ('4x4',        '4x4 / Tout-terrain','car-4wd',      4),
  ('pick-up',    'Pick-up',           'truck',        5),
  ('monospace',  'Monospace',         'bus',          6),
  ('minibus',    'Minibus',           'bus',          7),
  ('utilitaire', 'Utilitaire',        'truck-delivery', 8),
  ('luxe',       'Prestige / Luxe',   'diamond',      9),
  ('coupe',      'Coupé / Cabriolet', 'car-sport',    10)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Marques et modèles courants
-- -----------------------------------------------------------------------------
insert into public.vehicle_makes (name, slug, is_popular, sort_order) values
  ('Toyota', 'toyota', true, 1), ('Hyundai', 'hyundai', true, 2), ('Kia', 'kia', true, 3),
  ('Suzuki', 'suzuki', true, 4), ('Nissan', 'nissan', true, 5), ('Mitsubishi', 'mitsubishi', true, 6),
  ('Peugeot', 'peugeot', true, 7), ('Renault', 'renault', true, 8), ('Mercedes-Benz', 'mercedes-benz', true, 9),
  ('Ford', 'ford', false, 10), ('Honda', 'honda', false, 11), ('Volkswagen', 'volkswagen', false, 12),
  ('BMW', 'bmw', false, 13), ('Lexus', 'lexus', false, 14), ('Land Rover', 'land-rover', false, 15),
  ('Isuzu', 'isuzu', false, 16), ('Dacia', 'dacia', false, 17), ('Mazda', 'mazda', false, 18),
  ('Chevrolet', 'chevrolet', false, 19), ('Changan', 'changan', false, 20)
on conflict (slug) do nothing;

insert into public.vehicle_models (make_id, name, slug, default_category_id)
select mk.id, m.name, private.slugify(m.name), cat.id
  from (values
    ('toyota', 'Yaris', 'citadine'), ('toyota', 'Corolla', 'berline'), ('toyota', 'Camry', 'berline'),
    ('toyota', 'RAV4', 'suv'), ('toyota', 'Fortuner', 'suv'), ('toyota', 'Land Cruiser Prado', '4x4'),
    ('toyota', 'Land Cruiser', '4x4'), ('toyota', 'Hilux', 'pick-up'), ('toyota', 'Hiace', 'minibus'),
    ('hyundai', 'i10', 'citadine'), ('hyundai', 'Accent', 'berline'), ('hyundai', 'Elantra', 'berline'),
    ('hyundai', 'Tucson', 'suv'), ('hyundai', 'Santa Fe', 'suv'), ('hyundai', 'Creta', 'suv'),
    ('kia', 'Picanto', 'citadine'), ('kia', 'Rio', 'citadine'), ('kia', 'Cerato', 'berline'),
    ('kia', 'Sportage', 'suv'), ('kia', 'Sorento', 'suv'),
    ('suzuki', 'Swift', 'citadine'), ('suzuki', 'Dzire', 'berline'), ('suzuki', 'Vitara', 'suv'), ('suzuki', 'Jimny', '4x4'),
    ('nissan', 'Almera', 'berline'), ('nissan', 'X-Trail', 'suv'), ('nissan', 'Patrol', '4x4'), ('nissan', 'Navara', 'pick-up'),
    ('mitsubishi', 'Pajero', '4x4'), ('mitsubishi', 'L200', 'pick-up'), ('mitsubishi', 'Outlander', 'suv'),
    ('peugeot', '208', 'citadine'), ('peugeot', '301', 'berline'), ('peugeot', '508', 'berline'),
    ('peugeot', '2008', 'suv'), ('peugeot', '3008', 'suv'), ('peugeot', 'Partner', 'utilitaire'),
    ('renault', 'Clio', 'citadine'), ('renault', 'Logan', 'berline'), ('renault', 'Duster', 'suv'), ('renault', 'Koleos', 'suv'),
    ('mercedes-benz', 'Classe C', 'berline'), ('mercedes-benz', 'Classe E', 'luxe'), ('mercedes-benz', 'GLE', 'luxe'),
    ('mercedes-benz', 'Classe G', 'luxe'), ('mercedes-benz', 'Sprinter', 'minibus'),
    ('ford', 'Ranger', 'pick-up'), ('ford', 'Everest', 'suv'), ('ford', 'Explorer', 'suv'),
    ('honda', 'Civic', 'berline'), ('honda', 'CR-V', 'suv'), ('honda', 'Accord', 'berline'),
    ('volkswagen', 'Polo', 'citadine'), ('volkswagen', 'Golf', 'citadine'), ('volkswagen', 'Touareg', 'suv'),
    ('bmw', 'Série 3', 'berline'), ('bmw', 'Série 5', 'luxe'), ('bmw', 'X5', 'luxe'),
    ('lexus', 'RX', 'luxe'), ('lexus', 'LX', 'luxe'),
    ('land-rover', 'Range Rover', 'luxe'), ('land-rover', 'Defender', '4x4'),
    ('isuzu', 'D-Max', 'pick-up'), ('dacia', 'Sandero', 'citadine'), ('dacia', 'Duster', 'suv'),
    ('mazda', 'CX-5', 'suv'), ('chevrolet', 'Captiva', 'suv'), ('changan', 'CS35', 'suv')
  ) as m(make_slug, name, category_slug)
  join public.vehicle_makes mk on mk.slug = m.make_slug
  join public.vehicle_categories cat on cat.slug = m.category_slug
on conflict (make_id, slug) do nothing;

-- -----------------------------------------------------------------------------
-- Grille d'équipements
-- -----------------------------------------------------------------------------
insert into public.equipment (code, name, "group", is_filterable, sort_order) values
  ('air_conditioning',   'Climatisation',                 'comfort',    true,  1),
  ('dual_zone_climate',  'Climatisation bi-zone',         'comfort',    false, 2),
  ('leather_seats',      'Sièges cuir',                   'comfort',    false, 3),
  ('heated_seats',       'Sièges chauffants',             'comfort',    false, 4),
  ('sunroof',            'Toit ouvrant',                  'comfort',    false, 5),
  ('electric_windows',   'Vitres électriques',            'comfort',    false, 6),
  ('cruise_control',     'Régulateur de vitesse',         'comfort',    false, 7),
  ('third_row',          '3e rangée de sièges',           'comfort',    true,  8),
  ('bluetooth',          'Bluetooth',                     'technology', true,  20),
  ('apple_carplay',      'Apple CarPlay',                 'technology', true,  21),
  ('android_auto',       'Android Auto',                  'technology', true,  22),
  ('gps_navigation',     'GPS intégré',                   'technology', true,  23),
  ('touchscreen',        'Écran tactile',                 'technology', false, 24),
  ('usb_ports',          'Prises USB',                    'technology', false, 25),
  ('keyless_start',      'Démarrage sans clé',            'technology', false, 26),
  ('reversing_camera',   'Caméra de recul',               'technology', true,  27),
  ('abs',                'ABS',                           'safety',     false, 40),
  ('airbags',            'Airbags',                       'safety',     false, 41),
  ('esp',                'Contrôle de stabilité (ESP)',   'safety',     false, 42),
  ('parking_sensors',    'Radars de stationnement',       'safety',     true,  43),
  ('isofix',             'Fixations ISOFIX',              'safety',     true,  44),
  ('four_wheel_drive',   'Transmission intégrale (4x4)',  'safety',     true,  45),
  ('gps_tracker',        'Traceur GPS antivol',           'safety',     false, 46),
  ('lane_assist',        'Aide au maintien de voie',      'safety',     false, 47)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Options et services additionnels (prix conseillés, en FCFA)
-- -----------------------------------------------------------------------------
insert into public.extras (code, name, description, pricing_unit, default_price, max_quantity, requires_driver_details, sort_order) values
  ('child_seat',        'Siège enfant',                'Pour enfant de 9 à 18 kg',                   'per_day',     2000, 3, false, 1),
  ('booster_seat',      'Rehausseur',                  'Pour enfant de 15 à 36 kg',                  'per_day',     1500, 3, false, 2),
  ('gps_device',        'Boîtier GPS',                 'Navigation hors connexion',                  'per_day',     2500, 1, false, 3),
  ('additional_driver', 'Conducteur supplémentaire',   'Un conducteur de plus, vérifié',             'per_booking', 10000, 2, true, 4),
  ('extra_km_100',      'Forfait 100 km supplémentaires', 'S''ajoute au kilométrage inclus',         'per_unit',    10000, 10, false, 5),
  ('home_delivery',     'Livraison à domicile',        'Livraison et restitution à votre adresse',   'per_booking', 10000, 1, false, 6),
  ('hotel_delivery',    'Livraison à l''hôtel',        'Livraison et restitution à votre hôtel',     'per_booking', 10000, 1, false, 7),
  ('airport_pickup',    'Remise à l''aéroport',        'Aéroport Félix-Houphouët-Boigny',            'per_booking', 15000, 1, false, 8),
  ('wifi_hotspot',      'Wi-Fi embarqué',              'Routeur 4G',                                 'per_day',     3000, 1, false, 9),
  ('cooler_box',        'Glacière',                    'Pour les longs trajets',                     'per_booking', 3000, 2, false, 10)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Formules d'assurance de la plateforme (valeurs d'exemple)
-- RC incluse par défaut ; intermédiaire et tous risques en option payante
-- -----------------------------------------------------------------------------
insert into public.insurance_plans (partner_id, code, level, name, description, coverage, deductible_amount, price_per_day,
                                    is_included_by_default, sort_order)
select null, v.code, v.level::public.insurance_level, v.name, v.description, v.coverage::jsonb, v.deductible, v.price, v.included, v.sort
  from (values
    ('rc', 'third_party', 'Responsabilité civile', 'Obligatoire, incluse dans chaque location.',
     '["Dommages causés aux tiers", "Assistance 24 h/24"]', 1000000, 0, true, 1),
    ('intermediate', 'intermediate', 'Formule intermédiaire', 'RC + vol, incendie et bris de glace.',
     '["Dommages causés aux tiers", "Vol et incendie", "Bris de glace", "Assistance 24 h/24"]', 500000, 4000, false, 2),
    ('comprehensive', 'comprehensive', 'Tous risques', 'Couverture maximale avec franchise réduite.',
     '["Dommages causés aux tiers", "Dommages au véhicule", "Vol et incendie", "Bris de glace", "Assistance 24 h/24"]', 150000, 9000, false, 3)
  ) as v(code, level, name, description, coverage, deductible, price, included, sort)
 where not exists (select 1 from public.insurance_plans ip where ip.partner_id is null and ip.code = v.code);

-- -----------------------------------------------------------------------------
-- FAQ (onglets : location, vente/achats, paiement & sécurité, espace partenaire)
-- -----------------------------------------------------------------------------
insert into public.faq_categories (slug, name, audience, sort_order) values
  ('location', 'Location', 'rental', 1),
  ('vente-achat', 'Vente / Achat', 'sale', 2),
  ('paiement-securite', 'Paiement et sécurité', 'payment_security', 3),
  ('espace-partenaire', 'Espace partenaire / vendeur', 'partner', 4)
on conflict (slug) do nothing;

insert into public.faq_articles (category_id, slug, question, answer_md, sort_order)
select c.id, a.slug, a.question, a.answer, a.sort
  from (values
    ('location', 'documents-necessaires', 'Quels documents faut-il pour louer ?',
     'Un permis de conduire valide (recto et verso) et une pièce d''identité. Vous les ajoutez une seule fois dans votre coffre-fort numérique.', 1),
    ('location', 'caution-fonctionnement', 'Comment fonctionne la caution ?',
     'Avec une carte bancaire, la caution est une simple empreinte : aucun débit. Avec le Mobile Money, elle est versée puis restituée après le retour du véhicule.', 2),
    ('location', 'annulation', 'Puis-je annuler ma réservation ?',
     'Oui. Le montant remboursé dépend de la politique d''annulation affichée sur l''annonce (flexible, modérée ou stricte).', 3),
    ('location', 'livraison', 'Le véhicule peut-il être livré chez moi ou à mon hôtel ?',
     'Oui, si le loueur propose la livraison. L''option apparaît sur l''annonce avec son prix.', 4),
    ('vente-achat', 'reserver-essai', 'Comment réserver un essai ?',
     'Sur la fiche du véhicule, cliquez sur « Réserver un essai », choisissez une date et une heure, puis indiquez votre numéro de permis.', 1),
    ('vente-achat', 'acompte', 'À quoi sert l''acompte de réservation ?',
     'Il bloque le véhicule pour vous pendant quelques jours, le temps de finaliser l''achat avec le vendeur.', 2),
    ('paiement-securite', 'moyens-paiement', 'Quels moyens de paiement sont acceptés ?',
     'Cartes Visa et Mastercard, Wave, Orange Money, MTN MoMo et Moov Money.', 1),
    ('paiement-securite', 'paiement-hors-plateforme', 'Puis-je payer directement le loueur ?',
     'Non. Payer en dehors de la plateforme vous prive de l''assurance, du remboursement et de notre protection. Signalez toute demande de ce type.', 2),
    ('espace-partenaire', 'devenir-partenaire', 'Comment devenir partenaire ?',
     'Créez votre espace partenaire, ajoutez vos justificatifs (RCCM pour les professionnels), puis publiez vos véhicules.', 1),
    ('espace-partenaire', 'versements', 'Quand suis-je payé ?',
     'Vos revenus sont versés sur votre compte Mobile Money ou bancaire après chaque location terminée, selon le calendrier de versement.', 2)
  ) as a(cat, slug, question, answer, sort)
  join public.faq_categories c on c.slug = a.cat
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Pages et documents légaux (brouillons à faire relire par un juriste)
-- -----------------------------------------------------------------------------
insert into public.cms_pages (slug, title, content_md, is_published) values
  ('a-propos', 'À propos', E'# Pourquoi nous faire confiance\n\nPlateforme sûre, simple et fiable : partenaires vérifiés, paiement sécurisé, assistance 7j/7.', false),
  ('contact', 'Contact et assistance', '# Nous contacter', false)
on conflict (slug) do nothing;

insert into public.legal_documents (type, version, title, content_md, is_current, published_at) values
  ('terms_of_use', '0.1', 'Conditions générales d''utilisation', 'À rédiger.', true, null),
  ('terms_of_sale', '0.1', 'Conditions générales de vente', 'À rédiger.', true, null),
  ('privacy_policy', '0.1', 'Politique de confidentialité', 'À rédiger (loi n° 2013-450, déclaration ARTCI).', true, null),
  ('cookie_policy', '0.1', 'Politique cookies', 'À rédiger.', true, null),
  ('legal_notice', '0.1', 'Mentions légales', 'À rédiger.', true, null),
  ('partner_agreement', '0.1', 'Contrat partenaire', 'À rédiger.', true, null)
on conflict (type, version) do nothing;
