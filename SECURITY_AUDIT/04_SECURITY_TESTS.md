# 04 — Pruebas de Seguridad Ejecutadas y Evidencias

Las pruebas se ejecutaron de manera controlada y no destructiva contra el despliegue de producción en Vercel correspondiente al commit `05aab9c` (`backend-49fh2g33a-camivelasco93-5981s-projects.vercel.app` y `tesor-okjergrek-camivelasco93-5981s-projects.vercel.app`).

## 1. Verificación de Cabeceras HTTP de Seguridad
- **Frontend (`/`)**:
  - HTTP `200 OK`
  - `x-content-type-options`: `nosniff`
  - `x-frame-options`: `DENY`
  - `referrer-policy`: `strict-origin-when-cross-origin`
  - `permissions-policy`: `camera=(), microphone=(), geolocation=()`
  - `content-security-policy`: presente y activa.
- **Backend (`/health`)**:
  - HTTP `200 OK`, base de datos conectada (`95ms`).
  - `x-powered-by`: **Eliminado** (no presente en respuesta).
  - `x-content-type-options`: `nosniff`
  - `x-frame-options`: `DENY`

## 2. Verificación de Política CORS
- Solicitud con `Origin: https://evil.example.com` a `/health`: **BLOQUEADA** (sin cabecera `Access-Control-Allow-Origin`).
- Solicitud con `Origin: https://tesor-app-nine.vercel.app` a `/health`: **PERMITIDA** (`access-control-allow-origin: https://tesor-app-nine.vercel.app`).

## 3. Verificación de Control de Acceso Sin Autenticación
- `POST /ai/copilot` sin token -> **HTTP 401 Unauthorized**.
- `GET /gastos` sin token -> **HTTP 401 Unauthorized**.
- `GET /informes/periodo?periodo_id=test` sin token -> **HTTP 401 Unauthorized**.

## 4. Verificación Anti-Enumeración y Sanitización de Errores
- `POST /auth/login` con usuario inexistente:
  - HTTP `401`, cuerpo: `{"statusCode":401,"timestamp":"...","path":"/auth/login","method":"POST","message":"Credenciales inválidas"}`.
  - Sin campo `errorDetails` ni trazas de pila (`stack`).

## 5. Limitaciones de Pruebas en Este Entorno
- No se ejecutaron pruebas volumétricas de carga/DDoS sobre producción por política de continuidad operativa.
- El acceso directo a Supabase SQL vía MCP retornó `Unauthorized` tras el reinicio del servidor, por lo que la auditoría de políticas RLS activas en vivo queda marcada como **NO VERIFICABLE CON EL ACCESO ACTUAL**.
- No se ejecutó `npm audit` localmente porque `node_modules` no está instalado en el entorno local; quedó automatizado en `.github/workflows/security-audit.yml`.
