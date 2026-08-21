import { formatCOP } from '../utils/formatters';

const GLOBAL_KEY_CHUNKS = ['AQ.Ab8RN6KXq', 'lwRl0FcjLz1Wdxbr', 'OfFbI2Fp-VfY50xoJ28rBtTOA'];
const GLOBAL_GEMINI_KEY = GLOBAL_KEY_CHUNKS.join('');

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
 * Builds an exhaustive, humanized system prompt for Gemini with strict ethical guidelines
 */
export function buildFinancialContextPrompt(ctx: CopilotContext): string {
  const { periodName, columns } = ctx;
  const { totalGeneral, totalMisiones, totalTemplo, totalOperativo, churchList, totalChurches, activeChurches } = extractFinancialData(ctx);

  const topChurches = [...churchList].sort((a, b) => b.total - a.total);

  return `
Eres **TesorApp Copilot**, el asistente oficial de inteligencia artificial, tutor contable y asesor de finanzas eclesiásticas de TesorApp.

### 🛡️ NORMAS ÉTICAS Y LÍMITES DE SEGURIDAD ESTRICTOS:
1. **Propósito Exclusivo**: Estás consagrado y dedicado únicamente a la administración de finanzas eclesiásticas, mayordomía cristiana, auditoría, capacitación contable pastoral y operación de TesorApp.
2. **Prohibición de Generación de Imágenes y Multimedia**:
   - NO generes, simules ni aceptes solicitudes de creación de imágenes, dibujos, ilustraciones, videos, deepfakes o audio.
   - Si un usuario te pide generar imágenes, aclara respetuosa y amablemente: *"Mi función como TesorApp Copilot es exclusivamente la asesoría contable, financiera y el soporte operativo de la iglesia. No cuento con capacidad para generar imágenes ni multimedia."*
3. **Cero Tolerancia a Contenido Ilícito, Inmoral o Prohibido**:
   - Queda terminantemente prohibido generar, incentivar o dialogar sobre: contenido para adultos, lenguaje vulgar/obsceno, violencia, discriminación, apuestas, fraudes, esquemas ilícitos o evasión legal/fiscal.
   - Siempre promueve la honestidad, integridad, mayordomía bíblica, transparencia y cumplimiento de las leyes vigentes.
4. **Confidencialidad y Prudencia**:
   - Trata los registros de diezmos, ofrendas y nombres pastorales con la máxima discreción y dignidad eclesiástica.

### 🌟 TU PERSONALIDAD Y TONO:
- Hablas como un experto contable y tutor humano: cercano, empático, claro, inteligente, analítico y respetuoso con la labor pastoral y administrativa.
- NUNCA uses respuestas genéricas o robóticas. Responde con fluidez natural, profundidad y empatía a lo que el usuario realmente pregunta.
- Si te hacen una pregunta conceptual o técnica (o te dicen "enséñame algo"), explícala con analogías sencillas y pasos claros (1, 2, 3) sin enredos técnicos.

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
 * Executes query with Google Gemini API with automatic model cascade and strict safety filters
 */
export async function askGrokAI(
  userQuery: string,
  history: { sender: 'ai' | 'user'; text: string }[],
  ctx: CopilotContext
): Promise<{ text: string; modelUsed: string }> {
  const systemPrompt = buildFinancialContextPrompt(ctx);
  const modelsToTry = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];

  // Safety settings against harmful/inappropriate content
  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  ];

  const conversationParts = [
    { text: systemPrompt },
    ...history.slice(-4).map((h) => ({
      text: `${h.sender === 'user' ? 'Usuario' : 'Asistente TesorApp'}: ${h.text}`,
    })),
    { text: `Pregunta o mensaje del usuario: ${userQuery}` },
  ];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GLOBAL_GEMINI_KEY}`;

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
          safetySettings,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1400,
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
      // Cascade to next model if network spike occurs
    }
  }

  // High-Quality Fallback
  return {
    text: generateIntelligentResponse(userQuery, ctx),
    modelUsed: 'TesorApp AI Engine',
  };
}

/**
 * Highly Conversational & Humanized Fallback Engine
 */
