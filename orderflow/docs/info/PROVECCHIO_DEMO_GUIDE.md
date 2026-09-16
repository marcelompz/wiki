# 🔍 Guía de Demo — Provecchio con Playwright

**Versión:** 1.0.0  
**Fecha:** 2026-09-16  
**URL Base:** https://provecchio.com  
**Versión App:** 1.34.0

---

## 📋 Propósito

Esta guía documenta el proceso de validación E2E (End-to-End) de la plataforma **Provecchio** utilizando Playwright (Python). Incluye navegación por todas las páginas públicas y del panel de administración, con capturas de pantalla automáticas para documentación y QA.

---

## 🏗️ Estructura del Framework QA

```
qa/
├── .env                    # Configuración (BASE_URL, credenciales, viewports)
├── .env.provecchio         # Alias explícito para Provecchio
├── config.py               # Carga de variables y clase Config
├── conftest.py             # Fixture 'page' con browser context
├── pytest.ini              # Configuración de pytest
├── requirements.txt        # Dependencias Python
├── pages/
│   ├── base_page.py        # BasePage: goto, wait_for, assert, capture
│   ├── landing_page.py     # LandingPage: hero, CTA, shell verification
│   └── catalog_page.py     # CatalogPage: product cards, categories
├── tests/
│   ├── test_landing.py     # Tests de landing page (smoke + regression)
│   ├── test_catalog.py     # Tests de catálogo (smoke + regression)
│   ├── test_checkout.py    # Tests de checkout (regression)
│   └── test_provecchio_demo.py  # ⭐ Demo completo Provecchio
├── utils/
│   └── spa_waits.py        # SPAWaits: spinners, networkidle, root check
└── reports/
    └── screenshots/        # Capturas automáticas (28+ screenshots)
```

---

## ⚙️ Configuración

### Instalación de dependencias

```bash
cd qa
pip install -r requirements.txt
playwright install  # Instalar browsers (chromium, firefox, webkit)
```

### Archivo `.env`

```env
BASE_URL=https://provecchio.com
CATALOG_PATH=/catalog
HEADLESS=true
TIMEOUT_MS=30000
SCREENSHOT_ON_FAILURE=true
VIEWPORT_WIDTH=1280
VIEWPORT_HEIGHT=720
ADMIN_USERNAME=marcelo@pesallaccia.com
ADMIN_PASSWORD=PROVECCHIO_ADMIN_PASSWORD
```

> **Nota:** Para ejecutar tests autenticados, cambiar `ADMIN_PASSWORD` a la contraseña real del super admin.

---

## 🚀 Ejecución de Tests

### Ejecutar todos los tests del demo Provecchio

```bash
cd qa
pytest tests/test_provecchio_demo.py -v --tb=short --screenshot=on-failure
```

### Ejecutar por categoría

```bash
# Solo smoke tests (landing + health)
pytest tests/test_provecchio_demo.py -v -m smoke

# Tests de catálogo
pytest tests/test_provecchio_demo.py -v -m catalog

# Tests de regresión (todos los módulos admin)
pytest tests/test_provecchio_demo.py -v -m regression
```

### Ejecutar con screenshots específicos

```bash
# Ver todos los screenshots generados
ls qa/reports/screenshots/

# Ejecución visible (no headless) para inspección manual
HEADLESS=false pytest tests/test_provecchio_demo.py -v -k test_public_landing_page
```

---

## 📸 Módulos Capturados (28 Screenshots)

### Páginas Públicas (6 screenshots)

| # | Test | Screenshot | Descripción |
|---|------|-----------|-------------|
| 01 | `test_public_landing_page` | `01_landing.png` | Landing principal — hero, CTAs, secciones |
| 02 | `test_public_social_catalog` | `02_social_catalog.png` | Catálogo social con categorías y productos |
| 03 | `test_public_landing_bio` | `03_landing_bio.png` | Bio-link / landing personalizada del tenant |
| 23 | `test_public_checkout` | `23_checkout.png` | Flujo de checkout |
| 24 | `test_public_storefront` | `24_storefront.png` | Tienda pública del tenant |
| 25 | `test_public_coming_soon` | `25_coming_soon.png` | Página coming soon |

### Login (2 screenshots)

| # | Test | Screenshot | Descripción |
|---|------|-----------|-------------|
| 04 | `test_login_page_loads` | `04_login_page.png` | Formulario de login admin |
| 05 | `test_admin_login` | `05_after_login.png` | Post-login (dashboard o redirect) |

### Admin — Dashboard & Super Admin (1 screenshot)

| # | Test | Screenshot | Descripción |
|---|------|-----------|-------------|
| 06 | `test_admin_dashboard` | `06_admin_dashboard.png` | Dashboard Super Admin |

### Admin — Módulos de Negocio (22 screenshots)

