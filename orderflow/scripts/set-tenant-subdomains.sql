-- Script de actualización de subdominios por tenant en OrderFlow
-- Ejecutar en PostgreSQL (orderflow_prod_db / orderflow_db)

-- 1. GAIA WELLNESS -> gaiawellness.pesallaccia.com
UPDATE tenants
SET subdomain = 'gaiawellness',
    "subdomainVerified" = true,
    "ecommerceUrl" = 'https://gaiawellness.pesallaccia.com',
    "updatedAt" = NOW()
WHERE "apiKeySecret" = '067059e2d6ae48d8a5f7c81b85fbf522'
   OR id = 'spa-wellness-001'
   OR id = 'gaia-wellness-001';

-- 2. DIMORA / PROVECCHIO -> dimora.pesallaccia.com
UPDATE tenants
SET subdomain = 'dimora',
    "subdomainVerified" = true,
    "ecommerceUrl" = 'https://dimora.pesallaccia.com',
    "updatedAt" = NOW()
WHERE "apiKeySecret" = '0bb60656b9fbfcc27e38ae444e9e376f'
   OR id = 'provecchio-dimora-001';

-- 3. FERRESUR -> ferresur.pesallaccia.com
UPDATE tenants
SET subdomain = 'ferresur',
    "subdomainVerified" = true,
    "ecommerceUrl" = 'https://ferresur.pesallaccia.com',
    "updatedAt" = NOW()
WHERE "apiKeySecret" = 'sk_cdb58700aac8479a9f9327cc8cb9e24d'
   OR LOWER(name) LIKE '%ferresur%'
   OR id LIKE '%ferresur%';

-- 4. DEMOAUTO REPUESTOS -> demoauto-repuestos.pesallaccia.com
UPDATE tenants
SET subdomain = 'demoauto-repuestos',
    "subdomainVerified" = true,
    "ecommerceUrl" = 'https://demoauto-repuestos.pesallaccia.com',
    "updatedAt" = NOW()
WHERE "apiKeySecret" = 'd077a104c7924eec846588af8b0138cc'
   OR id = 'auto-repuestos-001'
   OR id = 'repuestos-enciso-001';

-- 5. ADMIN OMNIFLOW (Empresa Administradora) -> Sin subdominio (pesallaccia.com raíz)
UPDATE tenants
SET subdomain = NULL,
    "subdomainVerified" = false,
    "updatedAt" = NOW()
WHERE "apiKeySecret" = 'e54959344346e860f8c0cdf4d4307df28c53c5a18134f2cc3edf51a136b70435'
   OR LOWER(name) LIKE '%omniflow admin%'
   OR LOWER(name) LIKE '%empresa administradora%';

-- Verificación final de subdominios configurados
SELECT id, name, "apiKeySecret", subdomain, "subdomainVerified", "ecommerceUrl"
FROM tenants
ORDER BY name;
