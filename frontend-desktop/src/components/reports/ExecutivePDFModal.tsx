import { useState } from 'react';
import { 
  FileText, 
  Download, 
  X, 
  Building2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCOP } from '../../utils/formatters';

interface ExecutivePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  gridData: any;
  currentPeriod: any;
  user: any;
  tableName?: string;
}

export function ExecutivePDFModal({
  isOpen,
  onClose,
  gridData,
  currentPeriod,
  user,
}: ExecutivePDFModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const rows = gridData?.filas || [];
  const columns = gridData?.columnas || [];

  // Calculate totals
  let totalGeneral = 0;
  const tableRows = rows.map((r: any, idx: number) => {
    let rowTotal = 0;
    const rowValues = columns.map((col: any) => {
      const val = r.valores?.find((v: any) => v.campo_id === col.id);
      const isCalc = val?.modo_calculo === 'calculado';
      const num = isCalc ? (val?.valor_calculado || 0) : (val?.valor_manual || 0);
      if ((col.nombre || '').toLowerCase().includes('total')) {
        rowTotal = Math.max(rowTotal, num);
      }
      return formatCOP(num);
    });

    totalGeneral += rowTotal;

    return [
      (idx + 1).toString(),
      r.iglesia_nombre || 'Sede',
      ...rowValues,
      formatCOP(rowTotal),
    ];
  });

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, 297, 28, 'F');

      // Title & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('TESORAPP — INFORME EJECUTIVO DE TESORERÍA', 14, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225); // Slate 300
      doc.text(
        `Periodo Contable: ${currentPeriod?.nombre || 'General'} | Generado: ${new Date().toLocaleDateString('es-CO')} | Auditor: ${user?.nombre_completo || 'Tesorero General'}`,
        14,
        20
      );

      // KPI Summary Boxes
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 34, 85, 20, 2, 2, 'FD');
      doc.roundedRect(106, 34, 85, 20, 2, 2, 'FD');
      doc.roundedRect(198, 34, 85, 20, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL CONSOLIDADO', 20, 41);
      doc.text('CONGREGACIONES AUDITADAS', 112, 41);
      doc.text('ESTADO DEL PERIODO', 204, 41);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.text(formatCOP(totalGeneral), 20, 49);
      doc.text(`${rows.length} Iglesias`, 112, 49);
      doc.text(currentPeriod?.estado === 'cerrado' ? 'OFICIAL (Cerrado)' : 'EN CURSO (Abierto)', 204, 49);

      // AutoTable
      const headers = ['#', 'Congregación', ...columns.map((c: any) => c.nombre), 'Total Sede'];

      autoTable(doc, {
        head: [headers],
        body: tableRows,
        startY: 60,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [30, 41, 59], // Slate 800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        theme: 'grid',
      });

      // Signatures Block on last page
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setPage(pageCount);

      const finalY = (doc as any).lastAutoTable.finalY + 25;
      if (finalY < 180) {
        doc.setDrawColor(148, 163, 184);
        doc.line(20, finalY, 85, finalY);
        doc.line(115, finalY, 180, finalY);
        doc.line(210, finalY, 275, finalY);

        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('Tesorero General', 35, finalY + 5);
        doc.text('Revisor Fiscal', 133, finalY + 5);
        doc.text('Pastor Presidente / Junta', 222, finalY + 5);
      }

      // Save PDF
      doc.save(`TesorApp_Informe_Ejecutivo_${currentPeriod?.nombre?.replace(/\s+/g, '_') || 'Contabilidad'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Vista Previa del Informe Ejecutivo PDF</h3>
              <p className="text-xs text-slate-300">
                Documento oficial consolidado listo para presentación ante la junta y revisoría.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PDF Preview Sheet */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950">
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-md p-8 space-y-6">
            {/* Sheet Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">TESORAPP CONTABILIDAD</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Informe General de Tesorería y Balance Consolidado</p>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">Periodo: {currentPeriod?.nombre}</span>
                <span className="text-slate-400 dark:text-slate-500">Fecha: {new Date().toLocaleDateString('es-CO')}</span>
              </div>
            </div>

            {/* KPI Cards Preview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Consolidado</span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {formatCOP(totalGeneral)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Congregaciones</span>
                <span className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {rows.length} Sedes
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Estado</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {currentPeriod?.estado === 'cerrado' ? '🔒 Oficial Cerrado' : '🟢 Periodo Abierto'}
                </span>
              </div>
            </div>

            {/* Summary Table Preview */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white font-bold text-[11px]">
                  <tr>
                    <th className="p-2 w-8">#</th>
                    <th className="p-2">Sede</th>
                    {columns.slice(0, 3).map((col: any) => (
                      <th key={col.id} className="p-2 text-right">{col.nombre}</th>
                    ))}
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {rows.slice(0, 6).map((r: any, idx: number) => {
                    let rTot = 0;
                    columns.forEach((c: any) => {
                      const v = r.valores?.find((x: any) => x.campo_id === c.id);
                      const amt = v?.modo_calculo === 'calculado' ? (v?.valor_calculado || 0) : (v?.valor_manual || 0);
                      if ((c.nombre || '').toLowerCase().includes('total')) rTot = Math.max(rTot, amt);
                    });
                    return (
                      <tr key={r.iglesia_id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-850'}>
                        <td className="p-2 text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-sans font-semibold text-slate-800 dark:text-slate-200">{r.iglesia_nombre}</td>
                        {columns.slice(0, 3).map((col: any) => {
                          const val = r.valores?.find((v: any) => v.campo_id === col.id);
                          const amt = val?.modo_calculo === 'calculado' ? (val?.valor_calculado || 0) : (val?.valor_manual || 0);
                          return (
                            <td key={col.id} className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCOP(amt)}</td>
                          );
                        })}
                        <td className="p-2 text-right font-bold text-slate-900 dark:text-white">{formatCOP(rTot)}</td>
                      </tr>
                    );
                  })}
                  {rows.length > 6 && (
                    <tr>
                      <td colSpan={columns.slice(0, 3).length + 3} className="p-2 text-center text-slate-400 italic text-[10px] font-sans">
                        ... y {rows.length - 6} congregaciones adicionales incluidas en el PDF descargable.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Signatures preview */}
            <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-500 dark:text-slate-400">
              <div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-1.5 font-bold text-slate-700 dark:text-slate-300">Tesorero General</div>
                <div className="text-[10px] text-slate-400">{user?.nombre_completo}</div>
              </div>
              <div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-1.5 font-bold text-slate-700 dark:text-slate-300">Revisor Fiscal</div>
                <div className="text-[10px] text-slate-400">Certificación Oficial</div>
              </div>
              <div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-1.5 font-bold text-slate-700 dark:text-slate-300">Pastor Presidente</div>
                <div className="text-[10px] text-slate-400">Junta Directiva</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Formato A4 Horizontal • Compatible con impresoras y visores PDF
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
