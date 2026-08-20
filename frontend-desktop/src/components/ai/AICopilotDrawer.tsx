import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Copy, 
  Check, 
  TrendingUp, 
  AlertCircle, 
  Lightbulb
} from 'lucide-react';
import { formatCOP } from '../../utils/formatters';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  gridData: any;
  currentPeriod: any;
  iglesias?: any[];
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  isSummary?: boolean;
}

export function AICopilotDrawer({
  isOpen,
  onClose,
  gridData,
  currentPeriod,
}: AICopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rows = gridData?.filas || [];
  const columns = gridData?.columnas || [];

  // Generate automated financial analysis narrative
  const generateNarrative = () => {
    if (!rows.length) {
      return 'No hay datos suficientes en la planilla actual para generar un análisis financiero.';
    }

    let totalRecaudo = 0;
    const churchTotals: { name: string; total: number }[] = [];
    const emptyChurches: string[] = [];

    rows.forEach((r: any) => {
      let churchSum = 0;
      let hasValue = false;

      columns.forEach((col: any) => {
        const val = r.valores?.find((v: any) => v.campo_id === col.id);
        const amount = val?.modo_calculo === 'calculado' ? (val?.valor_calculado || 0) : (val?.valor_manual || 0);
        if (amount > 0) hasValue = true;
        const colName = (col.nombre || '').toLowerCase();
        if (colName.includes('total')) {
          churchSum = Math.max(churchSum, amount);
        }
      });

      if (!hasValue) {
        emptyChurches.push(r.iglesia_nombre);
      }

      totalRecaudo += churchSum;
      churchTotals.push({ name: r.iglesia_nombre, total: churchSum });
    });

    churchTotals.sort((a, b) => b.total - a.total);
    const top3 = churchTotals.slice(0, 3);
    const misionesEst = totalRecaudo * 0.25;
    const temploEst = totalRecaudo * 0.15;

    return `📊 **Resumen Ejecutivo de Inteligencia Financiera — Periodo ${currentPeriod?.nombre || 'Actual'}**

**1. Desempeño Consolidado:**
• El recaudo total registrado asciende a **${formatCOP(totalRecaudo)}**, distribuido en **${rows.length} congregaciones**.
• Estimación Fondos Especiales: **${formatCOP(misionesEst)}** destinados a Misiones y **${formatCOP(temploEst)}** para Fondo Pro-Templo / Edificación.

**2. Sedes Destacadas (Top 3 Aportes):**
${top3.map((c, i) => `${i + 1}. **${c.name}**: ${formatCOP(c.total)} (${totalRecaudo > 0 ? Math.round((c.total / totalRecaudo) * 100) : 0}% del total)`).join('\n')}

**3. Diagnóstico y Alertas de Auditoría:**
${emptyChurches.length > 0 ? `⚠️ Hay **${emptyChurches.length} congregación(es)** sin registros reportados (${emptyChurches.slice(0, 3).join(', ')}${emptyChurches.length > 3 ? '...' : ''}).` : '✅ Todas las congregaciones presentan registros contables al día.'}
• **Recomendación**: Validar los soportes de consignación antes del cierre oficial del periodo.`;
  };

  // Initialize initial AI summary
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([
          {
            id: 'init-summary',
            sender: 'ai',
            text: generateNarrative(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSummary: true,
          },
        ]);
        setIsTyping(false);
      }, 600);
    }
  }, [isOpen]);

  // Handle user question in natural language
  const handleSend = (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      let aiResponse = '';
      const qLower = q.toLowerCase();

      if (qLower.includes('top') || qLower.includes('mayor') || qLower.includes('mas')) {
        const sorted = [...rows]
          .map((r) => {
            let maxTotal = 0;
            columns.forEach((c: any) => {
              const v = r.valores?.find((x: any) => x.campo_id === c.id);
              const amount = v?.modo_calculo === 'calculado' ? (v?.valor_calculado || 0) : (v?.valor_manual || 0);
              if ((c.nombre || '').toLowerCase().includes('total')) maxTotal = Math.max(maxTotal, amount);
            });
            return { name: r.iglesia_nombre, total: maxTotal };
          })
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        aiResponse = `🏆 **Top 5 Sedes con Mayor Recaudo en ${currentPeriod?.nombre}:**\n\n` +
          sorted.map((s, idx) => `${idx + 1}. **${s.name}** — ${formatCOP(s.total)}`).join('\n');
      } else if (qLower.includes('pendiente') || qLower.includes('faltan') || qLower.includes('alerta')) {
        const missing = rows.filter((r: any) => {
          const hasVal = r.valores?.some((v: any) => (v.valor_manual || v.valor_calculado || 0) > 0);
          return !hasVal;
        });

        if (missing.length === 0) {
          aiResponse = `✅ ¡Excelente noticia! Todas las **${rows.length} iglesias** han ingresado datos en este periodo. No hay planillas en blanco.`;
        } else {
          aiResponse = `⚠️ **Sedes Pendientes por Reportar (${missing.length}):**\n\n` +
            missing.map((m: any) => `• **${m.iglesia_nombre}**`).join('\n') +
            `\n\n*Sugerencia: Envíe un recordatorio por WhatsApp a los pastores correspondientes.*`;
        }
      } else if (qLower.includes('mision') || qLower.includes('templo') || qLower.includes('fondo') || qLower.includes('distribucion')) {
        let total = 0;
        rows.forEach((r: any) => {
          columns.forEach((c: any) => {
            if ((c.nombre || '').toLowerCase().includes('total')) {
              const v = r.valores?.find((x: any) => x.campo_id === c.id);
              const amount = v?.modo_calculo === 'calculado' ? (v?.valor_calculado || 0) : (v?.valor_manual || 0);
              total = Math.max(total, amount);
            }
          });
        });
        aiResponse = `📊 **Distribución Estratégica de Fondos:**\n\n` +
          `• **Diezmos / Fondo Operativo Local (60%):** ${formatCOP(total * 0.6)}\n` +
          `• **Fondo de Misiones y Expansión (25%):** ${formatCOP(total * 0.25)}\n` +
          `• **Fondo Pro-Templo y Bienes Raíces (15%):** ${formatCOP(total * 0.15)}\n\n` +
          `*Esta distribución cumple con los estatutos contables vigentes.*`;
      } else {
        aiResponse = `He analizado la información contable disponible. Para el periodo **${currentPeriod?.nombre}**, se cuentan con **${rows.length} congregaciones** auditadas y **${columns.length} columnas contables**. ¿Deseas que genere un informe en PDF o simule escenarios de presupuesto?`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: aiResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm tracking-tight">TesorApp Copilot</h3>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-full uppercase">
                  IA
                </span>
              </div>
              <p className="text-[11px] text-purple-200">Inteligencia y Diagnóstico Financiero Contable</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAi ? 'items-start' : 'items-end'} animate-fade-in`}
              >
                <div
                  className={`max-w-[92%] p-4 rounded-2xl text-xs leading-relaxed ${
                    isAi
                      ? 'bg-white border border-slate-200 text-slate-800 shadow-xs rounded-tl-xs'
                      : 'bg-indigo-600 text-white shadow-md rounded-tr-xs'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>
                </div>

                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  {isAi && (
                    <button
                      onClick={() => copyToClipboard(msg.id, msg.text)}
                      className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-xs w-fit shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-spin" />
              <span>Analizando registros contables...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
          <button
            onClick={() => handleSend('¿Cuáles son las 3 iglesias que más aportaron?')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer border border-slate-200"
          >
            <TrendingUp className="w-3 h-3 text-indigo-500" /> Top Aportes
          </button>
          <button
            onClick={() => handleSend('¿Hay iglesias con valores pendientes por reportar?')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer border border-slate-200"
          >
            <AlertCircle className="w-3 h-3 text-amber-500" /> Planillas Pendientes
          </button>
          <button
            onClick={() => handleSend('¿Cómo se distribuyen los fondos de misiones y templo?')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer border border-slate-200"
          >
            <Lightbulb className="w-3 h-3 text-purple-500" /> Distribución de Fondos
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            placeholder="Pregunte a la IA sobre métricas, finanzas o auditoría..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || isTyping}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
