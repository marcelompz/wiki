# Documentación Técnica y Operativa — QMSS Suite

Bienvenido al repositorio central de documentación del **Sistema de Gestión de la Calidad ISO 9001:2015 y Control de Operaciones Industriales (QMSS)**.

---

## 📁 Estructura del Directorio

```text
docs/
├── README.md                                  # Índice general de documentación
├── manuales/                                  # Manuales operativos de usuario por módulo
│   ├── 01_manual_usuario_lista_maestra_iso9001.md
│   ├── 02_manual_kiosco_pwa_planta.md
│   ├── 03_manual_inspector_movil_expo.md
│   ├── 04_manual_terminal_fija_tauri_rust.md
│   ├── 05_manual_recetario_escalado_mermas.md
│   ├── 06_manual_respaldos_google_drive.md
│   └── 07_manual_generador_bpmn_ia.md         # Generador IA de diagramas BPMN 2.0 ISO 9001 §7.5
└── troubleshooting/                           # Guías de diagnóstico y resolución de incidentes
    ├── 01_troubleshooting_hardware_perifericos.md
    ├── 02_troubleshooting_google_drive_oauth.md
    ├── 03_troubleshooting_offline_pwa_sync.md
    ├── 04_troubleshooting_firmas_raci.md
    └── 05_troubleshooting_bpmn_ia.md          # Diagnóstico del módulo BPMN + IA
```

---

## 🎯 Guía Rápida por Perfil de Usuario

| Rol / Cargo | Documentación Recomendada | Enlace Directo |
| :--- | :--- | :--- |
| **Gerente / Jefe de Calidad** | Control documental §7.5, firmas electrónicas y respaldos remotos | [Manual Lista Maestra](./manuales/01_manual_usuario_lista_maestra_iso9001.md) |
| **Operador de Línea / Maquinista** | Registro de checklists en pantalla táctil, cambio de turno con PIN | [Manual Kiosco PWA](./manuales/02_manual_kiosco_pwa_planta.md) |
| **Auditor Interno / Inspector de Calidad** | Escaneo QR en planta, toma de fotos y geolocalización satelital | [Manual Inspector Móvil](./manuales/03_manual_inspector_movil_expo.md) |
| **Operador de Pesaje y Despacho** | Balanza RS-232 continua, tara a cero e impresión de etiquetas ZPL | [Manual Terminal Fija](./manuales/04_manual_terminal_fija_tauri_rust.md) |
| **Ingeniero de Procesos / Cocina Industrial** | Escalado de lote, cálculo de merma y monitoreo de PCC | [Manual Recetario](./manuales/05_manual_recetario_escalado_mermas.md) |
| **Soporte TI / Administrador de Sistemas** | Diagnóstico de periféricos, sincronización offline y OAuth Drive | [Guía de Troubleshooting](./troubleshooting/01_troubleshooting_hardware_perifericos.md) |
| **Gerente de Calidad / Procesos** | Generación de flujogramas BPMN 2.0 con IA, aprobación con PIN y trazabilidad ISO 9001 §7.5 | [Manual Generador BPMN](./manuales/07_manual_generador_bpmn_ia.md) |

---

## 🆕 Novedades destacadas

- **Generador IA de diagramas BPMN 2.0** con soporte multi-proveedor: Gemini, OpenAI y Ollama local.
- **Editor BPMN visual** con zoom, importación/exportación SVG/PNG/PDF y drag & drop.
- **Configuración de IA** integrada en el panel de administración, sin variables de entorno hardcodeadas.
- **Sincronización Local-First** de diagramas BPMN mediante PouchDB/CouchDB.
- **Historial de cambios** de diagramas con trazabilidad por versión y rollback.
- **Pruebas unitarias** automatizadas para validadores BPMN, factory de IA y settings.
