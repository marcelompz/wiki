# 🛠️ Troubleshooting 56 — Error `no space left on device` durante Docker Build / Deploy

> **Área:** DevOps / Docker / BuildKit / containerd  
> **Síntoma:** Error `failed to solve: ... no space left on device` en la capa de exportación o snapshotter de containerd al ejecutar `deploy-production.sh`  
> **Estado:** ✅ Resuelto / Procedimiento de Limpieza  
> **Fecha:** 24 de Agosto de 2026  

---

## 1. Síntomas

Durante la compilación de imágenes de Docker (`docker build` / `docker compose build`) en el servidor o máquina local, el proceso se interrumpe con el siguiente mensaje de error:

```text
ERROR: failed to extract layer sha256:... write /var/lib/containerd/...: no space left on device
ERROR: failed to prepare snapshot dir: failed to create temp dir: mkdir /var/lib/containerd/...: no space left on device
```

---

## 2. Causa Raíz

El directorio `/var/lib/docker` o `/var/lib/containerd` ha alcanzado el 100% de la capacidad de almacenamiento disponible en la partición debido a la acumulación de:
1. Caché de compilación antigua de BuildKit (`docker builder`).
2. Imágenes huérfanas o dangling (etiquetadas como `<none>`).
3. Volúmenes o contenedores detenidos de builds previos.

---

## 3. Solución Aplicada

Ejecutar la secuencia de limpieza de almacenamiento de Docker en el servidor o equipo donde se ejecuta la compilación:

### Paso 1: Liberar Caché de Compilación y Volúmenes sin Uso
```bash
docker system prune -af --volumes
docker builder prune -af
```

### Paso 2: Verificar Espacio Libre en Disco
```bash
df -h /var/lib/docker
```

### Paso 3: Re-ejecutar el Despliegue
```bash
./scripts/deploy-production.sh production
# O para Provecchio:
./scripts/deploy-production.sh provecchio
```
