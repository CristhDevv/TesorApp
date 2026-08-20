import { useState } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Building2, 
  Copy, 
  Check
} from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  iglesias: any[];
  currentPeriod: any;
  user?: any;
}

export function NotificationCenter({
  isOpen,
  onClose,
  iglesias,
  currentPeriod,
}: NotificationCenterProps) {
  const [templateType, setTemplateType] = useState<'reminder' | 'approval' | 'certificate'>('reminder');
  const [selectedChurchId, setSelectedChurchId] = useState<string>(iglesias[0]?.id || '');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const selectedChurch = iglesias.find((i) => i.id === selectedChurchId) || iglesias[0];
  const churchPhone = customPhone || selectedChurch?.telefono || '573001234567';
  const pastorName = selectedChurch?.nombre_pastor || 'Pastor';
  const churchName = selectedChurch?.nombre || 'Congregación';
  const periodName = currentPeriod?.nombre || 'Mes actual';

  // Templates
  const getMessageText = () => {
    switch (templateType) {
      case 'reminder':
        return `Estimado ${pastorName} (${churchName}), le saludamos cordialmente de la Tesorería General. Le recordamos que el plazo para el registro y reporte de la planilla contable del periodo *${periodName}* está próximo a vencer. Agradecemos su diligenciamiento oportuno a través de TesorApp. ¡Bendiciones!`;
      case 'approval':
        return `Paz de Cristo, ${pastorName}. Le informamos que la planilla contable de la congregación *${churchName}* correspondiente al periodo *${periodName}* ha sido revisada y *APROBADA* satisfactoriamente por la Tesorería General.`;
      case 'certificate':
        return `CERTIFICADO DE PAZ Y SALVO CONTABLE — Periodo *${periodName}*. La Tesorería General certifica que la congregación *${churchName}* (${pastorName}) se encuentra al día y en orden con todos sus compromisos y fondos estatutarios reportados.`;
    }
  };

  const messageText = getMessageText();
  const cleanPhone = churchPhone.replace(/[^0-9]/g, '');
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in font-sans">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Centro de Notificaciones & Envíos WhatsApp</h3>
              <p className="text-xs text-emerald-200">
                Comunicación automatizada de cierres, recordatorios y paz y salvos a pastores.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50">
          {/* Template Selector Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Tipo de Mensaje Automatizado
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('reminder')}
                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  templateType === 'reminder'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Recordatorio Cierre</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('approval')}
                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  templateType === 'approval'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Planilla Aprobada</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('certificate')}
                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  templateType === 'certificate'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Paz y Salvo Oficial</span>
              </button>
            </div>
          </div>

          {/* Church & Pastor Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Seleccionar Congregación</label>
              <select
                value={selectedChurchId}
                onChange={(e) => {
                  setSelectedChurchId(e.target.value);
                  const ig = iglesias.find((i) => i.id === e.target.value);
                  if (ig?.telefono) setCustomPhone(ig.telefono);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                {iglesias.map((ig) => (
                  <option key={ig.id} value={ig.id}>
                    {ig.nombre} ({ig.nombre_pastor || 'Sin pastor'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Número de WhatsApp / Celular del Pastor
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ej. +573001234567"
                  value={churchPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Vista Previa del Mensaje
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado al portapapeles' : 'Copiar Texto'}</span>
              </button>
            </div>
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-xs text-slate-800 leading-relaxed font-sans shadow-2xs whitespace-pre-line">
              {messageText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Abre la conversación oficial en WhatsApp Web o App en 1 clic
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cerrar
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition transform active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
