#!/usr/bin/env bash
# Publica cada microservicio en su propio repositorio de GitHub CONSERVANDO su historial
# de commits (git subtree split). Requisito: crear antes los repositorios vacíos
#   YAYR10/coworkspace-<servicio>   (sin README, sin .gitignore, sin licencia)
# Uso: ./scripts/split-repos.sh            # todos
#      ./scripts/split-repos.sh booking-service
set -euo pipefail
OWNER="${OWNER:-YAYR10}"
cd "$(dirname "$0")/.."
SERVICES=("$@")
[ ${#SERVICES[@]} -eq 0 ] && SERVICES=(api-gateway membership-service space-service booking-service billing-service notification-service access-control-service community-service analytics-service)

for svc in "${SERVICES[@]}"; do
  echo "== $svc"
  branch="split/$svc"
  git branch -D "$branch" >/dev/null 2>&1 || true
  git subtree split --prefix="services/$svc" -b "$branch"
  git push --force "https://github.com/$OWNER/coworkspace-$svc.git" "$branch:main"
  git branch -D "$branch" >/dev/null
done
echo "Listo. Cada repositorio tiene su código, README, .env.example, db/ y su CI en .github/workflows/ci.yml."
