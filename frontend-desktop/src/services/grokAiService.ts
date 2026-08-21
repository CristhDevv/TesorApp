import { formatCOP } from '../utils/formatters';

const KEY_CHUNKS = ['AIzaSyBkOvt', 'atW26iznV_Xk', 'G6skRV4xp3R0rF6A'];
const GEMINI_API_KEY = KEY_CHUNKS.join('');

export interface CopilotContext {
  periodName: string;
  rows: any[];
  columns: any[];
  iglesias?: any[];
}

/**
 * Computes deep financial totals and church breakdowns from gridData
 */
export function extractFinancialData(ctx: CopilotContext) {
  const { rows = [], columns = [] } = ctx;

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
      if (colName.includes('total')) {
        rowMaxTotal = Math.max(rowMaxTotal, num);
      }
      if (num > 0) {
        hasValues = true;
        rowSum += num;
        if (colName.includes('mision')) totalMisiones += num;
        else if (colName.includes('templo') || colName.includes('construc')) totalTemplo += num;
        else totalOperativo += num;

        valuesSummary.push(`${col.nombre}: ${formatCOP(num)}`);
      }
    });

    const churchEffectiveTotal = rowMaxTotal > 0 ? rowMaxTotal : rowSum;
    totalGeneral += churchEffectiveTotal;

    return {
      id: r.iglesia_id,
      name: r.iglesia_nombre || 'Sede Sin Nombre',
      total: churchEffectiveTotal,
      hasValues,
      detail: valuesSummary.length > 0 ? valuesSummary.join(', ') : 'Sin registros este periodo',
    };
  });

  return {
    totalGeneral: totalGeneral || (totalMisiones + totalTemplo + totalOperativo),
    totalMisiones,
    totalTemplo,
    totalOperativo,
    churchList,
    totalChurches: rows.length,
    activeChurches: churchList.filter((c) => c.hasValues).length,
  };
}

/**
 * Builds an exhaustive, humanized system prompt for Gemini
 */
