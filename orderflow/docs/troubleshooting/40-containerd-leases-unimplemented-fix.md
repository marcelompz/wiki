# 🛠️ Troubleshooting #40: Error `Unimplemented: unknown service containerd.services.leases.v1.Leases` en Docker

**Área:** DevOps / Docker / containerd  
**Fecha:** 2026-08-19  
**Severidad:** Alta (Impide crear o arrancar nuevos contenedores vía Docker API / Docker CLI)  
**Estado:** 🛠️ **DOCUMENTADO / SOLUCIÓN EN HOST PASO A PASO**

---

## 1. Síntoma Principal

Al intentar iniciar, crear o recrear contenedores (`docker run` o `docker compose up -d`), Docker falla con el siguiente error del demonio:

```text
Error response from daemon: Unimplemented: unknown service containerd.services.leases.v1.Leases
failed to start containers: <nombre_contenedor>
```

---

## 2. Causa Raíz

En versiones recientes de Docker (`dockerd` 25/26+) integradas con `containerd.sock`, el demonio utiliza la característica experimental o por defecto `containerd-snapshotter`. Si el proceso `containerd` de Linux se reinicia o se actualiza mientras `dockerd` sigue apuntando a sockets de *leases* obsoletos, la API gRPC de `containerd` rechaza las llamadas de creación de *leases* de almacenamiento/capas.

---

## 3. Solución Paso a Paso en el Servidor (Host)

Para solucionar permanentemente este desacople entre `dockerd` y `containerd`, ejecuta los siguientes comandos en la terminal de tu máquina:

### Paso 1: Reiniciar `containerd` y `docker` en orden
```bash
sudo systemctl restart containerd
sudo systemctl restart docker
```

### Paso 2 (Opcional, si persiste la desincronización): Desactivar containerd-snapshotter en `/etc/docker/daemon.json`
Si el error persiste tras reiniciar los servicios, desactiva el snapshotter de containerd creando/editando `/etc/docker/daemon.json`:

```json
{
  "features": {
    "containerd-snapshotter": false
  }
}
```

Luego reinicia Docker:
```bash
sudo systemctl restart docker
```

---

## 4. Despliegue Automatizado Post-Fix

Una vez ejecutados los pasos anteriores en tu terminal host, ejecuta el despliegue limpio de la suite:

```bash
cd /opt/orderflow
docker compose up -d --build --remove-orphans
docker compose -f docker-compose.standalone.yml up -d --build --remove-orphans
```

---

**Firma:** OrderFlow Harness Engineering Team  
**Archivo:** `docs/troubleshooting/40-containerd-leases-unimplemented-fix.md`
