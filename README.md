# SafetyBox

Bóveda privada para almacenar credenciales cifradas.

## Arquitectura

- **Frontend:** React 19 + Vite
- **Backend:** NestJS
- **Persistencia:** TypeORM + MySQL
- **Autenticación:** JWT
- **Cifrado local:** Web Crypto API con AES-GCM y PBKDF2

## Estructura

```text
safetybox/
├── api/    # API NestJS, usuarios, JWT y entidades TypeORM
└── web/    # Aplicación React + Vite
```

## Desarrollo

### Frontend

```bash
cd web
npm install
npm run dev
```

### Backend

Copia `api/.env.example` a `api/.env`, configura `JWT_SECRET` y los datos de MySQL.

```bash
cd api
docker compose up -d mysql
npm install
npm run start:dev
```

La API estará disponible en `http://localhost:3000` y su comprobación de salud en `http://localhost:3000/health`.

## Autenticación

- `POST /auth/register`: crear una cuenta.
- `POST /auth/login`: iniciar sesión y obtener un JWT.
- `GET /auth/me`: consultar el usuario autenticado.

Las contraseñas se guardan como hashes `bcrypt`. La contraseña maestra de la bóveda no se almacena.

## Estado actual

El frontend implementa una bóveda local cifrada. La sincronización con la API y los endpoints para persistir registros de bóveda por usuario están pendientes.