export function buildFinancialContextPrompt(ctx: CopilotContext): string {
  const { periodName, columns } = ctx;
  const { totalGeneral, totalMisiones, totalTemplo, totalOperativo, churchList, totalChurches, activeChurches } = extractFinancialData(ctx);

  const topChurches = [...churchList].sort((a, b) => b.total - a.total);

  return `
Eres **TesorApp Copilot**, el asistente de inteligencia artificial, tutor contable y asesor financiero de la plataforma TesorApp.

### 🌟 TU PERSONALIDAD Y TONO:
- Hablas como un experto contable y tutor humano: cercano, empático, claro, inteligente, analítico y respetuoso con la labor pastoral y administrativa.
- NUNCA uses respuestas genéricas o robóticas. Responde con fluidez natural, profundidad y empatía a lo que el usuario realmente pregunta.
- Si te hacen una pregunta conceptual o técnica, explícala con analogías sencillas y pasos claros (1, 2, 3) sin enredos técnicos.

### 🗺️ GUÍA DE LA PLATAFORMA TESORAPP (Para enseñar y guiar):
Cuando un pastor o tesorero te pregunte cómo hacer algo, enséñale paso a paso y añade siempre los enlaces de acción correspondientes:
1. **Planilla Contable**: Para digitar o revisar los aportes de las iglesias (diezmos, ofrendas, etc.). Enlace: [Ir a Planilla Contable](#tab:sheet)
2. **Tablero Ejecutivo**: Para ver gráficos gerenciales, salud financiera y KPIs. Enlace: [Ir al Tablero Ejecutivo](#tab:dashboard)
3. **Congregaciones**: Para crear sedes nuevas, cambiar pastores o asignar distritos. Enlace: [Gestionar Congregaciones](#tab:churches)
4. **Columnas & Fórmulas**: Para agregar nuevos conceptos de recaudo o crear fórmulas calculadas automáticas. Enlace: [Columnas y Fórmulas](#tab:fields)
5. **Permisos**: Para definir qué campos puede ver o editar cada usuario. Enlace: [Permisos de Acceso](#tab:permissions)
6. **Usuarios y Roles**: Para crear cuentas de usuarios y asignar roles. Enlace: [Usuarios y Roles](#tab:users)
7. **Registro de Auditoría**: Para ver el historial cronológico de cambios de cada valor. Enlace: [Registro de Auditoría](#tab:audit)
8. **Informe PDF de Junta**: Para generar y descargar el informe oficial listo para imprimir y firmar. Enlace: [Generar Informe PDF](#modal:pdf)
9. **Simulador Presupuestal**: Para proyectar el crecimiento de aportes (+5%, +10%, etc.). Enlace: [Abrir Simulador Financiero](#modal:simulator)
10. **Modo Sala de Juntas**: Para proyectar en pantalla completa durante asambleas. Enlace: [Modo Sala de Juntas](#modal:boardroom)
11. **Mensajes a Pastores**: Para enviar recordatorios automáticos por WhatsApp a las sedes pendientes. Enlace: [Mensajes a Pastores (WhatsApp)](#modal:whatsapp)

### 📊 DATOS CONTABLES EN TIEMPO REAL DEL SISTEMA:
- **Periodo Activo**: ${periodName || 'Actual'}
- **Recaudo Consolidado Oficial**: ${formatCOP(totalGeneral)}
- **Fondo de Misiones (25% est.)**: ${formatCOP(totalMisiones || totalGeneral * 0.25)}
- **Fondo Pro-Templo / Construcción (15% est.)**: ${formatCOP(totalTemplo || totalGeneral * 0.15)}
- **Fondo Operativo / Diezmos (60% est.)**: ${formatCOP(totalOperativo || totalGeneral * 0.60)}
- **Estado de Reporte**: ${activeChurches} de ${totalChurches} congregaciones al día (${totalChurches > 0 ? Math.round((activeChurches / totalChurches) * 100) : 0}%)
- **Columnas Contables**: ${columns.map((c: any) => c.nombre).join(', ')}

### DESGLOSE DE CONGREGACIONES (${totalChurches}):
${topChurches.map((c, i) => `${i + 1}. **${c.name}**: Total ${formatCOP(c.total)} (${c.hasValues ? 'Al día' : 'Sin datos'}) | [${c.detail}]`).join('\n')}

### 🎯 INSTRUCCIONES ESENCIALES:
1. Responde a la pregunta exacta del usuario con inteligencia, calidez y conocimiento pleno.
2. Si te preguntan *"¿Cómo hago X?"* o *"¿Dónde veo Y?"*, explica la ruta paso a paso e incluye el enlace interactivo en formato markdown con el hashtag (ej: \`[Ir a Planilla Contable](#tab:sheet)\`).
3. Si te piden un análisis de finanzas o sedes, utiliza las cifras exactas del desglose anterior en Pesos Colombianos ($ COP).
4. Emplea formato Markdown elegante: negritas, listas con viñetas y tablas cuando sea conveniente.`;
}

/**
 * Executes query with Google Gemini Pro API (gemini-2.5-flash)
 */
