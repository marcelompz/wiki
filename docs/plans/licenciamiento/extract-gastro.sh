#!/usr/bin/env bash
# Extrae los módulos de OmniGastro con su historial a un repo privado Enterprise
# y luego los elimina del repo Community en una rama aparte.
#
# Requisitos: git >= 2.22 y git-filter-repo (pip install git-filter-repo)
# Uso:  ./extract-gastro.sh            -> dry run (solo muestra qué haría)
#       ./extract-gastro.sh --apply    -> ejecuta
set -euo pipefail

# ====================== AJUSTAR ======================
SRC_REPO="$HOME/code/orderflow"                        # repo actual (privado, MIT)
WORK_DIR="$HOME/code/_extract/orderflow-enterprise"    # clon temporal (se crea de cero)
ENTERPRISE_REMOTE="git@github.com:TU_ORG/orderflow-enterprise.git"  # repo privado ya creado y VACÍO
RELEASE_TAG="v-gastro-golive"                          # tag del go-live
MAIN_BRANCH="main"

# Rutas de Gastro (relativas a la raíz del repo). Ajustar a las reales.
GASTRO_PATHS=(
  "backend/src/gastro"
  "backend/src/kds"
  "frontend/src/pages/admin/gastro"
  "frontend/src/pages/admin/kds"
  # "backend/prisma/migrations/2026XXXX_gastro"   # migraciones propias de Gastro
  # "docs/gastro"
)
# =====================================================

APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true

run() { echo "+ $*"; $APPLY && "$@" || true; }

command -v git-filter-repo >/dev/null || { echo "Falta git-filter-repo"; exit 1; }
[[ -d "$SRC_REPO/.git" ]] || { echo "SRC_REPO inválido: $SRC_REPO"; exit 1; }

cd "$SRC_REPO"
[[ -z "$(git status --porcelain)" ]] || { echo "El repo tiene cambios sin commitear. Aborto."; exit 1; }

echo "== 1. Verificar que las rutas existen =="
for p in "${GASTRO_PATHS[@]}"; do
  [[ -e "$p" ]] && echo "OK  $p" || echo "!!  NO EXISTE: $p (revisar)"
done

echo "== 2. Tag del estado actual (punto de retorno) =="
run git tag -f "$RELEASE_TAG"

echo "== 3. Clon fresco + filter-repo (conserva SOLO las rutas de Gastro) =="
run rm -rf "$WORK_DIR"
run git clone --no-local "$SRC_REPO" "$WORK_DIR"
if $APPLY; then
  cd "$WORK_DIR"
  args=()
  for p in "${GASTRO_PATHS[@]}"; do args+=(--path "$p"); done
  echo "+ git filter-repo ${args[*]}"
  git filter-repo "${args[@]}"
  echo "+ Historial resultante:"; git log --oneline | head -20
  echo
  echo "REVISAR ahora en $WORK_DIR antes de continuar:"
  echo "  - git log --stat | less      (que solo aparezcan rutas de Gastro)"
  echo "  - gitleaks detect            (secretos en el historial)"
  read -r -p "¿Publicar al repo privado Enterprise? [y/N] " ans
  [[ "$ans" == "y" ]] || { echo "Detenido. Nada fue enviado."; exit 0; }
  git remote add origin "$ENTERPRISE_REMOTE"
  git push -u origin "$MAIN_BRANCH"
  git push origin --tags
  cd "$SRC_REPO"
fi

echo "== 4. Quitar Gastro del repo Community (rama aparte, sin tocar main) =="
run git checkout -b chore/extract-gastro
for p in "${GASTRO_PATHS[@]}"; do
  [[ -e "$p" ]] && run git rm -r "$p"
done
run git commit -m "chore: extraer OmniGastro al repo enterprise privado"

cat <<'EOF'

== PENDIENTE MANUAL (filter-repo no toca archivos compartidos) ==
1. Referencias a Gastro en archivos que se quedan en Community:
   - backend/prisma/schema.prisma (modelos Gastro) y migraciones
   - AppModule / routers del backend, AdminApp.tsx / App.tsx del frontend
   - docker-compose.prod.yml y labels de Traefik
   Sustituir por puntos de extensión (registro de módulos / plugins).
2. Gastro debe consumir Community por API o paquete; Community no importa Gastro.
3. Poner un LICENSE "Todos los derechos reservados" en el repo Enterprise.
4. Correr scripts/check-community-boundary.sh en Community antes de mergear.
EOF
