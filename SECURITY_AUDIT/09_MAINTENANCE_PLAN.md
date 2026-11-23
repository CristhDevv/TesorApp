# 09 — Plan de Mantenimiento y Seguridad Continua

## 1. Automatización Configurada
- **GitHub Actions (`.github/workflows/security-audit.yml`)**: Ejecución automática en cada `push` a `main`, `pull_request` y de forma semanal (lunes 08:00 UTC) para auditar dependencias (`npm audit`) en `backend`, `frontend-desktop` y `frontend-mobile`.
- **Keepalive Supabase (`.github/workflows/keepalive-supabase.yml`)**: Verificación periódica de disponibilidad y conectividad cada 3 días.

## 2. Calendario Operativo Recomendado
- **Semanal**: Revisar resultados del workflow `Security & Dependency Audit` en GitHub Actions y actualizar dependencias con vulnerabilidades críticas/altas.
- **Mensual**: Revisar la pestaña **Auditoría** en TesorApp y verificar cuentas activas de usuarios (`tesorero`, `secretario`, `presbitero`).
- **Trimestral**: Rotar `JWT_SECRET`, tokens de despliegue (Vercel / GitHub PAT) y verificar políticas RLS y backups en Supabase.
- **Por cada nueva funcionalidad**:
  1. Toda nueva ruta de controlador en NestJS debe incluir `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(...)` explícitos.
  2. Toda consulta o mutación de una iglesia debe validar pertenencia (`userIglesiaId === targetIglesiaId`) en servidor.
  3. Mantener las cabeceras CSP y la lista blanca CORS actualizadas ante nuevos dominios autorizados.
