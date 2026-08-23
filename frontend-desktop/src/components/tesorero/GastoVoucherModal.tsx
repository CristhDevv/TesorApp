import { useRef } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  FileText,
  Download
} from 'lucide-react';
import { formatCOP } from '../../utils/formatters';
import { generateVoucherPDFBlob } from '../../utils/voucherPdfGenerator';

export interface GastoVoucherData {
  id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  campo_fondo_nombre?: string;
  periodo_nombre?: string;
  creado_por_nombre?: string;
  beneficiario?: string;
}

interface GastoVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasto: GastoVoucherData | null;
}

// Convert numbers to Spanish words helper
function numeroALetras(num: number): string {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'CERO PESOS M/CTE';

  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = [
    '', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'
  ];
  const diezY = [
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'
  ];
  const veinti = [
    'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'
  ];
  const centenas = [
    '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'
  ];

  function convertirGrupo(val: number): string {
    let output = '';
    if (val === 100) return 'CIEN';

    const c = Math.floor(val / 100);
    const d = Math.floor((val % 100) / 10);
    const u = val % 10;

    if (c > 0) output += centenas[c] + ' ';

    if (d === 1) {
      output += diezY[u] + ' ';
    } else if (d === 2 && u > 0) {
      output += veinti[u] + ' ';
    } else {
      if (d > 0) output += decenas[d] + (u > 0 ? ' Y ' : ' ');
      if (u > 0 && d !== 1 && d !== 2) output += unidades[u] + ' ';
    }

    return output.trim();
  }

  let millones = Math.floor(n / 1000000);
  let miles = Math.floor((n % 1000000) / 1000);
  let cientos = n % 1000;

  let resultado = '';

  if (millones > 0) {
    if (millones === 1) resultado += 'UN MILLÓN ';
    else resultado += convertirGrupo(millones) + ' MILLONES ';
  }

  if (miles > 0) {
    if (miles === 1) resultado += 'MIL ';
    else resultado += convertirGrupo(miles) + ' MIL ';
  }

  if (cientos > 0) {
    resultado += convertirGrupo(cientos) + ' ';
  }

  return resultado.trim() + ' PESOS M/CTE';
}

