# HOJA DE EVALUACIÓN Y ROLL-PLAY OPERATIVO — FEAT-125 / OmniGastro

**Objetivo:** Validar que los flujos de OmniGastro representan correctamente la operación real del restaurante y que clientes y colaboradores pueden utilizarlos de manera intuitiva.  
**Referencia de Especificaciones:** [FEAT-125_gastro.md](FEAT-125_gastro.md) | **Plan de Pruebas:** [test-plan.md](test-plan.md)

---

## 1. Datos de la Prueba

| Dato | Información |
|---|---|
| **Restaurante / Tenant** | |
| **Fecha de Evaluación** | |
| **Evaluador / QA** | |
| **Versión del Sistema** | `v1.25.0-alpha-omnigastro` |
| **Mesa Utilizada** | |
| **Mozo Participante** | |
| **Cajero Participante** | |
| **Cocina Participante** | |
| **Dispositivo Cliente** | |
| **Dispositivo Mozo** | |

### Resultado General
- [ ] **APROBADO**  
- [ ] **APROBADO CON OBSERVACIONES**  
- [ ] **REQUIERE CORRECCIONES**  
- [ ] **NO APROBADO**

---

## 2. Escala de Calificación

- **5 — Excelente:** Funciona correctamente y el usuario sabe qué hacer sin ayuda.
- **4 — Bueno:** Funciona correctamente, con pequeñas dudas o dificultades.
- **3 — Aceptable:** Funciona, pero requiere explicación o intervención.
- **2 — Deficiente:** Funciona parcialmente o genera confusión importante.
- **1 — Crítico:** No permite completar correctamente el proceso.
- **N/A:** No aplica.

---

## 3. ESCENARIO A — Cliente realiza pedido desde la mesa (Table Flow)

### Situación
Cliente se sienta en la mesa, escanea el QR, selecciona productos y solicita el pedido a través del menú digital.

| Punto a Evaluar | Caso de Prueba Relacionado | 1 | 2 | 3 | 4 | 5 | N/A |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| El QR se abre correctamente | `TC-125-A01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El sistema identifica correctamente la mesa | `TC-125-A01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El cliente entiende que está en modo restaurante (Badge) | `TC-125-A02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El cliente encuentra los productos en el menú | `TC-125-A03` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El cliente comprende el carrito ("Enviar al mozo") | `TC-125-A03` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Entiende la diferencia Mesa / Barra | `TC-125-A04` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Puede enviar el pedido sin asistencia | `TC-125-A05` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El pedido aparece correctamente en la tablet del mozo | `TC-125-A05` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El mozo entiende que debe reclamarlo | `TC-125-A07` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El mozo verifica correctamente el pedido en su modal | `TC-125-A07` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El pedido llega correctamente a cocina | `TC-125-A08` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El cliente recibe información del estado (Timeline) | `TC-125-A06` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El cierre del pedido resulta claro | `TC-125-A09` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

### Observaciones

__________________________________________________________________

__________________________________________________________________

### ¿El proceso representa cómo debería trabajar el restaurante?

☐ Sí  
☐ Sí, con modificaciones  
☐ No

---

## 4. ESCENARIO B — Cliente llama al mozo para realizar el pedido

### Situación
El cliente no utiliza el carrito. Escanea el QR y selecciona **📝 Quiero pedir**.

| Punto a Evaluar | Caso de Prueba Relacionado | 1 | 2 | 3 | 4 | 5 | N/A |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| El cliente encuentra el botón "Llamar al mozo" | `TC-125-B01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Entiende la opción "Quiero pedir" | `TC-125-B01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| La llamada aparece destacada al mozo | `TC-125-B02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El mozo entiende qué debe hacer ("Tomar pedido") | `TC-125-B03` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| La mesa queda correctamente identificada | `TC-125-B03` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El mozo puede cargar el pedido a mano en su tablet | `TC-125-B04` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El pedido continúa correctamente el flujo normal | `TC-125-B04` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

### Observaciones

__________________________________________________________________

__________________________________________________________________

---

## 5. ESCENARIO C — Cliente solicita asistencia

### Situación
Con un pedido activo, el cliente utiliza **Llamar al mozo ➔ Más pan** o **Ayuda**.

