# 95 — Enrutamiento Traefik OmniLedger: Secuestro de Ruta `/api/v1` (404 en Marcaciones de Asistencia)

## 📌 Contexto y Área
- **Área:** DevOps / Traefik / Microservicios Standalone / HR
- **Componente:** `docker-compose.standalone.yml`, `omniledger_standalone`, `HrController` (`/api/v1/hr/attendance/records`)
- **Estado:** ✅ Resuelto

---

## 🚨 Síntoma Principal
Al ingresar al módulo de Capital Humano (`/admin/hr`) en la aplicación frontend (`pesallaccia.com`), la consola del navegador muestra la siguiente excepción:

```text
Error al cargar marcaciones de asistencia AxiosError: Request failed with status code 404
    pa https://pesallaccia.com/assets/index-4oVpJQRN.js:12
    hr-h1Tj8P0j.js:1:857
```

Las marcaciones de asistencia no se visualizan y la grilla permanece vacía.

---

## 🔍 Causa Raíz
En el archivo `docker-compose.standalone.yml`, la etiqueta de Traefik para el contenedor `omniledger_standalone` contenía la siguiente regla de ruteo:

```yaml
- "traefik.http.routers.omniledger-standalone.rule=Host(`ledger.${ROOT_DOMAIN:-pesallaccia.com}`) || PathPrefix(`/api/v1`)"
```

Debido a que la segunda condición del disyuntor (`PathPrefix('/api/v1')`) no incluía restricción de Host o subdominio, Traefik interceptaba **todas** las peticiones enviadas al dominio principal (`pesallaccia.com`) cuyo path comenzara con `/api/v1/` y las redirigía al contenedor del microservicio de contabilidad `omniledger_standalone` (puerto `:3027`).

Dado que `omniledger_standalone` es un servicio FastAPI exclusivo de contabilidad y libro mayor, no posee el controlador de asistencia (`/api/v1/hr/attendance/records`), respondiendo con un error `HTTP 404 Not Found`.

---

## 🛠️ Solución Aplicada

1. **Corrección de la Regla de Traefik (`docker-compose.standalone.yml`):**
   Se actualizó la regla de ruteo de `omniledger_standalone` alineándola con el estándar de los demás microservicios standalone (`/sorteos-standalone`, `/catalogo-standalone`, `/turnos-standalone`, etc.):

```yaml
- "traefik.http.routers.omniledger-standalone.rule=Host(`ledger.${ROOT_DOMAIN:-pesallaccia.com}`) || PathPrefix(`/ledger-standalone`)"
```

2. **Resultado:**
   Las solicitudes enviadas a `/api/v1/hr/attendance/records` (y demás endpoints del backend de OrderFlow) son procesadas directamente por `orderflow-prod-backend` (puerto `:3010`), respondiendo correctamente con los registros de marcaciones de asistencia.
