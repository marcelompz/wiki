# Manual de Implementación – Schema LocalBusiness en OmniFlow

**Versión:** 1.0  
**Fecha:** Septiembre 2026  
**Alcance:** Todas las páginas BioLink generadas por el wizard de OmniFlow / OmniBio

---

## 1. Objetivo

Garantizar que **cada BioLink** creado con el wizard de OmniFlow incluya automáticamente Structured Data (Schema.org) del tipo más específico posible (`LocalBusiness` o subtipos como `Restaurant`), para mejorar la visibilidad en Google, Google AI Overviews, Perplexity y otros motores de IA.

---

## 2. Tipo de Schema recomendado

| Categoría del negocio          | Tipo Schema recomendado     |
|--------------------------------|-----------------------------|
| Restaurante / Gastronomía      | `Restaurant`                |
| Cafetería                      | `CafeOrCoffeeShop`          |
| Bar / Pub                      | `BarOrPub`                  |
| Tienda física / Retail         | `Store`                     |
| Servicios generales            | `LocalBusiness`             |
| Otro                           | El subtipo más cercano de Schema.org |

**Regla de oro:** Usar siempre el tipo más específico posible. `Restaurant` hereda todas las propiedades de `LocalBusiness`.

---

## 3. Template JSON-LD estándar

Inyectar este bloque en el `<head>` (o al final del `<body>`) de cada página BioLink:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": "https://TU-DOMINIO.com/#business",
  "name": "Nombre del Negocio",
  "url": "https://TU-DOMINIO.com",
  "image": "https://TU-DOMINIO.com/imagen-principal.jpg",
  "description": "Descripción corta del negocio (máximo 250-300 caracteres).",
  "telephone": "+54XXXXXXXXXX",
  "priceRange": "$$",
  "servesCuisine": ["Italiana", "Mediterránea"],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Calle y número",
    "addressLocality": "Ciudad",
    "addressRegion": "Provincia / Estado",
    "postalCode": "Código Postal",
    "addressCountry": "AR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -34.6037,
    "longitude": -58.3816
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "12:00",
      "closes": "15:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "20:00",
      "closes": "23:30"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday", "Sunday"],
      "opens": "12:00",
      "closes": "23:30"
    }
  ],
  "sameAs": [
    "https://www.instagram.com/usuario",
    "https://www.facebook.com/usuario",
    "https://wa.me/54XXXXXXXXXX"
  ],
  "hasMenu": "https://TU-DOMINIO.com",
  "acceptsReservations": false,
  "paymentAccepted": "Cash, Credit Card, Debit Card, Mercado Pago"
}
</script>
```

---

## 4. Datos que debe capturar el Wizard

### Obligatorios
- Nombre comercial
- Tipo de negocio (mapea a `@type`)
- URL del BioLink
- Dirección completa (calle, ciudad, provincia, CP, país)
- Teléfono en formato internacional

### Altamente recomendados
- Descripción corta
- Imagen principal
- Rango de precios (`$` a `$$$$`)
- Cocina / categoría (`servesCuisine`)
- Horarios de apertura
- Coordenadas geográficas (lat/long)
- Enlaces a redes sociales (`sameAs`)
- URL del menú / catálogo

---

## 5. Reglas de implementación técnica

1. **Renderizado**: El JSON-LD debe estar presente en el HTML inicial (SSR o pre-render). No depender de JavaScript del cliente.
2. **Ubicación**: Preferiblemente dentro del `<head>`.
3. **@id**: Usar un identificador único por negocio (`https://dominio.com/#business`).
4. **Consistencia NAP**: El nombre, dirección y teléfono deben coincidir exactamente con Google Business Profile y redes sociales.
5. **No inventar ratings**: No incluir `aggregateRating` ni `review` a menos que existan reseñas reales y verificables.
6. **Actualización**: Regenerar el schema cada vez que el cliente modifique datos relevantes (horarios, dirección, teléfono, etc.).

---

## 6. Validación

Antes de publicar cualquier BioLink:

1. [Google Rich Results Test](https://search.google.com/test/rich-results)
2. [Schema Markup Validator](https://validator.schema.org/)
3. Inspección de URL en Google Search Console

Mostrar al usuario un indicador visual:  
**“Tu BioLink está optimizado para Google y buscadores de IA”**

---

## 7. Checklist de despliegue

- [ ] Campos de captura de datos agregados al wizard
- [ ] Mapeo de categorías → `@type` específico implementado
- [ ] Generación automática del JSON-LD
- [ ] Inyección en el HTML de la página
- [ ] Validación automática al publicar
- [ ] Schema regenerado al editar datos
- [ ] Provecchio.com actualizado como caso de prueba
- [ ] Documentación interna actualizada

---

## 8. Notas importantes

- Google recomienda JSON-LD como formato preferido.
- El schema no es un factor de ranking directo, pero mejora el entendimiento de la entidad y la elegibilidad para rich results y citas en IA.
- Priorizar siempre datos reales y precisos.

---

**Documento listo para el equipo de Producto y Desarrollo de OmniFlow.**  
Última actualización: Septiembre 2026