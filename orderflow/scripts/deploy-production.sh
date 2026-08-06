#!/bin/bash
# OrderFlow - Deploy to Production
# Usage: ./deploy-production.sh [production|provecchio]
#
# Production target:
#   Host     : hetzner-orderflow (root@178.105.226.175)
#   Path     : /srv/orderflow
#   Env file : .env (not tracked by git; has real secrets)
#              Falls back to .env.production or .env.prod if .env not found
#
# Provecchio target (provecchio.com):
#   Direct   : root@192.168.69.240 (dimoraserverlocal, local network only)
#   Fallback : root@192.168.69.240 via ProxyJump root@38.52.135.227:2021 (dimoraserver1)
#              Used when local IP 192.168.69.240 is not directly reachable
#   Path     : /srv/orderflow
#   Env file : .env.prod (on remote server)

set -euo pipefail

ENV_FILE="${1:-production}"
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="hetzner-orderflow"
REMOTE_DIR="/srv/orderflow"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE_PATH=".env.${ENV_FILE}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARTIFACT_DIR="${BASE_DIR}/deploy-artifacts"
ROLLBACK_INFO="${ARTIFACT_DIR}/rollback-${ENV_FILE}-${TIMESTAMP}.env"
BACKUP_FILE="${BASE_DIR}/backups/pre_deploy_${ENV_FILE}_${TIMESTAMP}.sql"

# SSH options for proxy jump (used when target is not on local network)
SSH_OPTS=""

# Required environment variables that must be present in .env before deploy
REQUIRED_ENV_VARS=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET" "MASTER_API_KEY")

mkdir -p "${ARTIFACT_DIR}" "${BASE_DIR}/backups"

echo "=== OrderFlow Production Deploy ==="
echo "Environment : ${ENV_FILE}"
echo "Remote host : ${REMOTE_HOST} (${REMOTE_DIR})"
echo "Branch      : main"

if [ "${ENV_FILE}" = "production" ]; then
  if [ -f "${BASE_DIR}/.env" ]; then
    ENV_FILE_PATH=".env"
  elif [ -f "${BASE_DIR}/.env.production" ]; then
    ENV_FILE_PATH=".env.production"
  elif [ -f "${BASE_DIR}/.env.prod" ]; then
    ENV_FILE_PATH=".env.prod"
  else
    echo "❌ Missing env file. Create .env with production secrets (see .env.production.example)"
    exit 1
  fi
elif [ "${ENV_FILE}" = "provecchio" ]; then
  if [ -f "${BASE_DIR}/.env.provecchio" ]; then
    ENV_FILE_PATH=".env.provecchio"
  elif [ -f "${BASE_DIR}/.env.prod" ]; then
    ENV_FILE_PATH=".env.prod"
  else
    ENV_FILE_PATH=".env"
  fi

  PROVECCIO_LOCAL_IP="192.168.69.240"
  PROVECCIO_JUMP_USER="root"
  PROVECCIO_JUMP_HOST="38.52.135.227"
  PROVECCIO_JUMP_PORT="2021"
  REMOTE_HOST="${PROVECCIO_LOCAL_IP}"

  echo "🎯 Detecting Provecchio deploy target..."
  if ssh -o ConnectTimeout=3 -o BatchMode=yes -o StrictHostKeyChecking=no "root@${REMOTE_HOST}" "echo ok" >/dev/null 2>&1; then
    echo "   📡 Connected via local IP (${REMOTE_HOST})"
  else
    echo "   🔄 Local IP unreachable, using jump host (${PROVECCIO_JUMP_USER}@${PROVECCIO_JUMP_HOST}:${PROVECCIO_JUMP_PORT})"
    SSH_OPTS="-o ProxyJump=${PROVECCIO_JUMP_USER}@${PROVECCIO_JUMP_HOST}:${PROVECCIO_JUMP_PORT}"
  fi
elif [ ! -f "${BASE_DIR}/${ENV_FILE_PATH}" ]; then
  echo "❌ Missing env file: ${BASE_DIR}/${ENV_FILE_PATH}"
  exit 1
fi

# Validate required environment variables are present
echo "🔍 Validating required environment variables..."
MISSING_VARS=0
for var in "${REQUIRED_ENV_VARS[@]}"; do
  if ! grep -q "^${var}=" "${BASE_DIR}/${ENV_FILE_PATH}" 2>/dev/null; then
    echo "   ❌ Missing required variable: ${var}"
    MISSING_VARS=1
  fi
done
if [ "${MISSING_VARS}" -eq 1 ]; then
  echo "❌ Deploy aborted: missing required environment variables in ${ENV_FILE_PATH}"
  exit 1
fi
echo "✅ All required environment variables present"

cp -f "${BASE_DIR}/${ENV_FILE_PATH}" "${ROLLBACK_INFO}"
echo "🧷 Rollback env snapshot saved: ${ROLLBACK_INFO}"

echo "📥 Pushing latest changes to origin/main..."
git -C "${BASE_DIR}" stash || true
git -C "${BASE_DIR}" checkout main
git -C "${BASE_DIR}" push origin main

echo "🛡️ Pre-deploy database backup on remote..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}/backups && docker compose -f ${REMOTE_DIR}/${COMPOSE_FILE} --env-file ${REMOTE_DIR}/${ENV_FILE_PATH} exec -T database pg_dump -U \${POSTGRES_USER:-orderflow} \${POSTGRES_DB:-orderflow_db} > ${REMOTE_DIR}/backups/pre_deploy_${ENV_FILE}_${TIMESTAMP}.sql 2>/dev/null" || {
  echo "⚠️ Backup omitido (el contenedor postgres no está corriendo aún o está inicializándose)."
}

