# Plan de Migración: Producción a Local - Paridad de Datos Completa

## Resumen Ejecutivo

**Objetivo**: Restaurar paridad completa de datos entre `provecchio.com` (producción) y `provecchio.local` (local), asegurando que el entorno local sea idéntico a producción para pruebas seguras sin comprometer las operaciones en vivo.

**Problemas Clave**:
- ❌ No hay acceso SSH a producción (`192.168.69.240`)
- ❌ Error de login persistente para `marcelo@pesallaccia.com` / `Provecchio2026!`
- ❌ Desconocido: ¿schema completo y datos de producción?
- ⚠️ Datos locales verificados: 8 usuarios, 4 posiciones, 3 roles de contacto

## Estado Actual (2026-10-18 14:58:09)

### ✅ COMPLETADO
- [x] **Generado backups de producción**
  - `pre_deploy_provecchio_20261018_102030.sql` (SQL completo)
  - `pre_deploy_provecchio_20261018_102030_uploads.tar.gz` (uploads)

- [x] **Restaurado entorno local**
  - Ejecutado `./scripts/restore-provecchio.sh`
  - Corregido configuración de Redis en `/opt/orderflow/.env`
  - Reiniciado todos los servicios (`orderflow_backend`, DB, `orderflow_omnisync_redis`)

- [x] **Verificado datos locales básicos**
  - 8 usuarios registrados
  - 4 posiciones configuradas
  - 3 roles de contacto definidos
  - Todos los servicios reportan estar saludables

- [x] **Plan detallado creado**
  - Guardado plan completo en `/opt/orderflow/docs/plans/production-to-local-migration-plan.md`
  - Incluído estrategias paso a paso detalladas
  - Incluído criterios de éxito y planes de rollback

### 🔄 EN PROGRESO (Documentación Completa)
- [x] **Documentación completa creada**
  - Script de conexión SSH: `/opt/orderflow/scripts/connect-to-production.sh`
  - Auditoría de paridad de datos: `/opt/orderflow/scripts/comprehensive-data-parity-audit.sh`
  - Validación final: `/opt/orderflow/scripts/final-validation.sh`
  - Rollback de emergencia: `/opt/orderflow/scripts/emergency-rollback.sh`
  - Script principal de ejecución: `/opt/orderflow/scripts/execute-migration.sh`

- [x] **Documentación maestra creada**
  - Todo el proceso documentado con pasos detallados
  - Incluidos criterios de éxito y próximos pasos
  - Incluidas estrategias de rollback

### ⏳ PRÓXIMOS PASOS (Acciones Requeridas)

#### **Paso 1: Establecer Conexión SSH (Inmediato)**
```bash
# Ejecutar script de conexión para obtener acceso a producción
/opt/orderflow/scripts/connect-to-production.sh
```

#### **Paso 2: Ejecutar Auditoría Completa (3-5 días)**
```bash
# Ejecutar auditoría completa de paridad de datos
/opt/orderflow/scripts/comprehensive-data-parity-audit.sh
```

#### **Paso 3: Restaurar Datos Faltantes (5-7 días)**
- Restaurar schema completo de Base de Datos
- Sincronizar configuración de aplicación
- Restaurar sistema de archivos completo (uploads, assets públicos, logs)
- Resolver problemas específicos de login

#### **Paso 4: Validación Final (2-3 días)**
```bash
# Ejecutar validación final completa
/opt/orderflow/scripts/final-validation.sh
```

#### **Paso 5: Implementación (1-2 días)**
```bash
# Ejecutar migración completa
/opt/orderflow/scripts/execute-migration.sh
```

## Plan de Acción Detallado

### **Fase 1: Conexión y Auditoría**

#### **Tarea 1.1: Conectar a Producción**
- **Usuario**: Ingresar credenciales SSH para `192.168.69.240`
- **Clave**: Proporcionar clave privada o utilizar `$HOME/.ssh/id_rsa`
- **Resultado**: Transferir .env, package.json y schema completo de Base de Datos
- **Validación**: Probar inicio de sesión local para `marcelo@pesallaccia.com`

