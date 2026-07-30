# Diferencias entre AXIOS y FETCH

> **Documentación Técnica de Estándares de Cliente HTTP en OrderFlow**  
> **Fecha:** 2026-07-27  

---

## 📌 Decisión de Arquitectura en OrderFlow

En el proyecto **OrderFlow**, el estándar oficial para realizar peticiones HTTP (tanto en el cliente Web React/Refine como en aplicaciones móviles o integraciones) es **AXIOS**.

❌ **NO usar Fetch nativo** en nuevos componentes o servicios salvo casos de extrema excepción debidamente justificados.

---

## 📊 Comparativa General: Axios vs. Fetch

| Característica | `Fetch` (Nativo) | `Axios` (Librería - Usada en OrderFlow) |
| :--- | :--- | :--- |
| **Instalación** | Incluido nativamente en el navegador / Node.js. | Requiere instalación vía npm/yarn (`axios`). |
| **Transformación JSON** | Manual (requiere `.json()`). | Automática (disponible en `response.data`). |
| **Manejo de Errores HTTP** | NO rechaza la promesa en códigos `404` o `500`. | **Sí** rechaza automáticamente promesas para estatus $\ge 400$. |
| **Interceptores** | Sin soporte nativo (requiere wrappers manuales). | Soporte nativo para interceptores de **request** y **response**. |
| **Cancelación** | Vía `AbortController`. | Vía `AbortController` o `CancelToken`. |
| **Timeout** | Requiere `AbortSignal.timeout()`. | Opción `timeout` directa en configuración. |
| **Progreso de Carga** | Complejo / limitado en uploads. | Eventos `onUploadProgress` y `onDownloadProgress` integrados. |

---

## 💡 ¿Por qué usamos Axios en OrderFlow?

1. **Interceptores de Autenticación y Tenant:**
   En OrderFlow, cada petición requiere inyectar headers dinámicos como `Authorization` (JWT), `x-tenant-id` y `x-api-key`. Axios nos permite centralizar esto mediante un `axios.create()` con interceptores globales.
   
2. **Manejo Centralizado de Errores HTTP:**
   Fetch no considera los estados HTTP `401`, `403`, `404` o `500` como errores rechazados de la promesa (`.catch()`), obligando a evaluar `response.ok` manualmente en cada llamada. Axios lanza la excepción automáticamente permitiendo un flujo de control unificado.

3. **Serialización y Deserialización Automática:**
   Evitamos el código boilerplate repetitivo como `await response.json()` en cada consumo de API backend.

---

## 💻 Ejemplos de Código Comparativos

### 1. Petición GET y procesamiento de respuesta

#### ❌ Fetch (No recomendado en OrderFlow):
```typescript
fetch('https://api.orderflow.com/api/v1/products', {
  headers: {
    'x-tenant-id': tenantId,
    'Authorization': `Bearer ${token}`
  }
})
  .then(response => {
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    return response.json();
  })
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### ✅ Axios (Estándar OrderFlow):
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'x-tenant-id': tenantId }
});

api.get('/products')
  .then(response => {
    console.log(response.data); // Data ya deserializada
  })
  .catch(error => {
    console.error('Error HTTP:', error.response?.status, error.response?.data);
  });
```

---

### 2. Configuración de Interceptor Global en Frontend OrderFlow

```typescript
import axios from 'axios';

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['x-tenant-id'] = tenantId;

  return config;
});
```

---

## 🛠️ Reglas de Contribución

- Todo nuevo cliente HTTP en `frontend/`, `mobile/` o servicios integradores debe utilizar el cliente Axios configurado (`api` / `httpClient`).
- No importar ni usar `window.fetch` o `global.fetch` salvo en scripts aislados de test o micro-benchmarks que no dependan del pipeline de autenticación de OrderFlow.
