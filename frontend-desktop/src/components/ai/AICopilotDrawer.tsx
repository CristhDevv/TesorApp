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
  tablas?: any[];
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
  tablas,
  onNavigate,
  onOpenModal,
}: AICopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const rows = gridData?.filas || [];

  // Build a label that reflects ALL tables, not just the active one
  const allTablesLabel = tablas && tablas.length > 1
    ? `Todas las planillas (${tablas.map((t: any) => t.nombre).join(' + ')})`
    : tablas && tablas.length === 1
    ? tablas[0].nombre
    : gridData?.tabla_nombre || 'Todas las planillas';

  const totalSedes = tablas && tablas.length > 1
    ? `${tablas.reduce((acc: number, t: any) => acc + (t.total_iglesias || t.iglesias?.length || 0), 0)} sedes en ${tablas.length} planillas`
    : `${rows.length} sedes`;

  // Initialize with initial financial brief when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const periodName = currentPeriod?.nombre || gridData?.periodo_nombre || 'Periodo Actual';
      const { totalGeneral, activeChurches, totalChurches, fundsList } = extractFinancialData({
        gridData,
        currentPeriod,
        iglesias,
      });

      const tablasDesc = tablas && tablas.length > 1
        ? `**${tablas.length} planillas consolidadas** (${tablas.map((t: any) => t.nombre).join(', ')})`
        : `**${gridData?.tabla_nombre || 'Planilla General'}**`;

      const initialBrief = `🏛️ **¡Paz y bendiciones! Soy TesorApp Copilot**, tu asesor financiero y tutor contable.

He analizado los registros de ${tablasDesc} para **${periodName}**:
• **Recaudo Visible en Pantalla:** **${formatCOP(totalGeneral)}**
• **Reportes al día:** **${activeChurches} de ${totalChurches} congregaciones**
${fundsList.length > 0 ? `• **Fondos Registrados:** ${fundsList.slice(0, 3).map((f) => `${f.name} (${formatCOP(f.total)})`).join(', ')}` : ''}

> 💡 *Para informes consolidados de **TODAS las planillas** y **rangos de meses**, pregúntame directamente. Ej: «informe de enero hasta agosto», «consolidado de todas las tablas», «primer semestre».*

### 💡 ¿En qué te puedo asesorar hoy?
1. Consultar el total de cualquier fondo (ej. *«informe del fondo misionero»* o *«fondo pro arriendo»*).
2. Generar reportes o análisis detallados de cualquier sede.
3. Emitir certificados o informes oficiales imprimibles en PDF.

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
  }, [isOpen, gridData, currentPeriod, iglesias, tablas]);

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
          tablas,
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
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) { window.print(); return; }

    const currentPeriodName = currentPeriod?.nombre || 'Período Contable Actual';
    const dateStr = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── Strip emojis (all unicode emoji ranges) ──────────────────────────────
    const stripEmojis = (s: string) =>
      s.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|[\u{1F000}-\u{1FFFF}])/gu, '')
       .replace(/[🏛️📅📋💰📊🏆🎯💡⚠️✅🖨️📄👉•→←]/g, '')
       .replace(/^\s*[>\-#*]+\s*/gm, (m) => m.replace(/[^\n\s#>*\-]/g, ''))
       .replace(/>\s*/g, '') // blockquote markers
       .trim();

    // ── Parse markdown table into HTML <table> ────────────────────────────────
    const parseMarkdownTable = (block: string): string => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
      if (lines.length < 2) return '';
      const headers = lines[0].split('|').map(c => c.trim()).filter(c => c !== '');
      const dataRows = lines.slice(2); // skip separator line
      const rows = dataRows.map(row => row.split('|').map(c => c.trim()).filter(c => c !== ''));

      const thead = `<thead><tr>${headers.map(h => `<th>${stripEmojis(h)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${rows.map((r, ri) => {
        const isTotal = r[0] && /total|acumulado/i.test(r[0]);
        return `<tr class="${isTotal ? 'total-row' : ri % 2 === 0 ? 'even' : ''}">${r.map(c => `<td>${stripEmojis(c)}</td>`).join('')}</tr>`;
      }).join('')}</tbody>`;
      return `<table>${thead}${tbody}</table>`;
    };

    // ── Extract chart data from text (key: value patterns) ────────────────────
    interface ChartItem { label: string; value: number; }
    const extractChartData = (text: string): ChartItem[] => {
      const results: ChartItem[] = [];
      // Match "Label: $ X.XXX.XXX" or "Label: X.XXX.XXX"
      const pattern = /^(?:\d+\.\s+)?([A-ZÁÉÍÓÚÑa-záéíóúñ][^:\n]{2,50}):\s*\$?\s*([\d.,]+)/gm;
      let m;
      while ((m = pattern.exec(text)) !== null) {
        const raw = m[2].replace(/\./g, '').replace(',', '.');
        const val = parseFloat(raw);
        if (!isNaN(val) && val > 0) {
          results.push({ label: stripEmojis(m[1].trim()), value: val });
        }
      }
      return results.slice(0, 12);
    };

    // ── Generate SVG horizontal bar chart ────────────────────────────────────
    const generateBarChart = (data: ChartItem[], title: string): string => {
      if (data.length === 0) return '';
      const max = Math.max(...data.map(d => d.value));
      const barH = 22;
      const gap = 6;
      const labelW = 180;
      const chartW = 480;
      const valueW = 110;
      const totalW = labelW + chartW + valueW + 20;
      const totalH = (barH + gap) * data.length + 40;

      const formatM = (v: number) => {
        if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `$${Math.round(v/1_000)}k`;
        return `$${v}`;
      };

      const bars = data.map((d, i) => {
        const w = max > 0 ? Math.round((d.value / max) * chartW) : 0;
        const y = 30 + i * (barH + gap);
        const pct = max > 0 ? ((d.value/max)*100).toFixed(0) : 0;
        return `
          <text x="${labelW - 6}" y="${y + barH/2 + 4}" text-anchor="end" font-size="10" fill="#374151" font-family="sans-serif">${d.label.length > 22 ? d.label.slice(0,20)+'…' : d.label}</text>
          <rect x="${labelW}" y="${y}" width="${w}" height="${barH}" rx="2" fill="#1e3a5f" opacity="${0.5 + (d.value/max)*0.5}"/>
          <text x="${labelW + w + 6}" y="${y + barH/2 + 4}" font-size="10" fill="#1e3a5f" font-weight="bold" font-family="sans-serif">${formatM(d.value)} (${pct}%)</text>`;
      }).join('');

      return `<div class="chart-wrap">
        <div class="chart-title">${title}</div>
        <svg width="${totalW}" height="${totalH}" style="display:block;margin:0 auto;overflow:visible">
          <text x="0" y="16" font-size="11" fill="#6b7280" font-family="sans-serif">Distribución porcentual</text>
          ${bars}
        </svg>
      </div>`;
    };

    // ── Convert the full markdown message to professional HTML ────────────────
    const buildHtml = (raw: string): string => {
      const clean = stripEmojis(raw);
      const lines = clean.split('\n');
      let html = '';
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Blank line
        if (!trimmed) { i++; continue; }

        // Markdown table block: collect all pipe-lines
        if (trimmed.startsWith('|')) {
          let tableBlock = '';
          while (i < lines.length && lines[i].trim().startsWith('|')) {
            tableBlock += lines[i] + '\n';
            i++;
          }
          html += parseMarkdownTable(tableBlock);
          continue;
        }

        // ### Heading 3
        if (trimmed.startsWith('### ')) {
          html += `<h3>${stripEmojis(trimmed.slice(4))}</h3>`;
          i++;
          // Try to generate chart from the following section lines
          const sectionLines: string[] = [];
          while (i < lines.length && !lines[i].trim().startsWith('#') && !lines[i].trim().startsWith('|')) {
            sectionLines.push(lines[i]);
            i++;
          }
          const sectionText = sectionLines.join('\n');
          const sectionHtml = sectionText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>')
            .replace(/^(\d+)\.\s+(.+)$/gm, '<li><span class="num">$1.</span> $2</li>')
            .replace(/\n{2,}/g, '<br/>')
            .replace(/\n/g, '<br/>');
          if (sectionText.trim()) html += `<div class="section-body">${sectionHtml}</div>`;
          // Chart for certain sections (funds, congregaciones)
          const chartData = extractChartData(sectionText);
          if (chartData.length >= 3) {
            html += generateBarChart(chartData, 'Distribución Visual');
          }
          continue;
        }

        // ## Heading 2
        if (trimmed.startsWith('## ')) {
          html += `<h2>${stripEmojis(trimmed.slice(3))}</h2>`;
          i++; continue;
        }

        // # Heading 1
        if (trimmed.startsWith('# ')) {
          html += `<h2 class="main-section">${stripEmojis(trimmed.slice(2))}</h2>`;
          i++; continue;
        }

        // Blockquote
        if (trimmed.startsWith('>')) {
          html += `<blockquote>${stripEmojis(trimmed.slice(1)).trim()}</blockquote>`;
          i++; continue;
        }

        // Regular paragraph
        const para = trimmed
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1');
        html += `<p>${para}</p>`;
        i++;
      }

      return html;
    };

    const bodyHtml = buildHtml(messageText);

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Informe Oficial de Tesorería — TesorApp</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff;font-size:11.5pt;line-height:1.55}
    /* ── HEADER ── */
    .doc-header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #1e3a5f;padding-bottom:14px;margin-bottom:22px}
    .org-name{font-size:9pt;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
    .doc-title{font-size:16pt;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.5px}
    .doc-subtitle{font-size:9pt;color:#6b7280;margin-top:3px}
    .doc-meta{text-align:right;font-size:9pt;color:#374151;line-height:1.7}
    .doc-meta strong{display:block;font-size:10.5pt;color:#1e3a5f}
    /* ── SECTIONS ── */
    h2{font-size:12pt;font-weight:700;color:#1e3a5f;border-bottom:1px solid #d1d5db;padding-bottom:5px;margin:22px 0 12px}
    h2.main-section{font-size:13pt;border-bottom:2px solid #1e3a5f;margin-top:28px}
    h3{font-size:10.5pt;font-weight:700;color:#1e3a5f;margin:18px 0 8px;border-left:3px solid #1e3a5f;padding-left:8px}
    p{margin:4px 0 7px;color:#1f2937;font-size:10.5pt}
    blockquote{border-left:3px solid #9ca3af;padding:6px 12px;margin:10px 0;color:#6b7280;font-style:italic;font-size:9.5pt;background:#f9fafb}
    .section-body{margin:0 0 10px;font-size:10.5pt;color:#1f2937}
    .section-body li{list-style:none;padding:3px 0 3px 14px;border-bottom:1px solid #f3f4f6}
    .section-body .num{font-weight:700;color:#1e3a5f;margin-right:4px}
    strong{color:#111827}
    /* ── TABLES ── */
    table{width:100%;border-collapse:collapse;margin:12px 0 18px;font-size:9.5pt}
    thead tr{background:#1e3a5f;color:#fff}
    thead th{padding:7px 10px;text-align:left;font-weight:600;font-size:9pt;letter-spacing:.3px}
    tbody td{padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#1f2937}
    tbody tr.even td{background:#f8fafc}
    tbody tr.total-row td{background:#eff6ff;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f}
    tbody tr:hover td{background:#f1f5f9}
    /* ── CHARTS ── */
    .chart-wrap{margin:10px 0 22px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:4px;background:#fafafa;page-break-inside:avoid}
    .chart-title{font-size:9.5pt;font-weight:600;color:#374151;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px}
    /* ── KPI CARDS ── */
    .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0 22px}
    .kpi-card{border:1px solid #d1d5db;border-radius:4px;padding:12px 14px;background:#f8fafc}
    .kpi-label{font-size:8pt;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
    .kpi-value{font-size:13pt;font-weight:700;color:#1e3a5f}
    /* ── SIGNATURES ── */
    .signatures{margin-top:50px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;text-align:center;page-break-inside:avoid}
    .sign-block{}
    .sign-line{border-top:1px solid #374151;margin-bottom:8px;margin-top:44px}
    .sign-role{font-size:10pt;font-weight:700;color:#1e3a5f}
    .sign-sub{font-size:8.5pt;color:#6b7280;margin-top:3px}
    /* ── FOOTER ── */
    .doc-footer{margin-top:32px;padding-top:10px;border-top:1px solid #d1d5db;display:flex;justify-content:space-between;font-size:8.5pt;color:#9ca3af}
    @media print{
      body{padding:0}
      @page{margin:18mm 16mm;size:A4}
      .chart-wrap,.kpi-grid,.signatures{page-break-inside:avoid}
    }
    @page{margin:18mm 16mm;size:A4}
  </style>
</head>
<body style="padding:22px 28px">
  <!-- DOCUMENT HEADER -->
  <div class="doc-header">
    <div>
      <div class="org-name">Asociación / Zona Eclesiástica</div>
      <div class="doc-title">TesorApp &mdash; Informe Oficial de Tesorería</div>
      <div class="doc-subtitle">Sistema Financiero y Contabilidad Eclesiástica</div>
    </div>
    <div class="doc-meta">
      <strong>${currentPeriodName}</strong>
      Fecha de emisión: ${dateStr}<br/>
      Generado por: TesorApp Copilot
    </div>
  </div>

  <!-- BODY -->
  <div class="content">${bodyHtml}</div>

  <!-- SIGNATURE BLOCK -->
  <div class="signatures">
    <div class="sign-block">
      <div class="sign-line"></div>
      <div class="sign-role">Tesorero</div>
      <div class="sign-sub">Firma y Sello Oficial</div>
    </div>
    <div class="sign-block">
      <div class="sign-line"></div>
      <div class="sign-role">Secretario</div>
      <div class="sign-sub">Firma y Constancia</div>
    </div>
    <div class="sign-block">
      <div class="sign-line"></div>
      <div class="sign-role">Presbítero</div>
      <div class="sign-sub">Visto Bueno y Aprobación</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="doc-footer">
    <span>Documento generado automáticamente por TesorApp Copilot &mdash; Uso oficial interno</span>
    <span>Fecha: ${dateStr}</span>
  </div>
  <script>window.onload=function(){window.print();}</script>
</body>
</html>`);
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
      <div className="space-y-1.5 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
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
              <h4 key={lineIdx} className="font-bold text-sm text-slate-900 dark:text-white pt-1.5 pb-0.5">
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
                className="p-2 my-1 border-l-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-r-lg text-slate-700 dark:text-slate-300 italic"
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
                <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{numMatch[1]}.</span>
                <div className="flex-1">{renderInlineFormattedText(numMatch[2], rawText)}</div>
              </div>
            );
          }

          // Bullet list: • Item or - Item
          if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
            const cleanBullet = trimmed.replace(/^[•-]\s*/, '');
            return (
              <div key={lineIdx} className="flex items-start gap-1.5 pl-1 my-0.5">
                <span className="text-indigo-500 dark:text-indigo-400 font-bold shrink-0">•</span>
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
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
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">Alcance:</span>
            <span className="bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700 font-bold text-emerald-700 dark:text-emerald-300 truncate max-w-[160px]" title={allTablesLabel}>
              {allTablesLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-slate-500 dark:text-slate-400 font-mono text-[10px]">
            <span>{currentPeriod?.nombre || gridData?.periodo_nombre || 'Actual'}</span>
            <span>•</span>
            <span>{totalSedes}</span>
          </div>
        </div>

        {/* Chat History with Auto-scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950 scroll-smooth">
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
                      ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs rounded-tl-xs'
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
                    <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-100 dark:border-indigo-900 flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5" />
                      {msg.modelUsed}
                    </span>
                  )}
                  {isAi && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.text)}
                        className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-0.5 cursor-pointer"
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
                        className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-0.5 cursor-pointer ml-1"
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
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit text-xs text-slate-500 dark:text-slate-400 shadow-xs animate-pulse">
              <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
              <span>Gemini está analizando y respondiendo tu consulta...</span>
            </div>
          )}

          {/* Dummy element for auto-scroll target */}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 text-xs font-medium shadow-2xs"
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
