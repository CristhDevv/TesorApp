# 02 — Diagnóstico Inicial de Seguridad (Auditoría de Línea Base)

## Metodología
Revisión manual estática del código fuente (`backend/src`, `backend/api`, `frontend-desktop/src`, `frontend-mobile`, `supabase/`), configuración de despliegue (`vercel.json`) y verificación de cabeceras en producción.  
Referencia: OWASP Top 10 (2021), OWASP API Security Top 10 (2023) y OWASP ASVS.

## Hallazgos Detectados

| ID | Severidad | Componente | Descripción del Riesgo |
| :--- | :--- | :--- | :--- |
| **SEC-01** | **ALTA** | `backend/src/auth/auth.module.ts`, `jwt.strategy.ts` | Secreto JWT con fallback literal hardcodeado (`process.env.JWT_SECRET \|\| '...'`). Si falta la variable en algún entorno, permite falsificación de tokens para cualquier rol. Además, `JwtStrategy.validate` no validaba si el usuario seguía `activo` en base de datos. |
| **SEC-02** | **ALTA** | `backend/src/ai/ai.controller.ts` | El endpoint `POST /ai/copilot` solo exigía `JwtAuthGuard` sin `RolesGuard`. Un usuario con rol `iglesia` podía consultar cifras consolidadas, gastos y movimientos de fondos de todas las demás iglesias. |
| **SEC-03** | **ALTA** | `backend/src/gastos/gastos.controller.ts` | Los endpoints de lectura (`/gastos`, `/gastos/resumen`, `/gastos/:id`, `/gastos/fondos/:id/movimientos`) carecían de `@Roles(...)`, permitiendo a usuarios de rol `iglesia` consultar egresos y fondos de tesorería central. |
| **SEC-04** | **ALTA** | `backend/src/main.ts`, `backend/api/index.ts` | CORS permisivo (`origin: true` / `callback(null, true)`) combinado con `credentials: true`, reflejando cualquier origen arbitrario. |
| **SEC-05** | **ALTA** | `backend/api/index.ts`, `all-exceptions.filter.ts` | Exposición de información interna: el handler serverless devolvía `stack` y `err.message` en errores 500; el filtro global devolvía `errorDetails` y detalles de errores Prisma al cliente. |
| **SEC-06** | **MEDIA** | `backend/src/auth/auth.controller.ts`, `auth.service.ts` | Ausencia de rate limiting contra fuerza bruta en `/auth/login` y enumeración de usuarios por mensajes distintos (`Credenciales inválidas o usuario inactivo` vs `Credenciales inválidas`). |
| **SEC-07** | **MEDIA** | `backend/src/informes/informes.controller.ts` | `GET /informes/periodo` no restringía roles, permitiendo a un usuario `iglesia` listar el estado y observaciones de informes de otras congregaciones. |
| **SEC-08** | **MEDIA** | `vercel.json` (raíz, desktop, mobile), `main.ts` | Ausencia de cabeceras de seguridad (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) y presencia de `X-Powered-By: Express`. |
| **SEC-09** | **MEDIA** | `backend/src/reportes/reportes.controller.ts` | Parámetro `periodo_id` interpolado directamente en la cabecera `Content-Disposition` sin sanitización. |
| **SEC-10** | **MEDIA** | `backend/src/formulas/formulas.service.ts`, `valores.controller.ts` | Parser `expr-eval` sin `allowMemberAccess: false` ni límite de longitud; `valor_manual` no validaba `Number.isFinite`. |
| **SEC-11** | **BAJA** | `supabase/keepalive_pg_cron.sql`, `frontend-mobile/vercel.json` | Función `SECURITY DEFINER` sin `SET search_path = public, pg_temp`; regla catch-all en `frontend-mobile/vercel.json` sombreada sobre `/informes/:path*`. |
