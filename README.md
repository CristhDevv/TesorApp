# TesorApp - Plataforma de Tesorería para Iglesias

Plataforma web robusta y moderna diseñada para reemplazar el flujo financiero tradicional en Excel de un tesorero que administra más de 50 iglesias. Ofrece flexibilidad en la definición de campos, recálculo de fórmulas en tiempo real en cascada, arrastre de valores acumulables, control de accesos granular por roles (Tesorero e Iglesias), auditoría inalterable de cambios y dos experiencias de frontend totalmente independientes (Desktop y Mobile).

**Todo el sistema se sirve unificado desde un único servidor NestJS en el puerto 3000**, eliminando la necesidad de encender múltiples consolas, simplificando la arquitectura y eliminando problemas de CORS.

---

## Estructura del Proyecto

El proyecto está organizado en un monorepo limpio con tres módulos independientes:

```
TesorApp/
├── backend/                # API REST de NestJS (sirve las vistas estáticas y endpoints)
│   ├── prisma/             # Esquema y migraciones de la base de datos
│   └── src/                # Lógicas de negocio, fórmulas y enrutador principal
├── frontend-desktop/       # Portal administrativo de escritorio (React + Vite + TS)
└── frontend-mobile/        # Aplicación móvil táctil para captura rápida (React + Vite + TS)
```

---

## URLs del Servidor Unificado

Al encender únicamente el servidor del backend, podrás acceder a todo el ecosistema desde tu navegador:

- **Enrutador con Detección de Dispositivo**: `http://localhost:3000/`
  *Detecta automáticamente el ancho de la pantalla y el agente de navegación del usuario para redirigirlo al frontend adecuado.*
- **Portal de Escritorio (Desktop)**: `http://localhost:3000/desktop/`
- **Portal Móvil (Mobile)**: `http://localhost:3000/mobile/`
- **Endpoints de la API**: `http://localhost:3000/` (ej. `/auth/login`, `/valores`, `/periodos`)

---

## Credenciales de Acceso Sembradas

Para verificar el sistema, hemos inicializado los siguientes usuarios en la base de datos PostgreSQL remota (contraseña común: `Tesorero2026!` para las cuentas de prueba, y tu cuenta personalizada):

1. **Tu Cuenta de Administrador (Creada a Petición):**
   - **Correo:** `camilovelascoofficial@gmail.com`
   - **Contraseña:** `Soloc@li1`

2. **Rol Tesorero (Acceso de Prueba General):**
   - **Correo:** `tesorero@tesorapp.com`
   - **Contraseña:** `Tesorero2026!`

3. **Rol Iglesia (Representante de Iglesia Central):**
   - **Correo:** `central@tesorapp.com`
   - **Contraseña:** `Tesorero2026!`

4. **Rol Iglesia (Representante de Iglesia del Norte):**
   - **Correo:** `norte@tesorapp.com`
   - **Contraseña:** `Tesorero2026!`

---

## Cómo Iniciar el Servidor Unificado

### Requisitos Previos

- **Node.js** v24+
- **NPM** v10+

### Paso Único: Iniciar Backend

1. Diríjase a la carpeta `/backend`:
   ```bash
   cd backend
   ```
2. Asegúrese de que el archivo `.env` contenga la cadena de conexión del pooler de Supabase utilizando la cuenta autorizada `tesorapp`:
   ```env
   DATABASE_URL="postgresql://tesorapp.pezfespirobgfluznmey:TesorAppDB2026!@aws-0-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   JWT_SECRET="secret-key-for-jwt-tesorapp-2026"
   PORT=3000
   ```
3. Ejecute el comando de inicio en desarrollo:
   ```bash
   npm run start:dev
   ```
   El servidor compilará la lógica de negocio y quedará escuchando en `http://localhost:3000` sirviendo todos los recursos.

---

## Cómo Compilar Cambios de los Frontends (Opcional)

Si realizas modificaciones visuales o de interfaz en los directorios de los frontends, puedes reconstruir los paquetes compilados ejecutando:

- **Para Desktop**:
  ```bash
  cd frontend-desktop
  npm run build
  ```
- **Para Mobile**:
  ```bash
  cd frontend-mobile
  npm run build
  ```
Los bundles se compilarán en sus respectivas carpetas `/dist` y serán servidos de forma inmediata por el servidor de NestJS.
