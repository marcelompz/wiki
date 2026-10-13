# 📱 Manual de Usuario - Generador de Códigos QR

## 📋 Introducción

El **Generador de Códigos QR** de OrderFlow permite crear códigos QR personalizados para múltiples propósitos: URLs, productos, catálogos, biolinks, contactos, WiFi, vCards y archivos. Es una herramienta **standalone** (accesible desde `/admin/qr-generator`) y también se integra en otros módulos mediante un componente embebible.

---

## 🚀 Acceso

1. Iniciá sesión en el panel de administración.
2. En el menú lateral, buscá **"Catálogo & Canales"** → **"Generador QR"**.
3. O accedé directamente: `https://tu-dominio.com/admin/qr-generator`

---

## ⚙️ Configuración de un QR

### 1. Seleccionar Tipo de QR

Al abrir el modal, verás un **selector "Tipo de QR"** que permite elegir para qué sección generar el código:

| Tipo | Uso | Campo Requerido | Notas |
| :--- | :--- | :--- | :--- |
| 🔗 **URL** | Cualquier link externo | `url` | Admite HTTP / HTTPS |
| 📦 **Producto** | Producto del catálogo | `productId` | Redirige a la ficha del producto |
| 📱 **Catálogo Social (OmniCatalog)** | Catálogo omnicanal | *(ninguno)* | **Usa subdominio del tenant** |
| 🔗 **Biolink (OmniBio)** | Página biolink | `biolinkSlug` | Enlace a página tipo Linktree |
| 👤 **vCard** | Tarjeta de contacto digital | `name` (en vCard) | Importable directo a la agenda |
| 📄 **Archivo** | Enlace de descarga | `fileId` | Descarga de documento subido |
| 📶 **WiFi** | Configuración de red | `ssid` | Conexión automática |
| 📇 **Contacto** | Página de contacto del tenant | *(ninguno)* | Enlace al formulario/contacto |

> **Importante**: Para **Catálogo Social (OmniCatalog)** **no se requiere slug**. El QR se genera automáticamente usando el **subdominio del tenant** (ej: `https://mi-negocio.provecchio.com/social-catalog`). Si no hay subdominio configurado, usa la URL base `/social-catalog`.

### 2. Personalización Visual

| Parámetro | Rango | Default | Descripción |
| :--- | :---: | :---: | :--- |
| **Tamaño** | 100–2000 px | `512` | Resolución del QR en píxeles |
| **Corrección de error** | L / M / Q / H | `H` | Tolerancia a daños (`H` = 30%) |
| **Color QR** | Hex | `#630616` | Color de los módulos oscuros |
| **Color fondo** | Hex | `#ffffff` | Color de los módulos claros |
| **Logo central** | Base64 | — | Imagen en el centro (máx 22%) |
| **Tamaño logo** | 0–50% | `22%` | Porcentaje del QR que ocupa el logo |
| **Margen** | On / Off | `On` | Zona blanca protectora alrededor del QR |

### 3. Logo / Imagen Central

El QR permite agregar una **imagen central** (logo, ícono, etc.) de dos formas:

1. **Subir logo** → Click en "Subir logo" → Seleccioná archivo (PNG/JPG/WebP, máx 5MB).
2. **Galería de imágenes** → Click en **"Galería de imágenes"** → Se abre un modal con todas las imágenes subidas al tenant:
   - **Click simple** → Selecciona la imagen y cierra el modal.
   - **Doble click** → Abre **vista previa ampliada** (modal 800px, 80% altura).
   - **Icono 🔍 (zoom)** → Al pasar el mouse sobre una imagen, aparece botón de zoom para vista previa.
   - **Checkmark ✓** → Indica qué imagen está seleccionada actualmente.

### 4. Opciones Adicionales

- **Guardar en historial**: Al activarse, el QR queda registrado en la pestaña "Historial" para reutilización.
- **Nombre personalizado**: Para identificar el QR en el historial (ej: "QR Campaña Verano 2024").

---

## 👁️ Previsualización y Descarga

1. Completá la configuración.
2. Click en **"Generar QR"**.
3. Cambiá a la pestaña **"👁️ Previsualización"**.
4. Opciones disponibles:
   - **Descargar PNG**: Archivo listo para imprimir/compartir.
   - **Copiar imagen**: Al portapapeles (requiere HTTPS).
   - **Guardar en historial**: Registra el QR con su configuración.

