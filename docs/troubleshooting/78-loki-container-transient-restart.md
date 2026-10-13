# Troubleshooting #78 — Error Transitorio en Reinicio de Contenedor Loki en Despliegue de Producción

## 📋 Síntoma
Durante el despliegue automático mediante `./scripts/deploy-production.sh production`, `docker compose up -d` falló con el mensaje:
`dependency failed to start: container orderflow-loki exited (1)`

## 🔍 Causa Raíz
Al reiniciar la pila completa de servicios de observabilidad (Promtail, Loki, Grafana, Tempo), Loki intentó adquirir un candado de escritura en la carpeta de chunks/índices cuando el contenedor anterior aún estaba liberando descriptores de archivos, provocando una salida prematura con código de salida 1.

## 🛠️ Solución Aplicada
Se re-ejecutó `./scripts/deploy-production.sh production`, permitiendo que el estado de salud de Docker verifique los contenedores y reinicie la pila de monitoreo una vez liberados los recursos del sistema. Los contenedores Loki, Grafana, Promtail y la suite completa de microservicios iniciaron en estado `Healthy`.
