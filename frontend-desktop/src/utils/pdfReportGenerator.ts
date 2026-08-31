import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  metaInfo?: { label: string; value: string }[];
  headers: string[];
  rows: (string | number)[][];
  totalsRow?: (string | number)[];
  orientation?: 'portrait' | 'landscape';
  includeSignatures?: boolean;
  fileName?: string;
}

export function generatePDFReport(options: PDFReportOptions): void {
  const {
    title,
    subtitle = '',
    metaInfo = [],
    headers,
    rows,
    totalsRow,
    orientation = 'landscape',
    includeSignatures = true,
    fileName = 'Reporte_Oficial.pdf',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Top Decorative Bar
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 48, 'F');

  doc.setFillColor(79, 70, 229); // Indigo-600 accent
  doc.rect(0, 48, pageWidth, 3, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title.toUpperCase(), pageWidth / 2, 28, { align: 'center' });

  // Subtitle / Info
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240);
    doc.text(subtitle, pageWidth / 2, 42, { align: 'center' });
  }

  let startY = 62;

  // 2. Metadata Cards (if provided)
  if (metaInfo.length > 0) {
    const cardWidth = Math.min(140, (pageWidth - 60) / metaInfo.length);
    const totalBlockWidth = cardWidth * metaInfo.length + (metaInfo.length - 1) * 10;
    let startX = (pageWidth - totalBlockWidth) / 2;

    metaInfo.forEach((item) => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(startX, startY, cardWidth, 32, 4, 4, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(item.label.toUpperCase(), startX + cardWidth / 2, startY + 12, { align: 'center' });

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(item.value, startX + cardWidth / 2, startY + 25, { align: 'center' });

      startX += cardWidth + 10;
    });

    startY += 40;
  }

  // 3. Table Data Preparation
  const tableBody = [...rows];
  if (totalsRow) {
    tableBody.push(totalsRow);
  }

  // Column styles: right-align columns after the second one
  const columnStyles: Record<number, any> = {
    0: { halign: 'center', cellWidth: 28 },
    1: { halign: 'left', fontStyle: 'bold' },
  };

  for (let c = 2; c < headers.length; c++) {
    columnStyles[c] = { halign: 'right' };
  }

  // 4. Render Table with AutoTable
  autoTable(doc, {
    startY,
    head: [headers],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [67, 56, 202], // Indigo-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    didParseCell: (data) => {
      // Style totals row
      if (totalsRow && data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
        data.cell.styles.textColor = [15, 23, 42];
        if (data.column.index === 0) {
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 1) {
          data.cell.styles.halign = 'left';
        }
      }
    },
    margin: { left: 24, right: 24, bottom: includeSignatures ? 75 : 30 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || startY + 100;

  // 5. Signatures Block (if requested and fits, or added to last page)
  if (includeSignatures) {
    let sigY = finalY + 45;

    // Check if new page is needed for signatures
    if (sigY + 50 > pageHeight) {
      doc.addPage();
      sigY = 60;
    }

    const colWidth = (pageWidth - 80) / 3;

    // Signature 1: Tesorero
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.8);
    doc.line(40, sigY, 40 + colWidth - 20, sigY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('TESORERÍA / ADMINISTRACIÓN', 40 + (colWidth - 20) / 2, sigY + 12, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Firma y Sello Responsable', 40 + (colWidth - 20) / 2, sigY + 22, { align: 'center' });

    // Signature 2: Revisor Fiscal / Auditor
    const sig2X = 40 + colWidth;
    doc.line(sig2X, sigY, sig2X + colWidth - 20, sigY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('REVISORÍA FISCAL / AUDITORÍA', sig2X + (colWidth - 20) / 2, sigY + 12, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Verificado Conforme', sig2X + (colWidth - 20) / 2, sigY + 22, { align: 'center' });

    // Signature 3: Pastor / Presidencia
    const sig3X = 40 + colWidth * 2;
    doc.line(sig3X, sigY, sig3X + colWidth - 20, sigY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('PASTORADO / PRESIDENCIA', sig3X + (colWidth - 20) / 2, sigY + 12, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Visto Bueno Eclesiástico', sig3X + (colWidth - 20) / 2, sigY + 22, { align: 'center' });
  }

  // 6. Page Numbers & Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `TesorApp Financial System — Documento oficial emitido el ${new Date().toLocaleString('es-CO')}`,
      24,
      pageHeight - 14
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 24, pageHeight - 14, { align: 'right' });
  }

  // 7. Save / Download
  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
