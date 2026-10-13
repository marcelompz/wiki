# 🛠️ Troubleshooting #66 — Social Catalog en blanco / sin productos por Acordeón Colapsado por Defecto y Schema Drift

## 📌 Síntomas
Al ingresar al menú digital o catálogo público (`https://provecchio.com/social-catalog/menudigital` o cualquier subdominio/slug de tenant):
1. Los visitantes ven únicamente los títulos de categorías sin productos desplegados o la página aparece aparentemente sin productos.
2. En llamadas a la API `/api/v1/public/social-catalog/products`, el servidor responde con error `HTTP 500 Internal Server Error`.

---

## 🔍 Causa Raíz

### 1. Error HTTP 500 en Backend (Schema Drift)
- **Causa:** El backend compilado contenía un campo recién añadido (`products.handle` en `prisma/schema.prisma`), pero la base de datos PostgreSQL en producción no había ejecutado `npx prisma db push`.
- **Log:** `PrismaClientKnownRequestError: The column products.handle does not exist in the current database.`

### 2. Productos Invisibles en Frontend (Acordeón Colapsado por Defecto)
- **Causa:** Cuando el tenant tiene configurado el modo de plantilla `categoryLayoutMode: "accordion"`, el componente `SocialCatalogPage` (`omni-catalog.tsx`) instanciaba `<Collapse defaultActiveKey={[]}>`.
- **Efecto:** Todas las secciones de categorías abrían 100% cerradas al entrar a la página, requiriendo que el cliente hiciera clic manualmente en cada acordeón para poder ver los productos.

---

## 🛠️ Solución Aplicada

### 1. Sincronización de Base de Datos
Ejecutado `npx prisma db push` en el servidor de producción para sincronizar la columna `products.handle` en PostgreSQL.

### 2. Expansión por Defecto en Frontend (`omni-catalog.tsx`)
Se modificó `frontend/src/pages/omni-catalog.tsx` para inicializar el acordeón con todas las categorías desplegadas por defecto:
```tsx
<Collapse
  defaultActiveKey={Object.keys(groupedProducts)}
  expandIconPosition="end"
  bordered={false}
  style={{ background: 'transparent', display: 'flex', flexDirection: 'column', gap: '6px' }}
>
```

---

## 🔬 Verificación
1. `GET /api/v1/public/social-catalog/products?instanceKey=menudigital` responde HTTP 200 OK con los 221 productos activos.
2. Al ingresar al catálogo público en la web, todas las categorías aparecen desplegadas y los productos son visibles inmediatamente al cargar la página.
