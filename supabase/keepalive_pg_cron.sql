-- ====================================================================
-- TESORAPP: EXTENSIÓN PG_CRON Y CONSULTA PROGRAMADA EN SUPABASE
-- ====================================================================
-- Puedes ejecutar este script directamente en el SQL Editor del Dashboard
-- de Supabase si deseas contar con una consulta programada interna a nivel
-- de motor PostgreSQL.

-- 1. Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Crear función de actividad periódica (lectura liviana)
CREATE OR REPLACE FUNCTION public.supabase_keepalive()
RETURNS text AS $$
DECLARE
    total_iglesias integer;
BEGIN
    SELECT count(*) INTO total_iglesias FROM "Iglesia";
    RETURN 'Keepalive ejecutado con éxito. Total iglesias: ' || total_iglesias;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Programar la ejecución cada 2 días a las 04:00 AM UTC
-- Nota: 'cron.schedule' programa una tarea interna de PostgreSQL
SELECT cron.schedule(
    'supabase-db-keepalive',
    '0 4 */2 * *',
    'SELECT public.supabase_keepalive();'
);

-- Para verificar los cron jobs programados:
-- SELECT * FROM cron.job;

-- Para revisar el historial de ejecuciones:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