| Punto a Evaluar | Caso de Prueba Relacionado | 1 | 2 | 3 | 4 | 5 | N/A |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| El cliente encuentra la función en la pantalla de tracking | `TC-125-C01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Las opciones disponibles son comprensibles | `TC-125-C01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El mozo identifica correctamente la mesa | `TC-125-C02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El mozo entiende la solicitud | `TC-125-C02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| La llamada puede resolverse correctamente ("Resolver") | `TC-125-C02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

### Observaciones

__________________________________________________________________

__________________________________________________________________

---

## 6. ESCENARIO D — Cliente solicita la cuenta

### Situación
El cliente terminó de consumir y selecciona **🧾 Pedir la cuenta**. El mozo atiende y realiza el cobro/cierre.

| Punto a Evaluar | Caso de Prueba Relacionado | 1 | 2 | 3 | 4 | 5 | N/A |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| El cliente encuentra "Pedir la cuenta" | `TC-125-D01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| La solicitud llega correctamente al mozo | `TC-125-D01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El mozo puede dirigirse a la mesa correcta | `TC-125-D01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El procedimiento de cobro (3 opciones de cierre) está claro | `TC-125-D02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El cierre del pedido es correcto | `TC-125-D02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El cliente recibe confirmación del cierre | `TC-125-D02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

### ¿Cómo debería funcionar normalmente?

☐ Cliente paga en caja  
☐ Mozo cobra en mesa  
☐ Pago digital  
☐ Otro: __________________________

### Observaciones

__________________________________________________________________

__________________________________________________________________

---

## 7. ESCENARIO E — Pedido para llevar / barra

### Situación
Cliente selecciona **🍺 Para llevar / Tomar en barra**.

| Punto a Evaluar | Caso de Prueba Relacionado | 1 | 2 | 3 | 4 | 5 | N/A |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| El cliente entiende la modalidad | `TC-125-E01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El pedido entra correctamente a la cola de barra | `TC-125-E01` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| No se asigna incorrectamente a un mozo de mesa | `TC-125-E02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Barra comprende que debe atenderlo | `TC-125-E02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El procedimiento de cobro/retiro está claro | `TC-125-E02` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

### Observaciones

__________________________________________________________________

__________________________________________________________________

---

## 8. PRUEBAS DE SITUACIONES EXCEPCIONALES

## 8.1 Pedido incorrecto

El cliente envía un pedido equivocado.

**¿Qué hace el restaurante?**

__________________________________________________________________

**¿Quién puede modificarlo?**

__________________________________________________________________

**¿En qué momento?**

__________________________________________________________________

Resultado:

☐ Correcto  
☐ Requiere procedimiento  
☐ Requiere modificación del sistema

---

## 8.2 Producto agotado

El cliente solicita un producto que ya no está disponible.

**¿Qué ocurre actualmente?**

__________________________________________________________________

**¿Quién informa al cliente?**

__________________________________________________________________

**¿Qué hace el mozo?**

__________________________________________________________________

Resultado:

☐ Correcto  
☐ Requiere procedimiento  
☐ Requiere modificación del sistema

---

## 8.3 Dos mozos intentan tomar el mismo pedido (`TC-125-EX01`)

Resultado:

☐ Correcto  
☐ Genera confusión  
☐ Requiere modificación

Observaciones:

__________________________________________________________________

---

## 8.4 Cliente llama varias veces (`TC-125-EX02`)

Resultado:

☐ Correcto  
☐ Se generan llamadas duplicadas  
☐ Genera confusión  
☐ Requiere modificación

Observaciones:

__________________________________________________________________

---

## 8.5 El mozo no puede atender inmediatamente

**¿Qué espera el restaurante que ocurra?**

__________________________________________________________________

**¿Qué ve el cliente?**

__________________________________________________________________

**¿Quién debe hacerse cargo?**

__________________________________________________________________

Resultado:

☐ Procedimiento definido  
☐ Procedimiento no definido  
☐ Requiere funcionalidad

---

## 9. Evaluación de la experiencia del personal

### Mozo

**¿Pudo utilizar el sistema sin asistencia?**

☐ Sí  
☐ Con poca asistencia  
☐ Necesitó asistencia permanente

**¿Qué parte le resultó más difícil?**

__________________________________________________________________

**¿Qué información le faltó?**

__________________________________________________________________

**¿Qué cambiaría?**

__________________________________________________________________

---

### Cocina

**¿La información recibida es suficiente para preparar el pedido?**

☐ Sí  
☐ Parcialmente  
☐ No

**Observaciones:**

__________________________________________________________________

---

### Caja

**¿El proceso de cierre/cobro coincide con el procedimiento real?**

☐ Sí  
☐ Con modificaciones  
☐ No

**Observaciones:**

__________________________________________________________________

---

### Cliente

**¿Pudo completar el proceso sin ayuda?**

☐ Sí  
☐ Con ayuda  
☐ No

**¿Qué parte resultó confusa?**

__________________________________________________________________

---

## 10. Incidencias detectadas

| # | Incidencia | Escenario | Severidad | Responsable | Acción |
|---|---|---|---|---|---|
| 1 | | | ☐ Alta ☐ Media ☐ Baja | | |
| 2 | | | ☐ Alta ☐ Media ☐ Baja | | |
| 3 | | | ☐ Alta ☐ Media ☐ Baja | | |
| 4 | | | ☐ Alta ☐ Media ☐ Baja | | |

---

## 11. Resultado Final y Validación del Modelo Operativo

### ¿Estamos preparados para utilizar este flujo en operación real?

☐ **SÍ — Puede pasar a operación**

☐ **SÍ, CON OBSERVACIONES — Puede utilizarse corrigiendo puntos menores**

☐ **NO — Requiere correcciones antes de operación**

☐ **NO — El flujo debe rediseñarse**

---

## 12. Firma / Conformidad

**Responsable del restaurante**

Nombre: ______________________________________  
Firma: ________________________________________  
Fecha: ________________________________________  

**Responsable de implementación**

Nombre: ______________________________________  
Firma: ________________________________________  
Fecha: ________________________________________  