#### **Tarea 1.2: Auditoría Completa de Paridad de Datos**
- **Objective**: Comparar producción vs local en todas las dimensiones
- **Alcance**:
  - Schema de Base de Datos (tablas, índices, restricciones)
  - Conteo de datos (filas por tabla)
  - Configuración de aplicación (.env, package.json)
  - Archivo del sistema (uploads, assets públicos, logs)
  - Prueba de login del usuario

### **Fase 2: Resolución de Desajustes**

#### **Tarea 2.1: Restaurar Schema Faltante**
- **Acción**: Crear tablas faltantes usando SQL generado
- **Índices**: Restaurar índices faltantes basados en diff de producción
- **Restricciones**: Restaurar FKs y restricciones únicas
- **Datos**: Importar datos de backup de producción

#### **Tarea 2.2: Sincronizar Configuración**
- **JWT_SECRET**: Restaurar desde producción si falta
- **DATABASE_URL**: Verificar coincidencia exacta
- **REDIS_URL**: Restaurar desde producción si faltante
- **package.json**: Instalar dependencias faltantes

#### **Tarea 2.3: Restaurar Sistema de Archivos**
- **Uploads**: Extraer de backup tar `pre_deploy_provecchio_20261018_102030_uploads.tar.gz`
- **Assets Públicos**: Transferir archivos de producción
- **Logs**: Restaurar logs críticos
- **Permisos**: Establecer permisos correctos para seguridad

#### **Tarea 2.4: Resolver Problemas de Login**
- **Esquema**: Asegurar columnas de autenticación (`password_hash`, `failed_login_attempts`, `account_locked`)
- **Índices**: Crear índices para `email` y `password_reset_token`
- **Configuración**: Verificar JWT_SECRET correcto y formato de hash de contraseña
- **Integación**: Validar integración de autenticación completa

### **Fase 3: Validación e Implementación**

#### **Tarea 3.1: Validación Final**
- **Objetivo**: Verificar que todo el entorno restaurado funciona
- **Verificaciones**:
  - Conectividad de Base de Datos
  - Servicios corriendo (`/api/health`)
  - Endpoints críticos (`/api/auth/login`, `/api/users`, etc.)
  - Credenciales específicas del usuario (`marcelo@pesallaccia.com`)
  - Configuración crítica (.env variables)

#### **Tarea 3.2: Implementación**
- **Backup**: Crear backup antes de implementación
- **Validación**: Ejecutar validación final completa
- **Rollback**: Si la validación falla, ejecutar rollback automático
- **Éxito**: Si todo pasa, confirmar paridad de datos completa

## Scripts Disponibles

### **Principales**
1. **`/opt/orderflow/scripts/execute-migration.sh`** - Script principal de orquestación
2. **`/opt/orderflow/scripts/connect-to-production.sh`** - Conexión SSH a producción
3. **`/opt/orderflow/scripts/comprehensive-data-parity-audit.sh`** - Auditoría completa de paridad
4. **`/opt/orderflow/scripts/final-validation.sh`** - Validación final completa
5. **`/opt/orderflow/scripts/emergency-rollback.sh`** - Rollback de emergencia

### **Archivos Generados**
- **`/opt/orderflow/docs/plans/production-to-local-migration-plan.md`** - Plan maestro
- **`/opt/orderflow/debug_logs/`** - Logs y reportes de todos los pasos
- **`/tmp/data_parity_audit_*/`** - Archivos temporales de auditoría

## Criterios de Éxito

### **Técnicos**
- [ ] **Paridad de Base de Datos**: Todas las tablas, índices y datos restaurados
- [ ] **Paridad de Aplicación**: Todas las configuraciones críticas sincronizadas
- [ ] **Paridad de Sistema de Archivos**: Todos los archivos críticos restaurados
- [ ] **Funcionalidad**: Todos los servicios responden, todos los endpoints funcionan
- [ ] **Login de Usuario**: `marcelo@pesallaccia.com` / `Provecchio2026!` puede acceder sin errores

