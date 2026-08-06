# 🚀 Guía de Inicio Rápido - OrderFlow

[🏠 Atrás (README)](../README.md) | [🚀 Inicio Rápido](01-quickstart.md) | [🏗️ Arquitectura](02-architecture.md) | [🏢 Multi-Tenant Demo](03-multi-tenant-demo.md) | [🔐 JWT Auth](04-jwt-auth.md) | [📊 Testing Report](05-testing-report.md) | [🏪 POS & KDS](06-pos-kds.md) | [📊 Diagramas UML](07-uml-diagrams.md) | [🎖️ Loyalty Module](08-loyalty.md)

---

OrderFlow es un sistema multi-plataforma para gestión de pedidos de alta velocidad. Este proyecto incluye:

- **Backend API:** NestJS + Prisma (multi-tenant)
- **Frontend Web:** React + Refine.dev (panel de administración)
- **Mobile App:** React Native + Expo (ventas en terreno)

---

## Paso 1: Iniciar el entorno de desarrollo

```bash
cd /opt/orderflow
docker compose up -d
```

Esperar a que los contenedores estén saludables (~30 segundos).

## Paso 2: Crear tu primer tenant (empresa)

```bash
curl -X POST http://localhost:3010/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Empresa S.A.",
    "webhookOrderConfirmedUrl": "https://mi-erp.com/webhook"
  }'
```

**Respuesta:**
```json
{
  "id": "uuid-generado",
  "name": "Mi Empresa S.A.",
  "apiKeySecret": "abc123def456...",
  "createdAt": "2026-06-13T..."
}
```

**¡Importante!** Copia la `apiKeySecret` - es tu credencial para todas las llamadas API.

## Paso 3: Configurar el frontend

Abre la consola del navegador (F12) en `http://localhost:3011` y ejecuta:

```javascript
localStorage.setItem("apiKey", "abc123def456...");
```

O crea un archivo `.env` en el frontend:

```bash
cd frontend
cp .env.example .env
# Editar .env y agregar VITE_API_KEY=tu-api-key
```

## Paso 4: Sincronizar productos de prueba

```bash
curl -X POST http://localhost:3010/api/v1/sync/products \
  -H "Content-Type: application/json" \
  -H "x-api-key: abc123def456..." \
  -d '{
    "products": [
      {
        "sku_interno": "REP-001",
        "name": "Filtro de Aceite Toyota",
        "price": 45000,
        "stock_available": 50,
        "category": "Filtros",
        "images_urls": ["https://via.placeholder.com/200"]
      },
      {
        "sku_interno": "REP-002",
        "name": "Pastilla de Freno Delantera",
        "price": 120000,
        "stock_available": 25,
        "category": "Frenos",
        "images_urls": ["https://via.placeholder.com/200"]
      }
    ]
  }'
```

## Paso 5: ¡Comenzar a vender!

1. Abre `http://localhost:3011` en tu navegador
2. Verás el catálogo con los productos cargados
3. Agrega productos al carrito (clic en "Agregar")
4. Haz clic en "Carrito" (esquina superior derecha)
5. Presiona "Confirmar Pedido"
6. Completa el checkout en 3 pasos

## Paso 6: Verificar el webhook

Si configuraste una URL de webhook, deberías recibir un POST cuando confirmas el pedido:

```json
{
  "event": "order.confirmed",
  "tenant_id": "uuid-del-tenant",
  "order_id": "uuid-del-pedido",
  "customer": { ... },
  "items": [
    {
      "sku_interno": "REP-001",
      "qty": 2,
      "price": 45000
    }
  ],
  "timestamp": "2026-06-13T..."
}
```

## Comandos Útiles

```bash
# Ver logs del backend
docker logs orderflow_backend -f

# Ver logs de la base de datos
docker logs orderflow_db -f

# Reiniciar servicios
docker-compose restart

# Detener todo
docker-compose down

# Resetear base de datos (¡cuidado!)
docker-compose down -v
```

## Solución de Problemas

### Error: "API key missing"
- Verifica que el header `x-api-key` esté siendo enviado
- En el frontend, verifica `localStorage.getItem("apiKey")`

### Error: "Connection refused" al backend
- Verifica que el backend esté corriendo: `docker ps`
- Verifica el puerto: `http://localhost:3000`

### Productos no aparecen
- Verifica que la API key sea correcta
- Revisa los logs del backend para errores
- Ejecuta `curl http://localhost:3000/api/v1/sync/products -H "x-api-key: ..."` para probar

---

**Próximo paso:** Leer la documentación completa en `README.md` o [Arquitectura](02-architecture.md)
