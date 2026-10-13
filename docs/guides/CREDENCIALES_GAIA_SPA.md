# Credenciales de Acceso - SPA Wellness (Demo)

**Tenant ID:** `ca587fa3-c935-46bf-9d7e-ec50fb103efa`  
**API Key:** `067059e2d6ae48d8a5f7c81b85fbf522`  
**URL de Acceso:** `http://localhost:3011/login` (desarrollo) o `https://spa-demo.pesallaccia.com/login` (producción)

---

## Usuarios Creados

### 1. **Administrador** (Rol: ADMIN)
```
Email: admin@spa-demo.com
Password: SpaDemo2026!
Nombre: Administrador SPA Wellness
ID Usuario: 3a59792b-f476-4e97-b2da-020d6d2dfeb7
```

**Permisos:**
- ✅ Gestionar todos los módulos del sistema
- ✅ Crear/eliminar usuarios del tenant
- ✅ Configurar parámetros del tenant
- ✅ Acceso completo a bookings, productos, órdenes, clientes
- ✅ Ver reportes financieros y métricas

**Casos de uso:**
- Dueño del negocio
- Administrador del sistema
- Gerente general

---

### 2. **Recepción** (Rol: MANAGER)
```
Email: recepcion@spa-demo.com
Password: SpaDemo2026!
Nombre: Recepción SPA Wellness
ID Usuario: ace784d7-627f-4790-b2dd-893d86fb78b7
```

**Permisos:**
- ✅ Gestionar reservas/bookings (crear, modificar, cancelar)
- ✅ Gestionar clientes (alta, modificación)
- ✅ Gestionar productos y servicios
- ✅ Ver reportes operativos
- ❌ No puede eliminar usuarios
- ❌ No puede cambiar configuración del tenant

**Casos de uso:**
- Recepcionista del spa
- Coordinador de turnos
- Asistente administrativo

---

### 3. **Vendedor** (Rol: SELLER)
```
Email: ventas@spa-demo.com
Password: SpaDemo2026!
Nombre: Vendedor SPA Wellness
ID Usuario: 37176a84-713f-4acc-9ed4-923070347082
```

**Permisos:**
- ✅ Crear órdenes/pedidos
- ✅ Gestionar carrito de compras
- ✅ Ver clientes
- ✅ Ver productos y precios
- ❌ No puede modificar bookings
- ❌ No puede ver reportes financieros
- ❌ No puede gestionar usuarios

**Casos de uso:**
- Vendedor de productos wellness
- Asistente de ventas
- Promotor

---

### 4. **Profesional** (Rol: VIEWER)
```
Email: maria.martinez@spa-demo.com
Password: SpaDemo2026!
Nombre: Maria Martinez - Masajista
ID Usuario: 9fbe1fb9-e57c-48d6-8da6-2d7fdb1f0b33
```

**Permisos:**
- ✅ Ver su propia agenda de turnos
- ✅ Ver detalles de clientes asignados
- ✅ Ver productos relacionados a sus servicios
- ❌ No puede crear/modificar bookings
- ❌ No puede ver reportes
- ❌ Solo lectura en general

**Casos de uso:**
- Masajistas
- Psicólogos
- Profesionales independientes
- Staff que solo necesita ver su agenda

---

## Matriz de Permisos por Rol

| Funcionalidad | ADMIN | MANAGER | SELLER | VIEWER |
|---------------|-------|---------|--------|--------|
| **Usuarios** |
| Crear usuario | ✅ | ❌ | ❌ | ❌ |
| Eliminar usuario | ✅ | ❌ | ❌ | ❌ |
| Ver usuarios | ✅ | ✅ | ❌ | ❌ |
| **Bookings/Turnos** |
| Crear reserva | ✅ | ✅ | ❌ | ❌ |
| Modificar reserva | ✅ | ✅ | ❌ | ❌ |
| Cancelar reserva | ✅ | ✅ | ❌ | ❌ |
| Ver agenda | ✅ | ✅ | ❌ | ✅ (solo propia) |
| **Productos/Servicios** |
| Crear producto | ✅ | ✅ | ❌ | ❌ |
| Modificar precio | ✅ | ✅ | ❌ | ❌ |
| Ver catálogo | ✅ | ✅ | ✅ | ✅ |
| **Órdenes/Ventas** |
| Crear orden | ✅ | ✅ | ✅ | ❌ |
| Ver órdenes | ✅ | ✅ | ✅ | ❌ |
| Ver reportes financieros | ✅ | ✅ | ❌ | ❌ |
| **Configuración** |
| Configurar tenant | ✅ | ❌ | ❌ | ❌ |
| Ver métricas/dashboard | ✅ | ✅ | ❌ | ❌ |
| **Clientes** |
| Crear cliente | ✅ | ✅ | ✅ | ❌ |
| Ver clientes | ✅ | ✅ | ✅ | ✅ (solo asignados) |

---

## Instrucciones de Uso

### **Primer Acceso:**

1. Ir a `http://localhost:3011/login` (o URL de producción)
2. Ingresar email y password
3. Click en "Ingresar"
4. El sistema redirige automáticamente a `/admin`

### **Si se olvida la contraseña:**

Actualmente, contactar al administrador (admin@spa-demo.com) para reset manual.

### **Crear nuevo usuario:**

```bash
curl -X POST http://localhost:3010/api/v1/users \
  -H "Content-Type: application/json" \
  -H "x-api-key: 067059e2d6ae48d8a5f7c81b85fbf522" \
  -d '{
    "email": "nuevo@spa-demo.com",
    "password": "Password123!",
    "name": "Nombre del Usuario",
    "role": "SELLER"  // ADMIN, MANAGER, SELLER, VIEWER
  }'
```

---

## Notas de Seguridad

- **Password temporal:** Todos los usuarios tienen la misma password `SpaDemo2026!` por defecto
- **Recomendación:** Cambiar la password en el primer acceso de cada usuario
- **Rotación de API Key:** Si se compromete la API Key, generar una nueva en el panel de administración

---

## Contacto de Soporte

**Para problemas técnicos:**
- Email: soporte@orderflow.com
- Documentación: https://wiki.marcelompz.github.io/orderflow/
