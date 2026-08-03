# Troubleshooting: Confusión de Routing `pesallaccia.com` vs `provecchio.com`

## Síntoma
- `provecchio.com` carga contenido incorrecto o rompe
- Tráfico de `pesallaccia.com` llega al servidor equivocado
- Traefik en `192.168.69.240` no debería rutear `pesallaccia.com`

## Arquitectura Correcta
| Dominio | Servidor | IP | Traefik | Compose |
|---------|----------|-----|---------|---------|
| `provecchio.com` | Provecchio Di Mora | `192.168.69.240` | `/srv/traefik/` (stack aislado) | `docker-compose.prod.yml` con `.env.prod` |
| `pesallaccia.com` | Hetzner VPS | `178.105.226.175` | `/srv/traefik/` (stack propio) | `docker-compose.prod.yml` con `.env.production` |

## Reglas Críticas
1. **NO** agregar `pesallaccia.com` a la regla Traefik de `docker-compose.prod.yml` de provecchio
2. **NO** copiar configuraciones Traefik entre servidores
3. Cada servidor tiene su propio stack de Traefik y su propio `docker-compose.prod.yml` desplegado

## Solución
- Verificar que `docker-compose.prod.yml` solo contenga reglas para el dominio del entorno correspondiente
- Para `pesallaccia.com`: modificar `/srv/traefik/dynamic/services.yml` en el Hetzner
- Para `provecchio.com`: modificar `/srv/traefik/dynamic/services.yml` en `192.168.69.240`

## Prevención
Documentar siempre en qué servidor se despliega cada cambio de infraestructura. Usar `docs/PUERTOS_ENTORNOS.md` como referencia.
