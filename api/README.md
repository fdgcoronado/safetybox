# SafetyBox API

Backend NestJS con TypeORM y MySQL.

## Desarrollo

1. Copia `.env.example` a `.env`.
2. Levanta MySQL con `docker compose up -d mysql`.
3. Instala dependencias con `npm install`.
4. Arranca NestJS con `npm run start:dev`.
5. Comprueba `http://localhost:3000/health`.

`JWT_SECRET` debe ser una cadena larga y aleatoria. No la subas al repositorio.

## Autenticación

- `POST /auth/register` crea una cuenta con `{ "email": "...", "password": "..." }`.
- `POST /auth/login` devuelve `accessToken` y los datos públicos del usuario.
- `GET /auth/me` requiere `Authorization: Bearer <accessToken>`.

Las contraseñas se guardan como hashes `bcrypt`; los JWT expiran en 15 minutos.

En desarrollo TypeORM crea y actualiza la tabla `vault_records` automáticamente. En producción `synchronize` queda desactivado y deberán usarse migraciones.

Los campos persistidos para la bóveda son `encryptedPayload`, `salt` e `initializationVector`. El servidor no debe recibir contraseñas maestras ni claves en texto plano.
