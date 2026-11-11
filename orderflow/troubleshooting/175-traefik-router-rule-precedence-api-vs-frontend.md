# Troubleshooting: Traefik Router Rule Precedence — API vs Frontend Path Matching

**Fecha:** 2026-10-18  
**Entorno:** Local (provecchio.local) / Traefik v3.4  
**Severidad:** Alta — Rutas públicas (biolinks, social-catalog, login) devolvían 404

---

## Síntoma

- `GET https://provecchio.local/bio/dimora` → 404 "Cannot GET /bio/dimora"
- `GET https://provecchio.local/social-catalog/menudigital` → 404
- `POST https://provecchio.local/api/v1/auth/login` → 404
- `GET https://provecchio.local/api/v1/bio/dimora` → 404 (o HTML del frontend)

Las llamadas directas al backend (`http://localhost:3010/api/v1/...`) funcionaban correctamente.

---

## Causa Raíz

**Precedencia de operadores en reglas de Traefik** (Regla #13 del AGENTS.md: "Diagram-Driven Development & Telemetry-First" — los diagramas de flujo de ruteo deben reflejar la precedencia real).

Archivo: `/opt/orderflow/traefik/dynamic/provecchio-router.yml`

```yaml
# INCORRECTO — || tiene menor precedencia que &&
rule: "Host(`provecchio.local`) || HostRegexp(`{subdomain:.+}.provecchio\\.local$`) && PathPrefix(`/api`)"
# Se evalúa como: Host(...) || (HostRegexp(...) && PathPrefix(/api))
# Resultado: Cualquier request a provecchio.local coincide con el primer Host() y va al frontend
```

---

## Solución

Agregar paréntesis explícitos para forzar la precedencia correcta:

```yaml
# CORRECTO
rule: "(Host(`provecchio.local`) || HostRegexp(`{subdomain:.+}.provecchio\\.local$`)) && PathPrefix(`/api`)"
```

Archivo actualizado: `/opt/orderflow/traefik/dynamic/provecchio-router.yml`

```yaml
http:
  routers:
    frontend-provecchio-local:
      rule: "Host(`provecchio.local`) || HostRegexp(`{subdomain:.+}.provecchio\\.local$`)"
      entryPoints:
        - websecure
      service: provecchio-frontend
      tls: {}
    api-provecchio-local:
      rule: "(Host(`provecchio.local`) || HostRegexp(`{subdomain:.+}.provecchio\\.local$`)) && PathPrefix(`/api`)"
      entryPoints:
        - websecure
      service: provecchio-api
      tls: {}
      priority: 100
  services:
    provecchio-frontend:
      loadBalancer:
        servers:
          - url: "http://orderflow_frontend:80"
    provecchio-api:
      loadBalancer:
        servers:
          - url: "http://orderflow_backend:3010"
```

Aplicar cambios:
```bash
docker kill -s HUP orderflow_traefik
```

---

## Verificación Post-Fix

```bash
# Biolink público
curl -sk https://provecchio.local/bio/dimora
# → HTML del frontend (React Router maneja /bio/:slug client-side)

# Biolink API
curl -sk https://provecchio.local/api/v1/bio/dimora
# → JSON con datos del biolink

# Social Catalog
curl -sk https://provecchio.local/social-catalog/menudigital
# → HTML del frontend

# Login
curl -sk -X POST https://provecchio.local/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marcelo@pesallaccia.com","password":"Provecchio2026!"}'
# → JWT tokens válidos
```

---

## Regla General

> **En Traefik, `&&` tiene mayor precedencia que `||`. Siempre usar paréntesis al combinar `Host`/`HostRegexp` con `PathPrefix`, `Path`, `Query`, `Headers`, etc.**

Patrón seguro:
```yaml
rule: "(Host(`dominio.local`) || HostRegexp(`{sub}.dominio\\.local$`)) && PathPrefix(`/api`)"
```

---

## Referencias

- AGENTS.md Regla #13: Diagram-Driven Development — los diagramas de secuencia/ruteo deben declarar explícitamente precedencias
- Traefik docs: [Router Rule Syntax](https://doc.traefik.io/traefik/routing/routers/#rule)
- Archivo relacionado: `/opt/orderflow/traefik/dynamic/provecchio-router.yml`
- Commit: (pendiente — documentar en CHANGELOG.md)