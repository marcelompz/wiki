# 🚦 Pruebas Locales con Traefik y Dominios `.local` en Orderflow

Este documento explica cómo levantar y probar el stack de **Orderflow** localmente utilizando Traefik Reverse Proxy y HTTPS con dominios `.local`.

---

## 🛠️ Requisitos Previos

1. Tener la instancia de Traefik local ejecutándose desde `/opt/traefik-orderflow`:
   ```bash
   cd /opt/traefik-orderflow
   docker compose up -d
   ```
2. Tener configuradas las entradas en `/etc/hosts` de tu equipo:
   ```etc
   127.0.0.1 orderflow.local api.orderflow.local tenant1.orderflow.local
   ```

---

## 🏃 Cómo Ejecutar Orderflow con Traefik Local

Para incluir la configuración local de Traefik al levantar Orderflow con Docker Compose:

```bash
cd /opt/orderflow
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d
```

---

## 🌐 Dominios y Enrutamiento Disponible

| Servicio | Dominio Local | Protocolos | Destino Interno |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | `https://orderflow.local` | HTTP & HTTPS (SSL Autofirmado) | `frontend:80` |
| **Tenants Subdominios** | `https://<subdominio>.orderflow.local` | HTTP & HTTPS (SSL Autofirmado) | `frontend:80` |
| **Backend API** | `https://api.orderflow.local` | HTTP & HTTPS (SSL Autofirmado) | `backend:3010` |

---

## 🔍 Notas para Desarrolladores

- **Certificado SSL**: Al navegar a `https://orderflow.local` por primera vez, el navegador solicitará aceptar la advertencia del certificado autofirmado predeterminado de Traefik (`TRAEFIK DEFAULT CERT`).
- **Coexistencia**: Esta configuración no afecta los despliegues de producción (`pesallaccia.com`), ya que los labels locales están aislados en el archivo `docker-compose.traefik.yml`.
