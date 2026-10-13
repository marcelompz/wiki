# Troubleshooting 133: HTTP 500 al cargar marcaciones HR por referencias históricas huérfanas

## Síntoma

Después de ingresar al circuito operativo mediante PIN, el panel de HR registra:

```text
GET /api/v1/hr/attendance/records 500
Error al cargar marcaciones de asistencia
```

El warning de `apple-mobile-web-app-capable` no causa este error.

## Causa raíz

`AttendanceRecord.employeeId` contiene registros históricos creados antes de que la relación
formal con `Employee` quedara consolidada. La consulta incluía la relación requerida
directamente mediante Prisma. Cuando uno de esos identificadores no tenía un `Employee`
correspondiente en el mismo tenant, Prisma lanzaba `Inconsistent query result` y convertía
la carga completa del panel en HTTP 500.

## Solución aplicada

`HrService.getAttendanceRecords` ahora:

1. Consulta primero las marcaciones filtradas por `tenantId`.
2. Resuelve empleados y workplaces en consultas separadas, también filtradas por `tenantId`.
3. Devuelve `employee: null` o `workplace: null` para referencias históricas inexistentes,
   sin ocultar la marcación ni interrumpir el panel.
4. Conserva `employeeId` para permitir una posterior conciliación/migración de datos.

Se agregó una prueba regresiva para una marcación cuyo empleado ya no existe.

## Acción pendiente de datos

Las referencias huérfanas deben conciliarse con el legajo HRMS y no eliminarse
automáticamente. Una vez validado el mapeo, debe ejecutarse una migración de datos con
respaldo previo antes de imponer restricciones adicionales de integridad referencial.
