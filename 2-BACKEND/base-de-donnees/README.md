# Plateforme de location et vente de véhicules — Base de données

Base PostgreSQL / Supabase complète du projet (cahier des charges v0).

```
supabase/
  config.toml   réglages du CLI Supabase (pile locale, auth, emails, seed)
  .env.example  modèle des secrets lus par config.toml (copier en .env)
  .gitignore    exclut les secrets et fichiers temporaires
  templates/    emails d'authentification en français
  migrations/   22 migrations SQL, appliquées dans l'ordre (5 ajoutées le 6/11/2026)
  seed.sql      référentiels : villes et communes, catégories, marques/modèles,
                équipements, options, assurances, réglages, FAQ, documents légaux
  optional/
    cron.sql         tâches planifiées internes à la base (pg_cron)
    cron_render.sql  réveil du backend Render toutes les 5 min (pg_cron + pg_net)
tests/
  supabase_stub.sql          imite Supabase sur un Postgres vierge (tests uniquement)
  01_parcours_complets.sql   22 scénarios de bout en bout
  02_back_office_seed.sql    back-office admin + seed relançable
  03_securite_jeko_ia.sql    9 scénarios : Jeko, double authentification, FNE, agents IA, versements, audit
scripts/
  test-db.sh                 applique tout sur une base de test et lance les scénarios
docs/
  GUIDE_INSTALLATION.md      aide-mémoire des commandes (guide complet : lien dedans)
  BASE_DE_DONNEES.md         carte des tables, sécurité, RPC, IA, valeurs à valider
```

Démarrage rapide : `docs/GUIDE_INSTALLATION.md`.
