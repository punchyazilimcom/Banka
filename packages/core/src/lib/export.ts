import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Transaction, formatMoney } from '@gtt/shared';

/** İşlemleri .xlsx olarak indir (SheetJS). */
export function exportXlsx(txs: Transaction[], filename = 'garanti-islemler.xlsx') {
  const rows = txs.map((t) => ({
    Tarih: new Date(t.datetime).toLocaleString('tr-TR'),
    Yön: t.direction === 'in' ? 'Gelen' : 'Giden',
    Tutar: t.amount,
    'Para Birimi': t.currency,
    'Karşı Taraf': t.counterpartyName,
    Tür: t.counterpartyType === 'firm' ? 'Firma' : 'Kişi',
    Kanal: t.channel,
    IBAN: t.iban ?? '',
    Açıklama: t.description,
    Bakiye: t.balanceAfter ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 28 }, { wch: 8 }, { wch: 10 }, { wch: 28 }, { wch: 24 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'İşlemler');
  XLSX.writeFile(wb, filename);
}

/** İşlemleri PDF olarak indir (jsPDF + autotable), Punch Yazılım imzalı. */
export function exportPdf(txs: Transaction[], filename = 'garanti-rapor.pdf') {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('Garanti Transfer Takip Raporu', 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Oluşturma: ${new Date().toLocaleString('tr-TR')}`, 14, 22);

  const totalIn = txs.filter((t) => t.direction === 'in').reduce((a, t) => a + t.amount, 0);
  const totalOut = txs.filter((t) => t.direction === 'out').reduce((a, t) => a + t.amount, 0);
  doc.text(`Gelen: ${formatMoney(totalIn)}   Giden: ${formatMoney(totalOut)}   Net: ${formatMoney(totalIn - totalOut)}`, 14, 28);

  autoTable(doc, {
    startY: 33,
    head: [['Tarih', 'Yön', 'Tutar', 'Karşı Taraf', 'Tür', 'Kanal', 'Açıklama']],
    body: txs.map((t) => [
      new Date(t.datetime).toLocaleDateString('tr-TR'),
      t.direction === 'in' ? 'Gelen' : 'Giden',
      formatMoney(t.amount, t.currency),
      t.counterpartyName,
      t.counterpartyType === 'firm' ? 'Firma' : 'Kişi',
      t.channel,
      t.description,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [255, 212, 0], textColor: [10, 10, 10] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      'Punch Yazılım tarafından geliştirilmiştir',
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' },
    );
  }
  doc.save(filename);
}
