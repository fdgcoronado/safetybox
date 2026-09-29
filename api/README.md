# SafetyBox API

Backend NestJS con TypeORM y MySQL.

## Desarrollo

1. Copia `.env.example` a `.env`.
2. Levanta MySQL con `docker compose up -d mysql`.
3. Instala dependencias con `npm install`.
4. Arranca NestJS con `npm run start:dev`.
5. Comprueba `http://localhost:3000/health`.

`JWT_SECRET` debe ser una cadena larga y aleatoria. No la subas al repositorio.

## Crear la base de datos manualmente

El script `scripts/create-database.sql` crea la base `safetybox` y las tablas `users` y `vault_records` si todavía no existen, usando `utf8mb4`. Las columnas corresponden a las entidades TypeORM. Ejecútalo con una cuenta MySQL que tenga permisos para crear bases de datos y tablas:

En PowerShell, desde la carpeta `api`:

```powershell
Get-Content .\scripts\create-database.sql | mysql --host=localhost --user=root --password
```

En Bash:

```bash
mysql --host=localhost --user=root --password < scripts/create-database.sql
```

Verifica que `DB_DATABASE` en `.env` tenga el mismo valor. Al usar `docker compose up -d mysql`, Docker Compose crea automáticamente `safetybox`; en desarrollo TypeORM crea las tablas al iniciar la API. Para preparar la base y las tablas manualmente (por ejemplo, en producción), ejecuta este script.

## Autenticación

- `POST /auth/register` crea una cuenta con `{ "email": "...", "password": "..." }`.
- `POST /auth/login` devuelve `accessToken` y los datos públicos del usuario.
- `GET /auth/me` requiere `Authorization: Bearer <accessToken>`.

Las contraseñas se guardan como hashes `bcrypt`; los JWT expiran en 15 minutos.

## Logs y errores

El backend crea la carpeta `logs/` automáticamente:

- `logs/app.log`: eventos generales de la aplicación.
- `logs/errors.log`: excepciones, stack traces y contexto técnico para diagnóstico.

El filtro global de excepciones registra el detalle interno y devuelve mensajes simples al cliente. Los archivos de logs están excluidos de Git y no deben contener contraseñas, tokens ni payloads sensibles.

En desarrollo TypeORM crea y actualiza la tabla `vault_records` automáticamente. En producción `synchronize` queda desactivado y deberán usarse migraciones.

Los campos persistidos para la bóveda son `encryptedPayload`, `salt` e `initializationVector`. El servidor no debe recibir contraseñas maestras ni claves en texto plano.
