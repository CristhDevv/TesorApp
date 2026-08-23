import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Copy, 
  Check, 
  Cpu,
  ArrowRight,
  Printer
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const rows = gridData?.filas || [];
  const columns = gridData?.columnas || [];

  // Initialize with initial financial brief when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const periodName = currentPeriod?.nombre || 'Periodo Actual';
      const { totalGeneral, activeChurches, totalChurches } = extractFinancialData({
        gridData,
        currentPeriod,
        iglesias,
      });

      const initialBrief = `🏛️ **¡Paz y bendiciones! Soy TesorApp Copilot**, tu asesor financiero y tutor contable.

He analizado los registros de **${periodName}**:
• **Recaudo Total:** **${formatCOP(totalGeneral)}**
• **Reportes al día:** **${activeChurches} de ${totalChurches} congregaciones**

### 💡 ¿En qué te puedo asesorar hoy?
1. Generar reportes o análisis detallados de cualquier sede.
2. Emitir certificados o informes imprimibles en PDF.
3. Explicarte paso a paso cómo registrar gastos, planillas o fondos.

👉 [Ir a Planilla Contable](#tab:sheet) | [🖨️ Generar Informe en PDF](#action:print)`;

      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: initialBrief,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSummary: true,
          modelUsed: 'gemini-3.7-flash',
        },
      ]);
    }
  }, [isOpen, gridData, currentPeriod, iglesias]);

  // Scroll to bottom on message update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputQuery.trim() || isTyping) return;

    const userText = inputQuery.trim();
    setInputQuery('');

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsTyping(true);

    try {
      const { text, modelUsed } = await askGrokAI(
        userText,
        messages.map((m) => ({ sender: m.sender, text: m.text })),
        {
          gridData,
          currentPeriod,
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

  const handlePrintMessage = (messageText: string) => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const currentPeriodName = currentPeriod?.nombre || 'Período Contable Actual';
    const dateStr = new Date().toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Format simple markdown into clean HTML for printing
    const formattedHtml = messageText
      .replace(/### (.*)/g, '<h3 style="color:#0f172a; margin-top:18px; margin-bottom:6px; font-size:15px; font-weight:800;">$1</h3>')
      .replace(/## (.*)/g, '<h2 style="color:#0f172a; margin-top:22px; margin-bottom:8px; font-size:17px; font-weight:900;">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\(.*?\)/g, '')
      .replace(/•\s*(.*)/g, '<li style="margin-bottom:4px;">$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Informe Oficial de Tesorería — TesorApp</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              padding: 40px;
              line-height: 1.6;
              font-size: 13px;
              background: #ffffff;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .title {
              font-size: 18px;
              font-weight: 900;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .subtitle {
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
            }
            .badge {
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              padding: 6px 12px;
              border-radius: 8px;
              font-size: 11px;
              font-weight: 700;
              color: #334155;
            }
            .content {
              margin-bottom: 40px;
              background: #ffffff;
            }
            .signatures {
              margin-top: 60px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              text-align: center;
            }
            .sign-line {
              border-bottom: 1px solid #94a3b8;
              height: 40px;
              margin-bottom: 8px;
            }
            .footer {
              margin-top: 50px;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
              font-size: 10px;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
            }
            @media print {
              body { padding: 0; }
              @page { margin: 18mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">🏛️ TesorApp — Informe Oficial de Tesorería</div>
              <div class="subtitle">Sistema Financiero y Contabilidad Eclesiástica</div>
            </div>
            <div class="badge">
              Período: ${currentPeriodName}
            </div>
          </div>
          <div class="content">
            ${formattedHtml}
          </div>
          <div class="signatures">
            <div>
              <div class="sign-line"></div>
              <strong>Tesorero General / Encargado</strong>
              <div style="font-size:11px; color:#64748b;">Firma y Sello Oficial</div>
            </div>
            <div>
              <div class="sign-line"></div>
              <strong>Pastor / Junta Directiva</strong>
              <div style="font-size:11px; color:#64748b;">Visto Bueno y Aprobación</div>
            </div>
          </div>
          <div class="footer">
            <span>Certificado emitido por TesorApp Copilot</span>
            <span>Fecha de emisión: ${dateStr}</span>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleActionClick = (target: string, contextText?: string) => {
    if (target.startsWith('#tab:')) {
      const tabName = target.replace('#tab:', '');
      if (onNavigate) onNavigate(tabName);
      else onClose();
    } else if (
      target.startsWith('#action:print') || 
      target.startsWith('#action:pdf') || 
      target.startsWith('#modal:pdf') || 
      target.startsWith('#print')
    ) {
      // Print active or latest report to PDF
      const textToPrint = contextText || messages.filter(m => m.sender === 'ai').slice(-1)[0]?.text || '';
      handlePrintMessage(textToPrint);
    } else if (target.startsWith('#modal:')) {
      const modalName = target.replace('#modal:', '');
      if (onOpenModal) onOpenModal(modalName);
      else onClose();
    }
  };

  /**
   * Parses inline formatting: **bold**, *italic*, [Action](#tab:xxx)
   */
  const renderInlineFormattedText = (lineText: string, fullMessageText: string) => {
    // Regex for bold, links with various action prefixes (#tab:, #action:, #modal:, #print), and italic
    const tokenRegex = /(\*\*.*?\*\*|\[.*?\]\(#(?:tab|action|modal|print):[a-zA-Z0-9_:-]+\)|\*.*?\*)/g;
    const parts = lineText.split(tokenRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Action Links: [Label](#tab:sheet) or [Label](#action:print)
      const linkMatch = part.match(/^\[(.*?)\]\((#(?:tab|action|modal|print):[a-zA-Z0-9_:-]+)\)$/);
      if (linkMatch) {
        const isPrint = linkMatch[2].includes('print') || linkMatch[2].includes('pdf');
        return (
          <button
            key={index}
            onClick={() => handleActionClick(linkMatch[2], fullMessageText)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 my-1 mx-1 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer group ${
              isPrint 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white' 
                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white border border-indigo-600'
            }`}
          >
            {isPrint ? (
              <Printer className="w-3.5 h-3.5 text-emerald-200 group-hover:text-white" />
            ) : null}
            <span>{linkMatch[1]}</span>
            {!isPrint ? (
              <ArrowRight className="w-3 h-3 text-indigo-200 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
            ) : null}
          </button>
        );
      }

      // Bold: **text**
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        const cleanText = part.slice(2, -2);
        return (
          <strong key={index} className="font-extrabold text-slate-900">
            {cleanText}
          </strong>
        );
      }

      // Italic: *text* (Check if it was wrapping an action link)
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        const cleanText = part.slice(1, -1);
        const innerLinkMatch = cleanText.match(/^\[(.*?)\]\((#(?:tab|action|modal|print):[a-zA-Z0-9_:-]+)\)$/);
        if (innerLinkMatch) {
          const isPrint = innerLinkMatch[2].includes('print') || innerLinkMatch[2].includes('pdf');
          return (
            <button
              key={index}
              onClick={() => handleActionClick(innerLinkMatch[2], fullMessageText)}
              className="inline-flex items-center gap-1.5 px-3 py-1 my-1 mx-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer group"
            >
              {isPrint ? <Printer className="w-3.5 h-3.5 text-emerald-200" /> : null}
              <span>{innerLinkMatch[1]}</span>
              {!isPrint ? <ArrowRight className="w-3 h-3 text-indigo-200" /> : null}
            </button>
          );
        }
        return (
          <em key={index} className="italic text-slate-700">
            {cleanText}
          </em>
        );
      }

      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  /**
   * Parses full message block structures (Headers, Lists, Quotes)
   */
  const renderMessageContent = (rawText: string) => {
    const lines = rawText.split('\n');

    return (
      <div className="space-y-1.5 text-xs leading-relaxed text-slate-800">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();

          // Empty line
          if (!trimmed) {
            return <div key={lineIdx} className="h-1.5" />;
          }

          // Headers: ### Title or ## Title
          if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
            const cleanTitle = trimmed.replace(/^#+\s*/, '');
            return (
              <h4 key={lineIdx} className="font-bold text-sm text-slate-900 pt-1.5 pb-0.5">
                {renderInlineFormattedText(cleanTitle, rawText)}
              </h4>
            );
          }

          // Blockquote: > Quote
          if (trimmed.startsWith('>')) {
            const cleanQuote = trimmed.replace(/^>\s*/, '');
            return (
              <div
                key={lineIdx}
                className="p-2 my-1 border-l-2 border-indigo-400 bg-indigo-50/70 rounded-r-lg text-slate-700 italic"
              >
                {renderInlineFormattedText(cleanQuote, rawText)}
              </div>
            );
          }

          // Numbered list: 1. Item
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={lineIdx} className="flex items-start gap-1.5 pl-1 my-0.5">
                <span className="font-bold text-indigo-600 shrink-0">{numMatch[1]}.</span>
                <div className="flex-1">{renderInlineFormattedText(numMatch[2], rawText)}</div>
              </div>
            );
          }

          // Bullet list: • Item or - Item
          if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
            const cleanBullet = trimmed.replace(/^[•-]\s*/, '');
            return (
              <div key={lineIdx} className="flex items-start gap-1.5 pl-1 my-0.5">
                <span className="text-indigo-500 font-bold shrink-0">•</span>
                <div className="flex-1">{renderInlineFormattedText(cleanBullet, rawText)}</div>
              </div>
            );
          }

          // Regular paragraph line
          return <div key={lineIdx}>{renderInlineFormattedText(line, rawText)}</div>;
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Top Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/60 rounded-xl border border-indigo-400/30">
              <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm tracking-tight">TesorApp Copilot</h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded-full">
                  GEMINI 3.7 FLASH
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/80">Tutor y Asesor Contable con Google Gemini</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Context Bar */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Período:</span>
            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-indigo-700">
              {currentPeriod?.nombre || 'Actual'}
            </span>
          </div>
          <div className="text-slate-500">
            {rows.length} sedes • {columns.length} columnas
          </div>
        </div>

        {/* Chat History with Auto-scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth">
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
                  {isAi ? (
                    renderMessageContent(msg.text)
                  ) : (
                    <div className="whitespace-pre-line font-medium text-white">{msg.text}</div>
                  )}
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
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.text)}
                        className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer"
                        title="Copiar texto"
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

                      <button
                        onClick={() => handlePrintMessage(msg.text)}
                        className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer ml-1"
                        title="Imprimir / Exportar a PDF"
                      >
                        <Printer className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit text-xs text-slate-500 shadow-xs animate-pulse">
              <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
              <span>Gemini está analizando y respondiendo tu consulta...</span>
            </div>
          )}

          {/* Dummy element for auto-scroll target */}
          <div ref={chatEndRef} />
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
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs font-medium shadow-2xs"
              placeholder="Hazle una consulta a Gemini sobre la planilla, sedes o cómo usar la app..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
