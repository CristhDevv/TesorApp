const key = 'AIzaSyBkOvtatW26iznV_XkG6skRV4xp3R0rF6A';
const prompt = `Eres TesorApp Copilot, asesor contable y financiero de TesorApp.
DATOS CONTABLES OFICIALES:
- Periodo: Agosto 2026
- Recaudo Consolidado: $699.000 COP
- Sedes: 25 congregaciones
- Sede Principal: Sede Central ($350.000 COP)

Pregunta del tesorero: "Hola Asistente, ¿qué análisis me das sobre el recaudo de Agosto 2026 y qué acciones recomiendas?"`;

async function main() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 600 }
    })
  });

  const data = await response.json();
  console.log('=== RESPUESTA GENERADA EN VIVO POR GOOGLE GEMINI ===');
  console.log(data?.candidates?.[0]?.content?.parts?.[0]?.text);
}

main().catch(console.error);
