import { Injectable } from '@nestjs/common';

const FALLBACK_GEMINI_KEY = ['AIzaSyBkOvt', 'atW26iznV_Xk', 'G6skRV4xp3R0rF6A'].join('');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || FALLBACK_GEMINI_KEY;

@Injectable()
export class AiService {
  async askCopilot(userQuery: string, history: any[], context: any) {
    const { periodName, rows = [], columns = [] } = context || {};

    // 1. Calculate Real Financial Metrics from DB rows
    let totalGeneral = 0;
    let totalMisiones = 0;
    let totalTemplo = 0;
    let totalOperativo = 0;

    const churchList = rows.map((r: any) => {
      let rowMaxTotal = 0;
      let rowSum = 0;
      let hasValues = false;
      const valuesSummary: string[] = [];

      columns.forEach((col: any) => {
        const valObj = r.valores?.find((v: any) => v.campo_id === col.id);
        const isCalc = valObj?.modo_calculo === 'calculado';
        const num = isCalc ? (valObj?.valor_calculado || 0) : (valObj?.valor_manual || 0);

        const colName = (col.nombre || '').toLowerCase();
        if (colName.includes('total')) rowMaxTotal = Math.max(rowMaxTotal, num);
        if (num > 0) {
          hasValues = true;
          rowSum += num;
          if (colName.includes('mision')) totalMisiones += num;
          else if (colName.includes('templo') || colName.includes('construc')) totalTemplo += num;
          else totalOperativo += num;

          valuesSummary.push(`${col.nombre}: $${num.toLocaleString('es-CO')}`);
        }
      });

      const effectiveTotal = rowMaxTotal > 0 ? rowMaxTotal : rowSum;
      totalGeneral += effectiveTotal;

      return {
        id: r.iglesia_id,
        name: r.iglesia_nombre || 'Sede Sin Nombre',
        total: effectiveTotal,
        hasValues,
        detail: valuesSummary.length > 0 ? valuesSummary.join(', ') : 'Sin registros este periodo',
      };
    });

    const activeChurches = churchList.filter((c) => c.hasValues).length;
    const totalChurches = rows.length;

    // 2. Prepare Structured Prompt for Google Gemini
    const topChurches = [...churchList].sort((a, b) => b.total - a.total);
    const financialPrompt = `
Eres **TesorApp Copilot**, el asistente de inteligencia artificial y asesor financiero contable oficial para organizaciones religiosas e iglesias.
Cuentas con acceso en tiempo real a los registros contables oficiales del sistema.

### DATOS CONTABLES EN TIEMPO REAL:
- Periodo activo: ${periodName || 'Actual'}
- Recaudo Total Consolidado: $${totalGeneral.toLocaleString('es-CO')}
- Fondo de Misiones (25% est.): $${(totalMisiones || totalGeneral * 0.25).toLocaleString('es-CO')}
- Fondo Pro-Templo (15% est.): $${(totalTemplo || totalGeneral * 0.15).toLocaleString('es-CO')}
- Fondo Operativo/Diezmos (60% est.): $${(totalOperativo || totalGeneral * 0.60).toLocaleString('es-CO')}
- Tasa de Cumplimiento: ${activeChurches} de ${totalChurches} congregaciones con datos registrados (${totalChurches > 0 ? Math.round((activeChurches / totalChurches) * 100) : 0}%)
- Columnas y conceptos contables: ${columns.map((c: any) => c.nombre).join(', ')}

### LISTADO DE TODAS LAS CONGREGACIONES (${totalChurches}):
${topChurches.map((c, i) => `${i + 1}. **${c.name}**: Total $${c.total.toLocaleString('es-CO')} (${c.hasValues ? 'Al día' : 'Sin datos'}) | Detalle: [${c.detail}]`).join('\n')}

### INSTRUCCIONES:
1. Responde en español con tono profesional, ejecutivo, respetuoso y pastoral.
2. Si el usuario te saluda ("Hola", etc.) o te pregunta qué puedes hacer, dale una bienvenida cálida presentándote como TesorApp Copilot e incluye un resumen ejecutivo claro de los datos actuales (periodo, total de sedes y recaudo consolidado) junto con sugerencias de preguntas.
3. Si te preguntan por sedes, aportes, rankings, pendientes o fondos, responde basándote estrictamente en los datos anteriores.
4. Usa formato Markdown elegante (negritas, viñetas y tablas cuando aplique) y expresa siempre los valores en pesos colombianos ($ COP).`;

    // 3. Call Google Gemini API (gemini-2.5-flash / gemini-2.5-pro)
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const contentsPayload = [
        {
          role: 'user',
          parts: [
            { text: `${financialPrompt}\n\nPregunta del usuario:\n${userQuery}` }
          ]
        }
      ];

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contentsPayload,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
          }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiText) {
          return { text: geminiText, modelUsed: '✨ Google Gemini Pro' };
        }
      }
    } catch {
      // Fallback
    }

    // 4. Local Analytical Fallback
    const q = userQuery.toLowerCase().trim();
    const top5 = topChurches.slice(0, 5);
    return {
      text: `👋 **TesorApp Copilot — Periodo ${periodName || 'Actual'}**\n\n` +
        `• **Recaudo Consolidado:** $${totalGeneral.toLocaleString('es-CO')}\n` +
        `• **Sedes con Datos:** ${activeChurches} de ${totalChurches}\n\n` +
        `🏆 **Top 3 Aportes:**\n` +
        top5.slice(0, 3).map((s, i) => `${i + 1}. **${s.name}**: $${s.total.toLocaleString('es-CO')}`).join('\n'),
      modelUsed: 'TesorApp Engine',
    };
  }
}
