import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Copy, 
  Check, 
  Cpu,
  ArrowRight
} from 'lucide-react';
import { formatCOP } from '../../utils/formatters';
import { askGrokAI, extractFinancialData } from '../../services/grokAiService';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  gridData: any;
  currentPeriod: any;
  iglesias?: any[];
  onNavigate?: (tab: string) => void;
  onOpenModal?: (modalName: string) => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  isSummary?: boolean;
  modelUsed?: string;
}

export function AICopilotDrawer({
  isOpen,
  onClose,
  gridData,
  currentPeriod,
  iglesias,
  onNavigate,
  onOpenModal,
}: AICopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rows = gridData?.filas || [];
  const columns = gridData?.columnas || [];

  // Generate initial financial analysis narrative
  const generateNarrative = () => {
    if (!rows.length) {
      return 'No hay datos suficientes en la planilla actual para generar un análisis financiero.';
    }

    const { totalGeneral, churchList, totalMisiones, totalTemplo } = extractFinancialData({
      periodName: currentPeriod?.nombre || 'Actual',
      rows,
      columns,
      iglesias,
    });

    const sorted = [...churchList].sort((a, b) => b.total - a.total);
    const top3 = sorted.slice(0, 3);
    const emptyChurches = sorted.filter((c) => !c.hasValues);
    const misionesEst = totalMisiones || totalGeneral * 0.25;
    const temploEst = totalTemplo || totalGeneral * 0.15;

    return `📊 **Resumen Ejecutivo de Inteligencia Financiera — Periodo ${currentPeriod?.nombre || 'Actual'}**

**1. Desempeño Consolidado:**
• El recaudo total registrado asciende a **${formatCOP(totalGeneral)}**, distribuido en **${rows.length} congregaciones**.
• Estimación Fondos Especiales: **${formatCOP(misionesEst)}** destinados a Misiones y **${formatCOP(temploEst)}** para Fondo Pro-Templo / Edificación.

**2. Sedes Destacadas (Top 3 Aportes):**
${top3.map((c, i) => `${i + 1}. **${c.name}**: ${formatCOP(c.total)} (${totalGeneral > 0 ? ((c.total / totalGeneral) * 100).toFixed(1) : 0}% del total)`).join('\n')}

**3. Diagnóstico y Alertas de Auditoría:**
${emptyChurches.length > 0 ? `⚠️ Hay **${emptyChurches.length} congregación(es)** sin registros reportados (${emptyChurches.slice(0, 3).map((e) => e.name).join(', ')}${emptyChurches.length > 3 ? '...' : ''}).` : '✅ Todas las congregaciones presentan registros contables al día.'}
• **Recomendación**: Validar los soportes de consignación antes del cierre oficial del periodo.

👉 [Ir a Planilla Contable](#tab:sheet) | [Generar Informe PDF](#modal:pdf)`;
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
            modelUsed: '✨ Google Gemini Pro',
          },
        ]);
        setIsTyping(false);
      }, 400);
    }
  }, [isOpen]);

  // Handle user question in natural language via Google Gemini
  const handleSend = async (queryText?: string) => {
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

    try {
      const { text, modelUsed } = await askGrokAI(
        q,
        messages,
        {
          periodName: currentPeriod?.nombre || 'Periodo Actual',
          rows,
          columns,
          iglesias,
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: 'No fue posible conectar con el servicio en este momento. Por favor intenta nuevamente.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleActionClick = (target: string) => {
    if (target.startsWith('#tab:')) {
      const tabName = target.replace('#tab:', '');
      if (onNavigate) onNavigate(tabName);
      else onClose();
    } else if (target.startsWith('#modal:')) {
      const modalName = target.replace('#modal:', '');
      if (onOpenModal) onOpenModal(modalName);
      else onClose();
    }
  };

  /**
   * Helper to parse markdown text and render interactive action buttons
   */
  const renderMessageContent = (rawText: string) => {
    // Regex to match [Label](#tab:xxx) or [Label](#modal:yyy)
    const linkRegex = /\[(.*?)\]\((#(?:tab|modal):[a-zA-Z0-9_-]+)\)/g;
    const parts: (string | { label: string; target: string })[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(rawText.substring(lastIndex, match.index));
      }
      parts.push({ label: match[1], target: match[2] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < rawText.length) {
      parts.push(rawText.substring(lastIndex));
    }

    return (
      <div className="whitespace-pre-line leading-relaxed">
        {parts.map((part, index) => {
          if (typeof part === 'string') {
            return <React.Fragment key={index}>{part}</React.Fragment>;
          }
          return (
            <button
              key={index}
              onClick={() => handleActionClick(part.target)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 my-1 mx-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer group"
            >
              <span>{part.label}</span>
              <ArrowRight className="w-3 h-3 text-indigo-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
    );
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
                <span className="text-[10px] bg-gradient-to-r from-blue-400 to-indigo-400 text-slate-950 font-extrabold px-2 py-0.2 rounded-full uppercase tracking-wider shadow-2xs">
                  ✨ Gemini Pro
                </span>
              </div>
              <p className="text-[11px] text-purple-200">Tutor Contable y Asesor Financiero Inteligente</p>
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
                  {isAi ? renderMessageContent(msg.text) : <div className="whitespace-pre-line">{msg.text}</div>}
                </div>

                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  {msg.modelUsed && (
                    <span className="text-[9px] text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5" />
                      {msg.modelUsed}
                    </span>
                  )}
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
            <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit text-xs text-slate-500 shadow-xs">
              <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
              <span>Gemini está analizando y respondiendo tu consulta...</span>
            </div>
          )}
        </div>

        {/* Quick Question Prompts */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
            Preguntas Rápidas sugeridas:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              '🏆 Top 3 iglesias que más aportaron',
              '📝 ¿Cómo registro un valor en la planilla?',
              '🏛️ ¿Cómo creo una nueva sede?',
              '📄 Generar informe oficial para junta',
              '📊 Distribución de fondos de este periodo',
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-medium transition cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs font-medium"
              placeholder="Hazle una consulta a Gemini sobre la planilla, sedes o cómo usar la app..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
