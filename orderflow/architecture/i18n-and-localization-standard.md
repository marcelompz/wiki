# 🌐 Estándar de Internacionalización (i18n) y Selección de Idioma

> **Estado:** Estándar Oficial OmniFlow / OrderFlow  
> **Área:** Frontend & Backend Architecture  
> **Fecha:** 2026-08-21  

---

## 🎯 1. Propósito

Este documento establece las directrices para el soporte multi-idioma (i18n) y la localización (l10n) en **OmniFlow**, asegurando que tanto las aplicaciones web/móviles como los servicios backend atiendan adecuadamente a usuarios de diferentes idiomas (Español, Inglés, Portugués).

---

## 🏗️ 2. Arquitectura Frontend (React + Vite / Expo)

### 2.1 Motor de Traducción
El frontend utiliza `i18next` integrado con `react-i18next`.

- **Archivo de Configuración Central:** [`frontend/src/i18n.ts`](file:///opt/orderflow/frontend/src/i18n.ts)
- **Idiomas Soportados:**
  - 🇪🇸 **Español (`es`)** — Idioma predeterminado (fallback).
  - 🇺🇸 **Inglés (`en`)**
  - 🇧🇷 **Portugués (`pt`)**

### 2.2 Persistencia y Selección de Idioma
1. **Local (Navegador):** `localStorage.getItem('i18nextLng')` almacena el idioma seleccionado manualmente por el usuario en la interfaz.
2. **Preferencia en Servidor:** Al iniciar sesión, la preferencia guardada en el perfil del usuario (`user.preferredLanguage`) toma prioridad y actualiza `i18n.changeLanguage(...)`.

### 2.3 Uso en Componentes
Para traducir textos en componentes React, se utiliza el hook `useTranslation`:

```tsx
import { useTranslation } from 'react-i18next';

export const HeaderComponent = () => {
  const { t, i18n } = useTranslation();

  const changeLang = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div>
      <h1>{t('dashboard')}</h1>
      <button onClick={() => changeLang('en')}>{t('english')}</button>
    </div>
  );
};
```

---

## ⚙️ 3. Persistencia de Idioma en Backend

En el backend NestJS:
- El modelo `User` en Prisma contempla el atributo `preferredLanguage` (`'es' | 'en' | 'pt'`).
- Las peticiones HTTP pueden incluir el cabezal estándar `Accept-Language: es` o `Accept-Language: en` para formatear respuestas de error o notificaciones omnicanal (WhatsApp/Email).

---

## 📜 4. Matriz de Idiomas y Recursos

| Clave i18n | Español (`es`) | Inglés (`en`) | Portugués (`pt`) |
| :--- | :--- | :--- | :--- |
| `dashboard` | Dashboard General | General Dashboard | Painel Geral |
| `sales` | Ventas Totales | Total Revenue | Vendas Totais |
| `selectLanguage` | Idioma | Language | Idioma |
| `spanish` | Español 🇪🇸 | Spanish 🇪🇸 | Espanhol 🇪🇸 |
| `english` | Inglés 🇺🇸 | English 🇺🇸 | Inglês 🇺🇸 |
| `portuguese` | Portugués 🇧🇷 | Portuguese 🇧🇷 | Português 🇧🇷 |
