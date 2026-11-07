#!/usr/bin/env bash
set -euo pipefail
psql -v ON_ERROR_STOP=1 -f tests/supabase_stub.sql
for migration in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -f "$migration"; done
