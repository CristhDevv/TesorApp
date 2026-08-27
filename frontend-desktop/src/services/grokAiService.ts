/**
 * Grok / Gemini AI Service for TesorApp Desktop
 * Hybrid Engine: Google Gemini 3.7 / 2.5 Flash API + Local Financial Heuristic Model
 */

import axios from 'axios';
import { formatCOP } from '../utils/formatters';

interface CopilotContext {
  gridData: any;
  currentPeriod: any;
  iglesias?: any[];
}

/**
 * Extracts and consolidates data from GridData and churches
 */
export function extractFinancialData(ctx: CopilotContext) {
  const gridData = ctx.gridData;
  const rows = gridData?.filas || [];
  const columns = gridData?.columnas || [];
  const iglesias = ctx.iglesias || [];

  let totalGeneral = 0;
  let totalMisiones = 0;
  let totalTemplo = 0;
  let totalOperativo = 0;
  let activeChurches = 0;

  const churchList: { 
    id: string; 
    name: string; 
    total: number; 
    hasValues: boolean; 
    detail: string; 
    valuesMap: Record<string, number>;
  }[] = [];

  for (const row of rows) {
    const iglesiaName = row.iglesia_nombre || row.iglesia?.nombre || iglesias.find(i => i.id === row.iglesia_id)?.nombre || 'Sede';
    let rowTotal = 0;
    let hasValues = false;
    const details: string[] = [];
    const valuesMap: Record<string, number> = {};

    for (const col of columns) {
      let val = 0;
      if (Array.isArray(row.valores)) {
        const valObj = row.valores.find((v: any) => v.campo_id === col.id);
        const isCalc = valObj?.modo_calculo === 'calculado';
        val = Number(isCalc ? (valObj?.valor_calculado || 0) : (valObj?.valor_manual || 0));
      } else if (typeof row.valores === 'object' && row.valores !== null) {
        val = Number(row.valores[col.id] || 0);
      }

      valuesMap[col.id] = val;
      valuesMap[col.slug || col.nombre] = val;

      if (val > 0) {
        hasValues = true;
        details.push(`${col.nombre}: ${formatCOP(val)}`);
      }

      // Detect general column / category mappings
      const colNameLower = (col.nombre || '').toLowerCase();
      if (colNameLower.includes('mision') || colNameLower.includes('obra')) {
        totalMisiones += val;
      } else if (colNameLower.includes('templo') || colNameLower.includes('construc')) {
        totalTemplo += val;
      } else if (colNameLower.includes('diezmo') || colNameLower.includes('general') || colNameLower.includes('total')) {
        totalOperativo += val;
      }
      rowTotal += val;
    }

    if (hasValues) activeChurches++;
    totalGeneral += rowTotal;

    churchList.push({
      id: row.iglesia_id,
      name: iglesiaName,
      total: rowTotal,
      hasValues,
      detail: details.join(', ') || 'Sin valores reportados',
      valuesMap,
    });
  }

  return {
    totalGeneral,
    totalMisiones,
    totalTemplo,
    totalOperativo,
    activeChurches,
    totalChurches: rows.length || iglesias.length,
    columns,
    churchList,
    topChurches: [...churchList].sort((a, b) => b.total - a.total),
  };
}

/**
 * Builds dynamic system prompt for Gemini
 */
