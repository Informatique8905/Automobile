#!/usr/bin/env bash
# Wrapper CI : exécute les tests DB si psql est disponible, sinon passe silencieusement.
if command -v psql >/dev/null 2>&1; then
  bash "$(dirname "$0")/test-db.sh"
else
  echo "DB tests skipped: psql not found (run with a local Supabase instance)"
fi
