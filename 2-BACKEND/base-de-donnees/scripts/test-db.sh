#!/usr/bin/env bash
# Teste toutes les migrations sur un PostgreSQL local vierge (hors Supabase).
# Usage : PGHOST=/tmp PGPORT=5433 PGUSER=postgres ./scripts/test-db.sh
#         STRICT=1 ./scripts/test-db.sh   (projets Supabase créés après mai 2026)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${TEST_DB:-plateforme_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -d postgres -c "drop database if exists ${DB};"
"${PSQL[@]}" -d postgres -c "create database ${DB};"

# STRICT=1 : imite les projets Supabase récents (aucune table exposée sans GRANT)
LEGACY=true
[[ "${STRICT:-0}" == "1" ]] && LEGACY=false
echo "→ Stub Supabase (privilèges par défaut hérités : $LEGACY)"
"${PSQL[@]}" -d "$DB" -v legacy="$LEGACY" -f "$ROOT/tests/supabase_stub.sql"

for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f"
done

echo "→ seed.sql"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/seed.sql"

if [[ "${SKIP_TESTS:-0}" != "1" ]]; then
  for t in "$ROOT"/tests/[0-9]*.sql; do
    echo "→ test $(basename "$t")"
    "${PSQL[@]}" -d "$DB" -f "$t"
  done
fi

echo "✔ Base de test OK"
