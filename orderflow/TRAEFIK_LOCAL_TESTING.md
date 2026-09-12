# 🚦 Pruebas Locales con Traefik y Dominios `.local`

Documentación de referencia para configurar, ejecutar y probar el stack de **Orderflow** y servicios del ecosistema localmente utilizando Traefik Reverse Proxy y certificados SSL/TLS con dominios `.local`.

---

## 🏗️ Arquitectura de Traefik Local

En el entorno de desarrollo local, Traefik opera en el puerto `80` (HTTP) y `443` (HTTPS) a través del contenedor centralizado en `/opt/traefik-orderflow`.

```
                    ┌───────────────────────────┐
                    │      Traefik Proxy        │
                    │   (/opt/traefik-orderflow)│
                    └─────────────┬─────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│ orderflow.local │      │sitesinspect.local│     │  omnisites.local │
│   frontend:80   │      │ host.docker:3000│      │  omnisites:3030  │
└─────────────────┘      └─────────────────┘      └──────────────────┘
```

---

## 🛠️ Requisitos Previos

1. **Entradas en `/etc/hosts`**:
   Asegúrate de agregar la resolución local en tu archivo `/etc/hosts`:
   ```etc
   127.0.0.1 orderflow.local api.orderflow.local sitesinspect.local omnisites.local omnibi.local
   ```

2. **Traefik Local Activo**:
   Levantar la instancia principal de Traefik:
   ```bash
   cd /opt/traefik-orderflow
   docker compose up -d
   ```

---

## 🏃 Cómo Levantar Servicios con Traefik Local

### Orderflow Core
Para incluir los labels locales de Traefik en Orderflow:
```bash
cd /opt/orderflow
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d
```

### SitesInspect App
Para que SitesInspect responda a través de Traefik con el dominio `sitesinspect.local`, asegúrate de incluir `server: { allowedHosts: true }` en su `vite.config.ts`:
```bash
cd /home/marcelompz/sitesinspect
npm run dev
```

---

## 🌐 Dominios y Enrutamiento Registrado

| Servicio | Dominio Local | Protocolo | SSL / TLS | Destino |
| :--- | :--- | :--- | :--- | :--- |
| **Orderflow UI** | `https://orderflow.local` | HTTP / HTTPS | SSL Autofirmado (`tls: {}`) | `frontend:80` |
| **Orderflow Tenants** | `https://*.orderflow.local` | HTTP / HTTPS | SSL Autofirmado (`tls: {}`) | `frontend:80` |
| **Orderflow API** | `https://api.orderflow.local` | HTTP / HTTPS | SSL Autofirmado (`tls: {}`) | `backend:3010` |
| **SitesInspect** | `https://sitesinspect.local` | HTTP / HTTPS | SSL Autofirmado (`tls: {}`) | `host.docker.internal:3000` |
| **Omnisites** | `https://omnisites.local` | HTTP / HTTPS | SSL Autofirmado (`tls: {}`) | `orderflow_omnisites_standalone:3030` |
| **OmniBI API** | `https://omnibi.local` | HTTP / HTTPS | SSL Autofirmado (`tls: {}`) | `orderflow_omnibi_standalone:3028` |

---

## 🔐 Certificados SSL Autofirmados

Los dominios `.local` utilizan la emisión de certificados autofirmados automáticos de Traefik (`TRAEFIK DEFAULT CERT`). En la primera navegación, acepta la excepción de seguridad en tu navegador. Esto no interfiere ni sobreescribe los certificados reales de Let's Encrypt usados en servidores de producción.
