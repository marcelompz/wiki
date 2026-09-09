# **OmniCRM: Especificación Técnica de Microservicio Backend y Despliegue**

# **1\. Arquitectura del Microservicio Desacoplado**

OmniCRM se ha diseñado bajo un paradigma de microservicios para garantizar que las operaciones analíticas y de atribución no interfieran con la transaccionalidad del punto de venta (POS).

## **Estructura de Directorios Modular**

El proyecto utiliza el framework FastAPI con una estructura organizada por responsabilidades:

* **app/api**: Definición de endpoints, rutas y esquemas de validación (Pydantic).  
* **app/core**: Configuraciones globales, seguridad, manejo de variables de entorno y constantes del sistema.  
* **app/models**: Definición de la capa de datos utilizando SQLAlchemy 2.0.  
* **app/services**: Lógica de negocio core, algoritmos de atribución y procesamiento de datos.  
* **app/workers**: Tareas asíncronas y procesos cron para la sincronización de métricas de marketing.  
* **app/workers/follow\_up\_dispatcher.py**: Módulo que procesa periódicamente las reglas posventa y dispara las notificaciones automáticas por WhatsApp / SMS.

## **Principio de Desacoplamiento**

OmniCRM opera con su propia instancia de base de datos PostgreSQL. La interacción con el sistema OmniFlow se realiza exclusivamente a través de webhooks y APIs REST asíncronas. Esto asegura que cualquier latencia en el procesamiento de atribución o fallos en las APIs externas de marketing tengan cero impacto en el rendimiento y la disponibilidad del POS.

# **2\. Modelos de Base de Datos (SQLAlchemy 2.0 & PostgreSQL)**

La persistencia de datos se gestiona mediante SQLAlchemy 2.0, optimizando el uso de índices analíticos para consultas de atribución.

## **Definición de Modelos**

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index, Text

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped\_column, relationship

from datetime import datetime

class Base(DeclarativeBase):

    pass

class Customer(Base):

    \_\_tablename\_\_ \= "customers"

    id: Mapped\[int\] \= mapped\_column(primary\_key=True)

    phone: Mapped\[str\] \= mapped\_column(String(20), index=True)

    document\_id: Mapped\[str\] \= mapped\_column(String(20), unique=True, index=True) \# RUC/CI

    email: Mapped\[str\] \= mapped\_column(String(255), nullable=True)

    full\_name: Mapped\[str\] \= mapped\_column(String(255))

    created\_at: Mapped\[datetime\] \= mapped\_column(default=datetime.utcnow)

class Touchpoint(Base):

    \_\_tablename\_\_ \= "touchpoints"

    id: Mapped\[int\] \= mapped\_column(primary\_key=True)

    platform: Mapped\[str\] \= mapped\_column(String(50)) \# Meta, Google, Organic

    campaign\_id: Mapped\[str\] \= mapped\_column(String(100), nullable=True)

    gclid: Mapped\[str\] \= mapped\_column(String(255), nullable=True)

    fbclid: Mapped\[str\] \= mapped\_column(String(255), nullable=True)

    utm\_campaign: Mapped\[str\] \= mapped\_column(String(100), nullable=True)

    coupon\_code: Mapped\[str\] \= mapped\_column(String(50), nullable=True, index=True)

    created\_at: Mapped\[datetime\] \= mapped\_column(default=datetime.utcnow)

class PosOrder(Base):

    \_\_tablename\_\_ \= "pos\_orders"

    id: Mapped\[int\] \= mapped\_column(primary\_key=True)

    ticket\_id: Mapped\[str\] \= mapped\_column(String(100), unique=True)

    customer\_id: Mapped\[int\] \= mapped\_column(ForeignKey("customers.id"))

    total\_amount: Mapped\[float\] \= mapped\_column(Float)

    discount\_amount: Mapped\[float\] \= mapped\_column(Float, default=0.0)

    coupon\_code: Mapped\[str\] \= mapped\_column(String(50), nullable=True)

    channel: Mapped\[str\] \= mapped\_column(String(50))

    closed\_at: Mapped\[datetime\] \= mapped\_column(index=True)

class FollowUpRule(Base):  
    \_\_tablename\_\_ \= "follow\_up\_rules"  
    id: Mapped\[int\] \= mapped\_column(primary\_key=True)  
    name: Mapped\[str\] \= mapped\_column(String(100))  
    trigger\_type: Mapped\[str\] \= mapped\_column(String(50))  
    delay\_hours: Mapped\[int\] \= mapped\_column(Integer)  
    channel: Mapped\[str\] \= mapped\_column(String(50))  
    template\_text: Mapped\[str\] \= mapped\_column(Text)  
    is\_active: Mapped\[bool\] \= mapped\_column(default=True)

class FollowUpExecution(Base):  
    \_\_tablename\_\_ \= "follow\_up\_executions"  
    id: Mapped\[int\] \= mapped\_column(primary\_key=True)  
    rule\_id: Mapped\[int\] \= mapped\_column(ForeignKey("follow\_up\_rules.id"))  
    customer\_id: Mapped\[int\] \= mapped\_column(ForeignKey("customers.id"))  
    initial\_order\_id: Mapped\[int\] \= mapped\_column(ForeignKey("pos\_orders.id"))  
    scheduled\_for: Mapped\[datetime\] \= mapped\_column(index=True)  
    sent\_at: Mapped\[datetime\] \= mapped\_column(nullable=True)  
    status: Mapped\[str\] \= mapped\_column(String(50))  
    converted\_order\_id: Mapped\[int\] \= mapped\_column(ForeignKey("pos\_orders.id"), nullable=True)

