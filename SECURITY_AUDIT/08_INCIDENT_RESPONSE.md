# 08 — Procedimientos de Respuesta ante Incidentes

## 1. Detección
- Revisar alertas en Vercel Logs (errores 401/403/429/500 inusuales) y en el módulo interno **Auditoría (`HistorialCambios`)** de TesorApp.
- Señales de alerta: múltiples `429 Too Many Requests` en `/auth/login`, cambios masivos en períodos cerrados o creación inesperada de usuarios con rol `tesorero`.

## 2. Contención Inmediata
1. **Compromiso de cuenta**: Desactivar al usuario inmediatamente (`activo = false`) desde Administración de Usuarios; gracias a la validación en vivo en `JwtStrategy`, su sesión quedará revocada de inmediato.
2. **Compromiso de secreto JWT**: Rotar `JWT_SECRET` en Vercel Environment Variables y redesplegar el backend para invalidar todos los tokens activos.
3. **Compromiso de credenciales de BD**: Rotar la contraseña de la base de datos en Supabase Dashboard y actualizar `DATABASE_URL` en Vercel.

## 3. Erradicación y Recuperación
- Identificar el commit o vector en GitHub, aplicar corrección y redesplegar en Vercel (o ejecutar Rollback al deployment anterior `READY` en Vercel).
- En caso de alteración de datos, restaurar desde los backups automáticos de Supabase y contrastar con `historial_cambios`.

## 4. Post-Incidente
- Documentar causa raíz, línea de tiempo, impacto y agregar validación/prueba automatizada para evitar recurrencia.
