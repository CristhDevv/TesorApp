# 07 — Scorecard Final de Seguridad

| Dominio / Control | TesorApp Backend (NestJS) | TesorApp Frontend (Desktop & Mobile) | Base de Datos & Infraestructura |
| :--- | :---: | :---: | :---: |
| **Autenticación y JWT** | **Alto** (sin secreto hardcodeado, validación de usuario activo en BD, expiración 12h) | **Medio-Alto** (login sobre HTTPS, pendiente migración a cookies `HttpOnly`) | N/A |
| **Autorización / RBAC / IDOR** | **Alto** (`RolesGuard` + validación por `iglesiaId` en `ai`, `gastos`, `informes`, `valores`, `usuarios`) | **Alto** (la seguridad no depende del cliente) | **No verificable en vivo** (RLS pendiente de comprobación directa) |
| **Protección contra Inyección / XSS** | **Alto** (Prisma parametrizado, `ValidationPipe` whitelist, `expr-eval` sin acceso a miembros) | **Alto** (React escape automático + CSP en Vercel sin `'unsafe-eval'`) | **Alto** (`keepalive_pg_cron.sql` con `search_path` fijo) |
| **CORS y Cabeceras HTTP** | **Alto** (Allowlist estricta, sin `X-Powered-By`, `nosniff`, `DENY`) | **Alto** (CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) | **Alto** (HSTS preload en Vercel) |
| **Anti-Fuerza Bruta y Anti-Abuso** | **Medio-Alto** (`RateLimitGuard` en login, AI y exportaciones; pendiente backend distribuido) | **Alto** | **Medio-Alto** (protección Edge de Vercel) |
| **Manejo de Errores y Logs** | **Alto** (sin `stack` ni `errorDetails` en producción, logging de intentos fallidos) | **Alto** | **Alto** |

### Estado Global
- **Postura General**: **Sólida (Primera Fase de Hardening Completada y Verificada en Producción)** para vulnerabilidades críticas y altas de API, autenticación, CORS, cabeceras y exposición de errores.
