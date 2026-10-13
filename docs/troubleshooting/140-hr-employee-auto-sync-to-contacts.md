# 🛠️ Troubleshooting #140: Sincronización Automática de Colaboradores de RRHH (`/admin/hr`) al CRM de Contactos (`/admin/contacts`)

## 📋 Información General
- **Área:** Backend / HR / Contactos CRM
- **Síntoma:** Al crear un nuevo colaborador de nombre "Ivan Castillo" (o cualquier otro colaborador) en el módulo de Capital Humano (`/admin/hr`), al buscarlo en la sección de Contactos (`/admin/contacts`) no figuraba registrado en la base de datos de Contactos.
- **Estado:** ✅ Resuelto

---

## 🔍 Causa Raíz

En el servicio backend de RRHH (`HrService.createEmployee`), al registrar un legajo digital:
1. Se creaba únicamente un registro en la tabla `employees` (`prisma.employee`).
2. Si no se seleccionaba manualmente un contacto del selector CRM, el campo `contactId` quedaba en `null`.
3. El backend no creaba ni asociaba automáticamente una ficha en la tabla `contacts` (`prisma.contact`), ni le asignaba la función/rol `EMPLOYEE` en `contact_roles`.
4. La vista `/admin/contacts` consulta exclusivamente la tabla `contacts`, por lo que los empleados creados directamente desde RRHH no aparecían en las búsquedas del CRM.

---

## 🛠️ Solución Aplicada

1. **`backend/src/hr/hr.service.ts`:**
   - **`syncContactForEmployee`**: Se creó un método auxiliar que busca si ya existe un Contacto por documento (`nationalId`), email o nombre. Si no existe, genera automáticamente el `Contact` con los datos del colaborador y le asigna el rol `EMPLOYEE` en `contact_roles`.
   - **`createEmployee`**: Se integra la llamada a `syncContactForEmployee` para garantizar que todo nuevo colaborador nazca vinculado a su ficha en el CRM.
   - **`getEmployees` (Auto-Healing)**: Se implementó `syncUnlinkedEmployees` para detectar y curar automáticamente colaboradores creados previamente sin `contactId` (como Ivan Castillo), enlazándoles su contacto correspondiente.
   - **`updateEmployee`**: Se mantiene la sincronización de nombre, email, teléfono y cargo con la ficha de contacto vinculada.

2. **`backend/src/hr/hr.service.spec.ts`:**
   - Pruebas unitarias en Jest agregadas y aprobadas al 100%.

---

## 🧪 Verificación

- `npm test src/hr/hr.service.spec.ts` pasó el 100% de las pruebas (2/2).
- Verificación de tipos TypeScript limpia.
