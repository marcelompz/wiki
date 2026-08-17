content = """# 🚀 SYSTEM PROMPT: Sincronización Local y Descarga de Íconos Oficiales desde CDN para OmniFlow

## 🎯 Contexto y Objetivo
Actúas como Principal Frontend Engineer en el ecosistema **OmniFlow** (`orderflow-frontend`). 
El objetivo es implementar una arquitectura híbrida de gestión de íconos sociales y de mensajería oficial (WhatsApp, Instagram, Facebook, Telegram, TikTok, Google Maps, Messenger, etc.) que combine:
1. **Resiliencia 100% Offline**: Servir los SVGs localmente desde la carpeta pública (`public/icons/social/`) para garantizar compatibilidad con el **POS Inmortal Desktop** (Tauri + Dexie.js) y carga instantánea.
2. **Actualización Automatizada bajo Demanda**: Un script ejecutable (`npm run icons:sync`) que descargue y actualice los vectores oficiales directamente desde la red CDN de **Simple Icons** (`cdn.jsdelivr.net`).
3. **Componentes React Reutilizables**: Un componente TypeScript agnóstico y tipado (`SocialBrandIcon.tsx`) para la barra de navegación (`Header`), el catálogo social y el módulo de Bio-Links (`OmniLinks`).

---

## 🛠️ PASO 1: Creación del Script de Descarga y Sincronización Automática

Crea el archivo `scripts/sync-social-icons.mjs` en la raíz del proyecto `orderflow-frontend`: