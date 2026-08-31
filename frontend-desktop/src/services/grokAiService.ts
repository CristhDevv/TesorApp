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

export interface ColumnFinancialData {
  id: string;
  name: string;
  slug: string;
  total: number;
  isFund: boolean;
  isCalc: boolean;
  churchValues: { churchId: string; churchName: string; value: number }[];
}

/**
 * Extracts and consolidates real, exact data from GridData and churches
 */
export function extractFinancialData(ctx: CopilotContext) {
  const gridData = ctx.gridData;
  const rows = gridData?.filas || [];
  const columns = gridData?.columnas || [];
  const iglesias = ctx.iglesias || [];
  const tableName = gridData?.tabla_nombre || 'Planilla General';
  const periodName = ctx.currentPeriod?.nombre || gridData?.periodo_nombre || 'Periodo Actual';

  // 1. Calculate Exact Column Totals
  const columnTotals: Record<string, ColumnFinancialData> = {};

  columns.forEach((col: any) => {
    let colSum = 0;
    const churchValues: { churchId: string; churchName: string; value: number }[] = [];

    rows.forEach((r: any) => {
      const churchName = r.iglesia_nombre || r.iglesia?.nombre || iglesias.find((i: any) => i.id === r.iglesia_id)?.nombre || 'Sede';
      let val = 0;
      if (Array.isArray(r.valores)) {
        const valObj = r.valores.find((v: any) => v.campo_id === col.id);
        const isCalc = col.modo_calculo === 'calculado' || valObj?.modo_calculo === 'calculado';
        const isOverridden = isCalc && valObj?.valor_manual !== null && valObj?.valor_manual !== undefined;
        val = Number(isCalc ? (isOverridden ? valObj?.valor_manual : (valObj?.valor_calculado || 0)) : (valObj?.valor_manual || 0));
      } else if (typeof r.valores === 'object' && r.valores !== null) {
        val = Number(r.valores[col.id] || 0);
      }
      if (isNaN(val)) val = 0;

      colSum += val;
      churchValues.push({
        churchId: r.iglesia_id,
        churchName,
        value: val,
      });
    });

    const isFund = col.es_fondo === true || (col.nombre && /fondo|mision|muser|templo|arriendo|construc|auxilio|ayuda|pastoral/i.test(col.nombre));

    columnTotals[col.id] = {
      id: col.id,
      name: col.nombre,
      slug: col.slug || '',
      total: colSum,
      isFund,
      isCalc: col.modo_calculo === 'calculado',
      churchValues: churchValues.sort((a, b) => b.value - a.value),
    };
  });

  // 2. Identify Total Income column vs input columns (avoid double counting subtotals)
  const totalIngresosCol = columns.find(
    (c: any) => c.slug === 'total_ingresos' || c.slug === 'ingreso_total' || (c.nombre && /total\s*(ingreso|general|recaudo)/i.test(c.nombre))
  );

  const inputCols = columns.filter(
    (c: any) => c.seccion !== 'Egresos' && c.seccion !== 'Totales' && c.id !== totalIngresosCol?.id
  );

  let totalGeneral = 0;
  if (totalIngresosCol && columnTotals[totalIngresosCol.id]) {
    totalGeneral = columnTotals[totalIngresosCol.id].total;
  } else if (inputCols.length > 0) {
    totalGeneral = inputCols.reduce((acc: number, c: any) => acc + (columnTotals[c.id]?.total || 0), 0);
  } else {
    totalGeneral = Object.values(columnTotals).reduce((acc: number, c: any) => acc + c.total, 0);
  }

  // 3. Church List & Church Details
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
    const iglesiaName = row.iglesia_nombre || row.iglesia?.nombre || iglesias.find((i: any) => i.id === row.iglesia_id)?.nombre || 'Sede';
    let churchTotal = 0;
    let hasValues = false;
    const details: string[] = [];
    const valuesMap: Record<string, number> = {};

    for (const col of columns) {
      let val = 0;
      if (Array.isArray(row.valores)) {
        const valObj = row.valores.find((v: any) => v.campo_id === col.id);
        const isCalc = col.modo_calculo === 'calculado' || valObj?.modo_calculo === 'calculado';
        const isOverridden = isCalc && valObj?.valor_manual !== null && valObj?.valor_manual !== undefined;
        val = Number(isCalc ? (isOverridden ? valObj?.valor_manual : (valObj?.valor_calculado || 0)) : (valObj?.valor_manual || 0));
      } else if (typeof row.valores === 'object' && row.valores !== null) {
        val = Number(row.valores[col.id] || 0);
      }
      if (isNaN(val)) val = 0;

      valuesMap[col.id] = val;
      valuesMap[col.slug || col.nombre] = val;

      if (val > 0) {
        hasValues = true;
        details.push(`${col.nombre}: ${formatCOP(val)}`);
      }
    }

    if (totalIngresosCol) {
      const valObj = Array.isArray(row.valores) ? row.valores.find((v: any) => v.campo_id === totalIngresosCol.id) : null;
      churchTotal = Number(valObj?.valor_calculado ?? valObj?.valor_manual ?? 0);
    } else {
      inputCols.forEach((col: any) => {
        churchTotal += Number(valuesMap[col.id] || 0);
      });
    }

    if (hasValues) activeChurches++;

    churchList.push({
      id: row.iglesia_id,
      name: iglesiaName,
      total: churchTotal,
      hasValues,
      detail: details.join(', ') || 'Sin valores reportados',
      valuesMap,
    });
  }

  const allColsList = Object.values(columnTotals);
  const fundsList = allColsList.filter((c) => c.isFund || c.total > 0);

  return {
    tableName,
    periodName,
    totalGeneral,
    activeChurches,
    totalChurches: rows.length || iglesias.length,
    columns,
    columnTotals,
    allColsList,
    fundsList,
    churchList,
    topChurches: [...churchList].sort((a, b) => b.total - a.total),
  };
}

