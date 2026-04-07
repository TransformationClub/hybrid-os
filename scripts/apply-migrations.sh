#!/bin/bash
# Apply all Supabase migrations in order.
# Usage: ./scripts/apply-migrations.sh
# Requires: SUPABASE_DB_URL environment variable
#   e.g. postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres

set -e

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL is not set."
  echo "Usage: SUPABASE_DB_URL=postgresql://... ./scripts/apply-migrations.sh"
  exit 1
fi

echo "Applying Supabase migrations..."

for migration in supabase/migrations/*.sql; do
  if [ ! -f "$migration" ]; then
    echo "No migration files found in supabase/migrations/"
    exit 1
  fi
  echo "Applying: $migration"
  psql "$SUPABASE_DB_URL" -f "$migration"
done

echo "All migrations applied successfully."
