# 🗺️ OrderFlow: Puertos, Entornos y Archivos .env

[🏠 Principal (README)](../README.md) | [🚀 Inicio Rápido](01-quickstart.md) | [🏗️ Arquitectura](02-architecture.md) | [🏢 Multi-Tenant Demo](03-multi-tenant-demo.md) | [🔐 JWT Auth](04-jwt-auth.md) | [📊 Testing Report](05-testing-report.md) | [🏪 POS & KDS](06-pos-kds.md) | [📊 Diagramas UML](07-uml-diagrams.md) | [🎖️ Loyalty Module](08-loyalty.md)

---

Este documento describe la configuración de red, IPs, puertos y archivos de variables de entorno (`.env`) para los cuatro ambientes activos de la plataforma OrderFlow.

---

## 📊 Matriz General de Ambientes

| Entorno | Servidor / Host IP | Dominio Público / URL | Directorio en Servidor | Archivo .env Origen | Puertos Internos (DB / BE / FE) |
|---|---|---|---|---|---|
| **Local (Desarrollo)** | `localhost` | `http://localhost:3011` | Máquina Local del Desarrollador | `.env` | `5432` / `3010` / `3011` |
| **Staging (Hetzner)** | `178.105.226.175` | `https://staging.pesallaccia.com` | `/srv/orderflow-staging` | `.env.staging` | `5433` / `3012` / `3013` |
| **Production (Hetzner)** | `178.105.226.175` | `https://pesallaccia.com` *(y subdominios)* | `/srv/orderflow` | `.env.production` | `5432` / `3010` / `3011` |
| **Production Provecchio**| `38.52.135.227` | `http://dimora.provecchio.com:8083` / `provecchio.com` (incluye Dimora y Odoo) | `/srv/orderflow` (en VM `192.168.69.240`) | `.env.prod` | `5432` / `3010` / `3011` |

---

## 🔧 Detalles de Configuración por Entorno

### 1. Local (Desarrollo)
* **Propósito:** Desarrollo local rápido y ejecución de tests unitarios/Mocking.
* **Archivo .env:** Copiar `.env.example` a `.env` en la raíz de `backend` y `frontend`.
* **Puertos de Exposición:**
  * Base de Datos PostgreSQL: `5432`
  * API Backend (NestJS): `3010`
  * UI Frontend (Vite/Refine): `3011`
* **Comando para levantar:** `docker compose up -d` (usa `docker-compose.yml` local).

---

### 2. Staging (Hetzner VPS)
* **Propósito:** Pruebas avanzadas multi-tenant, testing E2E, integraciones con Google OAuth y pruebas de API.
* **Dominio:** `https://staging.pesallaccia.com`
* **Archivo .env:** `/srv/orderflow-staging/.env.staging` (se renombra a `.env` en el deploy).
* **Puertos de Exposición (Customizados para evitar colisiones con Producción):**
  * Base de Datos PostgreSQL: `5433`
  * API Backend (NestJS): `3012`
  * UI Frontend (Vite/Refine): `3013`
* **Docker Compose:** `docker compose -f docker-compose.prod.yml --env-file .env.staging up -d --build`

---

### 3. Production (Hetzner VPS)
* **Propósito:** Producción SaaS global dedicada para múltiples empresas/tenants.
* **Dominio:** `pesallaccia.com` y sus subdominios asociados.
* **Archivo .env:** `/srv/orderflow/.env.production` (se renombra a `.env` en el deploy).
* **Puertos de Exposición (Estándar):**
  * Base de Datos PostgreSQL: `5432`
  * API Backend (NestJS): `3010`
  * UI Frontend (Vite/Refine): `3011`
* **Docker Compose:** `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`

---

### 4. Production Provecchio (Servidor Local Provecchio)
* **Propósito:** Instancia física dedicada instalada in-house en el servidor local de Provecchio Di Mora para facturación, comanda offline-resiliente e integración con **Dimora** y **Odoo**.
* **Dominio:** `provecchio.com` (ej: `http://dimora.provecchio.com:8083`).
* **IP Pública de Acceso SSH:** `38.52.135.227` (Port `2021` / `2022`). Redirecciona por SSH-jump a la máquina local interna `192.168.69.240`.
* **Archivo .env:** `/srv/orderflow/.env.prod` (se renombra a `.env` en el deploy).
* **Puertos de Exposición:**
  * Base de Datos PostgreSQL: `5432`
  * API Backend (NestJS): `3010`
  * UI Frontend (Vite/Refine): `3011` (expuesto externamente en el puerto mapeado `8083`).
* **Docker Compose:** `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`

---

## 🔐 Configuración de Secrets en GitHub Actions

Para asegurar el despliegue automático exitoso de cada rama a su respectivo servidor sin mezclar ambientes ni credenciales, se mapean las siguientes variables y llaves en GitHub:

### A. Para Staging y Producción (Hetzner VPS `178.105.226.175`):
* **`SERVER_HOST`**: `178.105.226.175`
* **`SERVER_USER`**: `root`
* **`SERVER_SSH_KEY`**: Clave privada SSH autorizada en el Hetzner VPS.

### B. Para Provecchio Di Mora (Servidor Local `38.52.135.227`):
* **`PROVECCHIO_SERVER_HOST`**: `38.52.135.227`
* **`PROVECCHIO_SERVER_USER`**: `marcelompz`
* **`PROVECCHIO_SERVER_PORT`**: `2021`
* **`PROVECCHIO_SERVER_SSH_KEY`**: Clave privada SSH autorizada en el servidor local de Provecchio.

---

## 🏥 Comandos de Verificación de Salud (Health Checks)

### Hetzner VPS (Staging)
```bash
curl -f http://178.105.226.175:3012/health
curl -f http://178.105.226.175:3013
```

### Hetzner VPS (Producción)
```bash
curl -f http://178.105.226.175:3010/health
curl -f http://178.105.226.175:3011
```

### Provecchio (Producción Local)
```bash
curl -f http://38.52.135.227:3010/health
```
