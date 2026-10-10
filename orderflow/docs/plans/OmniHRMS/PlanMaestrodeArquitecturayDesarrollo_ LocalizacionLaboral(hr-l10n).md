# **Plan Maestro de Arquitectura y Desarrollo: Localización Laboral (hr-l10n)**

**Proyecto:** OmniFlow / OrderFlow

**Módulos Core:** hr / attendance / human-capital (services/hr-standalone)

**Estrategia de Dominio:** Core Agnóstico \+ Plugins de Jurisdicción (*Odoo/OmniLedger-Style*)

**Alcance:** Localización inicial **Paraguay (l10n-py)**, seguida de **Argentina (l10n-ar)** y **Brasil (l10n-br)**.

## **1\. Arquitectura Base del Motor de Localización**

Para garantizar que el Core de hr no contenga lógica legal ni tributaria rígida, se implementa el patrón **Strategy \+ Registry** con inyección dinámica dependiente del tenant o centro de trabajo (jurisdictionCode: PY | AR | BR).

                             ┌──────────────────────────────────┐

                              │            CORE (hr)             │

                              │   \- AttendanceRecord (Haversine) │

                              │   \- ShiftTemplate / WorkSchedule │

                              │   \- Employee (Legajo neutral)    │

                              │   \- PayrollEngine (Matemática)   │

                              └────────────────┬─────────────────┘

                                               │

                                   LocalizationRegistry

                                               │

           ┌───────────────────────────────────┼───────────────────────────────────┐

           ▼                                   ▼                                   ▼

┌───────────────────────┐           ┌───────────────────────┐           ┌───────────────────────┐

