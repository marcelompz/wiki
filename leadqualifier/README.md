# 🎯 LeadQualifierCRM - Documentación Técnica

> **Plataforma automatizada para prospección de negocios locales mediante generación instantánea de sitios web demo**

**Estado:** 🔄 En desarrollo  
**Versión:** 1.0.0 (MVP)  
**Última actualización:** 2026-07-06  
**Autor:** marcelompz  
**Email:** marcelo@pesallaccia.com

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Módulos Principales](#módulos-principales)
4. [Base de Datos](#base-de-datos)
5. [Scraping & Geolocalización](#scraping--geolocalización)
6. [Demo Web Generator](#demo-web-generator)
7. [Email Offer Generator](#email-offer-generator)
8. [Deployment](#deployment)

---

## Visión General

**LeadQualifierCRM** es una plataforma SaaS B2B diseñada para automatizar la prospección de negocios locales mediante:

1. **Scraping automatizado:** Google Maps + datos de negocios
2. **Generación de demos web:** Sitios personalizados al instante
3. **Gestión de CRM:** Seguimiento de prospectos y vendedores
4. **Email marketing:** Ofertas personalizadas con demo incluida

**Casos de Uso:**
- 🎯 **Agencias de marketing:** Prospección de clientes para servicios web
- 📦 **SaaS vendors:** Demo personalizada para cada prospecto
- 🏪 **Vendedores B2B:** Automatización de outreach
- 📊 **Consultoras:** Identificación de oportunidades

---

## Arquitectura

### Stack Tecnológico

```
┌─────────────────────────────────────────┐
│   FRONTEND (Next.js + React)            │
│   - Dashboard de prospectos             │
│   - Mapa interactivo                    │
│   - Generador de demos web              │
└────────────────┬────────────────────────┘
                 │ REST API
┌────────────────▼────────────────────────┐
│   BACKEND (Python/FastAPI)              │
│   - Autenticación (JWT + OAuth Google)  │
│   - CRM Core (CRUD negocios)            │
│   - Scraping Service                    │
│   - Demo Website Generator              │
│   - Email Offer Generator               │
└────────────────┬────────────────────────┘
     ┌───────────┼───────────┐
     │           │           │
┌────▼────┐ ┌───▼─────┐ ┌──▼──────┐
│PostgreSQL│ │ MongoDB │ │ Redis   │
│          │ │         │ │         │
│- Users  │ │- Datos  │ │- Cache  │
│- Roles  │ │  scraped│ │- Sesiones
│- Business│ │- Detalles
└──────────┘ └─────────┘ └─────────┘
```

### Componentes

| Componente | Tecnologías | Propósito |
|------------|-------------|-----------|
| **Frontend** | Next.js + React + Tailwind | Dashboard, mapa, generador de demos |
| **Backend** | FastAPI + Python | API REST, scraping, generación |
| **PostgreSQL** | PostgreSQL 15 | Usuarios, roles, businesses, CRM |
| **MongoDB** | MongoDB 6 | Datos scraped, detalles de negocios |
| **Redis** | Redis 7 | Cache, sesiones, colas |

---

## Módulos Principales

### 1. Autenticación y Autorización

**Endpoints:**
- `POST /api/auth/login` - Login email/password
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Invalidate session

**JWT Structure:**
```python
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "admin",  # or "vendedor"
  "exp": 1234567890,
  "iat": 1234567890
}
```

**Roles:**
- **Admin:** Gestión de usuarios, ABM vendedores, vista de todos los prospectos, reportes
- **Vendedor:** Acceso a prospectos asignados, generación de demos web, emails de oferta

### 2. Gestión de Usuarios (Admin)

**Endpoints:**
- `GET /api/users` - List all users
- `POST /api/users` - Create user (vendedor)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/:id/assigned-leads` - Get assigned prospects

**Permissions:**
```python
# Permission matrix
PERMISSIONS = {
    "admin": ["users:read", "users:write", "leads:read", "leads:write", "reports:read"],
    "vendedor": ["leads:read", "leads:write", "demos:write", "emails:write"]
}
```

### 3. Scraping y Geolocalización

**Services:**
- **Google Maps API:** Búsqueda de negocios por ubicación/rubro
- **Web Scraper:** Extracción de datos de websites
- **Social Media Analyzer:** Análisis de redes sociales
- **Technology Detector:** Detección de tecnologías usadas

**Data Points:**
- Nombre del negocio
- Dirección + coordenadas GPS
- Teléfono
- Website
- Redes sociales (Facebook, Instagram, Twitter)
- Tecnologías detectadas (WordPress, Shopify, etc.)
- Estado de la web (tiene/no tiene sitio)

**Endpoints:**
- `POST /api/scraping/search` - Search businesses by location/category
- `GET /api/scraping/business/:id` - Get scraped business details
- `POST /api/scraping/extract` - Extract data from website URL

### 4. CRM Core - Negocios/Prospectos

**Modelo Principal:**
```python
class Business(Base):
    __tablename__ = "businesses"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    phone = Column(String)
    website = Column(String)
    social_media = Column(JSON)  # {facebook: "", instagram: ""}
    technologies = Column(JSON)  # ["wordpress", "woocommerce"]
    has_website = Column(Boolean)
    scraped_data_id = Column(String, ForeignKey("scraped_data.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"))
    sale_probability = Column(Integer)  # 0-100
    status = Column(String)  # "new", "contacted", "interested", "closed"
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
```

**Endpoints:**
- `GET /api/businesses` - List businesses (with filters)
- `GET /api/businesses/:id` - Get business details
- `PUT /api/businesses/:id/assign` - Assign to seller
- `PUT /api/businesses/:id/probability` - Update sale probability
- `GET /api/businesses/map` - Get businesses for interactive map

### 5. Generación de Demo Web

**Process:**
1. Select business from CRM
2. Choose template by industry
3. Customize colors/branding
4. Generate static site
5. Upload to Cloud Storage
6. Generate public URL (with expiration)

**Templates:**
- Restaurant/Café
- Retail/Store
- Professional Services
- Health/Wellness
- Automotive

**Endpoints:**
- `POST /api/demos/generate` - Generate demo website
- `GET /api/demos/:id` - Get demo details
- `DELETE /api/demos/:id` - Delete demo
- `GET /api/demos/:id/preview` - Preview demo (public)

**Cloud Storage:**
```python
# Upload to S3-compatible storage
def upload_demo(business_id: int, html_content: str):
    bucket = "leadqualifier-demos"
    key = f"demos/{business_id}_{uuid4()}.html"
    
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=html_content,
        ContentType="text/html",
        Metadata={"business_id": str(business_id)}
    )
    
    url = f"https://demos.leadqualifier.com/{key}"
    return url
```

### 6. Email de Oferta

**Template:**
```html
Subject: Propuesta para {business_name}

Hola {contact_name},

Soy {seller_name} de {agency_name}. 

Estuve analizando tu negocio y noté que {observation}.

Preparamos una demo personalizada para mostrar cómo podrías {benefit}:

👉 <a href="{demo_url}">Ver demo personalizada</a>

La demo estará disponible por 7 días.

¿Te gustaría agendar una llamada para discutirlo?

Saludos,
{seller_name}
```

**Endpoints:**
- `POST /api/emails/generate` - Generate offer email
- `GET /api/emails/:id` - Get generated email
- `POST /api/emails/:id/send` - Send email (via SMTP)

---

## Base de Datos

### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'vendedor',
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Businesses table (CRM)
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(50),
    website TEXT,
    social_media JSONB,
    technologies JSONB,
    has_website BOOLEAN DEFAULT false,
    scraped_data_id VARCHAR(255),
    assigned_to INTEGER REFERENCES users(id),
    sale_probability INTEGER CHECK (sale_probability BETWEEN 0 AND 100),
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scraped data (MongoDB alternative in PostgreSQL)
CREATE TABLE scraped_data (
    id VARCHAR(255) PRIMARY KEY,
    raw_data JSONB,
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Demo websites
CREATE TABLE demos (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    template VARCHAR(100),
    colors JSONB,
    s3_key VARCHAR(500),
    public_url TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email offers
CREATE TABLE email_offers (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    seller_id INTEGER REFERENCES users(id),
    subject VARCHAR(500),
    body TEXT,
    demo_url TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### MongoDB Schema (Optional)

```javascript
// Scraped data collection
{
  _id: "google_maps_business_id",
  name: "Business Name",
  address: "Full address",
  location: {
    type: "Point",
    coordinates: [-58.45, -34.60]
  },
  phone: "+54 11 1234-5678",
  website: "https://example.com",
  socialMedia: {
    facebook: "https://facebook.com/...",
    instagram: "https://instagram.com/..."
  },
  technologies: ["wordpress", "woocommerce"],
  scrapedAt: ISODate("2026-07-06T00:00:00Z")
}
```

---

## Scraping & Geolocalización

### Google Maps API Integration

```python
from googlemaps import Client

gmaps = Client(api_key=GOOGLE_MAPS_API_KEY)

def search_businesses(location: str, radius: int, keyword: str):
    """Search businesses by location and category."""
    results = gmaps.places_nearby(
        location=location,
        radius=radius,
        keyword=keyword
    )
    
    businesses = []
    for place in results['results']:
        business = {
            'name': place['name'],
            'address': place.get('vicinity'),
            'latitude': place['geometry']['location']['lat'],
            'longitude': place['geometry']['location']['lng'],
            'place_id': place['place_id']
        }
        businesses.append(business)
    
    return businesses
```

### Web Scraper

```python
import requests
from bs4 import BeautifulSoup

def extract_website_data(url: str):
    """Extract data from business website."""
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        data = {
            'title': soup.title.string if soup.title else '',
            'meta_description': '',
            'phone': extract_phone(soup),
            'email': extract_email(soup),
            'social_links': extract_social_links(soup),
            'technologies': detect_technologies(response.headers, soup)
        }
        
        # Extract meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            data['meta_description'] = meta_desc.get('content')
        
        return data
    except Exception as e:
        return {'error': str(e)}
```

### Technology Detection

```python
def detect_technologies(headers, soup):
    """Detect technologies used on website."""
    technologies = []
    
    # Check headers
    server = headers.get('Server', '').lower()
    if 'nginx' in server:
        technologies.append('nginx')
    if 'apache' in server:
        technologies.append('apache')
    
    # Check meta generators
    generators = soup.find_all('meta', attrs={'name': 'generator'})
    for gen in generators:
        content = gen.get('content', '').lower()
        if 'wordpress' in content:
            technologies.append('wordpress')
        if 'shopify' in content:
            technologies.append('shopify')
        if 'wix' in content:
            technologies.append('wix')
    
    # Check script sources
    scripts = soup.find_all('script', src=True)
    for script in scripts:
        src = script['src'].lower()
        if 'wp-content' in src:
            technologies.append('wordpress')
        if 'shopify' in src:
            technologies.append('shopify')
    
    return list(set(technologies))
```

---

## Demo Web Generator

### Template System

```python
from jinja2 import Template

def generate_demo(business: dict, template: str, colors: dict):
    """Generate demo website using template."""
    
    # Load template
    template_path = f"templates/{template}.html"
    with open(template_path, 'r') as f:
        template_content = f.read()
    
    # Render with business data
    jinja_template = Template(template_content)
    html = jinja_template.render(
        business_name=business['name'],
        business_address=business['address'],
        business_phone=business['phone'],
        primary_color=colors.get('primary', '#007bff'),
        secondary_color=colors.get('secondary', '#6c757d')
    )
    
    return html
```

### Template Example (Restaurant)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ business_name }} - Demo</title>
    <style>
        :root {
            --primary: {{ primary_color }};
            --secondary: {{ secondary_color }};
        }
        
        .hero {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            padding: 4rem 2rem;
            text-align: center;
        }
        
        .cta-button {
            background: white;
            color: var(--primary);
            padding: 1rem 2rem;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="hero">
        <h1>{{ business_name }}</h1>
        <p>¡Bienvenido a nuestro nuevo sitio web!</p>
        <a href="tel:{{ business_phone }}" class="cta-button">Llamar ahora</a>
    </div>
    
    <div class="content">
        <h2>Nuestros Servicios</h2>
        <p>Ofrecemos los mejores productos y servicios...</p>
    </div>
    
    <footer>
        <p>{{ business_address }}</p>
        <p>Tel: {{ business_phone }}</p>
    </footer>
</body>
</html>
```

---

## Email Offer Generator

### Email Template

```python
def generate_offer_email(business: dict, seller: dict, demo_url: str):
    """Generate personalized offer email."""
    
    subject = f"Propuesta para {business['name']}"
    
    body = f"""
    Hola,
    
    Soy {seller['full_name']} de {seller['agency']}.
    
    Estuve analizando tu negocio y noté que {get_observation(business)}.
    
    Preparamos una demo personalizada para mostrar cómo podrías {get_benefit(business)}:
    
    👉 <a href="{demo_url}">Ver demo personalizada</a>
    
    La demo estará disponible por 7 días.
    
    ¿Te gustaría agendar una llamada para discutirlo?
    
    Saludos,
    {seller['full_name']}
    {seller['email']}
    {seller['phone']}
    """
    
    return {
        'subject': subject,
        'body': body,
        'demo_url': demo_url
    }
```

### Observation Generator (AI)

```python
def get_observation(business: dict):
    """Generate observation based on scraped data."""
    observations = []
    
    if not business.get('has_website'):
        observations.append("no tienes sitio web")
    
    if business.get('technologies') and 'wordpress' in business['technologies']:
        observations.append("tu sitio web usa WordPress (podría ser más moderno)")
    
    if not business.get('social_media', {}).get('instagram'):
        observations.append("no tienes presencia en Instagram")
    
    return observations[0] if observations else "hay oportunidades de mejora digital"
```

---

## Deployment

### Docker Compose (Development)

```yaml
services:
  # PostgreSQL
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: leadqualifier
      POSTGRES_PASSWORD: secure-password
      POSTGRES_DB: leadqualifier
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # MongoDB
  mongodb:
    image: mongo:6
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secure-password
    volumes:
      - mongodb_data:/data/db

  # Redis
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  # Backend (FastAPI)
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://leadqualifier:password@postgres/leadqualifier
      MONGODB_URL: mongodb://admin:password@mongodb:27017
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - mongodb
      - redis

  # Frontend (Next.js)
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on:
      - backend

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
```

### Production Deployment

**Server:** Hetzner Cloud (shared with other SaaS)  
**Domain:** `crm.leadqualifier.com` (pending)  
**Staging:** `staging.crm.leadqualifier.com` (pending)

**Steps:**
1. Clone repository
2. Copy `.env.production` from template
3. Run `docker compose -f docker-compose.prod.yml up -d`
4. Configure nginx reverse proxy
5. Generate SSL certificate (Let's Encrypt)

---

## 📞 Soporte y Contacto

**Author:** marcelompz  
**Email:** marcelo@pesallaccia.com  
**GitHub:** https://github.com/marcelompz/LeadQualifierCRM  
**Wiki:** https://marcelompz.github.io/wiki/leadqualifier/

---

## 🔄 Changelog

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-07-06 | Documentación inicial creada | marcelompz |
| 2026-07-06 | Agregados patrones de scraping | marcelompz |
| 2026-07-06 | Agregado demo web generator | marcelompz |

---

**Próxima revisión:** 2026-10-06 (Quarterly)