class AttributionMatch(Base):

    \_\_tablename\_\_ \= "attribution\_matches"

    id: Mapped\[int\] \= mapped\_column(primary\_key=True)

    order\_id: Mapped\[int\] \= mapped\_column(ForeignKey("pos\_orders.id"))

    touchpoint\_id: Mapped\[int\] \= mapped\_column(ForeignKey("touchpoints.id"))

    attributed\_revenue: Mapped\[float\] \= mapped\_column(Float)

    model: Mapped\[str\] \= mapped\_column(String(50)) \# last\_click, coupon\_first

class DailyMarketingMetric(Base):

    \_\_tablename\_\_ \= "daily\_marketing\_metrics"

    id: Mapped\[int\] \= mapped\_column(primary\_key=True)

    date: Mapped\[datetime\] \= mapped\_column(index=True)

    platform: Mapped\[str\] \= mapped\_column(String(50))

    campaign\_id: Mapped\[str\] \= mapped\_column(String(100))

    query\_or\_target: Mapped\[str\] \= mapped\_column(Text, nullable=True)

    spend: Mapped\[float\] \= mapped\_column(Float)

    impressions: Mapped\[int\] \= mapped\_column(Integer)

    clicks: Mapped\[int\] \= mapped\_column(Integer)

    conversions: Mapped\[int\] \= mapped\_column(Integer)

## **Migraciones e Índices**

Se utiliza Alembic para la gestión de migraciones de base de datos. Se han configurado índices compuestos en Touchpoint(coupon\_code, created\_at) y PosOrder(closed\_at) para acelerar el pipeline de atribución temporal.

# **3\. Webhook Receiver y Lógica de Atribución en Tiempo Real**

Se implementan los endpoints `/api/v1/follow-up-rules` para la gestión administrativa de las reglas, permitiendo configurar los parámetros que alimentan la interfaz de provecchio.com/admin/follow-up-rules.

El endpoint `/api/v1/webhooks/omniflow/ticket-closed` es el punto de entrada para los datos de ventas offline.

## **Pipeline de Resolución de Identidad**

Al recibir un ticket, el sistema ejecuta los siguientes pasos:

1. **Identificación**: Búsqueda del cliente en la tabla `Customer` por número de teléfono o documento de identidad.  
2. **Registro de Orden**: Creación del registro en `PosOrder`.  
3. **Matching de Touchpoints**:  
   * Prioridad 1: Coincidencia por `coupon_code` activo.  
   * Prioridad 2: Atribución por ventana temporal (Lookback Window). El sistema busca touchpoints digitales (gclid, fbclid) asociados al identificador del cliente dentro de los últimos 14 a 30 días.  
4. **Cierre de Atribución**: Persistencia en `AttributionMatch`.

## **Despacho Asíncrono**

Tras la atribución exitosa, OmniCRM utiliza `BackgroundTasks` de FastAPI para enviar el evento 'Purchase' a la Meta Conversions API (CAPI). Esto permite reportar conversiones offline sin bloquear la respuesta del webhook.

# **4\. Clientes de Integración de Marketing**

## **Meta Client (`meta_client.py`)**

Gestiona la comunicación con Meta Marketing API para extraer Insights de campañas y con Conversions API (CAPI). Implementa el hashing SHA256 obligatorio para datos sensibles de clientes (email, teléfono) antes de la transmisión.

## **Google Search Console Client (gsc\_client.py)**

Conexión mediante google-api-python-client utilizando una Google Cloud Service Account. Su función es extraer métricas de rendimiento y queries de búsqueda específicas para el dominio provecchio.com, integrándolas en el dashboard de métricas diarias.

## **Google Ads Client (google\_ads\_client.py)**

Estructura preparada para consultar el servicio de reporting de Google Ads (Search/Campaign reporting), permitiendo consolidar el gasto y clics de campañas pagas con los ingresos atribuidos en el backend.

# **5\. Contenedorización y Despliegue con Docker**

## **Dockerfile (Multi-stage)**

\# Stage 1: Builder

FROM python:3.12-slim as builder

WORKDIR /app

COPY requirements.txt .

RUN pip install \--no-cache-dir \--prefix=/install \-r requirements.txt

\# Stage 2: Final

FROM python:3.12-slim

WORKDIR /app

COPY \--from=builder /install /usr/local

COPY ./app /app/app

COPY alembic.ini .

CMD \["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"\]

## **docker-compose.yml**

El despliegue integra los servicios necesarios y se configura para trabajar detrás de un proxy inverso Traefik.version: '3.8'

services:

  omnicrm-db:

    image: postgres:16-alpine

    environment:

      POSTGRES\_DB: omnicrm

      POSTGRES\_USER: \<span type="placeholder" placeholder-type="person"\>\</span\>

      POSTGRES\_PASSWORD: \<span type="placeholder" placeholder-type="person"\>\</span\>

    volumes:

      \- pgdata:/var/lib/postgresql/data

  omnicrm-app:

    build: .

    env\_file: .env

    depends\_on:

      \- omnicrm-db

    labels:

      \- "traefik.enable=true"

      \- "traefik.http.routers.omnicrm.rule=Host(\`api.omnicrm.local\`)"

  omnicrm-worker:

    build: .

    command: python \-m app.workers.metrics\_sync

    env\_file: .env

    depends\_on:

      \- omnicrm-db

volumes:

  pgdata:

## **Variables de Entorno (.env.example)**

* `DATABASE_URL`: `postgresql://user:pass@omnicrm-db:5432/omnicrm`  
* `META_ACCESS_TOKEN`: Person  
* `GOOGLE_ADS_CLIENT_ID`: Person  
* `GSC_SERVICE_ACCOUNT_FILE`: File  
* `LOOKBACK_WINDOW_DAYS`: 30