│   Plugin \`l10n-py\`    │           │   Plugin \`l10n-ar\`    │           │   Plugin \`l10n-br\`    │

│  \- IPS (9% / 16.5%)   │           │  \- Ley 20.744 (LCT)   │           │  \- CLT / eSocial      │

│  \- Vacaciones Art 218 │           │  \- CCT / Libro Sueldos│           │  \- INSS / FGTS        │

│  \- REOP / MTESS Excel │           │  \- F.931 (AFIP/ARCA)  │           │  \- 13º / Férias \+ 1/3 │

└───────────────────────┘           └───────────────────────┘           └───────────────────────┘

### **1.1 Contrato del Adaptador (Core Interface)**

TypeScript

// backend/src/hr/localization/interfaces/localization-adapter.interface.ts

export interface StatutoryReportInput {

  tenantId: string;

  period: string; // "YYYY-MM"

  records: Array\<{

    nationalId: string;

    taxId?: string;

    fullName: string;

    hireDate: Date;

    baseSalary: number;

    regularHours: number;

    overtimeHours: number;

    nightHours: number;

    grossPay: number;

    employeeDeductions: number;

    employerContributions: number;

    netPay: number;

  }\>;

}

export interface GeneratedReportOutput {

  filename: string;

  mimeType: string;

  buffer: Buffer;

}

export interface LocalizationAdapter {

  readonly jurisdiction: 'PY' | 'AR' | 'BR';

  // 1\. Antigüedad y Licencias

  calculateStatutoryVacationDays(hireDate: Date, cutOffDate: Date): number;


  // 2\. Clasificación y Bases Imponibles

  evaluateConceptTaxes(conceptCode: string, amount: number): {

    isSocialSecuritySubject: boolean;

    isIncomeTaxSubject: boolean;

  };

  // 3\. Aportes Obligatorios

  calculateStatutoryDeductions(grossTaxable: number): {

    employeeTotal: number;

    employerTotal: number;

    breakdown: Record\<string, number\>;

  };

  // 4\. Reportes y Planillas Gubernamentales

  generateStatutoryReport(reportType: string, input: StatutoryReportInput): Promise\<GeneratedReportOutput\>;

  // 5\. Semilla inicial de conceptos para el tenant

  getDefaultPayrollConcepts(): Array\<{

    code: string;

    name: string;

    isEarning: boolean;

    isTaxable: boolean;

  }\>;

}

## **2\. Fase 1: Localización Paraguay (l10n-py) — Prioridad Inmediata**

Diseño centrado en la matriz normativa paraguaya (Código del Trabajo Ley 213/93, MTESS y Régimen IPS).

### **2.1 Reglas de Negocio del Adaptador py-localization.adapter.ts**

* **Vacaciones (Art. 218 Código Laboral):**  
  * Antigüedad de 1 a 5 años: **12 días corridos**.  
  * Más de 5 hasta 10 años: **18 días corridos**.  
  * Más de 10 años: **30 días corridos**.  
* **Cargas Sociales (Seguridad Social IPS \- Régimen General):**  
  * Aporte Obrero: **9.0%** (descuento en recibo).  
  * Aporte Patronal: **16.5%** (14% IPS fondo común \+ 1.5% Ministerio de Salud \+ 1% SNPP/SINAFOCAL).  
  * Salario Mínimo Legal como piso imponible para personal de tiempo completo.  
* **Aguinaldo (Art. 243):**  
  * La doceava ($1/12$) parte de todas las remuneraciones devengadas durante el año calendario (libre de descuentos e inembargable).  
* **Sobretasas de Asistencia (Horas Extra):**  
  * Diurnas: recargo del **50%**.  
  * Nocturnas (20:00 a 06:00) o en días feriados/descanso: recargo del **100%**.

### **2.2 Entregables de Reportes Regulatorios de Paraguay**

* MTESS\_REOP\_EXCEL\_v1: Generador de planilla oficial en formato .xlsx con las hojas estándar requeridas por el Registro Obrero Patronal (Datos del Trabajador, Sueldos y Jornales, Resumen de Personal Ocupado).  
* IPS\_REI\_TXT\_v1: Exportador de novedades y salarios para carga batch en el portal REI del IPS.  
* RECIBO\_SALARIO\_PY\_PDF: Modelo de recibo de pago con detalle de horas trabajadas, retención 9% IPS y número patronal.

## **3\. Fase 2: Localización Argentina (l10n-ar)**

Diseño adaptado a la Ley de Contrato de Trabajo N.º 20.744 (LCT), Convenios Colectivos de Trabajo (CCT) y disposiciones de ARCA (ex-AFIP).

### **3.1 Reglas de Negocio del Adaptador ar-localization.adapter.ts**

* **Vacaciones (Art. 150 LCT):**  
  * Hasta 5 años de antigüedad: **14 días corridos**.  
  * Más de 5 hasta 10 años: **21 días corridos**.  
  * Más de 10 hasta 20 años: **28 días corridos**.  
  * Más de 20 años: **35 días corridos**.  
  * *Cálculo del plus vacacional:* división del salario mensual por 25 en vez de 30\.  
* **Seguridad Social y Cargas Sociales (F.931):**  
  * Aportes del Trabajador (promedio \~17%):  
    * Jubilación (SIPA): 11%.  
    * Obra Social: 3%.  
    * INSSJP (PAMI): 3%.  
  * Contribuciones Patronales: SIPA, PAMI, Fondo Nacional de Empleo, Obra Social y Asignaciones Familiares (\~24% a 26,4% según encuadre empresa de servicios/comercio o industrial).  
  * Alícuotas de Seguro de Vida Obligatorio y cuotas fijas/variables de ART (Aseguradora de Riesgos del Trabajo).  
* **Sueldo Anual Complementario (SAC / Aguinaldo):**  
  * 50% de la mayor remuneración mensual devengada en el semestre, pagadero en dos cuotas (junio y diciembre).

### **3.2 Entregables de Reportes Regulatorios de Argentina**

* LSD\_TXT\_AFIP\_v1: Exportador para el sistema **Libro de Sueldos Digital (LSD)** de AFIP/ARCA, estructurado en registros de longitud fija (datos referenciales, liquidación de conceptos y bases imponibles F.931).  
* RECIBO\_LEY\_20744\_PDF: Recibo oficial con desglose de haberes remunerativos, no remunerativos, retenciones de ley, banco de depósito y firma digital/ológrafa.

## **4\. Fase 3: Localización Brasil (l10n-br)**

Diseño alineado con la Consolidação das Leis do Trabalho (CLT), Ministerio do Trabalho e Emprego y el sistema eSocial.

### **4.1 Reglas de Negocio del Adaptador br-localization.adapter.ts**

* **Férias e Abono Constitucional (Art. 129 CLT):**  
  * Período de 30 días tras cada período de 12 meses de trabajo (sujeto a deducciones por faltas injustificadas: \>5 faltas reduce el derecho).  
  * **Terço Constitucional:** Pago obligatorio de un tercio adicional ($1/3$) sobre la remuneración de las vacaciones.  
* **Cargas e Impostos sobre a Folha de Pagamento:**  
  * **INSS (Previdência Social):** Tabla progresiva de retención al empleado (alícuotas escalonadas de 7.5%, 9%, 12% y 14% según faixas salariales con techo máximo).  
  * **FGTS (Fundo de Garantia do Tempo de Serviço):** 8% a cargo exclusivo del empleador, depositado en cuenta vinculada en Caixa Econômica Federal.  
  * **IRRF (Imposto de Renda Retido na Fonte):** Tabla progresiva deducible tras restar dependientes y cuota de INSS.  
* **13º Salário (Gratificação Natalina):**  
  * Liquidado en dos cuotas obligatorias (primera cuota entre febrero y noviembre, segunda cuota hasta el 20 de diciembre).

### **4.2 Entregables de Reportes Regulatorios de Brasil**

* ESOCIAL\_EVENTS\_JSON\_v1: Generación de payloads estructurados para los eventos periódicos de eSocial (S-1200 Remuneração do Trabalhador, S-1210 Pagamentos de Rendimentos).  
* GUIA\_FGTS\_SEFIP\_v1: Formato para conciliación de depósitos obligatorios de garantía.  
* HOLERITE\_PDF: Recibo de sueldo brasileño con indicación de bases de cálculo de INSS, FGTS e IRRF.

## **5\. Matriz Comparativa de Implementación**

| Dimensión | 🇵🇾 Paraguay (l10n-py) | 🇦🇷 Argentina (l10n-ar) | 🇧🇷 Brasil (l10n-br) |
| :---- | :---- | :---- | :---- |
| **Norma Marco** | Código del Trabajo (Ley 213/93) | Ley de Contrato de Trabajo (LCT 20.744) | CLT (Decreto-Lei 5.452/43) |
| **Vacaciones Básicas** | 12, 18 o 30 días corridos según años | 14, 21, 28 o 35 días corridos según años | 30 días corridos \+ 1/3 adicional |
| **Aportes Trabajador** | 9% fijo (IPS) | \~17% (Jubilación \+ Obra Social \+ PAMI) | 7.5% a 14% (INSS progresivo) |
| **Carga Patronal** | 16.5% (IPS \+ SNPP \+ SINAFOCAL) | \~24% a 26.4% \+ ART | 8% FGTS \+ \~20% INSS patronal |
| **Aguinaldo / Décimo** | 1 pago en diciembre ($1/12$ anual) | 2 pagos (junio y diciembre, 50% mayor sueldo) | 2 pagos (1ª cuota hasta nov, 2ª en dic) |
| **Reporte Central** | Excel REOP (MTESS) \+ TXT REI | TXT Libro Sueldos Digital (AFIP/ARCA) | Eventos eSocial (S-1200/S-1210) |

## **6\. Hoja de Ruta de Desarrollo por Sprints**

### **🗓️ Sprint L1 — Fundaciones del Core Localization**

* \[ \] Crear el directorio backend/src/hr/localization/.  
* \[ \] Definir interfaces genéricas (LocalizationAdapter, StatutoryReportInput, GeneratedReportOutput).  
* \[ \] Implementar LocalizationRegistry para resolver el plugin adecuado según tenant.defaultJurisdiction o workplace.jurisdiction.  
* \[ \] Conectar el motor de nómina del core (PayrollEngine) para invocar al adaptador correspondiente durante el cálculo.

### **🗓️ Sprint L2 — Entrega Completa l10n-py (Paraguay)**

* \[ \] Implementar ParaguayLocalizationAdapter.  
* \[ \] Lógica de vacaciones según antigüedad (12/18/30 días).  
* \[ \] Retención IPS obrero (9%) y cálculo de pasivo patronal (16.5%).  
* \[ \] Generador de plantilla MTESS\_REOP\_EXCEL\_v1 utilizando exceljs.  
* \[ \] Generador de recibos de salarios oficiales en PDF.

### **🗓️ Sprint L3 — Entrega Completa l10n-ar (Argentina)**

* \[ \] Implementar ArgentinaLocalizationAdapter.  
* \[ \] Regla de días de vacaciones según LCT y divisor de plus vacacional / 25.  
* \[ \] Aportes de seguridad social al 17% y escala de contribuciones patronales.  
* \[ \] Generador de archivos de texto plano de ancho fijo para **Libro de Sueldos Digital (AFIP)**.

### **🗓️ Sprint L4 — Entrega Completa l10n-br (Brasil)**

* \[ \] Implementar BrazilLocalizationAdapter.  
* \[ \] Regla de cálculo de férias CLT con cálculo del tercio constitucional ($1/3$).  
* \[ \] Motor de cálculo para la tabla progresiva de alícuotas del INSS e IRRF.  
* \[ \] Generador de payloads estructurados para los eventos mensuales de eSocial (S-1200).