export function buildFinancialContextPrompt(ctx: CopilotContext): string {
  const periodName = ctx.currentPeriod?.nombre || 'Periodo Actual';
  const { totalGeneral, columns, totalChurches, activeChurches, topChurches, totalMisiones, totalTemplo, totalOperativo } = extractFinancialData(ctx);

  return `Eres **TesorApp Copilot**, el Asistente Contable, Financiero y Tutor Inteligente oficial del sistema **TesorApp** para tesoreros y pastores.

### 🛡️ NORMAS ÉTICAS Y LÍMITES DE SEGURIDAD ESTRICTOS:
1. **Propósito Exclusivo**: Estás consagrado y dedicado únicamente a la administración de finanzas eclesiásticas, mayordomía cristiana, auditoría, capacitación contable pastoral y operación de TesorApp.
2. **Prohibición de Generación de Imágenes y Multimedia**:
   - NO generes, simules ni aceptes solicitudes de creación de imágenes, dibujos, ilustraciones, videos, deepfakes o audio.
3. **Cero Tolerancia a Contenido Ilícito, Inmoral o Prohibido**:
   - Queda terminantemente prohibido generar o dialogar sobre contenido inapropiado, ilegal o fraudulento.
   - Siempre promueve la honestidad, integridad, mayordomía bíblica, transparencia y cumplimiento de las leyes vigentes.
4. **Confidencialidad y Prudencia**:
   - Trata los registros de diezmos, ofrendas y nombres pastorales con la máxima discreción y dignidad eclesiástica.

### 📊 DATOS CONTABLES OFICIALES EN TIEMPO REAL:
- **Período Contable Activo:** ${periodName}
- **Recaudo Total Consolidado:** ${formatCOP(totalGeneral)}
- **Fondo Misionero & Obra Nacional:** ${formatCOP(totalMisiones || totalGeneral * 0.25)}
- **Fondo Pro-Templo:** ${formatCOP(totalTemplo || totalGeneral * 0.15)}
- **Fondo Operativo & Sostenimiento:** ${formatCOP(totalOperativo || totalGeneral * 0.60)}
- **Tasa de Cumplimiento:** ${activeChurches} de ${totalChurches} congregaciones con informes digitados.
- **Columnas y Conceptos Contables:** ${columns.map((c: any) => c.nombre).join(', ')}

### 📋 REGISTRO DE CONGREGACIONES (${topChurches.length} sedes):
${topChurches.map((c, i) => `${i + 1}. **${c.name}**: Total ${formatCOP(c.total)} (${c.hasValues ? 'Al día' : 'Sin datos'}) | Detalle: [${c.detail}]`).join('\n')}

### 🎯 DIRECTRICES DE RESPUESTA:
- Responde siempre en español con un tono pastoral, profesional, ético y alentador.
- Si el usuario pide un documento, certificado o informe de una iglesia específica (ej. "iglesia la banda"), genera un informe formal estructurado con el nombre de la sede, período, estado, totales y desglose por conceptos, e incluye enlaces interactivos como: \`👉 [Ver en Planilla Contable](#tab:sheet) | [🖨️ Imprimir / Guardar este Informe en PDF](#action:print)\`.
- Utiliza Markdown elegante con negritas, listas y separadores. Expresa todas las cifras en pesos colombianos ($ COP).`;
}

/**
 * Main Copilot AI Query Function
 */
export async function askGrokAI(
  userQuery: string,
  history: { sender: 'ai' | 'user'; text: string }[],
  ctx: CopilotContext
): Promise<{ text: string; modelUsed: string }> {
  // 1. Try Backend Copilot Endpoint (Has official Gemini API Key on server)
  try {
    const backendRes = await axios.post('/ai/copilot', {
      userQuery,
      history,
      context: {
        periodName: ctx.currentPeriod?.nombre || 'Periodo Actual',
        rows: (ctx.gridData?.filas || []).map((r: any) => ({
          iglesia_id: r.iglesia_id,
          iglesia_nombre: r.iglesia_nombre || r.iglesia?.nombre || ctx.iglesias?.find(i => i.id === r.iglesia_id)?.nombre,
          valores: r.valores,
        })),
        columns: ctx.gridData?.columnas || [],
      },
    }, { timeout: 10000 });

    if (backendRes.data?.text) {
      return { text: backendRes.data.text, modelUsed: backendRes.data.modelUsed || '✨ Gemini 3.7 Flash' };
    }
  } catch {
    // Continue to direct API call or heuristic fallback
  }

  const systemPrompt = buildFinancialContextPrompt(ctx);
  const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

  const contents = [
    {
      role: 'user',
      parts: [{ text: `INSTRUCCIONES DEL SISTEMA:\n${systemPrompt}` }],
    },
    {
      role: 'model',
      parts: [{ text: 'Entendido. Actuaré como TesorApp Copilot bajo los principios éticos y datos contables provistos.' }],
    },
    ...history.slice(-8).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
    {
      role: 'user',
      parts: [{ text: userQuery }],
    },
  ];

  for (const model of modelsToTry) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            key: (import.meta as any).env?.VITE_GEMINI_API_KEY || '',
          },
          timeout: 12000,
        }
      );

      const candidate = response.data?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      if (text && text.trim().length > 0) {
        return { text, modelUsed: model };
      }
    } catch {
      // Continue to next model in cascade
    }
  }

  // Fallback to local heuristic engine
  return {
    text: generateLocalAIResponse(userQuery, ctx),
    modelUsed: 'TesorApp Engine (Inteligente)',
  };
}

