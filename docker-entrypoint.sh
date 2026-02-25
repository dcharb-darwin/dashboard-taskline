#!/bin/sh
set -e

# Always apply latest schema
echo "Applying database schema..."
npx drizzle-kit push --config drizzle.config.ts --force
echo "Schema applied."

# Optional: seed the database with sample templates, projects, and tasks.
# Controlled by the SEED_ON_START environment variable.
if [ "$SEED_ON_START" = "true" ]; then
  echo "SEED_ON_START=true — seeding database with sample data..."
  npx tsx seed-database.mjs
  echo "Seeding complete."
fi

# Start the application
exec node dist/index.js
