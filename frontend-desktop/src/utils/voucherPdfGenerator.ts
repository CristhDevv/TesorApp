import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCOP } from './formatters';

export interface VoucherPDFInput {
  voucherNumber: string;
  tipo?: 'egreso' | 'ingreso';
  monto: number;
  montoLetras: string;
  descripcion: string;
  fecha: string;
  periodoNombre?: string;
  creadoPorNombre?: string;
  fondoNombre?: string;
  observacion?: string;
}

export function generateVoucherPDFBlob(data: VoucherPDFInput): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isIngreso = data.tipo === 'ingreso';
  const headerVoucherTitle = isIngreso ? 'COMPROBANTE DE INGRESO' : 'COMPROBANTE DE EGRESO';
  const valorLabel = isIngreso ? 'VALOR RECIBIDO / INGRESADO:' : 'VALOR PAGADO / DEDUCIDO:';
  const authLabel = isIngreso ? 'RECIBIDO Y CONTABILIZADO POR:' : 'AUTORIZADO Y EXPEDIDO POR:';

  const fechaFormateada = new Date(data.fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text('TESORAPP — GESTIÓN FINANCIERA', 22, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text('Sistema Contable & Control de Tesorería', 22, 31);

  // Voucher Number Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(headerVoucherTitle, 188, 26, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text(data.voucherNumber, 188, 32, { align: 'right' });

  // Divider
  doc.setLineWidth(0.5);
  doc.line(20, 36, 190, 36);

  // AutoTable Form
  const bodyRows: any[] = [
    [
      {
        content: `FECHA DE EXPEDICIÓN:\n${fechaFormateada}`,
        styles: { fontStyle: 'bold', fillColor: [249, 250, 251] },
      },
      {
        content: `PERÍODO CONTABLE:\n${data.periodoNombre || 'Período Actual'}`,
        styles: { fontStyle: 'bold', fillColor: [249, 250, 251] },
      },
    ],
  ];

  if (data.fondoNombre) {
    bodyRows.push([
      {
        content: `FONDO / CUENTA:\n${data.fondoNombre}`,
        colSpan: 2,
        styles: { fontStyle: 'bold', fillColor: [249, 250, 251] },
      },
    ]);
  }

  bodyRows.push(
    [
      {
        content: `${valorLabel}\n${formatCOP(data.monto)} COP`,
        colSpan: 2,
        styles: { fontSize: 13, fontStyle: 'bold', fillColor: isIngreso ? [240, 253, 244] : [243, 244, 246] },
      },
    ],
    [
      {
        content: `LA SUMA DE (EN LETRAS):\n${data.montoLetras}`,
        colSpan: 2,
        styles: { fontSize: 9, fontStyle: 'bold' },
      },
    ],
    [
      {
        content: `POR CONCEPTO DE:\n${data.descripcion}`,
        colSpan: 2,
        styles: { fontSize: 10, fontStyle: 'bold' },
      },
    ]
  );

  if (data.observacion) {
    bodyRows.push([
      {
        content: `OBSERVACIONES / DETALLES:\n${data.observacion}`,
        colSpan: 2,
        styles: { fontSize: 9 },
      },
    ]);
  }

  bodyRows.push([
    {
      content: `${authLabel}\n${data.creadoPorNombre || 'Tesorero'} — Tesorería Zona 52\nTesorería Zona 52 • Registro Oficial Aprobado en Sistema`,
      colSpan: 2,
      styles: { fillColor: [249, 250, 251], fontStyle: 'bold', fontSize: 9.5 },
    },
  ]);

  autoTable(doc, {
    startY: 40,
    margin: { left: 20, right: 20 },
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      textColor: [17, 24, 39],
      lineColor: [209, 213, 219],
      lineWidth: 0.2,
      font: 'helvetica',
    },
    body: bodyRows,
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 140;

  // Outer Border (calculated based on table height)
  const rectHeight = Math.max(160, finalY + 18 - 15);
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.rect(15, 15, 180, rectHeight);

  // Document Footer Info
  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('TesorApp • Documento Contable Oficial', 22, finalY + 12);
  doc.text(`Generado el ${new Date().toLocaleString('es-CO')}`, 188, finalY + 12, { align: 'right' });

  return doc.output('blob');
}
