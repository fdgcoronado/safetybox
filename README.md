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

## Ventajas

- Control total del usuario sobre su propia clave maestra
- Cifrado de credenciales en el navegador antes de almacenarse
- Datos protegidos en tránsito entre cliente y servidor
- Bóveda privada con acceso rápido a credenciales favoritas
- UX clara y moderna para gestionar credenciales con seguridad
- Arquitectura preparada para crecimiento con JWT, MySQL y TypeORM

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

## Despliegue CI/CD

GitHub Actions valida el build en pull requests y despliega al hacer push a `develop`, `production`, `main` o `master`. Los jobs de publicación usan los GitHub Environments `develop` o `production`; `main` y `master` también apuntan a `production`. Los despliegues de web y API son independientes.

En el Environment `develop`, configura estos **secrets** y **variables**:

- Secrets: `FTP_HOST_DEV`, `FTP_USERNAME_DEV`, `FTP_PASSWORD_DEV`
- Variables: `FTP_REMOTE_DIR_WEB_DEV`, `FTP_REMOTE_DIR_API_DEV`

En el Environment `production`, configura:

- Secrets: `FTP_HOST_PRD`, `FTP_USERNAME_PRD`, `FTP_PASSWORD_PRD`
- Variables: `FTP_REMOTE_DIR_WEB_PRD`, `FTP_REMOTE_DIR_API_PRD`

Los directorios remotos son relativos a la raíz visible para cada usuario FTP. En `develop`, el usuario inicia directamente en `/home/<user>/public_html/safetybox-dev`; configura `FTP_REMOTE_DIR_WEB_DEV` como `/` y `FTP_REMOTE_DIR_API_DEV` como `/api`. Así, web queda en `/home/<user>/public_html/safetybox-dev` y la API en `/home/<user>/public_html/safetybox-dev/api`. En `production`, usa `/` y `/api` si el usuario FTP también inicia en la raíz web de producción; si su raíz inicial es distinta, ajusta ambas variables respecto a esa raíz.

El resultado del deploy será:

- Contenido de `web/dist/` directamente en la raíz pública.
- Archivos de API en `api/` y compilación en `api/dist/`.

Configura a nivel de repositorio las variables que necesita el build web:

- `VITE_API_URL_DEV`, `VITE_API_URL_PROD`
- Opcionales: `VITE_PBKDF2_ITERATIONS`, `VITE_TRANSPORT_KEY_SALT`

El workflow web publica únicamente `web/dist/` y excluye `api/` del publish y de los borrados remotos. Además, se asegura de crear de nuevo la carpeta API si no existe. El workflow API publica `api/dist/` y requiere hosting compatible con Node.js, con el archivo de inicio configurado como `dist/main.js` y las variables de entorno de la API definidas en el hosting. El workflow crea y sube `node_modules.zip` por separado, nunca transfiere la carpeta `node_modules/`. Si esta carpeta todavía no existe en el servidor, extrae el ZIP manualmente dentro de la carpeta de la API y reinicia la aplicación desde el hosting. Cuando ya existe, el workflow envía `tmp/restart.txt` para solicitar el reinicio.

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
