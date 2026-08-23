import { useRef } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  FileText, 
  User
} from 'lucide-react';
import { formatCOP } from '../../utils/formatters';

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

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `🏛️ *COMPROBANTE DE EGRESO - TESORERÍA*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 *No. Comprobante:* ${voucherNumber}\n` +
      `📅 *Fecha:* ${new Date(gasto.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}\n` +
      `📝 *Concepto / Detalle:* ${gasto.descripcion}\n` +
      `💰 *Monto Pagado:* ${formatCOP(gasto.monto)}\n` +
      `🔤 *Son:* ${montoLetras}\n` +
      `👤 *Registrado por:* ${gasto.creado_por_nombre || 'Tesorería'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Comprobante oficial generado por el Sistema Financiero TesorApp_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm">Voucher / Comprobante de Egreso</h3>
              <p className="text-[11px] text-slate-300">Recibo oficial de salida de fondos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
              title="Compartir por WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div 
          ref={printRef}
          className="p-6 md:p-8 overflow-y-auto space-y-5 print:p-0 print:overflow-visible print:space-y-4"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-900 text-white rounded-2xl print:bg-slate-900 print:text-white">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-black uppercase tracking-tight text-slate-900">
                  TESORAPP — GESTIÓN FINANCIERA
                </h1>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tesorería &amp; Control de Egresos
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right bg-slate-50 print:bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black uppercase text-indigo-700 block tracking-widest">
                COMPROBANTE DE EGRESO
              </span>
              <span className="text-sm font-mono font-extrabold text-slate-900 block">
                {voucherNumber}
              </span>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-600" /> Fecha de Emisión
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {new Date(gasto.fecha).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-600" /> Autorizado por
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block truncate">
                {gasto.creado_por_nombre || 'Tesorería'}
              </span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm print:bg-slate-900 print:text-white">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-200 block">
                VALOR PAGADO / DEDUCIDO
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tight">
                {formatCOP(gasto.monto)}
              </span>
            </div>
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30 flex items-center gap-1.5 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>EGRESO AUTORIZADO</span>
            </div>
          </div>

          {/* Description & Words */}
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Concepto / Motivo del Desembolso:
              </span>
              <p className="font-bold text-slate-900 text-sm leading-relaxed">
                {gasto.descripcion}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                La suma de (en letras):
              </span>
              <p className="font-mono font-bold text-slate-800 text-[11px]">
                {montoLetras}
              </p>
            </div>
          </div>

          {/* Signatures Area */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-1">
              <div className="border-b border-slate-400 h-10 w-full mb-1"></div>
              <p className="font-bold text-slate-900">{gasto.creado_por_nombre || 'Tesorero Oficial'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Entregué Conforme (Tesorería)</p>
            </div>

            <div className="space-y-1">
              <div className="border-b border-slate-400 h-10 w-full mb-1"></div>
              <p className="font-bold text-slate-900">Firma Beneficiario / Receptor</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">C.C. / Recibí Conforme</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span>TesorApp v2.0 • Comprobante Contable Oficial</span>
            <span>Generado el {new Date().toLocaleString('es-CO')}</span>
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden on print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Enviar por WhatsApp</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Voucher (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