/**
 * Builds dynamic system prompt for Gemini
 */
export function buildFinancialContextPrompt(ctx: CopilotContext): string {
  const { 
    tableName,
    periodName, 
    totalGeneral, 
    totalChurches, 
    activeChurches, 
    topChurches, 
    allColsList 
  } = extractFinancialData(ctx);

  return `Eres **TesorApp Copilot**, el Asistente Contable, Financiero y Tutor Inteligente oficial del sistema **TesorApp** para tesoreros y pastores.

### 🛡️ NORMAS ÉTICAS Y LÍMITES DE SEGURIDAD:
1. **Propósito Exclusivo**: Estás dedicado únicamente a la administración de finanzas eclesiásticas, mayordomía cristiana, auditoría, capacitación contable pastoral y operación de TesorApp.
2. **Prohibición de Generación de Imágenes y Multimedia**: NO generes ni aceptes solicitudes de creación de imágenes, ilustraciones o multimedia.
3. **Cero Tolerancia a Contenido Ilícito, Inmoral o Prohibido**.

### 📊 DATOS CONTABLES EXACTOS EN TIEMPO REAL:
- **Período Contable Activo:** ${periodName}
- **Planilla / Tabla Activa:** ${tableName} (${totalChurches} congregaciones)
- **Recaudo Total Consolidado:** ${formatCOP(totalGeneral)}
- **Tasa de Cumplimiento:** ${activeChurches} de ${totalChurches} congregaciones con informes digitados (${totalChurches > 0 ? Math.round((activeChurches / totalChurches) * 100) : 0}%).

### 💼 FONDOS Y CONCEPTOS CONTABLES REGISTRADOS (Totales exactos):
${allColsList.map((c) => `• **${c.name}**: ${formatCOP(c.total)} (${c.churchValues.filter((cv) => cv.value > 0).length} sedes con aportes)`).join('\n')}

### 📋 REGISTRO DE CONGREGACIONES (${topChurches.length} sedes):
${topChurches.map((c, i) => `${i + 1}. **${c.name}**: Total ${formatCOP(c.total)} (${c.hasValues ? 'Al día' : 'Sin datos'}) | Detalle: [${c.detail}]`).join('\n')}

### 🎯 DIRECTRICES DE RESPUESTA:
- Responde siempre en español con un tono pastoral, profesional, ético y alentador.
- Si el usuario pregunta por un fondo específico (ej. "fondo misionero", "ayuda misionera", "fondo muser", "pro arriendo", "diezmo", "fondo nacional"), busca la columna correspondiente en los datos anteriores, presenta el TOTAL EXACTO del fondo y lista los aportes de cada congregación.
- Si el usuario pide un documento, certificado o informe, genera un informe estructurado con el nombre de la tabla, período, totales y desglose por conceptos, e incluye enlaces como: \`👉 [Ver en Planilla Contable](#tab:sheet) | [🖨️ Imprimir / Guardar este Informe en PDF](#action:print)\`.
- Utiliza Markdown elegante con negritas, listas y tablas. Expresa todas las cifras en pesos colombianos ($ COP).`;
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
        periodName: ctx.currentPeriod?.nombre || ctx.gridData?.periodo_nombre || 'Periodo Actual',
        tableName: ctx.gridData?.tabla_nombre || 'Planilla General',
        rows: (ctx.gridData?.filas || []).map((r: any) => ({
          iglesia_id: r.iglesia_id,
          iglesia_nombre: r.iglesia_nombre || r.iglesia?.nombre || ctx.iglesias?.find((i: any) => i.id === r.iglesia_id)?.nombre,
          valores: r.valores,
        })),
        columns: ctx.gridData?.columnas || [],
      },
    }, { timeout: 10000 });

    if (backendRes.data?.text) {
      return { text: backendRes.data.text, modelUsed: backendRes.data.modelUsed || '✨ Gemini Copilot' };
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
            temperature: 0.1,
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
    modelUsed: 'TesorApp Engine (Exacto)',
  };
}

