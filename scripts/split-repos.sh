#!/usr/bin/env bash
# Publica cada microservicio en su propio repositorio CONSERVANDO su historial de commits
# (git subtree split) y el pipeline reutilizable en YAYR10/coworkspace-pipelines.
# Requisito: crear antes los repositorios vacíos (sin README, .gitignore ni licencia):
#   YAYR10/coworkspace-pipelines y YAYR10/coworkspace-<servicio>
# Uso: ./scripts/split-repos.sh            # todos
#      ./scripts/split-repos.sh booking-service
set -euo pipefail
OWNER="${OWNER:-YAYR10}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SERVICES=("$@")
ALL=(api-gateway membership-service space-service booking-service billing-service notification-service access-control-service community-service analytics-service)
[ ${#SERVICES[@]} -eq 0 ] && SERVICES=(pipelines "${ALL[@]}")

for svc in "${SERVICES[@]}"; do
  echo "== $svc"
  if [ "$svc" = "pipelines" ]; then
    tmp="$(mktemp -d)"
    mkdir -p "$tmp/.github/workflows"
    cp .github/workflows/microservicio.yml "$tmp/.github/workflows/"
    cp pipelines/README.md "$tmp/"
    git -C "$tmp" init -q -b main
    git -C "$tmp" add -A
    git -C "$tmp" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" commit -qm "Pipeline reutilizable de CI/CD para los microservicios de CoworkSpace"
    git -C "$tmp" push --force "https://github.com/$OWNER/coworkspace-pipelines.git" main
    rm -rf "$tmp"
    continue
  fi
  branch="split/$svc"
  git branch -D "$branch" >/dev/null 2>&1 || true
  git subtree split --prefix="services/$svc" -b "$branch"
  git push --force "https://github.com/$OWNER/coworkspace-$svc.git" "$branch:main"
  git branch -D "$branch" >/dev/null
done
echo "Listo. Cada servicio usa .github/workflows/ci.yml, que llama a coworkspace-pipelines."
