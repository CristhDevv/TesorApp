import { useState } from 'react';
import {
  X,
  BookOpen,
  TrendingUp,
  FileSpreadsheet,
  Wallet,
  Building2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Send,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'kpis' | 'fondos' | 'workflow' | 'mobile'>('general');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in select-text font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Centro de Ayuda & Guía del Sistema
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase">
                  TesorApp 2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Explicación clara y amigable de cada función, métrica y concepto contable.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          {[
            { id: 'general', label: 'Inicio & Módulos', icon: BookOpen },
            { id: 'kpis', label: 'Tablero & Métricas', icon: TrendingUp },
            { id: 'fondos', label: 'Fondos & Gastos', icon: Wallet },
            { id: 'workflow', label: 'Flujo de Informes', icon: ShieldCheck },
            { id: 'mobile', label: 'Versión Móvil', icon: Smartphone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-700 dark:text-slate-300 text-xs">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                <h4 className="font-extrabold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  ¿Qué es TesorApp?
                </h4>
                <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  TesorApp es la plataforma integral para la gestión financiera de la <strong>Zona 52</strong>. Permite a las congregaciones enviar sus informes mensuales, y al tesorero consolidar cifras, auditar cambios en tiempo real, registrar gastos y emitir comprobantes oficiales en PDF.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-xs">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>Tablero Ejecutivo</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Muestra los totales de recaudo, gastos, el saldo propio disponible y el semáforo de cumplimiento de cada iglesia.
                  </p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-xs">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span>Planilla Contable</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Hoja de cálculo interactiva para registrar valores, calcular porcentajes automáticos y consultar fórmulas de las celdas.
                  </p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-xs">
                    <Wallet className="w-4 h-4 text-rose-600" />
                    <span>Gastos & Fondos</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Control de egresos por rubro con generación directa de comprobantes de egreso en PDF y envío por WhatsApp.
                  </p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-xs">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Congregaciones & Usuarios</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Directorio de las 32 sedes de la zona, pastores responsables y cuentas de acceso con permisos diferenciados.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KPIS Y METRICAS */}
          {activeTab === 'kpis' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Entendiendo los 4 Indicadores Principales (KPIs)
              </h4>

              <div className="space-y-3">
                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">1. Total Ingresos (Recaudo)</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Entradas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Suma total de todos los ingresos brutos reportados por las iglesias (diezmos, ofrendas locales, eventos) durante el mes contable seleccionado.
                  </p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">2. Total Egresos & Aportes</span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                      Salidas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Total de aportes zonales, deducciones por porcentaje y gastos operacionales registrados en la planilla del período.
                  </p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">3. Saldo Propio Zona 52 (Balance Neto)</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      Caja Real
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Es el <strong>dinero real disponible en la tesorería de la Zona 52</strong>. Se calcula restando los egresos locales y <strong>excluyendo automáticamente los fondos en tránsito</strong> que pertenecen a entes superiores.
                  </p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">4. Cumplimiento de Reportes</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      Porcentaje
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Indica qué porcentaje de las congregaciones ya completaron su digitación (80%+), enviaron su informe o ya fueron aprobadas por la tesorería.
                  </p>
                </div>
              </div>

              {/* Semáforo */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                  Semáforo de Salud Contable
                </h5>
                <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span><strong>🟢 Al día:</strong> Informe enviado, aprobado o con planilla completa (&gt;80%).</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                    <span><strong>🟡 En Proceso:</strong> Digitación iniciada pero incompleta, o devuelta para revisión.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                    <span><strong>🔴 Retraso:</strong> La iglesia aún no ha registrado ningún valor en el mes.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: FONDOS Y GASTOS */}
          {activeTab === 'fondos' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Diferencia entre Fondos Propios y Fondos en Tránsito
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <h5 className="font-extrabold text-xs text-emerald-950 dark:text-emerald-300">
                      🏛️ Fondo Propio (Zona 52)
                    </h5>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Son los dineros que <strong>permanecen en la caja de la Zona 52</strong> para cubrir los gastos zonales, eventos y comités locales. Suman directamente al saldo disponible de caja.
                  </p>
                </div>

                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <h5 className="font-extrabold text-xs text-amber-950 dark:text-amber-300">
                      🚀 En Tránsito (Giro a Ente Superior)
                    </h5>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Son dineros que la tesorería <strong>solo recauda y contabiliza para luego transferirlos</strong> a un ente superior (ej. Directiva Nacional). <strong>No inflan el saldo de caja local</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h5 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  ¿Cómo se emite un Comprobante de Egreso (Voucher)?
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Al pulsar <strong>«Registrar Gasto»</strong>, seleccionas el fondo afectado, beneficiario, concepto y monto. El sistema genera de inmediato un archivo <strong>PDF oficial contable</strong> que puedes descargar o compartir directamente por <strong>WhatsApp</strong> con un solo clic.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: FLUJO DE INFORMES */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Ciclo de Vida de los Informes Mensuales
              </h4>

              <div className="space-y-2.5">
                <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Borrador (Digitación de la Sede)</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      La congregación digita sus ingresos y egresos locales. Puede adjuntar fotos de consignaciones bancarias.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Enviado (A Tesorería)</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      La iglesia presiona «📤 Enviar Informe». El informe queda en espera de validación por parte del tesorero.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">En Revisión (Si se requieren ajustes)</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Si hay diferencias con las consignaciones, el tesorero agrega una nota de revisión para que la iglesia corrija.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                    4
                  </span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Aprobado / Consolidado</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      El tesorero aprueba el informe. Sus valores pasan a formar parte oficial del balance consolidado de la zona.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MOBILE */}
          {activeTab === 'mobile' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Consejos para la Versión Móvil
              </h4>

              <div className="space-y-3">
                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">📸 Soportes de Pago Directos</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Puedes tomar foto directamente del recibo de consignación o transferencia bancaria desde la cámara de tu celular y adjuntarlo al informe.
                  </p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">📤 Enviar por WhatsApp con PDF</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    El tesorero puede abrir WhatsApp con el archivo PDF del comprobante automáticamente adjunto sin necesidad de descargarlo primero.
                  </p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">🌓 Modo Oscuro</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Puedes alternar entre fondo blanco minimalista o modo oscuro en cualquier momento desde el botón ☀️ / 🌙 del encabezado o en tu perfil.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            ¿Tienes dudas adicionales? Consulta al tesorero de la Zona 52.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