| # | Test | Screenshot | Módulo |
|---|------|-----------|--------|
| 07 | `test_admin_products` | `07_admin_products.png` | Gestión de Productos |
| 08 | `test_admin_customers` | `08_admin_customers.png` | Gestión de Clientes |
| 09 | `test_admin_bookings` | `09_admin_bookings.png` | Reservas / Turnos |
| 10 | `test_admin_gastro` | `10_admin_gastro.png` | Panel OmniGastro |
| 11 | `test_admin_kds` | `11_admin_kds.png` | Kitchen Display System |
| 12 | `test_admin_pos` | `12_admin_pos.png` | Punto de Venta |
| 13 | `test_admin_loyalty` | `13_admin_loyalty.png` | Programa de Fidelización |
| 14 | `test_admin_homepage_b... | `14_admin_homepage_builder.png` | Constructor de Homepage |
| 15 | `test_admin_whatsapp_c... | `15_admin_whatsapp_catalog.png` | Catálogo WhatsApp |
| 16 | `test_admin_landed_costs` | `16_admin_landed_costs.png` | Landed Costs (Costos de Importación) |
| 17 | `test_admin_bi` | `17_admin_bi.png` | OmniBI Analytics |
| 18 | `test_admin_messaging` | `18_admin_messaging.png` | OmniMessaging Hub |
| 19 | `test_admin_orders` | `19_admin_orders.png` | Gestión de Órdenes |
| 20 | `test_admin_deploy_man... | `20_admin_deploy_manager.png` | Deploy Manager |
| 21 | `test_admin_api_key_conf... | `21_admin_api_key_config.png` | Configuración de API Keys |
| 22 | `test_admin_biolinks` | `22_admin_biolinks.png` | Bio-Links Management |

### Páginas Legales (2 screenshots)

| # | Test | Screenshot | Descripción |
|---|------|-----------|-------------|
| 26 | `test_public_terms_privacy` | `26_terms.png` | Términos de Uso |
| 27 | `test_public_terms_privacy` | `27_privacy.png` | Política de Privacidad |

### Health Check (1 screenshot)

| # | Test | Screenshot | Descripción |
|---|------|-----------|-------------|
| 28 | `test_admin_health` | `28_admin_health.png` | Estado de salud del sistema |

---

## 🔄 Flujo de Validación Provecchio

### Flujo 1: Acceso Público

```gherkin
Scenario: Navegación pública completa
  Given el usuario visita https://provecchio.com
  Then la landing page carga con hero visible
  And el catálogo social es accesible en /social-catalog
  And la bio-link page es accesible en /bio
  And todas las páginas retornan HTTP 200
```

### Flujo 2: Autenticación Admin

```gherkin
Scenario: Login como Super Admin
  Given el usuario visita /admin/login
  When ingresa email "marcelo@pesallaccia.com"
  And ingresa contraseña correspondiente
  Y presiona "Iniciar Sesión"
  Then es redirigido al dashboard de administración
  And la sesión se almacena en localStorage
```

### Flujo 3: Navegación por Módulos Admin

```gherkin
Scenario: Recorrido por todos los módulos
  Given el usuario está autenticado
  When navega a cada módulo:
    | /admin/products           |
    | /admin/customers          |
    | /admin/bookings           |
    | /admin/gastro             |
    | /admin/kds                |
    | /admin/pos                |
    | /admin/loyalty            |
    | /admin/homepage-builder   |
    | /admin/whatsapp-catalog   |
    | /admin/landed-costs       |
    | /admin/bi                 |
    | /admin/messaging          |
    | /admin/orders             |
    | /admin/deploy-manager     |
    | /admin/api-key-config     |
    | /admin/biolinks           |
  Then cada módulo carga sin errores 502
  And se genera screenshot automático
```

---

## 🔧 Troubleshooting

### Tests fallan con timeout

```bash
# Aumentar timeout global
TIMEOUT_MS=60000 pytest tests/test_provecchio_demo.py -v
```

### Browser no se instala

```bash
playwright install chromium
# O instalar todos los browsers:
playwright install
```

### Screenshots vacías o en blanco

Verificar que la SPA haya cargado completamente:

```bash
# Ejecución visible para debug
HEADLESS=false pytest tests/test_provecchio_demo.py -v -k test_public_landing_page
```

### Error 502 en páginas admin

Confirmar que el backend y frontend están corriendo:

```bash
curl -k https://provecchio.com/admin/health
curl -k https://provecchio.com/api/v1/health
```

---

## 📊 CI/CD Integration

En `.github/workflows` o `scripts/init.sh`:

```bash
# Paso 1: Instalar dependencias QA
cd qa && pip install -r requirements.txt

# Paso 2: Ejecutar tests E2E Provecchio
cd qa && pytest tests/test_provecchio_demo.py -v -m smoke --screenshot=on-failure

# Paso 3: Verificar screenshots generados
ls qa/reports/screenshots/ | wc -l  # Esperar: 28+
```

---

## 📝 Notas de Despliegue

### Sincronización de Documentación

Este documento debe sincronizarse con la Wiki oficial en `/opt/wiki/orderflow/` después de cada actualización significativa.

### Actualización de Versión

Cada nueva versión debe actualizar:
1. Este documento si hay cambios en módulos o flujos
2. `VERSION` en raíz del proyecto
3. `CHANGELOG.md` con la sección correspondiente
4. `ROADMAP.md` con el estado actualizado
5. `README.md` con las características destacadas
6. Tags de git: `git tag vX.Y.Z && git push --tags`
7. Wiki oficial: `git push` al repo de wiki

---

**Última actualización:** 2026-09-16  
**Versión de la guía:** 1.0.0
