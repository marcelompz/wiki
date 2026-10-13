# Pin_code faltante en tabla users

## Síntoma
- Errores 500 al autenticarse (login)
- Log del backend: `The column \`users.pin_code\` does not exist in the current database`
- Endpoint `POST /api/v1/auth/login` falla con Prisma error

## Causa raíz
El schema Prisma (`schema.prisma`) define el campo `pinCode` en el modelo `User` (`@map("pin_code")`) pero no existe una migración correspondiente que añada la columna a la base de datos. La columna se añadió al schema sin crear la migración asociada.

Afecta a ambas bases de datos (producción y provecchio).

## Solución aplicada
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10) DEFAULT NULL;
```

Ejecutado directamente en el contenedor de PostgreSQL de cada servidor.

## Prevención
Crear migración Prisma:
```bash
cd backend
npx prisma migrate dev --name add-pin-code-to-users
npx prisma migrate deploy
```

## Verificación
```sql
SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='pin_code';
```
Debe devolver `pin_code`.