/**
 * Intelligent local fallback heuristic engine
 */
function generateLocalAIResponse(query: string, ctx: CopilotContext): string {
  const { 
    tableName,
    periodName, 
    totalGeneral, 
    churchList, 
    totalChurches, 
    activeChurches, 
    topChurches, 
    allColsList,
    fundsList
  } = extractFinancialData(ctx);
  const q = query.toLowerCase().trim();

  // Safety checks in local engine
  if (q.includes('imagen') || q.includes('foto') || q.includes('dibujo') || q.includes('genera una imagen')) {
    return `ℹ️ **Aviso**: Como **TesorApp Copilot**, mi propósito es brindarte asesoría contable, financiera y soporte en la plataforma eclesiástica. No dispongo de funciones para generar imágenes o archivos gráficos.\n\n¿En qué aspecto financiero o contable de la iglesia te puedo colaborar hoy?`;
  }

  // Check if user is asking for a specific Fund / Column
  const matchedFund = allColsList.find((col) => {
    const colLower = col.name.toLowerCase();
    const slugLower = col.slug.toLowerCase();
    if (q.includes(colLower) || q.includes(slugLower)) return true;
    if ((q.includes('muser') || q.includes('mision')) && (colLower.includes('mision') || slugLower.includes('mision'))) return true;
    if ((q.includes('arriendo') || q.includes('misionero de zona')) && (colLower.includes('arriendo') || colLower.includes('misionero'))) return true;
    if (q.includes('templo') && colLower.includes('templo')) return true;
    if (q.includes('nacional') && colLower.includes('nacional')) return true;
    if (q.includes('diezmo') && colLower.includes('diezmo')) return true;
    return false;
  });

  if (matchedFund) {
    const aportantes = matchedFund.churchValues.filter((cv) => cv.value > 0);
    return `🏛️ **INFORME OFICIAL DEL FONDO: ${matchedFund.name.toUpperCase()}**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📋 **Planilla / Tabla:** **${tableName}** (${totalChurches} congregaciones)\n` +
      `📅 **Período:** ${periodName}\n` +
      `💰 **Total Recaudado en este Fondo:** **${formatCOP(matchedFund.total)}**\n` +
      `⛪ **Sedes con Aportes:** ${aportantes.length} de ${totalChurches} congregaciones\n\n` +
      `### 📊 Desglose de Aportes por Congregación:\n` +
      matchedFund.churchValues.map((cv, idx) => `• **${idx + 1}. ${cv.churchName}:** ${formatCOP(cv.value)} ${matchedFund.total > 0 && cv.value > 0 ? `*(${((cv.value / matchedFund.total) * 100).toFixed(1)}%)*` : ''}`).join('\n') +
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Certificación contable generada automáticamente con base en los registros oficiales de la planilla.*\n\n` +
      `👉 [Ver en Planilla Contable](#tab:sheet) | [🖨️ Imprimir / Guardar este Informe en PDF](#action:print)`;
  }

  // Check if user is asking for a specific church
  const matchedChurch = churchList.find((c) => {
    const cName = c.name.toLowerCase();
    return q.includes(cName) || cName.split(' ').some((part) => part.length > 3 && q.includes(part));
  });

  if (matchedChurch) {
    return `🏛️ **INFORME OFICIAL DE CONGREGACIÓN**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `⛪ **Sede:** **${matchedChurch.name}**\n` +
      `📋 **Tabla:** ${tableName}\n` +
      `📅 **Período:** ${periodName}\n` +
      `📊 **Estado:** ${matchedChurch.hasValues ? '✅ Planilla diligenciada' : '⏳ Pendiente de digitación'}\n` +
      `💰 **Total Registrado:** **${formatCOP(matchedChurch.total)}**\n\n` +
      `### 📋 Desglose Detallado de Rubros:\n` +
      (matchedChurch.detail !== 'Sin valores reportados' 
        ? matchedChurch.detail.split(', ').map((d) => `• **${d}**`).join('\n')
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
      `📋 **Planilla / Tabla:** **${tableName}** (${totalChurches} congregaciones)\n` +
      `📅 **Período Contable:** ${periodName}\n` +
      `📊 **Total Recaudo Consolidado:** **${formatCOP(totalGeneral)}**\n` +
      `⛪ **Sedes al Día:** ${activeChurches} de ${totalChurches} congregaciones (${totalChurches > 0 ? Math.round((activeChurches / totalChurches) * 100) : 0}%)\n\n` +
      `### 💼 Distribución por Fondos Registrados:\n` +
      fundsList.map((f) => `• **${f.name}:** ${formatCOP(f.total)}`).join('\n') +
      `\n\n### 📋 Resumen de Aportes Principales:\n` +
      topSedes.map((s, idx) => `${idx + 1}. **${s.name}**: ${formatCOP(s.total)} (${s.hasValues ? 'Al día' : 'Sin datos'})`).join('\n') +
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Certifico que los valores aquí relacionados concuerdan fielmente con los registros del sistema contable.* \n\n` +
      `👉 [🖨️ Imprimir / Guardar este Informe en PDF](#action:print)`;
  }

  // 2. Teaching / "Enséñame algo" / Training
  if (q.includes('enseña') || q.includes('aprender') || q.includes('tutor') || q.includes('capacit') || q.includes('como funciona')) {
    return `🎓 **¡Con mucho gusto! Aquí tienes una lección clave para la administración de tu iglesia:**

La gestión de una tesorería eclesiástica en TesorApp se fundamenta en **3 pilares clave**:

1. **La Planilla Contable Mensual:**
   Es el corazón operativo. Cada mes, cada sede asienta sus entradas (Diezmos, Ofrendas y Fondos).
   👉 [Ir a Planilla Contable](#tab:sheet)

2. **La Distribución de Fondos Oficiales:**
   TesorApp calcula automáticamente la separación de fondos según la estructura de columnas configurada:
${fundsList.slice(0, 3).map((f) => `   • **${f.name}:** ${formatCOP(f.total)}`).join('\n')}

3. **La Rendición de Cuentas Transparente:**
   Genera informes y certificados contables oficiales con firmas en PDF en cualquier momento.
   👉 [🖨️ Imprimir / Guardar este Informe en PDF](#action:print)

¿Te gustaría que revisemos cómo registrar un nuevo gasto o consultar el balance de una sede específica?`;
  }

  // 3. How-to: Digitar planilla
  if (q.includes('planilla') || q.includes('digitar') || q.includes('ingresar') || q.includes('llenar') || q.includes('registro')) {
    return `📝 **Guía Rápida: Cómo registrar valores en la Planilla Contable:**\n\n` +
      `1. Haz clic en el botón de abajo para ir a la **Planilla Contable**.\n` +
      `2. Selecciona la tabla (**${tableName}**) y el periodo (**${periodName}**).\n` +
      `3. Ubica la fila de la congregación y haz **doble clic en la celda** del concepto deseado.\n` +
      `4. Digita el monto y presiona **Enter** o navega con las flechas; la celda se guardará y recalculará los totales al instante.\n\n` +
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
    return `🏆 **Ranking de Congregaciones — Planilla ${tableName} (${periodName}):**\n\n` +
      top5.map((s, idx) => `${idx + 1}. **${s.name}**: ${formatCOP(s.total)} (${totalGeneral > 0 ? ((s.total / totalGeneral) * 100).toFixed(1) : 0}% del total)`).join('\n') +
      `\n\n💰 **Recaudo Total:** **${formatCOP(totalGeneral)}**\n\n` +
      `👉 [Ver Tablero Ejecutivo](#tab:dashboard) | [Ir a Planilla](#tab:sheet)`;
  }

  // 6. Delinquent / Pending Churches
  if (q.includes('pendiente') || q.includes('faltan') || q.includes('alerta') || q.includes('mora') || q.includes('blanco') || q.includes('deben')) {
    const missing = churchList.filter((c) => !c.hasValues);
    if (missing.length === 0) {
      return `✅ **¡Excelente! Todas las ${totalChurches} congregaciones de ${tableName} están al día con sus aportes en ${periodName}.** No hay registros pendientes.`;
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

Actualmente estoy monitoreando la planilla **${tableName}** (${periodName}) con **${totalChurches} congregaciones** (${activeChurches} al día) y un recaudo de **${formatCOP(totalGeneral)}**.

### 💼 ¿En qué te puedo orientar hoy?
- 📚 **Enseñanza y Guía**: Pídeme que te enseñe a usar la planilla, registrar gastos o administrar fondos.
- 📊 **Análisis de Recaudo y Fondos**: Pregúntame por cualquier fondo (${fundsList.slice(0, 3).map((f) => f.name).join(', ')}) o sede.
- 📄 **Certificados e Informes en PDF**: Pídeme un reporte y descárgalo o imprímelo al instante.

👉 [Ir a Planilla Contable](#tab:sheet) | [Ver Tablero](#tab:dashboard) | [🖨️ Generar Informe en PDF](#action:print)`;
  }

  // 8. General fallback
  return `He procesado tu consulta sobre la planilla **${tableName}** (${periodName}, ${totalChurches} congregaciones, recaudo: **${formatCOP(totalGeneral)}**).\n\n` +
    `Respecto a tu inquietud, los registros contables muestran **${activeChurches} sedes activas** con los siguientes fondos registrados:\n` +
    fundsList.map((f) => `• **${f.name}:** ${formatCOP(f.total)}`).join('\n') +
    `\n\n¿Deseas que te guíe a la planilla contable o que generemos el informe oficial en PDF?\n\n` +
    `👉 [Ir a Planilla Contable](#tab:sheet) | [🖨️ Imprimir / Guardar en PDF](#action:print)`;
}

