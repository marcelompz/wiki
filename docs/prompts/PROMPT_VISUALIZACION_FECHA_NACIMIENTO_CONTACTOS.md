# Prompt: Visualización de Fecha de Nacimiento en Contactos y Participantes de Sorteos

## Contexto

Los sorteos creados en OmniFlow (como el sorteo de Provecchio `https://provecchio.com/sorteo/26857e8e-7f29-46ff-8931-c1335fc42a7f`) capturan la fecha de nacimiento del cliente (`birthDate`) durante su registro y la almacenan de forma segura en la base de datos dentro del objeto JSON `contact.metadata.birthDate`.

Sin embargo, en las vistas de administración:
1. `/admin/contacts` (`frontend/src/pages/admin/contacts.tsx`) no muestra la fecha de nacimiento ni en la tabla de contactos ni en el modal de edición/detalle.
2. `/admin/giveaways` (`frontend/src/pages/admin/giveaways.tsx`) no incluye la columna de fecha de nacimiento en la lista de participantes del sorteo.

---

## Objetivos

1. **Visibilidad en `/admin/contacts`:**
   - Agregar la columna **"Fecha Nacimiento"** en la tabla de contactos (`AdaptiveTable` / `Columns`), extrayendo el valor de `record.metadata?.birthDate`. Si no está presente, mostrar `-`.
   - Agregar el campo **"Fecha de Nacimiento"** (DatePicker de Ant Design o Input format `DD/MM/YYYY`) en el modal de creación/edición de contacto.
   - Permitir guardar y actualizar `metadata.birthDate` al guardar/editar un contacto desde la interfaz.

2. **Visibilidad en `/admin/giveaways`:**
   - En el modal de detalle del sorteo -> pestaña **Participantes**, agregar la columna **"Fecha Nacimiento"** a la tabla de participantes, extrayendo el valor de `record.contact?.metadata?.birthDate`.

3. **Cumplimiento del Protocolo `AGENTS.md`:**
   - Respetar `tenantId` en todas las operaciones.
   - No romper ni alterar el esquema Prisma ni la estructura de aislamiento.
   - No ejecutar `./scripts/init.sh` sin pedir confirmación explícita previa al usuario.
   - Actualizar el estado de la tarea en `featurelist.json`.
   - Incrementar versión en `VERSION`, `CHANGELOG.md`, `ROADMAP.md` y sincronizar con la Wiki oficial (`/opt/wiki/orderflow/`).

---

## Especificaciones de Implementación

### 1. Frontend: `frontend/src/pages/admin/contacts.tsx`

- **Tabla de Contactos:**
  - Agregar una columna `Fecha Nacimiento` entre `Teléfono` y `Funciones`:
    ```tsx
    {
      title: 'Fecha Nacimiento',
      key: 'birthDate',
      render: (_: any, record: any) => record.metadata?.birthDate || '-',
    }
    ```
- **Modal Form:**
  - Agregar un `Form.Item` para la fecha de nacimiento:
    ```tsx
    <Form.Item name="birthDate" label="Fecha de Nacimiento">
      <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" />
    </Form.Item>
    ```
  - En `handleSave`, empaquetar `birthDate` dentro del payload de `metadata`:
    ```tsx
    metadata: {
      ...(editingContact?.metadata || {}),
      birthDate: values.birthDate ? values.birthDate.format('DD/MM/YYYY') : null,
    }
    ```
  - En `handleEdit`, inicializar `form.setFieldsValue`:
    ```tsx
    birthDate: record.metadata?.birthDate ? dayjs(record.metadata.birthDate, 'DD/MM/YYYY') : null,
    ```

### 2. Frontend: `frontend/src/pages/admin/giveaways.tsx`

- En la tabla de participantes (dentro del modal de detalles del sorteo):
  - Agregar la columna `Fecha Nacimiento` en la prop `columns` de la tabla de participantes:
    ```tsx
    {
      title: "Fecha Nacimiento",
      dataIndex: ["contact", "metadata", "birthDate"],
      key: "birthDate",
      render: (birthDate: string) => birthDate || "-",
    }
    ```

### 3. Sincronización de Documentación & Versión (`AGENTS.md`)

1. Actualizar `featurelist.json` registrando la característica como `completed`.
2. Incrementar versión semántica del Core en `VERSION` (ej: `v1.20.17`).
3. Actualizar `CHANGELOG.md` y `ROADMAP.md`.
4. Sincronizar la Wiki oficial en `/opt/wiki/orderflow/`.

---

## Criterios de Aceptación

- [ ] `/admin/contacts` muestra la columna de Fecha de Nacimiento en la tabla.
- [ ] En el modal de edición/creación de contactos se puede consultar y modificar la Fecha de Nacimiento.
- [ ] La pestaña "Participantes" en `/admin/giveaways` muestra la Fecha de Nacimiento de cada participante registrado.
- [ ] El cambio no rompe la carga de contactos ni de participantes existentes.
- [ ] La Wiki local (`/opt/wiki/orderflow/`) y los documentos del proyecto quedan actualizados y sincronizados.