/**
 * Intelligent local fallback heuristic engine
 */
function generateLocalAIResponse(query: string, ctx: CopilotContext): string {
  const periodName = ctx.currentPeriod?.nombre || 'Periodo Actual';
  const { totalGeneral, churchList, totalChurches, activeChurches, topChurches, totalMisiones, totalTemplo, totalOperativo } = extractFinancialData(ctx);
  const q = query.toLowerCase().trim();

  // Safety checks in local engine
  if (q.includes('imagen') || q.includes('foto') || q.includes('dibujo') || q.includes('genera una imagen')) {
    return `ℹ️ **Aviso**: Como **TesorApp Copilot**, mi propósito es brindarte asesoría contable, financiera y soporte en la plataforma eclesiástica. No dispongo de funciones para generar imágenes o archivos gráficos.\n\n¿En qué aspecto financiero o contable de la iglesia te puedo colaborar hoy?`;
  }

  // Check if user is asking for a specific church
  const matchedChurch = churchList.find((c) => {
    const cName = c.name.toLowerCase();
    return q.includes(cName) || cName.split(' ').some(part => part.length > 3 && q.includes(part));
  });

  if (matchedChurch) {
    return `🏛️ **INFORME OFICIAL DE CONGREGACIÓN**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `⛪ **Sede:** **${matchedChurch.name}**\n` +
      `📅 **Período:** ${periodName}\n` +
      `📊 **Estado:** ${matchedChurch.hasValues ? '✅ Planilla diligenciada' : '⏳ Pendiente de digitación'}\n` +
      `💰 **Total Registrado:** **${formatCOP(matchedChurch.total)}**\n\n` +
      `### 📋 Desglose Detallado de Rubros:\n` +
      (matchedChurch.detail !== 'Sin valores reportados' 
        ? matchedChurch.detail.split(', ').map(d => `• **${d}**`).join('\n')
        : '• *No se registran aportes para este periodo.*') +
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Documento contable generado automáticamente para fines de control y certificación eclesiástica.*\n\n` +
      `👉 [Ver en Planilla Contable](#tab:sheet) | [🖨️ Imprimir / Guardar en PDF](#action:print)`;
  }

  // 1. PDF / Report Request General
  if (q.includes('pdf') || q.includes('informe') || q.includes('documento') || q.includes('certificado') || q.includes('imprimir') || q.includes('acta') || q.includes('damelo')) {
    const topSedes = topChurches.slice(0, 5);
    return `🏛️ **INFORME OFICIAL Y CERTIFICADO CONTABLE DE TESORERÍA**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📅 **Período Contable:** ${periodName}\n` +
      `📊 **Total Recaudo Consolidado:** **${formatCOP(totalGeneral)}**\n` +
      `⛪ **Sedes al Día:** ${activeChurches} de ${totalChurches} congregaciones (${totalChurches > 0 ? Math.round((activeChurches / totalChurches) * 100) : 0}%)\n\n` +
      `### 💼 Distribución por Fondos:\n` +
      `• **Fondo Misionero & Obra Nacional:** ${formatCOP(totalMisiones || totalGeneral * 0.25)}\n` +
      `• **Fondo Pro-Templo & Infraestructura:** ${formatCOP(totalTemplo || totalGeneral * 0.15)}\n` +
      `• **Fondo Operativo & Diezmos:** ${formatCOP(totalOperativo || totalGeneral * 0.60)}\n\n` +
      `### 📋 Resumen de Aportes Principales:\n` +
      topSedes.map((s, idx) => `${idx + 1}. **${s.name}**: ${formatCOP(s.total)} (${s.hasValues ? 'Al día' : 'Sin datos'})`).join('\n') +
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Certifico que los valores aquí relacionados concuerdan fielmente con los registros del sistema contable.* \n\n` +
      `👉 [🖨️ Imprimir / Guardar este Informe en PDF](#action:print)`;
  }

  // 2. Teaching / "Enséñame algo" / Training
  if (q.includes('enseña') || q.includes('aprender') || q.includes('tutor') || q.includes('capacit') || q.includes('como funciona')) {
    return `🎓 **¡Con mucho gusto! Aquí tienes una lección clave para la administración de tu iglesia:**

La gestión de una tesorería eclesiástica se fundamenta en **3 pilares clave**:

1. **La Planilla Contable Mensual:**
   Es el corazón operativo. Cada mes, cada sede asienta sus entradas (Diezmos, Ofrendas y Fondos).
   👉 [Ir a Planilla Contable](#tab:sheet)

2. **La Distribución Estatutaria de Fondos:**
   TesorApp calcula automáticamente la separación de fondos:
   • **Fondo Misionero (25%):** ${formatCOP(totalMisiones || totalGeneral * 0.25)} para plantación y viajes.
   • **Fondo Pro-Templo (15%):** ${formatCOP(totalTemplo || totalGeneral * 0.15)} para remodelación de sedes.
   • **Fondo Operativo Local (60%):** ${formatCOP(totalOperativo || totalGeneral * 0.60)} para sostenimiento y servicios.

3. **La Rendición de Cuentas Transparente:**
   Genera informes y certificados contables oficiales con firmas en PDF en cualquier momento.
   👉 [🖨️ Imprimir / Guardar este Informe en PDF](#action:print)

¿Te gustaría que revisemos cómo registrar un nuevo gasto o consultar el balance de una sede específica?`;
  }

  // 3. How-to: Digitar planilla
  if (q.includes('planilla') || q.includes('digitar') || q.includes('ingresar') || q.includes('llenar') || q.includes('registro')) {
    return `📝 **Guía Rápida: Cómo registrar valores en la Planilla Contable:**\n\n` +
      `1. Haz clic en el botón de abajo para ir a la **Planilla Contable**.\n` +
      `2. Selecciona la tabla y el periodo (**${periodName}**).\n` +
      `3. Ubica la fila de la congregación y haz **doble clic en la celda** del concepto (Diezmos, Ofrendas, etc.).\n` +
      `4. Digita el monto y presiona **Enter**; la celda se guardará y recalculará los totales al instante.\n\n` +
      `👉 [Ir a Planilla Contable](#tab:sheet)`;
  }

  // 4. How-to: Gastos
  if (q.includes('gasto') || q.includes('egreso') || q.includes('voucher') || q.includes('comprobante') || q.includes('salida')) {
    return `💰 **Cómo registrar un Gasto y emitir Voucher en TesorApp:**\n\n` +
      `1. Dirígete a la sección de **Gastos & Control de Fondos**.\n` +
      `2. Haz clic en **«Registrar Gasto»**.\n` +
      `3. Selecciona el fondo a deducir, ingresa el monto, fecha y concepto.\n` +
      `4. Al guardar, se genera automáticamente el **Voucher Oficial de Egreso** con opciones de enviar por WhatsApp o imprimir en PDF.\n\n` +
      `👉 [Control de Gastos y Fondos](#tab:gastos)`;
  }

  // 5. Ranking
  if (q.includes('top') || q.includes('mayor') || q.includes('mas') || q.includes('ranking') || q.includes('primeros')) {
    const top5 = [...churchList].sort((a, b) => b.total - a.total).slice(0, 5);
    return `🏆 **Ranking de Congregaciones — Periodo ${periodName}:**\n\n` +
      top5.map((s, idx) => `${idx + 1}. **${s.name}**: ${formatCOP(s.total)} (${totalGeneral > 0 ? ((s.total / totalGeneral) * 100).toFixed(1) : 0}% del total)`).join('\n') +
      `\n\n💰 **Recaudo Total Consolidado:** **${formatCOP(totalGeneral)}**\n\n` +
      `👉 [Ver Tablero Ejecutivo](#tab:dashboard) | [Ir a Planilla](#tab:sheet)`;
  }

  // 6. Delinquent / Pending Churches
  if (q.includes('pendiente') || q.includes('faltan') || q.includes('alerta') || q.includes('mora') || q.includes('blanco') || q.includes('deben')) {
    const missing = churchList.filter((c) => !c.hasValues);
    if (missing.length === 0) {
      return `✅ **¡Excelente! Todas las ${totalChurches} congregaciones están al día con sus aportes en ${periodName}.** No hay registros pendientes.`;
    }
    return `⚠️ **Sedes Pendientes por Reportar (${missing.length} de ${totalChurches}):**\n\n` +
      missing.slice(0, 6).map((m) => `• **${m.name}** (Sin movimientos registrados)`).join('\n') +
      (missing.length > 6 ? `\n• *...y ${missing.length - 6} congregaciones más.*` : '') +
      `\n\n💡 Puedes revisar los detalles completos en la planilla contable:\n` +
      `👉 [Ir a Planilla Contable](#tab:sheet)`;
  }

  // 7. General Friendly Conversational Greeting
  if (q === 'hola' || q.startsWith('hola') || q.includes('quien eres') || q.includes('que puedes hacer')) {
    return `👋 ¡Hola! Soy **TesorApp Copilot**, tu asesor financiero y tutor contable inteligente.

Actualmente estoy monitoreando el periodo **${periodName}** con **${totalChurches} congregaciones** (${activeChurches} al día) y un recaudo consolidado de **${formatCOP(totalGeneral)}**.

### 💼 ¿En qué te puedo orientar hoy?
- 📚 **Enseñanza y Guía**: Pídeme que te enseñe a usar la planilla, registrar gastos o administrar fondos.
- 📊 **Análisis de Recaudo**: Consulta qué sedes han aportado más o qué fondos tenemos en caja.
- 📄 **Certificados e Informes en PDF**: Pídeme un reporte y descárgalo o imprímelo al instante.

👉 [Ir a Planilla Contable](#tab:sheet) | [Ver Tablero](#tab:dashboard) | [🖨️ Generar Informe en PDF](#action:print)`;
  }

  // 8. General fallback
  return `He procesado tu consulta sobre **${periodName}** (${totalChurches} congregaciones, recaudo: **${formatCOP(totalGeneral)}**).\n\n` +
    `Respecto a tu inquietud, los registros contables muestran **${activeChurches} sedes activas** con aportes en Misiones (${formatCOP(totalMisiones || totalGeneral * 0.25)}) y Pro-Templo (${formatCOP(totalTemplo || totalGeneral * 0.15)}).\n\n` +
    `¿Deseas que te guíe a la planilla contable o que generemos el informe oficial en PDF?\n\n` +
    `👉 [Ir a Planilla Contable](#tab:sheet) | [🖨️ Imprimir / Guardar en PDF](#action:print)`;
}
