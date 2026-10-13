# 🛠️ Troubleshooting #139: Inclusión de Selector de Contactos CRM al Crear Colaboradores en RRHH (`/admin/hr`)

## 📋 Información General
- **Área:** Frontend / Admin App / HR / Contactos CRM
- **Síntoma:** Al crear un nuevo colaborador en la sección de Capital Humano (`/admin/hr`), el formulario exigía ingresar los datos desde cero (nombre, apellido, cédula) sin brindar la posibilidad de seleccionar o vincular un contacto previamente creado en el CRM (`/admin/contacts`).
- **Estado:** ✅ Resuelto

---

## 🔍 Causa Raíz
Aunque el backend NestJS (`CreateEmployeeDto` y `HrService.createEmployee`) y el esquema de la base de datos ya contaban con soporte nativo para la relación `contactId`, el formulario modal del frontend ([frontend/src/pages/admin/hr.tsx](file:///opt/orderflow/frontend/src/pages/admin/hr.tsx#L261)) carecía del campo de selección de contactos.

---

## 🛠️ Solución Aplicada

1. **`frontend/src/pages/admin/hr.tsx`:**
   - Se añadió la consulta `api.get('/api/v1/contacts')` para obtener la lista de contactos del tenant.
   - Se incorporó el campo `<Form.Item name="contactId" label="Vincular con Contacto existente (CRM)">` en el modal de creación de colaboradores.
   - Se implementó la lógica de auto-completado automático de campos (`firstName`, `lastName`, `nationalId`, `email`, `phone`) al seleccionar un contacto del listado desplegable.

---

## 🧪 Verificación
- Verificación de tipos limpia mediante `npx tsc --noEmit` en `frontend/`.
- Seleccionar un contacto autocompleta los campos del colaborador y guarda el vínculo `contactId` en la base de datos.
