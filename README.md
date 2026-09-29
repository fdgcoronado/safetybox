# SafetyBox

SafetyBox es una bóveda segura para guardar credenciales, contraseñas y accesos digitales bajo control del usuario.

## Visión general

- Frontend: React + Vite
- Backend: NestJS
- Base de datos: MySQL
- ORM: TypeORM
- Autenticación: JWT
- Cifrado: Web Crypto API (AES-GCM + PBKDF2) en el navegador
- Seguridad: la llave maestra nunca se guarda ni se almacena en la base de datos

## Funcionalidades actuales

- Registro e inicio de sesión con JWT
- Bóveda protegida por una llave maestra
- Cifrado de credenciales antes de persistirlas
- Envío de datos cifrados entre cliente y servidor
- Filtro y vista de credenciales favoritas
- Sidebar con acceso rápido a entradas favoritas
- Modo de login/registro con flujo de autenticación de usuario
- Carga de configuración por variables de entorno
- Logging de errores y manejo seguro de excepciones

## Estructura del proyecto

```text
safetybox/
├── api/                # Backend NestJS + TypeORM + MySQL
├── web/                # Frontend React + Vite
├── README.md           # Documentación del proyecto
├── .gitignore
└── package.json
```

## Seguridad del producto

SafetyBox está pensado para que:

- las credenciales del usuario sean cifradas antes de guardarse
- el cliente derive la llave maestra desde una contraseña local
- la llave maestra no se almacene en localStorage ni en base de datos
- los datos viajen cifrados entre navegador y backend
- el backend no exponga mensajes internos sensibles

## Requerimientos

- Node.js 18+
- MySQL 8+
- npm

## Configuración

### Backend

1. Entrar a la carpeta `api`
2. Crear `.env` a partir de la configuración del proyecto
3. Configurar:
   - `PORT`
   - `NODE_ENV`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USERNAME`
   - `DB_PASSWORD`
   - `DB_DATABASE`

Ejemplo:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=replace-this-with-a-long-random-secret
JWT_EXPIRES_IN=15m
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=123456
DB_DATABASE=safetyboxdb
```

### Frontend

En `web/.env` configurar:

```env
VITE_API_URL=http://localhost:3000
VITE_PBKDF2_ITERATIONS=250000
VITE_TRANSPORT_KEY_SALT=safetybox-json-transport
```

## Ejecutar localmente

### API

```bash
cd api
npm install
npm run start:dev
```

### Web

```bash
cd web
npm install
npm run dev
```

La API queda disponible en:

- http://localhost:3000
- http://localhost:3000/health

La app web queda disponible normalmente en:

- http://localhost:5173

## Endpoints principales

### Autenticación

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Bóveda

- `GET /vault`
- `POST /vault`
- `GET /vault/entries`
- `PUT /vault/entries`
- `DELETE /vault/entries`
- `DELETE /vault`

## Estado actual

El proyecto ya incluye:

- autenticación con JWT
- bóveda con cifrado local y persistencia segura
- estructura modular en backend
- integración de frontend con backend
- favoritos en la vista principal
- seguridad visible en la interfaz para reforzar la confianza del usuario

## Nota

Este proyecto está orientado a un uso seguro y moderno de gestión de credenciales, con enfoque en privacidad, cifrado y control total por parte del usuario.