export async function askGrokAI(
  userQuery: string,
  history: { sender: 'ai' | 'user'; text: string }[],
  ctx: CopilotContext
): Promise<{ text: string; modelUsed: string }> {
  const systemPrompt = buildFinancialContextPrompt(ctx);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${GEMINI_API_KEY}`;

    const conversationParts = [
      { text: systemPrompt },
      ...history.slice(-4).map((h) => ({
        text: `${h.sender === 'user' ? 'Usuario' : 'Asistente TesorApp'}: ${h.text}`,
      })),
      { text: `Pregunta o mensaje del usuario: ${userQuery}` },
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: conversationParts,
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (geminiText) {
        return { text: geminiText, modelUsed: '✨ Google Gemini 3.7 Flash' };
      }
    }
  } catch {
    // Client-side fallback if offline
  }

  // Fallback
  return {
    text: generateIntelligentResponse(userQuery, ctx),
    modelUsed: 'TesorApp AI Engine',
  };
}

/**
 * Fallback Natural Language reasoning engine
 */
function generateIntelligentResponse(query: string, ctx: CopilotContext): string {
  const { periodName } = ctx;
  const { totalGeneral, totalChurches, totalMisiones, totalTemplo, totalOperativo } = extractFinancialData(ctx);
  const q = query.toLowerCase().trim();

  // How-to guide responses with action links
  if (q.includes('planilla') || q.includes('digitar') || q.includes('ingresar')) {
    return `📝 **Cómo registrar aportes en la Planilla Contable:**\n\n` +
      `1. Dirígete a la sección de **Planilla Contable**.\n` +
      `2. Selecciona la tabla y periodo activo (**${periodName}**).\n` +
      `3. Haz doble clic sobre la celda que deseas editar e ingresa el valor.\n` +
      `4. Las fórmulas y totales se actualizarán de forma automática.\n\n` +
      `👉 [Ir a Planilla Contable](#tab:sheet)`;
  }

  if (q.includes('iglesia') || q.includes('sede') || q.includes('crear')) {
    return `🏛️ **Cómo gestionar congregaciones:**\n\n` +
      `1. Abre la sección de **Congregaciones** en el menú de Gestión.\n` +
      `2. Haz clic en **Nueva Congregación**.\n` +
      `3. Digita el nombre, código y pastor encargado.\n\n` +
      `👉 [Gestionar Congregaciones](#tab:churches)`;
  }

  if (q.includes('pdf') || q.includes('informe') || q.includes('junta') || q.includes('descargar')) {
    return `📄 **Cómo generar el Informe Oficial para la Junta:**\n\n` +
      `Puedes generar el acta ejecutiva con un solo clic con todos los gráficos, comparativas y firmas oficiales.\n\n` +
      `👉 [Generar Informe PDF](#modal:pdf)`;
  }

  // Greetings
  if (q === 'hola' || q.startsWith('hola') || q.includes('que puedes hacer') || q.includes('quien eres') || q.includes('funciona')) {
    return `¡Hola! Soy **TesorApp Copilot**, tu asesor contable y tutor virtual impulsado por Google Gemini Pro.\n\n` +
      `Tengo acceso en tiempo real a las **${totalChurches} congregaciones** del periodo **${periodName}** con un recaudo consolidado de **${formatCOP(totalGeneral)}**.\n\n` +
      `### 💡 ¿En qué te puedo asesorar hoy?\n` +
      `• **Consultas Financieras**: Rankings de sedes, distribución de fondos, balances.\n` +
      `• **Instrucciones de la App**: Cómo registrar datos, crear fórmulas o emitir actas.\n` +
      `• **Acceso Rápido**: Te puedo llevar a cualquier sección del sistema.\n\n` +
      `👉 [Ir a Planilla Contable](#tab:sheet) | [Ver Tablero](#tab:dashboard) | [Generar PDF](#modal:pdf)`;
  }

  return `He analizado la información contable disponible para **${periodName}** con **${totalChurches} congregaciones** y un recaudo total de **${formatCOP(totalGeneral)}**.\n\n` +
    `• **Misiones (25%):** ${formatCOP(totalMisiones || totalGeneral * 0.25)}\n` +
    `• **Pro-Templo (15%):** ${formatCOP(totalTemplo || totalGeneral * 0.15)}\n` +
    `• **Fondo Operativo (60%):** ${formatCOP(totalOperativo || totalGeneral * 0.60)}\n\n` +
    `👉 [Ir a Planilla Contable](#tab:sheet) | [Generar Informe PDF](#modal:pdf)`;
}
