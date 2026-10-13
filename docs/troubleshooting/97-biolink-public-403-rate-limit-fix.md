# Troubleshooting #97 — HTTP 403 en BioLink Público por Rate Limit Global

## 📋 Síntomas

1. **Error 403 al cargar BioLinks públicos:**
   ```
   Error cargando BioLink público: AxiosError: Request failed with status code 403
   ```
2. **Error intermitente:** El error aparece y desaparece, afectando a múltiples usuarios simultáneamente.
3. **Solo afecta a endpoints públicos:** Los endpoints con autenticación (JWT/API Key) funcionan correctamente.

---

## 🔍 Causa Raíz

1. **Rate Limit Compartido Global:**
   El `TenantThrottlerGuard` está registrado como `APP_GUARD` global en `backend/src/app.module.ts:129-131`, aplicándose a TODOS los endpoints, incluidos los públicos.

2. **Tracker `'global'` para Requests sin Auth:**
   En `backend/src/common/tenant-throttler.guard.ts:7-10`, el método `getTracker()` usaba:
   ```typescript
   const tenantId = (req as any).tenant?.id || req.headers['x-api-key'] || 'global';
   return `${tenantId}`;
   ```
   Cuando no hay tenant ni API key (endpoints públicos), el tracker caía en `'global'`.

3. **Bucket Compartido:**
   El rate limit está configurado como 100 requests por 60 segundos (`ttl: 60000, limit: 100`). Con el tracker `'global'`, **todas las requests públicas de todos los usuarios compartían el mismo bucket de 100 requests**.

4. **ForbiddenException en vez de 429:**
   El método `throwThrottlingException` lanza `ForbiddenException` (HTTP 403) en vez de `TooManyRequestsException` (HTTP 429), lo que enmascara la naturaleza real del error.

---

## 🛠️ Solución Aplicada

**Tracking por IP para endpoints públicos** en `backend/src/common/tenant-throttler.guard.ts`:

```typescript
protected async getTracker(req: Request): Promise<string> {
  const tenantId = (req as any).tenant?.id || req.headers['x-api-key'];
  if (tenantId) {
    return `${tenantId}`;
  }
  const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'global';
  return `ip:${ip}`;
}
```

Cada usuario ahora tiene su propio bucket de rate limit basado en su IP, evitando que usuarios legítimos sean bloqueados por la actividad de otros.

---

## 🧪 Verificación

- Requests desde IPs diferentes deben funcionar simultáneamente sin 403.
- El rate limit sigue aplicando por IP (100 req/60s por IP).
- Endpoints autenticados (con tenant/apiKey) mantienen su tracking original.

---

## ⚠️ Nota

Considerar cambiar `ForbiddenException` a `TooManyRequestsException` (HTTP 429) en `throwThrottlingException` para mayor semántica correcta del protocolo HTTP.
