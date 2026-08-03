# SLA — Acuerdo de Nivel de Servicio

**Versión:** v1.10.0  
**Vigencia:** A partir del deploy de v1.10.0  
**Aplica a:** Planes Startup, Professional, Enterprise

---

## 1. Definiciones

- **Disponibilidad:** Porcentaje de tiempo en que el servicio está operativo y accesible.
- **Tiempo de Respuesta Inicial (TRI):** Tiempo máximo para acusar recibo de una incidencia.
- **Tiempo de Resolución (TR):** Tiempo máximo para resolver una incidencia.
- **Incidencia Crítica:** Fallo que impide completamente la operación del negocio (checkout caído, sistema inaccesible, pérdida de datos).
- **Incidencia Alta:** Fallo que afecta funcionalidades críticas con workaround disponible.
- **Incidencia Media/Baja:** Consultas, mejoras o fallos menores.

---

## 2. SLA por Plan

| Métrica | Startup | Professional | Enterprise |
|---------|---------|--------------|------------|
| **Disponibilidad** | 99.0% | 99.5% | 99.9% |
| **TRI (Crítico)** | 8 horas | 4 horas | 1 hora |
| **TR (Crítico)** | 48 horas | 24 horas | 8 horas |
| **TR (Alta)** | 5 días hábiles | 3 días hábiles | 1 día hábil |
| **TR (Media/Baja)** | 10 días hábiles | 5 días hábiles | 3 días hábiles |
| **Soporte** | Email | Email + Chat | Email + Chat + Teléfono |
| **Horario** | L-V 9-18hs | L-V 9-20hs | 24/7 |
| **Backup incluido** | No | Sí (7 días) | Sí (30 días) |

### Exclusiones

- Mantenimiento programado con 48h de antelación
- Incidentes causados por acciones del cliente o terceros
- Problemas derivados de modificaciones no autorizadas al código
- Fuerza mayor (desastres naturales, caída de proveedor de cloud)

---

## 3. Cálculo de Disponibilidad

```
Disponibilidad = (Tiempo total - Tiempo de inactividad no planificada) / Tiempo total × 100
```

**Ventanas de mantenimiento:**

- Startup/Professional: Domingos 02:00-04:00 ART
- Enterprise: Según acuerdo específico

---

## 4. Proceso de Soporte

### 4.1 Apertura de Ticket

1. Cliente abre ticket en soporte@orderflow.dev o portal de soporte.
2. Sistema asigna número de ticket y categoría automáticamente.
3. Support Lead asigna a Support Engineer según severidad.

### 4.2 Clasificación de Severidad

| Severidad | Criterio | Tiempo de Escalación |
|-----------|----------|----------------------|
| **P1 — Crítico** | Sistema caído, datos perdidos | 15 minutos |
| **P2 — Alta** | Funcionalidad rota, workaround complejo | 1 hora |
| **P3 — Media** | Bug menor, consulta técnica | 4 horas |
| **P4 — Baja** | Mejora, pregunta general | 1 día hábil |

### 4.3 Comunicación

- **Startup:** Email únicamente
- **Professional:** Email + chat (Slack/Telegram)
- **Enterprise:** Email + chat + llamada telefónica

Actualizaciones de estado cada 4 horas para P1, cada 8 horas para P2.

---

## 5. Créditos por Incumplimiento

Si OrderFlow no cumple con el SLA acordado, el cliente recibe créditos:

| Plan | Crédito por incumplimiento de disponibilidad |
|------|----------------------------------------------|
| **Startup** | 10% de la factura mensual |
| **Professional** | 20% de la factura mensual |
| **Enterprise** | 30% de la factura mensual + revisión trimestral del SLA |

Los créditos se solicitan por ticket dentro de los 30 días posteriores al incidente.

---

## 6. Equipo de Soporte

| Rol | Cantidad | Cobertura |
|-----|----------|-----------|
| Support Lead | 1 | L-V horario comercial |
| Support Engineer L1/L2 | 2 | L-V horario comercial (escalonado) |

**On-call rotation:** Para planes Enterprise, se define un rotation on-call para cobertura 24/7.

---

## 7. Métricas y Reportes

- **Reporte mensual de disponibilidad:** enviado a todos los clientes activos.
- **Dashboard público:** `https://status.orderflow.dev` (Uptime Kuma o similar).
- **Incidentes postmortem:** documentados en `/opt/wiki/orderflow/historico/` para planes Enterprise.

---

## 8. Contacto

- **Soporte general:** soporte@orderflow.dev
- **Emergencias Enterprise:** +55 9 XXXX-XXXX (línea directa)
- **Status page:** https://status.orderflow.dev
- **Email de SLA:** sla@orderflow.dev
