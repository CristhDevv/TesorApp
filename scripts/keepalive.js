/**
 * TesorApp - Supabase & Backend Keep-Alive Script
 * 
 * Este script realiza consultas periódicas a los endpoints del Backend y de Supabase
 * para mantener activa la base de datos PostgreSQL y prevenir la pausa automática
 * tras 7 días de inactividad (Supabase Free Tier).
 */

const https = require('https');

const TARGETS = [
  {
    name: 'TesorApp Backend Direct (/ping - Query SQL activo)',
    url: 'https://backend-zeta-rouge-39.vercel.app/ping',
  },
  {
    name: 'TesorApp Backend Direct (/health - DB Check)',
    url: 'https://backend-zeta-rouge-39.vercel.app/health',
  },
  {
    name: 'TesorApp Frontend Proxy (/ping)',
    url: 'https://tesor-app-nine.vercel.app/ping',
  },
  {
    name: 'Supabase Auth Health API',
    url: 'https://pezfespirobgfluznmey.supabase.co/auth/v1/health',
  },
];

function pingUrl(target) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(target.url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const latency = Date.now() - start;
        resolve({
          name: target.name,
          url: target.url,
          statusCode: res.statusCode,
          latencyMs: latency,
          response: data.slice(0, 150),
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name: target.name,
        url: target.url,
        statusCode: 0,
        latencyMs: Date.now() - start,
        error: err.message,
        success: false,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: target.name,
        url: target.url,
        statusCode: 408,
        latencyMs: Date.now() - start,
        error: 'Timeout alcanzado (15s)',
        success: false,
      });
    });
  });
}

async function main() {
  console.log('='.repeat(65));
  console.log('🚀 INICIANDO KEEPALIVE SUPABASE / TESORAPP');
  console.log(`⏰ Fecha y Hora: ${new Date().toISOString()}`);
  console.log('='.repeat(65));

  let successfulPings = 0;

  for (const target of TARGETS) {
    console.log(`\n📡 Consultando: ${target.name}...`);
    const result = await pingUrl(target);

    if (result.success) {
      successfulPings++;
      console.log(`   ✅ ÉXITO [HTTP ${result.statusCode}] (${result.latencyMs} ms)`);
      if (result.response) {
        console.log(`   📄 Respuesta: ${result.response.trim()}`);
      }
    } else {
      console.log(`   ⚠️ ADVERTENCIA / FALLO [HTTP ${result.statusCode || 'N/A'}] (${result.latencyMs} ms)`);
      if (result.error) console.log(`   ❌ Error: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(65));
  if (successfulPings > 0) {
    console.log(`🎉 Keepalive completado con éxito (${successfulPings}/${TARGETS.length} endpoints respondieron).`);
    console.log('   La base de datos de Supabase ha registrado actividad y el contador de 7 días se reinició.');
  } else {
    console.error('❌ Error: Ningún endpoint respondió exitosamente.');
    process.exitCode = 1;
  }
  console.log('='.repeat(65) + '\n');
}

main();