---

## 📜 Historial de QRs

La pestaña **Historial** muestra todos los QRs generados con `saveToHistory=true`:

- **Filtros**: Por tipo, búsqueda por nombre/datos.
- **Paginación**: 20 items por página.
- **Acciones por QR**:
  - 👁️ **Ver**: Abre el QR en nueva pestaña.
  - ⬇️ **Descargar**: PNG directo.
  - ✏️ **Regenerar**: Abre el modal con la misma configuración.
  - 🗑️ **Eliminar**: Quita del historial (requiere `qr:manage`).

---

## 🔗 Integración en Módulos

### Botones Contextuales en Admin

| Módulo | Botón | Tipo QR | Campo Prellenado |
| :--- | :--- | :---: | :--- |
| **OmniCatalog** (`/admin/social-catalog`) | 📱 **Generar QR Catálogo** | `catalog` | `catalogSlug` vacío *(usa subdominio)* |
| **OmniLinks/Biolinks** (`/admin/biolinks`) | 📱 **Generar QR Biolink** | `biolink` | `biolinkSlug` actual |
| **Productos** (`/admin/products`) | 📱 **Generar QR Producto** | `product` | `productId` del item seleccionado |

> También disponible standalone en **Catálogo & Canales → Generador QR** (`/admin/qr-generator`).

### Componente Embebible (`QrGeneratorModal`)

El modal `QrGeneratorModal` se puede embeber en cualquier página admin:

```tsx
import { QrGeneratorModal } from '@/components/admin/QrGeneratorModal';

// En tu componente:
<QrGeneratorModal
  open={modalVisible}
  onCancel={() => setModalVisible(false)}
  onSuccess={recargarDatos}
  endpoint="/api/v1/qr/generate"
  templateEndpoint="/api/v1/qr/template"
  templateFilename="plantilla_qr.xlsx"
  title="Generar QR para Producto"
  initialType="product"
  initialData={{ productId: producto.id }}
/>
```

---

## 📋 Casos de Uso Comunes

### 1. QR para Producto en Mesa / Estantería

```text
Tipo: Producto
productId: "prod-abc123"
Tamaño: 300px
Logo: Logo de la marca (22%)
Nombre: "QR Mesa 5 - Hamburguesa Clásica"
```
→ Escanean y van directo a `/tienda/producto/prod-abc123`

### 2. QR para Catálogo en Vidriera (OmniCatalog)

```text
Tipo: Catálogo Social (OmniCatalog)
catalogSlug: (vacío - usa subdominio del tenant)
Tamaño: 500px
Color QR: #1a5c2e (verde marca)
Nombre: "QR Vidriera - Catálogo Verano"
```
→ Escanean y abren `https://mi-negocio.provecchio.com/social-catalog`

### 3. QR WiFi para Clientes

```text
Tipo: WiFi
SSID: "MiNegocio-Guest"
Password: "cliente2024"
Encriptación: WPA
Nombre: "QR WiFi Recepción"
```
→ Configuran WiFi automáticamente al escanear.

### 4. vCard en Tarjetas Personales

```text
Tipo: vCard
Nombre: "Juan Pérez"
Organización: "Mi Negocio"
Teléfono: "+54 9 11 1234-5678"
Email: "juan@minegocio.com"
Nombre: "vCard Juan Pérez - Ventas"
```
→ Guardan contacto directo en el teléfono.

---

## 🔐 Permisos Requeridos

| Acción | Permiso Requerido | Roles Típicos |
| :--- | :--- | :--- |
| **Generar QR** | `qr:generate` | Admin, Manager, Seller |
| **Ver historial** | `qr:read` | Admin, Manager |
| **Eliminar historial** | `qr:manage` | Admin |

> El admin configura permisos en **Configuración → Usuarios → Permisos**.

---

## 📐 Especificaciones Técnicas

| Característica | Detalle / Implementación |
| :--- | :--- |
| **Librería** | `qrcode` (Node.js) |
| **Formatos de salida** | PNG (`base64` / `blob`), SVG (`string`) |
| **Corrección de error** | Reed-Solomon (`L`=7%, `M`=15%, `Q`=25%, `H`=30%) |
| **Almacenamiento** | Tabla `qr_code_history` (PostgreSQL por tenant) |
| **Multi-tenant** | Aislamiento total por `tenantId` |
| **API** | REST `/api/v1/qr/*` con API Key + JWT |