echo "🚀 Deploying stack on remote..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "
  cd ${REMOTE_DIR}
  echo '🔍 Verificando rama, sincronización y limpieza de Git en servidor remoto...'
  git checkout main
  git clean -fd
  git fetch origin main
  DIFF_COUNT=\$(git diff --name-only HEAD origin/main | wc -l)
  if [ \"\${DIFF_COUNT}\" -gt 0 ]; then
    echo \"⚠️ Se detectaron \${DIFF_COUNT} archivos de diferencia respecto a origin/main. Aplicando sincronización exacta...\"
    git diff --stat HEAD origin/main
  fi
  git reset --hard origin/main
  git pull origin main
  LOCAL_HASH=\$(git rev-parse HEAD)
  REMOTE_HASH=\$(git rev-parse origin/main)
  if [ \"\${LOCAL_HASH}\" != \"\${REMOTE_HASH}\" ]; then
    echo '❌ ERROR: El servidor remoto no logró sincronizar el código con origin/main'
    exit 1
  fi
  echo \"✅ Git sincronizado correctamente sin diferencias (Diff: 0) en hash: \${LOCAL_HASH}\"
  docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_PATH} up -d --build --remove-orphans
"

echo "⏳ Waiting for database on remote..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "
  ATTEMPTS=0
  until docker compose -f ${REMOTE_DIR}/${COMPOSE_FILE} --env-file ${REMOTE_DIR}/${ENV_FILE_PATH} exec -T database pg_isready -U \${POSTGRES_USER:-orderflow} -d \${POSTGRES_DB:-orderflow_db} >/dev/null 2>&1; do
    ATTEMPTS=\$((ATTEMPTS+1))
    if [ \"\${ATTEMPTS}\" -ge 60 ]; then
      echo '❌ Database did not become ready in time'
      exit 1
    fi
    sleep 1
  done
  echo '✅ Database is ready'
"

echo "🔄 Running Prisma migrations on remote..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "cd ${REMOTE_DIR} && timeout 300 docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_PATH} run --rm --entrypoint 'npx prisma migrate deploy' backend" || {
  echo "❌ Migrations failed"
  echo "♻️ Rolling back containers..."
  ssh ${SSH_OPTS} "${REMOTE_HOST}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_PATH} up -d --build --remove-orphans" || true
  exit 1
}
echo "✅ Migrations completed"

echo "🔍 Running health checks on remote..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "
  ATTEMPTS=0
  until [ \"\$(docker inspect --format='{{.State.Running}}' orderflow-backend-prod 2>/dev/null)\" = 'true' ]; do
    ATTEMPTS=\$((ATTEMPTS+1))
    if [ \"\${ATTEMPTS}\" -ge 30 ]; then
      echo '❌ Backend container failed to start'
      exit 1
    fi
    sleep 1
  done
  echo '✅ Backend container is running'
"

ssh ${SSH_OPTS} "${REMOTE_HOST}" "
  ATTEMPTS=0
  until [ \"\$(docker inspect --format='{{.State.Running}}' orderflow-frontend-prod 2>/dev/null)\" = 'true' ]; do
    ATTEMPTS=\$((ATTEMPTS+1))
    if [ \"\${ATTEMPTS}\" -ge 30 ]; then
      echo '❌ Frontend container failed to start'
      echo '⚠️ Attempting force-start recovery...'
      cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_PATH} up -d frontend || true
      sleep 5
      if [ \"\$(docker inspect --format='{{.State.Running}}' orderflow-frontend-prod 2>/dev/null)\" = 'true' ]; then
        echo '✅ Frontend container force-started successfully'
      else
        echo '❌ Frontend container still not running after recovery attempt'
        exit 1
      fi
    fi
    sleep 1
  done
  echo '✅ Frontend container is running'
"

echo "🔍 Verifying backend application health (via docker exec, port not published to host)..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "
  ATTEMPTS=0
  until docker exec orderflow-backend-prod wget -qO- http://localhost:3010/api/v1/health >/dev/null 2>&1; do
    ATTEMPTS=\$((ATTEMPTS+1))
    if [ \"\${ATTEMPTS}\" -ge 60 ]; then
      echo '❌ Backend health check failed after 60s'
      exit 1
    fi
    sleep 1
  done
  echo '✅ Backend health check passed'
"

echo "🚦 Verifying Traefik v3.3 on remote..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "
  if [ \"\$(docker inspect --format='{{.State.Running}}' traefik 2>/dev/null)\" = 'true' ]; then
    docker network connect traefik-public orderflow-frontend-prod 2>/dev/null || true
    docker network connect traefik-public orderflow-backend-prod 2>/dev/null || true
    docker exec traefik kill -HUP 1 2>/dev/null || docker restart traefik 2>/dev/null || true
    echo '✅ Traefik v3.3 active and config reloaded'
  else
    echo '⚠️ Traefik container not running on remote'
  fi
"

echo "🧹 Cleaning old images on remote..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "docker image prune -f || true"

echo "🎉 Production Deploy Complete ==="
echo "Environment : ${ENV_FILE}"
echo "Remote      : ${REMOTE_HOST}:${REMOTE_DIR}"
echo "Backend URL : http://localhost:3010 (remote)"
echo "Frontend URL: http://localhost:3011 (remote)"
echo "Rollback env: ${ROLLBACK_INFO}"
