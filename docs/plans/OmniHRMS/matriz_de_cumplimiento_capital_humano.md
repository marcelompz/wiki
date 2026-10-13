### Matriz de cumplimiento legal y administrativo para un software de Gestión de Capital Humano —asumiendo inicialmente que se comercializará y operará en **Paraguay**— y traducirla en requisitos funcionales, reglas de cálculo, documentos, trazabilidad e integraciones.

Pero hay una precisión importante: ningún software puede prometer “cubrir todas las exigencias” de forma permanente sin un proceso continuo de actualización legal y validación por un abogado laboralista/tributarista local. Las normas, resoluciones, formatos de planillas y parámetros como salario mínimo o aportes pueden cambiar. El enfoque correcto es diseñar un producto **compliance-by-design**: cumplimiento incorporado desde la arquitectura, parametrizable y auditable.

## Alcance legal inicial

Para Paraguay, el núcleo normativo de un sistema de Capital Humano debería contemplar al menos estas capas:

| Área | Norma / autoridad principal | Qué debe resolver el software |
|---|---|---|
| Relación laboral | Código del Trabajo, Ley N.º 213/1993 | Contratos, jornada, horas extra, descansos, vacaciones, permisos, aguinaldo, desvinculaciones y antigüedad. El Código establece, por ejemplo, vacaciones mínimas según antigüedad: 12, 18 o 30 días corridos.  [bacn.gov](https://www.bacn.gov.py/leyes-paraguayas/2608/ley-n-213-establece-el-codigo-del-trabajo) |
| Registro laboral | MTESS — REOP | Gestión de datos requeridos para inscripción obrero-patronal, altas, bajas, movimientos y preparación de planillas laborales. El MTESS exige inscripción patronal, libros/planillas laborales y tramita datos mediante el sistema REOP.  [mtess.gov](https://www.mtess.gov.py/?page_id=2398) |
| Seguridad social | IPS — AOP / REI | Alta de empleador y trabajador, base imponible, liquidación de aportes, novedades y conciliación de aportes. El IPS indica que la remuneración incluye dinero, especies, regalías y trabajo extraordinario; por ello el motor de liquidación no debe limitarse al salario base.  [portal.ips.gov](https://portal.ips.gov.py/sistemas/ipsportal/contenido.php?c=59) |
| Nómina y remuneración | Código del Trabajo, MTESS, IPS | Sueldos, jornales, conceptos remunerativos/no remunerativos, descuentos, recibos, aguinaldo, vacaciones, horas extra y topes o bases configurables. |
| Datos personales | Ley N.º 1.682/2001 | Protección de legajos, documentos personales, datos bancarios, médicos, biometría y evaluaciones. La ley restringe la difusión de datos sensibles de personas identificadas o identificables.  [bacn.gov](https://www.bacn.gov.py/leyes-paraguayas/1760/ley-n-1682-reglamenta-la-informacion-de-caracter-privado) |
| SST | Decreto N.º 14.390/1992 y resoluciones MTESS | Seguridad, higiene y medicina laboral: incidentes, capacitaciones, evaluaciones, exámenes médicos y evidencias preventivas. El reglamento se aplica obligatoriamente a los centros de trabajo del país.  [mtess.gov](https://mtess.gov.py/wp-content/uploads/2025/09/Resolucion-MTESS-N%C2%B0-904-Manual-de-Insalubridad-o-Peligrosidad-en-el-trabajo.pdf) |
| Teletrabajo | Ley N.º 6.738 | Modalidad remota, acuerdos específicos, lugar de prestación, control tecnológico, jornada y evidencias de cumplimiento. La ley regula el trabajo a distancia realizado mediante TIC —Tecnologías de la Información y Comunicación— bajo medios de control y supervisión tecnológicos.  [bacn.gov](https://www.bacn.gov.py/leyes-paraguayas/9582/ley-n-6738-establece-la-modalidad-del-) |
| Tributación | DNIT / Marangatu | Exportación contable de costos laborales, retenciones si corresponden, trazabilidad de comprobantes y conciliación para contabilidad. La DNIT mantiene servicios de registro electrónico de comprobantes en Marangatu.  [dnit.gov](https://www.dnit.gov.py/web/portal-institucional/registro-de-comprobantes) |

## Módulos imprescindibles

No conviene comenzar con “un sistema de RR. HH.” genérico. Conviene definir una plataforma por dominios, donde cada módulo tenga responsabilidades claras.

### 1. Legajo digital del colaborador

Debe centralizar la relación laboral y evitar archivos dispersos en carpetas, WhatsApp o planillas Excel.

Datos recomendados:

- Identificación: nombre, cédula, fecha de nacimiento, nacionalidad, domicilio y contactos.
- Datos laborales: empresa, sucursal, cargo, centro de costo, jefe, fecha de ingreso, tipo de contrato, modalidad presencial/híbrida/remota y horario.
- Datos de nómina: salario, moneda, banco, cuenta, conceptos recurrentes, descuentos autorizados y situación IPS.
- Documentos: contrato, adendas, cédula, certificados, títulos, autorizaciones, recibos firmados y documentos de desvinculación.
- Historial: promociones, cambios salariales, transferencias internas, sanciones, ausencias, vacaciones y capacitaciones.
- Consentimientos y avisos de privacidad, particularmente para datos sensibles.

**Diseño clave:** el legajo debe ser histórico e inmutable en lo esencial. No se debe “editar” un salario o cargo anterior sin conservar quién modificó qué, cuándo, por qué y cuál era el valor previo.

### 2. Contratación y movimientos

El sistema debería soportar un flujo de estados, no solo formularios:

\[
\text{Borrador} \rightarrow \text{Revisión} \rightarrow \text{Aprobado} \rightarrow \text{Firmado} \rightarrow \text{Vigente}
\]

Para cada alta, cambio o baja, debe generar una lista de verificación:

- Validación de datos mínimos del trabajador.
- Contrato laboral y anexos.
- Registro o preparación de información para REOP.
- Alta del trabajador ante IPS, según el canal o proceso habilitado por la institución.
- Asignación de horario, jefe, centro de costo y política de asistencia.
- Documentos de entrega de equipos, si aplica.
- Consentimiento de tratamiento de datos y política de uso de activos/TIC.
- Documentación de teletrabajo, si corresponde.

El IPS señala que, tras la inscripción de la empresa, el empleador debe registrar a sus trabajadores mediante el sistema REI; por eso el producto debe permitir como mínimo **exportar datos consistentes**, mantener evidencia del trámite y conciliar estados de inscripción. [portal.ips.gov](https://portal.ips.gov.py/sistemas/ipsportal/contenido.php?c=74)

### 3. Asistencia, jornada y horas extra

Este módulo suele ser el mayor foco de contingencia laboral. Debe separar claramente:

- **Horario planificado:** lo que el contrato o reglamento asigna.
- **Marcaciones:** entradas, salidas, pausas, geolocalización o biometría, si la empresa las utiliza.
- **Tiempo efectivo:** el período en que la persona está a disposición del empleador; el Código del Trabajo define la jornada efectiva bajo este criterio. [bacn.gov](https://www.bacn.gov.py/leyes-paraguayas/2608/establece-el-codigo-del-trabajo)
- **Excepciones:** tardanzas, ausencias, permisos, trabajo en feriados, turnos, horas nocturnas y horas extra.
- **Aprobaciones:** un responsable valida incidencias antes de que impacten la nómina.
- **Evidencia:** fuente de cada marcación, dispositivo, IP, ubicación —si fuera lícito y proporcional— y auditoría.

Para biometría, geolocalización o monitoreo de actividad remota, no basta con una función técnicamente disponible. Son datos de alto impacto para la privacidad. Deben existir finalidad definida, base documental, retención limitada, controles de acceso y una alternativa razonable cuando la medida sea desproporcionada.

### 4. Nómina parametrizable

No recomiendo codificar reglas legales directamente en el código fuente. Deben existir **tablas de vigencia** y un motor de reglas versionado.

Componentes:

- Salario mensual, jornal, salario por hora, comisiones, bonos y variables.
- Horas ordinarias, nocturnas, extraordinarias y feriados.
- Vacaciones y remuneración asociada.
- Aguinaldo.
- Anticipos, préstamos, embargos y descuentos autorizados.
- Aportes del trabajador y aportes patronales.
- Reglas por categoría, actividad, sucursal, modalidad contractual y convenio/política interna.
- Generación de recibo de salario y archivo de pago bancario.
- Reversión o reliquidación con trazabilidad.

Como referencia, las fuentes del IPS indican una cuota obrera del 9% y una cuota patronal del 14% bajo el régimen general, además de referir un aporte adicional patronal del 2,5%. Sin embargo, estos porcentajes, bases y excepciones deben configurarse y validarse con un especialista antes de convertirlos en regla productiva. [portal.ips.gov](https://portal.ips.gov.py/sistemas/ipsportal/contenido.php?c=59)

**Ejemplo práctico:** si una persona tiene salario base, comisión y horas extra, el motor debe poder identificar qué conceptos integran la remuneración imponible para IPS, cuál es el descuento del trabajador, cuál es el costo patronal y qué parte se expone en el recibo. No debe depender de cálculos manuales de Excel.

### 5. Vacaciones, licencias y ausencias

Debe incluir un motor de saldos que diferencie:

- Devengamiento por antigüedad.
- Solicitud, aprobación y goce.
- Feriados nacionales y calendario laboral.
- Enfermedad, maternidad/paternidad, accidentes, permisos especiales y ausencias injustificadas.
- Impacto en asistencia, nómina, IPS y reportes.
- Saldos pendientes y alertas de vencimiento.

El Código del Trabajo prevé vacaciones remuneradas tras cada año continuo de trabajo y establece períodos mínimos según antigüedad; por tanto, el sistema debe calcularlas con una fecha de corte, historial contractual y reglas vigentes, no como un simple contador de días. [bacn.gov](https://www.bacn.gov.py/leyes-paraguayas/2608/ley-n-213-establece-el-codigo-del-trabajo)

### 6. Seguridad y salud ocupacional

Para una versión inicial, incluiría:

- Registro de accidentes, incidentes y casi accidentes.
- Matriz de riesgos por puesto o centro de trabajo.
- Entrega de equipos de protección personal.
- Capacitaciones obligatorias y vencimientos.
- Aptitud médica, sin exponer diagnósticos clínicos a perfiles no autorizados.
- Seguimiento de exámenes médicos de admisión y periódicos.
- Evidencias documentales para auditorías.

La Resolución MTESS N.º 3/2022 reglamenta contenido y frecuencia de exámenes médicos obligatorios de admisión y periódicos, por lo que el sistema debe tratar esta información bajo controles reforzados de confidencialidad y acceso. [mtess.gov](https://www.mtess.gov.py/documentos/resolucion-mtess-n-322)

## Documentación que debe producir

Tu software no debería limitarse a almacenar PDFs. Tiene que poder **generar, versionar, firmar y probar** los documentos relevantes.

### Documentos internos

- Ficha o legajo del trabajador.
- Contrato de trabajo y adendas.
- Oferta laboral y aceptación.
- Descripción de puesto.
- Reglamento interno de trabajo y constancia de recepción.
- Políticas de asistencia, vacaciones, teletrabajo, equipos, seguridad de la información y protección de datos.
- Autorizaciones de descuentos.
- Solicitudes y aprobaciones de vacaciones, permisos y horas extra.
- Actas de entrega/devolución de equipos.
- Evaluaciones de desempeño y planes de capacitación.
- Actas disciplinarias, cuando aplique.
- Documentación de renuncia, despido, liquidación final y entrega de certificados.

### Documentos regulatorios y de soporte

- Datos y archivos necesarios para REOP/MTESS.
- Planillas laborales anuales o del período que defina el MTESS.
- Información de altas y movimientos para IPS/REI.
- Liquidaciones y constancias de aportes.
- Reportes para contabilidad, auditoría y DNIT.
- Evidencias de seguridad y salud ocupacional.

Las planillas laborales se presentan en línea en REOP y el MTESS ha requerido carga en un formato Excel preestablecido, incluyendo datos de trabajadores, sueldos/jornales y resumen de personas ocupadas. Diseña el exportador como un adaptador versionado: `MTESS_REOP_2026_v1`, no como una exportación rígida. [mtess.gov](https://www.mtess.gov.py/direccion-de-registro-obrero-patronal/planillas-laborales)

## Arquitectura de cumplimiento

Para que el sistema sea mantenible, propongo estas decisiones técnicas desde el inicio.

### Parámetros con vigencia

Toda regla regulatoria debe tener:

- Fecha de inicio y finalización de vigencia.
- Fuente normativa.
- Responsable que aprobó el cambio.
- Estado: borrador, revisado, publicado o retirado.
- Pruebas de cálculo asociadas.

Ejemplos de parámetros:

- Salario mínimo.
- Porcentajes de IPS.
- Bases imponibles.
- Fórmulas de horas extra.
- Calendario de feriados.
- Reglas de vacaciones.
- Formatos REOP.
- Políticas internas de cada empresa cliente.

Esto permitirá recalcular una nómina histórica usando la versión legal que regía en ese período, evitando que un cambio normativo altere liquidaciones ya cerradas.

### Auditoría y segregación de funciones

Aplicaría controles de tipo **RBAC** (*Role-Based Access Control*, control de acceso basado en roles):

| Rol | Acciones permitidas |
|---|---|
| Colaborador | Ver su legajo limitado, solicitar vacaciones/permiso, descargar recibos |
| Jefe | Aprobar solicitudes de su equipo, sin ver salario si la política lo restringe |
| RR. HH. | Gestionar legajos, contratos, ausencias y documentos |
| Nómina | Preparar y cerrar liquidaciones, sin alterar datos históricos sin autorización |
| Auditor | Consulta de trazabilidad y reportes, sin modificación |
| Administrador | Configuración técnica y roles, con acceso excepcional monitoreado |

Además:

- Bitácora de auditoría no editable.
- Doble aprobación para cambios salariales, cierres de nómina y eliminación lógica.
- Cifrado en tránsito y en reposo.
- Copias de seguridad, recuperación ante desastres y política de retención.
- Separación por empresa/tenant si será un SaaS multiempresa.
- Registro de descargas de archivos sensibles.
- Minimización de datos: solicitar solo aquello necesario para una finalidad concreta.

## Hoja de ruta recomendada

### Fase 0: relevamiento jurídico

Antes de desarrollar, elaboraría una matriz con estas columnas:

| Requisito | Fuente legal | Obligación | Dato necesario | Proceso | Evidencia | Módulo | Riesgo |
|---|---|---|---|---|---|---|---|
| Alta de trabajador | IPS / REI | Registrar al trabajador | CI, fecha ingreso, salario, cargo | Onboarding | Constancia/trazabilidad | Legajo e integraciones | Alto |
| Planilla laboral | MTESS / REOP | Presentar planilla aplicable | Personal, salarios, movimientos | Cierre anual | Archivo y acuse | Reportes regulatorios | Alto |
| Vacaciones | Código del Trabajo | Calcular y documentar | Antigüedad, ausencias, fechas | Gestión de licencias | Solicitud y aprobación | Vacaciones | Alto |
| Datos sensibles | Ley 1.682 | Restringir divulgación | Salud, biometría, etc. | Gestión de legajo | Accesos y consentimiento | Seguridad | Alto |

Esta etapa debería ser revisada por:

- Abogado/a laboralista paraguayo/a.
- Contador/a con experiencia en nómina, IPS y DNIT.
- Especialista de RR. HH.
- Responsable de seguridad de la información.
- Un representante de clientes objetivo: pyme, empresa mediana, industria, comercio o empresa de servicios.

### Fase 1: MVP comercialmente útil

El primer producto viable debería incluir:

- Multiempresa, sucursales, cargos y centros de costo.
- Legajo digital.
- Contratos y gestión documental.
- Asistencia y solicitudes.
- Vacaciones y permisos.
- Nómina básica parametrizable.
- Recibos.
- Exportaciones IPS/MTESS configurables.
- Auditoría, roles y control de acceso.
- Tablero de vencimientos regulatorios.

### Fase 2: cumplimiento avanzado

- Integraciones directas o asistidas con REOP, IPS/REI, bancos y ERP como Odoo.
- Firma electrónica/digital, según el caso de uso y validación jurídica.
- Liquidaciones complejas, reliquidaciones y finiquitos.
- SST, capacitaciones y medicina ocupacional.
- Portal móvil del colaborador.
- Analítica de rotación, ausentismo y costo laboral.
- API para Odoo, contabilidad y dispositivos biométricos.

## Límites y siguiente paso

La documentación oficial relevante se concentra, como mínimo, en MTESS, IPS, DNIT y la Biblioteca y Archivo Central del Congreso Nacional. El MTESS además dispone de resoluciones y referencias de Reglamento Interno de Trabajo, por lo que conviene incluir un módulo documental que no asuma un único formato rígido. [mtess.gov](https://www.mtess.gov.py/?page_id=31671)

Puedo ayudarte a hacer este trabajo de forma metódica: levantar la normativa paraguaya aplicable, identificar obligaciones por tipo de empresa y trabajador, convertir cada obligación en historias de usuario, modelo de datos, reglas de cálculo, flujos de aprobación y casos de prueba. El resultado ideal sería una **especificación funcional-jurídica versionada**, no una lista suelta de leyes.

Para avanzar sin asumir demasiado, tomaría como base estas decisiones de producto: **Paraguay como jurisdicción inicial, sector privado, empleados en relación de dependencia, empresas pequeñas/medianas y posible integración con Odoo**. Con ese alcance, el siguiente entregable puede ser una matriz completa de requisitos legales y un backlog técnico priorizado para el MVP.
