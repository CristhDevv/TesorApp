import { useState } from 'react';
import { 
  Paperclip, 
  X, 
  Upload, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ExternalLink,
  Trash2
} from 'lucide-react';
import { formatCOP } from '../../utils/formatters';

export interface ReceiptItem {
  id: string;
  churchId: string;
  churchName: string;
  periodId: string;
  fileName: string;
  fileUrl: string;
  amount: number;
  uploadedAt: string;
  verified: boolean;
  notes?: string;
}

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchName: string;
  churchId: string;
  periodName: string;
  periodId: string;
  receipts: ReceiptItem[];
  onAddReceipt: (item: ReceiptItem) => void;
  onDeleteReceipt: (id: string) => void;
  onToggleVerify?: (id: string) => void;
}

export function ReceiptViewerModal({
  isOpen,
  onClose,
  churchName,
  churchId,
  periodName,
  periodId,
  receipts,
  onAddReceipt,
  onDeleteReceipt,
}: ReceiptViewerModalProps) {
  const [newAmount, setNewAmount] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredReceipts = receipts.filter(
    (r) => r.churchId === churchId && r.periodId === periodId
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount.trim()) return;

    const cleanNum = parseFloat(newAmount.replace(/[^0-9.-]/g, '')) || 0;

    const newReceipt: ReceiptItem = {
      id: Date.now().toString(),
      churchId,
      churchName,
      periodId,
      fileName: selectedFile ? selectedFile.name : `Comprobante_Transferencia_${Date.now().toString().slice(-4)}.png`,
      fileUrl: previewUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
      amount: cleanNum,
      uploadedAt: new Date().toLocaleDateString('es-CO'),
      verified: true,
      notes: newNotes,
    };

    onAddReceipt(newReceipt);
    setNewAmount('');
    setNewNotes('');
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Bóveda de Comprobantes Bancarios</h3>
              <p className="text-xs text-slate-300">
                Sedes: <span className="font-bold text-white">{churchName}</span> • Periodo: {periodName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50 dark:bg-slate-950">
          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Adjuntar Nueva Consignación o Recibo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Monto de la Consignación ($)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 1,500,000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Notas / Referencia Bancaria</label>
                <input
                  type="text"
                  placeholder="Ej. Transf. Bancolombia Ref #4928"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Archivo de Soporte (Imagen o PDF)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs"
              >
                Guardar Comprobante
              </button>
            </div>
          </form>

          {/* List of Attachments */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Comprobantes Verificados en este Periodo ({filteredReceipts.length})
            </h4>

            {filteredReceipts.length === 0 ? (
              <div className="text-center py-8 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-400 dark:text-slate-500">
                No hay soportes bancarios adjuntos para esta congregación en este mes.
              </div>
            ) : (
              filteredReceipts.map((rc) => (
                <div
                  key={rc.id}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {rc.fileUrl ? (
                        <img src={rc.fileUrl} alt="Soporte" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{formatCOP(rc.amount)}</span>
                        {rc.verified ? (
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Verificado
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{rc.fileName}</p>
                      {rc.notes && <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">{rc.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={rc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      title="Ver soporte completo"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => onDeleteReceipt(rc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Eliminar comprobante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Aceptar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
