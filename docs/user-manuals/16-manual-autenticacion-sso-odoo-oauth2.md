# 📘 Manual de Usuario: Autenticación Unificada SSO y Mapeo de Roles Odoo <-> OrderFlow (`FEAT-095`)

> **Módulo:** Autenticación / Odoo OAuth2 SSO  
> **Ubicación del Documento:** `docs/user-manuals/16-manual-autenticacion-sso-odoo-oauth2.md`  
> **Versión de OrderFlow:** v1.20.30+  
> **Versión de Odoo Soportada:** Odoo CE (v14, v18, v19)  
> **Fecha:** 25 de Agosto de 2026

---

## 1. INTRODUCCIÓN Y PROPÓSITO

![Pantalla de Login con Autenticación Unificada Odoo SSO](/home/marcelompz/.gemini/antigravity-cli/brain/81248e19-f485-437b-aa12-83861e977a30/odoo_sso_login_screen_1787705934418.jpg)

Este manual instruye sobre la **Autenticación Unificada (Single Sign-On / SSO)** mediante credenciales o sesiones de **Odoo CE / OAuth2** y el mapeo automático de roles y permisos RBAC en el backend de OrderFlow (`FEAT-095`).

Permite que cajeros, vendedores y administradores ingresen a la suite de OrderFlow utilizando sus mismas credenciales de Odoo, resolviendo automáticamente su contexto de `tenantId` y nivel de acceso.

---

## 2. MAPEO DE ROLES ODOO ➔ ORDERFLOW

| Grupo / Rol en Odoo CE | Rol Asignado en OrderFlow | Permisos en OrderFlow |
| :--- | :---: | :--- |
| `base.group_erp_manager` / Admin | `ADMIN` | Control total del tenant y configuración de sesión |
| `account.group_account_user` / Contable | `MANAGER` | Gestión de catálogo, cierres de caja y clientes |
| `pos.group_pos_user` / Vendedor | `SELLER` | Creación de pedidos POS y venta directa |
| `base.group_portal` / Portal | `VIEWER` | Consulta y lecturas de información |

---

## 3. USO DEL ENDPOINT SSO (`POST /api/v1/auth/odoo-sso`)

### Solicitud de Autenticación:
```json
{
  "tenantId": "provecchio-dimora-001",
  "odooUser": "Juan Cajero",
  "role": "POS_SELLER",
  "email": "cajero@provecchio.odoo.internal"
}
```

### Respuesta con Tokens JWT de OrderFlow:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tenantId": "provecchio-dimora-001",
  "user": {
    "id": "user-sso-101",
    "email": "cajero@provecchio.odoo.internal",
    "name": "Juan Cajero",
    "role": "SELLER"
  },
  "ssoProvider": "ODOO_OAUTH2"
}
```
