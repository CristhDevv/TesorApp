# 05 — Seguridad de Infraestructura y Despliegue

## 1. Hosting y Red (Vercel)
- **TLS / HTTPS**: Obligatorio en todos los endpoints de Vercel con HSTS activo (`strict-transport-security: max-age=63072000; includeSubDomains; preload`).
- **Aislamiento de API**: El frontend actúa como proxy inverso mediante `rewrites` en `vercel.json` hacia el backend serverless.
- **Cabeceras de Seguridad**: Configuradas a nivel de plataforma en `vercel.json` (raíz, `frontend-desktop`, `frontend-mobile`) y a nivel de aplicación en `backend/src/common/security.config.ts`.
- **Protección DDoS**: Delegada a la red Edge de Vercel, complementada con `RateLimitGuard` por instancia en endpoints críticos (`login`, `ai/copilot`, `reportes/exportar`) y límite de payload de `2mb`.

## 2. Base de Datos (Supabase PostgreSQL)
- **Conexión**: Mediante Connection Pooler (PgBouncer) y credenciales almacenadas en variables de entorno (`DATABASE_URL`), excluidas del control de versiones vía `.gitignore`.
- **Mantenimiento de Disponibilidad**: Keepalive mediante GitHub Actions (`keepalive-supabase.yml`) cada 3 días y script SQL opcional con `pg_cron` (`supabase/keepalive_pg_cron.sql`, endurecido con `SET search_path = public, pg_temp`).
- **Aislamiento**: El acceso a base de datos se realiza exclusivamente desde el backend NestJS mediante Prisma ORM (consultas parametrizadas), sin exponer claves `service_role` ni conexión directa desde el frontend.

## 3. Gestión de Secretos y Control de Versiones
- `.gitignore` excluye `.env`, `.env.*`, `backend/.env`, `scratch/` y `.vercel`.
- Se recomienda rotar cualquier token de despliegue o PAT compartido durante sesiones de soporte técnico y gestionar exclusivamente las credenciales mediante GitHub Secrets y Vercel Environment Variables.
