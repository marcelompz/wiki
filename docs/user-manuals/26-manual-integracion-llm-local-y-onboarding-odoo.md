# 📘 Manual de Usuario: Motor de Integración LLM Local & Onboarding Zero-Touch Odoo (`v1.20.40`)

> **Módulo:** Motor de Integración LLM Local (OmniAI) & Zero-Touch Oboarding Manifest  
> **Ubicación del Documento:** `docs/user-manuals/26-manual-integracion-llm-local-y-onboarding-odoo.md`  
> **Versión de OrderFlow / OmniFlow:** v1.20.40+  
> **Fecha:** 26 de Agosto de 2026

---

## 1. INTRODUCCIÓN Y PROPÓSITO

![OmniAI & Local LLM Integration](/home/marcelompz/.gemini/antigravity-cli/brain/81248e19-f485-437b-aa12-83861e977a30/manual_localllm_onboarding_1787784214616.jpg)

En esta versión **`v1.20.40`**, OmniFlow incorpora dos nuevos componentes de infraestructura:

1. **Motor de Integración con LLM Local (`OmniAI` / `LlmModule`):** Conexión con modelos de Inteligencia Artificial locales (Ollama / vLLM / LocalAI en `ai.provecchio.com` o proxy Traefik SSL) sin enviar datos sensibles a servicios de terceros.
2. **Onboarding Zero-Touch de Tenants Odoo (`tenant_manifest.json`):** Aprovisionamiento en 1-Click de datos de empresa, categorías, depósitos y conexión Odoo a partir de un manifiesto estándar en JSON.

---

## 2. ARQUITECTURA DEL MOTOR DE LLM LOCAL (`LlmModule`)

```mermaid
graph TD
    Client["Cliente / Backend OmniFlow"]
    Traefik["Traefik v3.4 Proxy (ai.provecchio.com)"]
    LlmService["LlmService NestJS (/api/v1/integrations/llm)"]
    LocalLLM["Servidor LLM Local (Ollama / vLLM llama3)"]

    Client -->|1. POST /chat/completions| LlmService
    LlmService -->|2. Chequeo de Salud /api/tags| Traefik
    Traefik -->|3. Forward HTTPS| LocalLLM
    LocalLLM -->>LlmService: 4. Inferencia procesada (JSON)
    LlmService -->>Client: 5. Respuesta estructurada
```

### 🔹 Endpoints de LLM Local:
- **`GET /api/v1/integrations/llm/status`:** Retorna la salud del motor local y el modelo activo.
- **`POST /api/v1/integrations/llm/chat/completions`:** Ejecuta inferencia de lenguaje sobre modelos locales (`llama3`, `mistral`, `gemma`).

---

## 3. ONBOARDING ZERO-TOUCH ODOO (`tenant_manifest.json`)

Permite aprovisionar y vincular un tenant en OmniFlow + Odoo en un solo paso importando un archivo manifest JSON:

```json
{
  "tenantId": "t-provecchio-01",
  "company": {
    "name": "Provecchio S.A.",
    "taxId": "80012345-6",
    "currencySymbol": "PYG",
    "logoUrl": "https://provecchio.com/logo.png"
  },
  "odooDbName": "db_provecchio",
  "odooUrl": "https://odoo.provecchio.com",
  "categories": [
    { "name": "Bebidas" },
    { "name": "Carnes & Parri" }
  ],
  "warehouses": [
    { "name": "Depósito Central", "code": "WH/MAIN" }
  ]
}
```

### 🔹 Endpoint de Onboarding:
- **`POST /api/v1/public/webhooks/odoo/onboard-manifest`:** Procesa el manifest de forma idempotente.
