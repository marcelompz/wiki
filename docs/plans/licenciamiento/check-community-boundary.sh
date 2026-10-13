#!/usr/bin/env bash
# Falla si el repo Community referencia código o paquetes Enterprise.
# Guardar como scripts/check-community-boundary.sh en el repo Community.
set -uo pipefail

# ====================== AJUSTAR ======================
# Expresiones regulares (grep -E) que NO deben aparecer en Community.
FORBIDDEN_PATTERNS=(
  "@omniflow/enterprise"
  "orderflow-enterprise"
  "from ['\"].*/gastro(/|['\"])"
  "require\(['\"].*/gastro"
  "omnisites-enterprise"
  "axon-ecosystem"
)
# Directorios a revisar
SCAN_DIRS=(backend frontend scripts docker-compose.prod.yml package.json)
# Rutas que no se revisan
EXCLUDES=(node_modules dist build .git coverage)
# =====================================================

fail=0
exclude_args=()
for e in "${EXCLUDES[@]}"; do exclude_args+=(--exclude-dir="$e"); done

for pat in "${FORBIDDEN_PATTERNS[@]}"; do
  for target in "${SCAN_DIRS[@]}"; do
    [[ -e "$target" ]] || continue
    hits=$(grep -rnE "${exclude_args[@]}" -- "$pat" "$target" 2>/dev/null || true)
    if [[ -n "$hits" ]]; then
      echo "::error::Referencia Enterprise prohibida ($pat) en $target"
      echo "$hits"
      fail=1
    fi
  done
done

# Ningún submódulo apuntando a repos privados
if [[ -f .gitmodules ]] && grep -qiE "enterprise" .gitmodules; then
  echo "::error::.gitmodules referencia un repo enterprise"
  fail=1
fi

# Ninguna dependencia privada en package.json (scope enterprise)
if grep -rqE '"@omniflow/enterprise' --include=package.json --exclude-dir=node_modules . 2>/dev/null; then
  echo "::error::package.json depende de paquetes @omniflow/enterprise"
  fail=1
fi

if [[ $fail -eq 0 ]]; then
  echo "OK: Community no referencia código Enterprise."
fi
exit $fail
