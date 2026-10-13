# 200 - Internal Server Error al editar empleado con contacto inexistente (Paula Cocinera)

## Estado
Resuelto

## Síntoma
Al editar el perfil de un empleado en `/admin/hr/employees/:id/edit`, el backend retornaba `500 Internal Server Error` cuando el empleado tenía un `contactId` referenciando un contacto que no existía en la tabla `contacts` (fue borrado o nunca fue creado).

Afectó específicamente a **Paula Cocinera** (`id: cmucs7nrc00011w3e4fx800zv`) cuyo `contact_id = 7dd9c50e-ca8b-4df2-b6c2-a5262a00d61c` no existía en `contacts`.

## Causa Raíz
El método `syncContactForEmployee` en `backend/src/hr/hr.service.ts` verificaba `if (!contactId)` para decidir buscar o crear un contacto. Cuando el empleado ya tenía un `contactId` (no null), el código saltaba la búsqueda y iba directamente a `prisma.contact.update()` en la línea 254, que fallaba con `Foreign key violation/PRIMARY KEY violation` porque el contacto referenciado no existía.

Las otras empleadas (Ivan Castillo, Natalia Bado) funcionaban porque tenían contactos válidos asociados.

## Solución Aplicada
`backend/src/hr/hr.service.ts` — `syncContactForEmployee()`:
- Agregado bloque `else` en la validación `if (!contactId)` para verificar explícitamente que el `contactId` referenciado exista en la tabla `contacts`.
- Si el contacto no existe, se limpia la referencia (`contactId = null`) y se realiza la búsqueda/creación de un nuevo contacto basado en `taxId`, `email` o `name`.
- Esto evita el error FK y asegura que el empleado siempre tenga un contacto válido asociado.

## Verificación
1. Acceder a `/admin/hr/employees/cmucs7nrc00011w3e4fx800zv/edit`.
2. Modificar cualquier campo y guardar.
3. La operación debe completarse con `200 OK` y el empleado debe tener un nuevo `contactId` válido.

## Archivos Modificados
- `backend/src/hr/hr.service.ts` — `syncContactForEmployee()` método (líneas 76-90)