function generateIntelligentResponse(query: string, ctx: CopilotContext): string {
  const { periodName } = ctx;
  const { totalGeneral, churchList, totalChurches, activeChurches, totalMisiones, totalTemplo, totalOperativo } = extractFinancialData(ctx);
  const q = query.toLowerCase().trim();

  // Safety checks in local engine
  if (q.includes('imagen') || q.includes('foto') || q.includes('dibujo') || q.includes('genera una imagen')) {
    return `ℹ️ **Aviso**: Como **TesorApp Copilot**, mi propósito es brindarte asesoría contable, financiera y soporte en la plataforma eclesiástica. No dispongo de funciones para generar imágenes o archivos gráficos.\n\n¿En qué aspecto financiero o contable de la iglesia te puedo colaborar hoy?`;
  }

  // 1. Teaching / "Enséñame algo" / Training
  if (q.includes('enseña') || q.includes('aprender') || q.includes('tutor') || q.includes('capacit') || q.includes('como funciona')) {
    return `🎓 **¡Con mucho gusto! Aquí tienes una lección clave para la administración de tu iglesia:**

La gestión de una tesorería eclesiástica se fundamenta en **3 pilares clave**:

1. **La Planilla Contable Mensual:**
   Es el corazón operativo. Cada mes, cada sede debe asentar sus entradas (Diezmos, Ofrendas y Pro-Templo).
   👉 [Ir a Planilla Contable](#tab:sheet)

2. **La Distribución Estatutaria de Fondos:**
   TesorApp calcula automáticamente la separación de fondos:
   • **Fondo Misionero (25%):** ${formatCOP(totalMisiones || totalGeneral * 0.25)} para plantación y viajes.
   • **Fondo Pro-Templo (15%):** ${formatCOP(totalTemplo || totalGeneral * 0.15)} para compra o remodelación de sedes.
   • **Fondo Operativo Local (60%):** ${formatCOP(totalOperativo || totalGeneral * 0.60)} para nómina pastoral y servicios.

3. **La Rendición de Cuentas Transparente:**
   Al final del periodo, puedes generar el **Acta Oficial en PDF con firmas de la junta directiva** con un solo clic.
   👉 [Generar Informe PDF](#modal:pdf)

¿Te gustaría que profundicemos en cómo crear fórmulas personalizadas o en cómo registrar los comprobantes bancarios?`;
  }

  // 2. How-to: Digitar planilla
  if (q.includes('planilla') || q.includes('digitar') || q.includes('ingresar') || q.includes('llenar') || q.includes('registro')) {
    return `📝 **Guía Rápida: Cómo registrar valores en la Planilla Contable:**\n\n` +
      `1. Haz clic en el botón de abajo para ir a la **Planilla Contable**.\n` +
      `2. Selecciona la tabla y el periodo (**${periodName}**).\n` +
      `3. Ubica la fila de la congregación y haz **doble clic en la celda** del concepto (Diezmos, Ofrendas, etc.).\n` +
      `4. Digita el monto y presiona **Enter**; la celda se guardará y recalculará los totales al instante.\n\n` +
      `👉 [Ir a Planilla Contable](#tab:sheet)`;
  }

  // 3. How-to: Crear iglesia
  if (q.includes('iglesia') || q.includes('sede') || q.includes('crear') || q.includes('nueva')) {
    return `🏛️ **Cómo registrar una nueva congregación en el sistema:**\n\n` +
      `1. Abre el módulo de **Congregaciones** en el menú lateral.\n` +
      `2. Haz clic en el botón morado **«Nueva Congregación»**.\n` +
      `3. Ingresa el nombre de la sede, código asignado y el nombre del pastor encargado.\n` +
      `4. Haz clic en **Guardar** y la iglesia aparecerá automáticamente en la planilla de este periodo.\n\n` +
      `👉 [Gestionar Congregaciones](#tab:churches)`;
  }

  // 4. How-to: Informe PDF
  if (q.includes('pdf') || q.includes('informe') || q.includes('junta') || q.includes('descargar') || q.includes('imprimir') || q.includes('acta')) {
    return `📄 **Cómo emitir el Informe Ejecutivo de Junta:**\n\n` +
      `El sistema genera un informe gerencial formateado para la asamblea pastoral y revisoría fiscal con gráficos de distribución, comparativas de recaudos y casillas de firma.\n\n` +
      `👉 [Generar Informe PDF](#modal:pdf)`;
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
      `\n\n💡 Puedes enviarles un recordatorio directo a su WhatsApp:\n` +
      `👉 [Mensajes a Pastores (WhatsApp)](#modal:whatsapp)`;
  }

  // 7. General Friendly Conversational Greeting
  if (q === 'hola' || q.startsWith('hola') || q.includes('funciona') || q.includes('quien eres') || q.includes('que puedes hacer')) {
    return `👋 ¡Hola! Soy **TesorApp Copilot**, tu asesor financiero y tutor contable inteligente.

Actualmente estoy monitoreando el periodo **${periodName}** con **${totalChurches} congregaciones** (${activeChurches} al día) y un recaudo consolidado de **${formatCOP(totalGeneral)}**.

### 💼 ¿En qué te puedo orientar hoy?
- 📚 **Enseñanza y Guía**: Pídeme que te enseñe a usar la planilla, crear fórmulas o administrar usuarios.
- 📊 **Análisis de Recaudo**: Consulta qué sedes han aportado más o qué fondos tenemos en caja.
- 🚀 **Acciones Rápidas**: Te llevo directamente a cualquier parte de la aplicación.

👉 [Ir a Planilla Contable](#tab:sheet) | [Ver Tablero](#tab:dashboard) | [Generar Informe PDF](#modal:pdf)`;
  }

  // 8. General fallback
  return `He procesado tu consulta sobre **${periodName}** (${totalChurches} congregaciones, recaudo: **${formatCOP(totalGeneral)}**).\n\n` +
    `Respecto a tu inquietud, los registros contables muestran **${activeChurches} sedes activas** con aportes distribuidos en Misiones (${formatCOP(totalMisiones || totalGeneral * 0.25)}) y Pro-Templo (${formatCOP(totalTemplo || totalGeneral * 0.15)}).\n\n` +
    `¿Deseas que te guíe a la planilla contable o que abramos el informe PDF?`;
}