export function GastoVoucherModal({ isOpen, onClose, gasto }: GastoVoucherModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !gasto) return null;

  const voucherNumber = `CE-${new Date(gasto.fecha || Date.now()).getFullYear()}-${(gasto.id || '0000').slice(0, 6).toUpperCase()}`;
  const montoLetras = numeroALetras(gasto.monto);
  const fechaFormateada = new Date(gasto.fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante de Egreso ${voucherNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              padding: 40px;
              line-height: 1.4;
            }
            .voucher-container {
              max-width: 680px;
              margin: 0 auto;
              border: 1.5px solid #1f2937;
              padding: 24px 28px;
              background: #ffffff;
            }
            .header-table {
              width: 100%;
              border-bottom: 1.5px solid #1f2937;
              padding-bottom: 14px;
              margin-bottom: 16px;
            }
            .title-main {
              font-size: 15px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #111827;
            }
            .title-sub {
              font-size: 11px;
              color: #4b5563;
              font-weight: 600;
              margin-top: 2px;
            }
            .num-box {
              text-align: right;
            }
            .num-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              color: #111827;
            }
            .num-code {
              font-size: 14px;
              font-weight: 800;
              font-family: monospace;
              color: #111827;
              margin-top: 2px;
            }
            .grid-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            .grid-table td {
              border: 1px solid #d1d5db;
              padding: 8px 12px;
              vertical-align: top;
            }
            .cell-label {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              color: #6b7280;
              display: block;
              margin-bottom: 2px;
            }
            .cell-value {
              font-size: 12px;
              font-weight: 700;
              color: #111827;
            }
            .cell-value-mono {
              font-size: 11px;
              font-weight: 700;
              font-family: monospace;
              color: #111827;
            }
            .cell-amount {
              font-size: 16px;
              font-weight: 800;
              font-family: monospace;
              color: #111827;
            }
            .auth-box {
              border: 1px solid #d1d5db;
              padding: 10px 14px;
              background: #f9fafb;
              margin-top: 16px;
            }
            .footer-info {
              margin-top: 16px;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #9ca3af;
              font-family: monospace;
              border-top: 1px dashed #e5e7eb;
              padding-top: 8px;
            }
            @media print {
              body { padding: 0; }
              @page { margin: 15mm; size: portrait; }
            }
          </style>
        </head>
        <body>
          <div class="voucher-container">
            <table class="header-table">
              <tr>
                <td>
                  <div class="title-main">TESORAPP — GESTIÓN FINANCIERA</div>
                  <div class="title-sub">Sistema Contable &amp; Tesorería</div>
                </td>
                <td class="num-box">
                  <div class="num-title">COMPROBANTE DE EGRESO</div>
                  <div class="num-code">${voucherNumber}</div>
                </td>
              </tr>
            </table>

            <table class="grid-table">
              <tr>
                <td style="width: 50%;">
                  <span class="cell-label">Fecha de Expedición</span>
                  <span class="cell-value">${fechaFormateada}</span>
                </td>
                <td style="width: 50%;">
                  <span class="cell-label">Período Contable</span>
                  <span class="cell-value">${gasto.periodo_nombre || 'Período Actual'}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2">
                  <span class="cell-label">Valor Pagado / Deducido</span>
                  <span class="cell-amount">${formatCOP(gasto.monto)} COP</span>
                </td>
              </tr>
              <tr>
                <td colspan="2">
                  <span class="cell-label">La suma de (en letras)</span>
                  <span class="cell-value-mono">${montoLetras}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2">
                  <span class="cell-label">Por Concepto de</span>
                  <span class="cell-value" style="font-size: 13px;">${gasto.descripcion}</span>
                </td>
              </tr>
            </table>

            <div class="auth-box">
              <span class="cell-label">Autorizado y Expedido por</span>
              <div class="cell-value" style="font-size: 13px;">
                ${gasto.creado_por_nombre || 'Tesorero'} — Tesorería Zona 52
              </div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">
                Tesorería Zona 52 • Registro Oficial Aprobado en Sistema
              </div>
            </div>

            <div class="footer-info">
              <span>TesorApp • Documento Contable Oficial</span>
              <span>Generado el ${new Date().toLocaleString('es-CO')}</span>
            </div>
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

  const handleDownloadPDF = () => {
    const pdfBlob = generateVoucherPDFBlob({
      voucherNumber,
      monto: gasto.monto,
      montoLetras,
      descripcion: gasto.descripcion,
      fecha: gasto.fecha,
      periodoNombre: gasto.periodo_nombre,
      creadoPorNombre: gasto.creado_por_nombre,
    });
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Comprobante_${voucherNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = async () => {
    const fileName = `Comprobante_${voucherNumber}.pdf`;
    const pdfBlob = generateVoucherPDFBlob({
      voucherNumber,
      monto: gasto.monto,
      montoLetras,
      descripcion: gasto.descripcion,
      fecha: gasto.fecha,
      periodoNombre: gasto.periodo_nombre,
      creadoPorNombre: gasto.creado_por_nombre,
    });
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

    // On mobile devices (Android / iPhone), Web Share API opens WhatsApp app and attaches the file directly:
    if (isMobileDevice && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: `Comprobante de Egreso ${voucherNumber}`,
          text: `🏛️ *COMPROBANTE DE EGRESO - TESORERÍA ZONA 52*\n📄 *No:* ${voucherNumber}\n💰 *Monto:* ${formatCOP(gasto.monto)} COP\n📝 *Concepto:* ${gasto.descripcion}`,
          files: [pdfFile],
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing PDF file:', err);
        }
      }
    }

    // On PC / Desktop: Download PDF instantly & open WhatsApp Web
    handleDownloadPDF();

    const text = `*COMPROBANTE DE EGRESO — TESORERÍA ZONA 52*\n` +
      `----------------------------------------\n` +
      `• *No. Comprobante:* ${voucherNumber}\n` +
      `• *Fecha:* ${fechaFormateada}\n` +
      `• *Concepto:* ${gasto.descripcion}\n` +
      `• *Monto:* ${formatCOP(gasto.monto)} COP\n` +
      `• *Son:* ${montoLetras}\n` +
      `• *Autorizado por:* ${gasto.creado_por_nombre || 'Tesorero'} — Tesorería Zona 52\n` +
      `----------------------------------------\n` +
      `_Documento oficial generado por TesorApp_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-300" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Comprobante de Egreso</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Compartir por WhatsApp (Adjunta o descarga el PDF)"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp & PDF</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Descargar archivo PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Imprimir"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Professional Monochrome Voucher Display */}
        <div 
          ref={printRef}
          className="p-6 overflow-y-auto space-y-4 text-slate-900 bg-white"
        >
          {/* Formal Outer Frame */}
          <div className="border border-slate-900 p-5 bg-white space-y-4">
            {/* Header Table */}
            <div className="flex items-start justify-between border-b border-slate-900 pb-3">
              <div>
                <h1 className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
                  TESORAPP — GESTIÓN FINANCIERA
                </h1>
                <p className="text-[11px] font-medium text-slate-600">
                  Sistema Contable &amp; Tesorería
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-extrabold uppercase text-slate-900 block tracking-wider">
                  COMPROBANTE DE EGRESO
                </span>
                <span className="text-xs font-mono font-extrabold text-slate-900 block mt-0.5">
                  {voucherNumber}
                </span>
              </div>
            </div>

            {/* Grid Table */}
            <div className="border border-slate-300 divide-y divide-slate-300 text-xs">
              <div className="grid grid-cols-2 divide-x divide-slate-300">
                <div className="p-2.5 bg-slate-50/50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                    Fecha de Expedición
                  </span>
                  <span className="font-bold text-slate-900">{fechaFormateada}</span>
                </div>
                <div className="p-2.5 bg-slate-50/50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                    Período Contable
                  </span>
                  <span className="font-bold text-slate-900">{gasto.periodo_nombre || 'Período Actual'}</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-100/70">
                <span className="text-[10px] uppercase font-bold text-slate-600 block mb-0.5">
                  Valor Pagado / Deducido
                </span>
                <span className="text-base font-mono font-extrabold text-slate-900">
                  {formatCOP(gasto.monto)} COP
                </span>
              </div>

              <div className="p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                  La suma de (en letras)
                </span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">
                  {montoLetras}
                </span>
              </div>

              <div className="p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                  Por Concepto de
                </span>
                <p className="font-bold text-slate-900 text-xs leading-relaxed">
                  {gasto.descripcion}
                </p>
              </div>
            </div>

            {/* Authorized By Box (NO signature lines, pure authorization) */}
            <div className="border border-slate-300 p-3 bg-slate-50/50 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                Autorizado y Expedido por
              </span>
              <div className="font-bold text-slate-900 text-xs">
                {gasto.creado_por_nombre || 'Tesorero'} — Tesorería Zona 52
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Tesorería Zona 52 • Registro Oficial Aprobado en Sistema
              </div>
            </div>

            {/* Document Footer */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span>TesorApp • Documento Contable Oficial</span>
              <span>Generado el {new Date().toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Enviar por WhatsApp</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
