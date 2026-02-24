#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SEED=true
REBUILD=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-seed)
      SEED=false
      shift
      ;;
    --no-build)
      REBUILD=false
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./scripts/docker-quickstart.sh [--no-seed] [--no-build]

Options:
  --no-seed   Skip sample-data seeding
  --no-build  Skip rebuild of Docker images
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not installed." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is required but unavailable." >&2
  exit 1
fi

BUILD_ARG=""
if [[ "$REBUILD" == true ]]; then
  BUILD_ARG="--build"
fi

echo "Starting database..."
docker compose up -d $BUILD_ARG db

echo "Running migrations..."
docker compose run --rm migrate

if [[ "$SEED" == true ]]; then
  echo "Seeding sample data..."
  docker compose run --rm seed
fi

echo "Starting application..."
docker compose up -d $BUILD_ARG app

echo ""
docker compose ps
echo ""
echo "RTC Project Manager is available at: http://localhost:3000"
echo "Stop services with: docker compose down"