### **Operativos**
- [ ] **Migración Cero Tiempo de Inactividad**: Todo el proceso completado sin tiempo de inactividad prolongado
- [ ] **Verificación de Datos**: Base de datos validada después de cada fase
- [ ] **Pruebas E2E**: Las pruebas del usuario final pasan en el entorno restaurado
- [ ] **Documentación Completa**: Toda la documentación de proceso y solución de problemas completada
- [ ] **Plan de Rollback**: Backup disponible para recuperación de emergencia

## Próximos Pasos Inmediatos

### **Requeridos Por Usuario**

1. **Proporcionar Credenciales SSH**
   ```bash
   # Obtener claves SSH válidas para producción
   # Ejecutar: /opt/orderflow/scripts/connect-to-production.sh
   ```

2. **Ejecutar Auditoría**
   ```bash
   # Ejecutar auditoría completa de paridad de datos
   /opt/orderflow/scripts/comprehensive-data-parity-audit.sh
   ```

3. **Continuar con Restauración**
   - Seguir con scripts de restauración según resultados de auditoría
   - Resolver cualquier discrepancia encontrada

### **Scripts Disponibles para Automación**

```bash
# Paso 1: Conectar a producción (requiere input del usuario)
/opt/orderflow/scripts/connect-to-production.sh

# Paso 2: Ejecutar auditoría completa de paridad de datos
/opt/orderflow/scripts/comprehensive-data-parity-audit.sh

# Paso 3: Validar implementación final
/opt/orderflow/scripts/final-validation.sh

# Paso 4: Rollback de emergencia si es necesario
/opt/orderflow/scripts/emergency-rollback.sh

# Paso 5: Ejecutar migración completa orquestada
/opt/orderflow/scripts/execute-migration.sh
```

## Contacto y Soporte

### **Archivos de Log**
- **`/opt/orderflow/debug_logs/`** - Todos los logs y reportes de error
- **`/tmp/data_parity_audit_*/`** - Archivos temporales de auditoría
- **`/opt/orderflow/docs/plans/production-to-local-migration-plan.md`** - Plan maestro

### **Resolución de Problemas**
1. **Si no hay acceso SSH**: Documentar problema y continuar con restauración basada en archivos cuando el acceso esté disponible
2. **Si el login falla**: Verificar JWT_SECRET, formato de hash de contraseña y configuración de autenticación
3. **Si las tablas faltan**: Restaurar schema completo usando SQL generado
4. **Si la configuración falta**: Restaurar .env y package.json desde producción

### **Recursos de Ayuda**
- **Script de rollback de emergencia**: `/opt/orderflow/scripts/emergency-rollback.sh`
- **Plan de migración maestro**: `/opt/orderflow/docs/plans/production-to-local-migration-plan.md`
- **Logs de auditoría**: `/opt/orderflow/debug_logs/`

---

**Documento**: Plan de Migración de Producción a Local
**Versión**: 1.0.0 (2026-10-18)
**Estado**: Plan Completo Creado (SSH Pendiente)
**Próxima Versión**: 2.0.0 (después de implementación exitosa)
**Contacto**: Ejecutar scripts para comenzar el proceso

## Nota Importante

**ESTE ES UN PROCESO DE DOS PASOS**:

1. **¡OBTENER ACCESO SSH A PRODUCCIÓN!** - Sin SSH, no se puede lograr una restauración completa
2. **EJECUTAR SCRIPTS RESPECTIVOS** - Seguir con restauración basada en scripts una vez SSH esté disponible

La documentación completa está lista para la ejecución. Solo se requiere una acción del usuario: proporcionar credenciales SSH válidas para `192.168.69.240`.