---

## 🚀 Instalación

### Desde App Store (Admin)

1. Ir a **Configuración → App Store (Módulos)**.
2. Buscar **"Generador de Códigos QR"**.
3. Click en **Instalar**.
4. Asignar permisos `qr:generate` / `qr:read` a los roles correspondientes.

### Desde CLI (Super Admin)

```bash
# Instalar para tenant específico
docker exec orderflow-database-1 psql -U orderflow -d orderflow_db -c "
  INSERT INTO module_installations (id, "tenantId", "moduleId", version, "installedAt", active, config)
  VALUES (gen_random_uuid(), '<TENANT_ID>', 'qr', '1.0.0', NOW(), true, '{}')
  ON CONFLICT ("tenantId", "moduleId") DO UPDATE SET active=true, version='1.0.0'
"
```

---

## 🔧 Configuración Post-Instalación

1. **Asignar permisos** en Configuración → Usuarios → Permisos:
   - `qr:generate` → Admin, Manager, Seller
   - `qr:read` → Admin, Manager
   - `qr:manage` → Admin
2. **Verificar acceso**: Menú lateral → **Catálogo & Canales** → **Generador QR** (`/admin/qr-generator`).

---

## 📚 Documentación Adicional

- **Manual de Usuario**: `/docs/user-manuals/09-manual-generador-qr.md`
- **Documentación Técnica**: `/docs/09-qr-generator.md`
- **API Reference**: Swagger en `/api/docs` → tag `qr`
- **Changelog**: Ver `CHANGELOG.md` entradas `v1.20.13+`

---

## ❓ Preguntas Frecuentes

### **¿Puedo usar mi logo en el centro?**
Sí, subí una imagen (PNG/JPG/WebP) usando el botón **"Galería de imágenes"** o **"Subir logo"**. Se recomienda PNG con fondo transparente. Máximo 22% del tamaño del QR.

### **¿Qué pasa si el QR no se escanea?**
- Verificá que el **contraste** sea suficiente (QR oscuro sobre fondo claro).
- Aumentá la **corrección de error** a **H** (30%).
- Reducí el **tamaño del logo** (máx 22%).
- Asegurá **margen** activado.

### **¿Los QRs expiran?**
No, los QRs generados son **estáticos** (codifican la URL/dato directamente). Si cambias la URL de destino, debés regenerar el QR.

### **¿Puedo generar QRs masivos?**
Actualmente solo uno a uno via UI. Para masivo, usá la API directamente con un script.

### **¿Dónde se guardan los QRs del historial?**
En la tabla `qr_code_history` de tu tenant (base de datos PostgreSQL). Solo usuarios de tu tenant los ven.

### **¿Para Catálogo (OmniCatalog) necesito poner el slug?**
**No**. El QR para Catálogo Social usa automáticamente el **subdominio del tenant** (ej: `https://mi-negocio.provecchio.com/social-catalog`). Si el tenant no tiene subdominio configurado, usa la URL base `/social-catalog`. El campo `catalogSlug` es opcional y solo se usa en casos muy específicos con dominios personalizados.

---

## 🆘 Soporte

- **Documentación técnica**: `/docs/09-qr-generator.md`
- **API Reference**: Swagger en `/api/docs` → tag `qr`
- **Issues**: Reportar en GitLab/GitHub del proyecto

---

## 📝 Changelog

| Versión | Fecha | Cambios Principales |
| :---: | :---: | :--- |
| **1.1** | 2026-08-19 | **FEAT-075 v1.1**: Selector de sección en modal (OmniCatalog/OmniBio/Producto/URL), botón Galería en logo, ImagePicker con vista previa ampliada (doble-click + zoom), botones contextuales en OmniCatalog/OmniBio/Products, TemplateVariablePicker en OmniCatalog config, CATALOG usa subdominio del tenant (sin catalogSlug requerido). |
| **1.0** | 2026-08-19 | **Lanzamiento inicial (FEAT-075)**: 8 tipos de QR, personalización completa, historial, RBAC. |

---

> **Nota**: Este manual cubre la versión 1.20.15+. Para versiones anteriores, algunas funcionalidades pueden no estar disponibles (selector de sección, galería con vista previa, botones contextuales en módulos).
