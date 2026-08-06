# Troubleshooting — v1.12.2 Admin UI & Deploy Issues

**Fecha:** 2026-08-05  
**Alcance:** errores runtime en admin, despliegue en Hetzner/Provechio y fixes aplicados

---

## 1. Sidebar admin duplicada: Usuarios / Clientes / Contactos

**Síntoma:**  
En `/admin` aparecían ítems separados **Usuarios**, **Clientes** y **Contactos Unificados**.

**Causa:**  
`AdminApp.tsx` cargaba los 3 items como rutas distintas sin fusión.

**Solución:**  
Fusionar Usuarios y Clientes en un solo item **Contactos** y ocultar los items legacy del sidebar.

**Archivos:**  
- `frontend/src/AdminApp.tsx`

---

## 2. Contactos rota: `TypeError: J.some is not a function`

**Síntoma:**  
Al entrar a `/admin/contacts` se rompe la página con `J.some is not a function`.

**Causa:**  
`installedModules` puede ser `undefined`/objeto en la primera carga, y el frontend llamaba a `.some()` sin defensa.

**Solución:**  
Agregar guard `Array.isArray()` antes de cualquier `.some()`, `.find()` o `.filter()` sobre `installedModules`.

**Archivos:**  
- `frontend/src/AdminApp.tsx`
- `frontend/src/pages/admin/modules.tsx`
- `frontend/src/pages/admin/quotations.tsx`

---

## 3. BioLink admin 404 al cargar configuración

**Síntoma:**  
`Error al cargar configuración de BioLink: AxiosError: Request failed with status code 404`

**Causa:**  
El tenant no tenía configuración de BioLink creada; el endpoint `/api/v1/bio/config` devuelve 404 en ese caso.

**Solución:**  
Tratar el 404 como estado vacío en vez de error crítico; mostrar formulario vacío para crear la configuración.

**Archivos:**  
- `frontend/src/pages/admin/biolinks.tsx`

---

## 4. Backend no inicia en producción: `PaymentGatewaysModule`

**Síntoma:**  
```
Nest cannot export a provider/module that is not a part of the currently processed module (PaymentGatewaysModule)
```

**Causa:**  
Se intentaba exportar la clase abstracta `PaymentGatewayAdapter` sin registrarla como provider.

**Solución:**  
No exportar `PaymentGatewayAdapter` desde `PaymentGatewaysModule`. Solo exportar los gateways concretos y el token `PAYMENT_GATEWAYS`.

**Archivos:**  
- `backend/src/billing/gateways/gateways.module.ts`

---

## 5. Backend no inicia: `BillingService` no resuelve `StripePaymentGateway`

**Síntoma:**  
```
Nest can't resolve dependencies of the BillingService (PrismaService, ?, MercadoPagoPaymentGateway, PagoparPaymentGateway)
```

**Causa:**  
Después de quitar la exportación abstracta, los gateways concretos dejaron de estar disponibles en `BillingModule`.

**Solución:**  
Exportar `StripePaymentGateway`, `MercadoPagoPaymentGateway` y `PagoparPaymentGateway` desde `PaymentGatewaysModule`.

**Archivos:**  
- `backend/src/billing/gateways/gateways.module.ts`

---

## 6. Servidor Hetzner se cuelga durante build Docker

**Síntoma:**  
Deploy se corta por timeout; servidor queda inaccesible por OOM.

**Causa:**  
RAM insuficiente durante build de imágenes (3.7Gi sin swap).

**Solución:**  
Agregar swap persistente de 4Gi en el servidor.

```bash
ssh hetzner-orderflow
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Nota:** Aumentar también `NODE_OPTIONS=--max-old-space-size=4096` en `Dockerfile.prod`.

---

## 7. Stacktrace `J.some is not a function` en Contactos (persistente)

**Síntoma:**  
En producción sigue apareciendo `J.some is not a function` al entrar a Contactos, a pesar de los guards frontend.

**Causa:**  
El endpoint `/api/v1/modules/installed` puede devolver un objeto en vez de array bajo condiciones específicas de módulos/cache.

**Workaround aplicado:**  
- Guard en `AdminApp.tsx`, `modules.tsx`, `quotations.tsx`
- Si `installedModules` no es array, usar módulos core por defecto

**Pendiente:**  
Investigar si el backend devuelve formato inconsistente en `getInstalledModules()` bajo multi-tenant o cache.

---

## 8. Checklist de deploy en Hetzner/Provechio

**Antes de deployar:**
1. Verificar memoria disponible: `free -h` y swap activo
2. Verificar estado de contenedores: `docker ps`
3. Hacer backup de BD: `./scripts/deploy-production.sh production` incluye backup automático

**Después del deploy:**
1. Verificar que backend responda: `curl -sS http://localhost:3010/api/v1/health`
2. Verificar logs: `docker compose -f docker-compose.prod.yml --env-file .env logs --tail=100 backend`
3. Verificar frontend: abrir dominio en navegador y revisar consola

**Rollback:**
```bash
ssh hetzner-orderflow
cd /srv/orderflow
git checkout <commit-anterior>
./scripts/deploy-production.sh production
```
