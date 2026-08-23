import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Building2, 
  History, 
  FileSpreadsheet, 
  LogOut, 
  TrendingUp, 
  TrendingDown,
  ChevronRight, 
  User, 
  Calendar, 
  Search, 
  Monitor, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Paperclip, 
  MessageSquare, 
  Plus, 
  RefreshCw, 
  X, 
  Trash2, 
  Upload,
  Share2,
  Sun,
  Moon,
  HelpCircle,
  Coins,
} from 'lucide-react';
import { OfflineBanner } from './OfflineBanner';
import { ChurchSearchModal } from './ChurchSearchModal';
import { formatCOP } from '../../utils/formatters';
import { generateVoucherPDFBlob } from '../../utils/voucherPdfGenerator';
import { HelpModal } from '../common/HelpModal';

interface MobileViewProps {
  token: string | null;
  user: any;
  onLogout: () => void;
  onSwitchToDesktop: () => void;
  API_BASE: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

interface ReceiptItem {
  id: string;
  churchId: string;
  periodId: string;
  fileName: string;
  fileUrl: string;
  amount: number;
  uploadedAt: string;
  notes?: string;
}

export function MobileView({
  token,
  user,
  onLogout,
  onSwitchToDesktop,
  API_BASE,
  theme,
  onToggleTheme,
}: MobileViewProps) {
  const isTesorero = user?.rol === 'tesorero';

  // Navigation tab state
  const [activeScreen, setActiveScreen] = useState<'capture' | 'gastos' | 'history' | 'summary' | 'profile'>('capture');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  // Modals state
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showChurchSearch, setShowChurchSearch] = useState(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [showNewGastoModal, setShowNewGastoModal] = useState(false);

  // Receipts state
  const [receipts, setReceipts] = useState<ReceiptItem[]>(() => {
    try {
      const saved = localStorage.getItem('tesorapp_mobile_receipts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptFilePreview, setReceiptFilePreview] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState('');

  // Dropdown list
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');
  
  const [tablas, setTablas] = useState<any[]>([]);
  const [selectedTabla, setSelectedTabla] = useState<string>('');
  
  const [iglesias, setIglesias] = useState<any[]>([]);
  const [selectedIglesia, setSelectedIglesia] = useState<string>('');

  // Section filter in capture screen
  const [sectionFilter, setSectionFilter] = useState<'all' | 'ingresos' | 'egresos' | 'calculados'>('all');

  // Grid values (fields and inputs)
  const [gridData, setGridData] = useState<any>(null);
  const [loadingValues, setLoadingValues] = useState(false);

  // Gastos state for treasurer
  const [gastos, setGastos] = useState<any[]>([]);
  const [resumenFondos, setResumenFondos] = useState<any[]>([]);
  const [newGastoData, setNewGastoData] = useState({
    descripcion: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    campo_fondo_id: '',
  });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load period and table dropdowns
  const loadDropdowns = async () => {
    if (!token || !user) return;
    try {
      const [perRes, tabRes] = await Promise.all([
        axios.get(`${API_BASE}/periodos`),
        axios.get(`${API_BASE}/tablas`)
      ]);

      setPeriodos(perRes.data);
      setTablas(tabRes.data);

      if (perRes.data.length > 0 && !selectedPeriodo) {
        setSelectedPeriodo(perRes.data[0].id);
      }

      if (tabRes.data.length > 0) {
        let defaultTabId = '';
        const userChurchId = user?.iglesiaId || user?.iglesia_id || user?.iglesia?.id;
        if (isTesorero) {
          defaultTabId = tabRes.data[0].id;
        } else {
          // Find table that contains this church
          const matchedTab = tabRes.data.find((t: any) => 
            t.iglesias?.some((i: any) => i.id === userChurchId)
          );
          if (matchedTab) defaultTabId = matchedTab.id;
          else defaultTabId = tabRes.data[0].id;
        }
        setSelectedTabla(defaultTabId);
        if (!isTesorero && userChurchId) {
          setSelectedIglesia(userChurchId);
        }
      }
    } catch (err) {
      console.error('Error loading mobile dropdowns:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDropdowns();
      if (!isTesorero) {
        const userChurchId = user?.iglesiaId || user?.iglesia_id || user?.iglesia?.id;
        if (userChurchId) setSelectedIglesia(userChurchId);
      }
    }
  }, [user, isTesorero]);

  // Set churches list based on selected table
  useEffect(() => {
    if (selectedTabla) {
      const matched = tablas.find(t => t.id === selectedTabla);
      if (matched) {
        const churchList = matched.iglesias || [];
        setIglesias(churchList);
        if (churchList.length > 0) {
          if (isTesorero) {
            if (!selectedIglesia || !churchList.some((i: any) => i.id === selectedIglesia)) {
              setSelectedIglesia(churchList[0].id);
            }
          } else {
            const userChurchId = user?.iglesiaId || user?.iglesia_id || user?.iglesia?.id;
            if (userChurchId) {
              setSelectedIglesia(userChurchId);
            } else {
              setSelectedIglesia(churchList[0].id);
            }
          }
        }
      }
    }
  }, [selectedTabla, tablas, user, isTesorero]);

  // Load actual values for selected church, table, and period
  const fetchValues = async () => {
    if (!selectedTabla || !selectedPeriodo || !selectedIglesia) return;
    setLoadingValues(true);
    try {
      const res = await axios.get(`${API_BASE}/valores?tabla_id=${selectedTabla}&periodo_id=${selectedPeriodo}`);
      setGridData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingValues(false);
    }
  };

  useEffect(() => {
    fetchValues();
  }, [selectedTabla, selectedPeriodo, selectedIglesia]);

  // Fetch gastos if treasurer
  const fetchGastos = async () => {
    if (!isTesorero || !selectedPeriodo) return;
    try {
      const [gRes, rRes] = await Promise.all([
        axios.get(`${API_BASE}/gastos?periodo_id=${selectedPeriodo}`),
        axios.get(`${API_BASE}/gastos/resumen?periodo_id=${selectedPeriodo}`)
      ]);
      setGastos(gRes.data || []);
      setResumenFondos(rRes.data || []);
    } catch (err) {
      console.error('Error fetching gastos on mobile:', err);
    }
  };

  useEffect(() => {
    if (isTesorero && (activeScreen === 'gastos' || activeScreen === 'capture')) {
      fetchGastos();
    }
  }, [isTesorero, selectedPeriodo, activeScreen]);

  // Save manual value handler
  const handleSaveValue = async (campoId: string, valStr: string) => {
    const cleanStr = valStr.replace(/[^0-9.-]/g, '');
    const val = cleanStr === '' ? 0 : parseFloat(cleanStr);
    if (isNaN(val)) return;

    try {
      await axios.put(`${API_BASE}/valores/${selectedIglesia}/${campoId}/${selectedPeriodo}`, {
        valor_manual: val
      });
      fetchValues();
      triggerToast('✓ Valor guardado', 'success');
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'No se pudo guardar', 'error');
    }
  };

  // Workflow Handlers
  const handleSendReport = async () => {
    if (!selectedIglesia || !selectedPeriodo) return;
    try {
      await axios.post(`${API_BASE}/informes/enviar`, {
        iglesia_id: selectedIglesia,
        periodo_id: selectedPeriodo,
      });
      setShowSendConfirmModal(false);
      triggerToast('¡Informe mensual enviado a tesorería con éxito!', 'success');
      fetchValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error al enviar informe', 'error');
    }
  };

  const handleChangeWorkflowStatus = async (estado: string, observaciones?: string) => {
    if (!selectedIglesia || !selectedPeriodo) return;
    try {
      await axios.put(`${API_BASE}/informes/estado`, {
        iglesia_id: selectedIglesia,
        periodo_id: selectedPeriodo,
        estado,
        observaciones,
      });
      setShowReviewModal(false);
      triggerToast(`Estado actualizado a "${estado}".`, 'success');
      fetchValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error actualizando estado', 'error');
    }
  };

  // Save Gasto handler for Treasurer
  const handleSaveGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGastoData.descripcion || !newGastoData.monto || !newGastoData.campo_fondo_id) {
      triggerToast('Complete todos los campos del gasto', 'error');
      return;
    }

    try {
      await axios.post(`${API_BASE}/gastos`, {
        descripcion: newGastoData.descripcion,
        monto: Number(newGastoData.monto),
        fecha: newGastoData.fecha,
        campo_fondo_id: newGastoData.campo_fondo_id,
        periodo_id: selectedPeriodo,
      });
      triggerToast('Gasto registrado con éxito', 'success');
      setShowNewGastoModal(false);
      setNewGastoData({
        descripcion: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        campo_fondo_id: '',
      });
      fetchGastos();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error guardando gasto', 'error');
    }
  };

  // Receipt Handlers
  const handleAddReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptAmount) return;

    const newReceipt: ReceiptItem = {
      id: `rc_${Date.now()}`,
      churchId: selectedIglesia,
      periodId: selectedPeriodo,
      fileName: receiptFileName || `Comprobante_${Date.now().toString().slice(-4)}.jpg`,
      fileUrl: receiptFilePreview || '',
      amount: parseFloat(receiptAmount.replace(/[^0-9.-]/g, '')) || 0,
      uploadedAt: new Date().toLocaleDateString('es-CO'),
      notes: receiptNotes,
    };

    const updated = [newReceipt, ...receipts];
    setReceipts(updated);
    try {
      localStorage.setItem('tesorapp_mobile_receipts', JSON.stringify(updated));
    } catch {}

    setReceiptAmount('');
    setReceiptNotes('');
    setReceiptFilePreview(null);
    setReceiptFileName('');
    triggerToast('Comprobante adjuntado con éxito', 'success');
  };

  const handleDeleteReceipt = (id: string) => {
    const updated = receipts.filter(r => r.id !== id);
    setReceipts(updated);
    try {
      localStorage.setItem('tesorapp_mobile_receipts', JSON.stringify(updated));
    } catch {}
    triggerToast('Comprobante eliminado', 'success');
  };

  const currentPeriodObj = periodos.find(p => p.id === selectedPeriodo);
  const isPeriodOpen = currentPeriodObj?.estado === 'abierto';

  // Get current row values for the selected church
  const currentChurchRow = gridData?.filas?.find((r: any) => r.iglesia_id === selectedIglesia);
  const columns = gridData?.columnas || [];

  const estadoInforme = currentChurchRow?.estado_informe || 'borrador';
  const isReportEditable = isPeriodOpen && (isTesorero || estadoInforme === 'borrador' || estadoInforme === 'en_revision');

  // Real-time financial calculations
  const financialTotals = useMemo(() => {
    if (!currentChurchRow || !columns.length) return { ingresos: 0, egresos: 0, saldoNeto: 0 };
    let ingresos = 0;
    let egresos = 0;

    columns.forEach((col: any) => {
      const val = currentChurchRow.valores?.find((v: any) => v.campo_id === col.id);
      if (!val) return;
      const isCalc = val.modo_calculo === 'calculado';
      const num = Number(isCalc ? (val.valor_calculado || 0) : (val.valor_manual || 0));

      const sec = (col.seccion || col.seccion_iglesia || '').toLowerCase();
      if (sec === 'ingresos') ingresos += num;
      else if (sec === 'egresos') egresos += num;
      else if (col.nombre?.toLowerCase().includes('diezmo') || col.nombre?.toLowerCase().includes('ofrenda')) ingresos += num;
      else if (col.nombre?.toLowerCase().includes('gasto') || col.nombre?.toLowerCase().includes('aporte')) egresos += num;
    });

    return {
      ingresos,
      egresos,
      saldoNeto: ingresos - egresos,
    };
  }, [currentChurchRow, columns]);

  // Emolumentos calculation specifically matching the field "Total Emolumentos"
  const totalEmolumentos = useMemo(() => {
    if (!currentChurchRow || !columns.length) return 0;
    const emoCol = columns.find((c: any) => 
      c.slug === 'total_emolumentos' || 
      c.nombre?.trim().toLowerCase() === 'total emolumentos'
    ) || columns.find((c: any) => 
      c.nombre?.toLowerCase().includes('total emolumento')
    );

    if (emoCol) {
      const val = currentChurchRow.valores?.find((v: any) => v.campo_id === emoCol.id);
      if (val) {
        const isCalc = val.modo_calculo === 'calculado';
        return Number(isCalc ? (val.valor_calculado || 0) : (val.valor_manual || 0));
      }
    }
    return 0;
  }, [currentChurchRow, columns]);

  // Filtered columns based on section tab
  const filteredColumns = useMemo(() => {
    if (sectionFilter === 'all') return columns;
    return columns.filter((col: any) => {
      const val = currentChurchRow?.valores?.find((v: any) => v.campo_id === col.id);
      const isCalc = val?.modo_calculo === 'calculado';
      const sec = (col.seccion || col.seccion_iglesia || '').toLowerCase();

      if (sectionFilter === 'calculados') return isCalc;
      if (sectionFilter === 'ingresos') return sec === 'ingresos' || (!isCalc && !sec.includes('egreso'));
      if (sectionFilter === 'egresos') return sec === 'egresos' || sec.includes('aporte') || sec.includes('gasto');
      return true;
    });
  }, [columns, currentChurchRow, sectionFilter]);

  const churchReceipts = receipts.filter(r => r.churchId === selectedIglesia && r.periodId === selectedPeriodo);

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-slate-950 flex flex-col font-sans overflow-y-auto pb-28 touch-pan-y overscroll-y-contain">
      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Dynamic Header */}
      <header className="sticky top-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-white z-30 px-4 py-2.5 flex flex-col gap-2 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">TesorApp</span>
                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-200 font-bold px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-400/30">
                  {isTesorero ? 'Tesorero' : 'Sede'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowHelpModal(true)}
              title="Guía y Ayuda"
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </button>
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={theme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            )}
            <button
              onClick={onSwitchToDesktop}
              title="Cambiar a vista de escritorio"
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button 
              onClick={onLogout} 
              className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters and selectors */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div>
            <select
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {periodos.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.estado === 'cerrado' ? '🔒' : '●'}
                </option>
              ))}
            </select>
          </div>

          <div>
            {isTesorero ? (
              <select
                value={selectedTabla}
                onChange={(e) => setSelectedTabla(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {tablas.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate">
                {iglesias.find((i: any) => i.id === selectedIglesia)?.nombre 
                  || iglesias.find((i: any) => i.id === (user?.iglesiaId || user?.iglesia_id))?.nombre 
                  || user?.iglesia?.nombre 
                  || user?.iglesia_nombre 
                  || 'Mi Congregación'}
              </div>
            )}
          </div>
        </div>

        {/* Church selector for Treasurer */}
        {isTesorero && (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setShowChurchSearch(true)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">
                  {iglesias.find((i: any) => i.id === selectedIglesia)?.nombre || 'Seleccionar Congregación'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 shrink-0 font-normal text-[10px]">
                <Search className="w-3 h-3" />
                <span>Buscar ({iglesias.length})</span>
              </div>
            </button>
          </div>
        )}
      </header>

      {/* Screen 1: CAPTURE SCREEN (PLANILLA CONTABLE) */}
      {activeScreen === 'capture' && (
        <div className="p-3.5 flex-1 flex flex-col gap-3">
          {/* Workflow Status Banner & Action Buttons */}
          <div className={`p-3 rounded-2xl border flex flex-col gap-2.5 shadow-xs ${
            estadoInforme === 'aprobado' || estadoInforme === 'consolidado'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : estadoInforme === 'enviado'
              ? 'bg-blue-50 border-blue-200 text-blue-950'
              : estadoInforme === 'en_revision'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {estadoInforme === 'aprobado' || estadoInforme === 'consolidado' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : estadoInforme === 'enviado' ? (
                  <Clock className="w-4 h-4 text-blue-600" />
                ) : estadoInforme === 'en_revision' ? (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                )}
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                    Estado del Informe
                  </span>
                  <span className="font-extrabold text-xs capitalize">
                    {estadoInforme === 'en_revision' ? 'En Revisión (Ajustes)' : estadoInforme}
                  </span>
                </div>
              </div>

              {/* Action Buttons depending on role */}
              <div className="flex items-center gap-1.5">
                {/* Church: Send Report Button */}
                {!isTesorero && isPeriodOpen && (estadoInforme === 'borrador' || estadoInforme === 'en_revision') && (
                  <button
                    onClick={() => setShowSendConfirmModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Informe</span>
                  </button>
                )}

                {/* Treasurer: Review and Approval Buttons */}
                {isTesorero && (
                  <>
                    {estadoInforme !== 'aprobado' && estadoInforme !== 'consolidado' && (
                      <button
                        onClick={() => handleChangeWorkflowStatus('aprobado')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Aprobar</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <span>Revisión</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sub-bar tools: Attachments & Notes */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
              <button
                onClick={() => setShowReceiptsModal(true)}
                className="flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Soportes Bancarios ({churchReceipts.length})</span>
              </button>

              <button
                onClick={() => {
                  setNotesInput(currentChurchRow?.observaciones || '');
                  setShowNotesModal(true);
                }}
                className="flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{currentChurchRow?.observaciones ? 'Ver Observación' : 'Añadir Nota'}</span>
              </button>
            </div>
          </div>

          {/* Emolumentos Highlight Card in Green */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl shadow-xs">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                  Emolumentos
                </span>
                <span className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 font-medium">
                  Total calculado para el pastor
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-base sm:text-lg text-emerald-700 dark:text-emerald-300">
                {formatCOP(totalEmolumentos)}
              </span>
            </div>
          </div>

          {/* Section Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSectionFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                sectionFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Todos ({columns.length})
            </button>
            <button
              onClick={() => setSectionFilter('ingresos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                sectionFilter === 'ingresos'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              📥 Ingresos
            </button>
            <button
              onClick={() => setSectionFilter('egresos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                sectionFilter === 'egresos'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              📤 Egresos
            </button>
            <button
              onClick={() => setSectionFilter('calculados')}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                sectionFilter === 'calculados'
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              🧮 Fórmulas
            </button>
          </div>

          {/* Render Cards / Fields */}
          <div className="space-y-2.5">
            {loadingValues ? (
              <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Cargando datos contables...</span>
              </div>
            ) : filteredColumns.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-2xl border border-slate-200 p-6">
                No hay campos que coincidan con la sección seleccionada.
              </div>
            ) : (
              filteredColumns.map((col: any) => {
                const val = currentChurchRow?.valores?.find((v: any) => v.campo_id === col.id);
                if (!val) return null;
                const isCalculated = val.modo_calculo === 'calculado';
                const value = isCalculated ? val.valor_calculado : val.valor_manual;
                const isCurrency = !col.tipo || col.tipo === 'moneda';
                const canEdit = isReportEditable && val.editable && !isCalculated;

                return (
                  <div 
                    key={col.id} 
                    className={`p-3.5 rounded-2xl border transition shadow-xs flex flex-col gap-2.5 ${
                      isCalculated
                        ? 'bg-indigo-50/40 border-indigo-200/80'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-xs tracking-tight">
                            {col.nombre}
                          </h4>
                          {col.es_transito && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded border border-amber-300">
                              En Tránsito
                            </span>
                          )}
                          {col.es_fondo && !col.es_transito && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
                              Fondo
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize mt-0.5 block font-mono">
                          {col.seccion || 'General'} • {isCalculated ? 'Calculado' : 'Digitación Manual'}
                        </span>
                      </div>

                      {col.es_acumulable && (
                        <div className="text-right shrink-0">
                          <span className="block text-[8px] text-slate-400 uppercase font-extrabold">Acumulado</span>
                          <span className="text-[11px] text-indigo-700 font-extrabold font-mono">{formatCOP(val.valor_acumulado)}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      {canEdit ? (
                        <div className="relative">
                          {isCurrency && (
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-extrabold text-xs">$</span>
                          )}
                          <input
                            key={`${selectedIglesia}_${selectedPeriodo}_${col.id}_${value}`}
                            type="text"
                            inputMode="numeric"
                            className={`w-full ${isCurrency ? 'pl-7' : 'pl-3'} pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-extrabold focus:outline-none focus:border-indigo-600 focus:bg-white text-sm font-mono shadow-2xs transition`}
                            defaultValue={value === 0 ? '' : value}
                            placeholder="0"
                            onBlur={(e) => handleSaveValue(col.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-semibold">
                            {isCalculated ? 'Resultado Fórmula' : 'Valor Registrado'}
                          </span>
                          <span className="text-sm font-extrabold font-mono text-slate-900">
                            {isCurrency ? formatCOP(value) : value}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Screen 2: GASTOS & FONDOS (SOLO TESORERO EN MÓVIL) */}
      {activeScreen === 'gastos' && isTesorero && (
        <div className="p-3.5 flex-1 flex flex-col gap-3">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Gastos y Fondos</h3>
              <p className="text-[11px] text-slate-500">Control de salidas y saldos en tiempo real</p>
            </div>
            {isPeriodOpen && (
              <button
                onClick={() => setShowNewGastoModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Gasto</span>
              </button>
            )}
          </div>

          {/* Funds List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Estado de Fondos ({resumenFondos.length})
            </h4>

            {resumenFondos.map((f: any) => (
              <div 
                key={f.campo_fondo_id}
                className={`p-3.5 rounded-2xl border shadow-xs bg-white ${
                  f.es_transito ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      {f.es_transito ? (
                        <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded border border-amber-300">
                          🚀 En Tránsito
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
                          🏛️ Fondo Propio
                        </span>
                      )}
                      {f.ente_superior_nombre && (
                        <span className="text-[9px] font-bold text-amber-800">
                          Destino: {f.ente_superior_nombre}
                        </span>
                      )}
                    </div>
                    <h5 className="font-extrabold text-slate-900 text-xs">{f.campo_fondo_nombre}</h5>
                  </div>
                  <span className={`text-xs font-extrabold font-mono ${
                    f.saldo_disponible < 0 ? 'text-rose-600' : f.es_transito ? 'text-amber-800' : 'text-indigo-700'
                  }`}>
                    {formatCOP(f.saldo_disponible)}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 flex justify-between pt-1.5 border-t border-slate-100">
                  <span>Recaudo: {formatCOP(f.total_fondo)}</span>
                  <span className="text-rose-600">Gastos: −{formatCOP(f.total_gastos)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Gastos History */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Egresos Registrados ({gastos.length})
            </h4>

            {gastos.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                No hay gastos registrados en este período.
              </div>
            ) : (
              gastos.map((g: any) => (
                <div key={g.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
                  <div>
                    <h6 className="font-extrabold text-slate-900 text-xs">{g.descripcion}</h6>
                    <span className="text-[10px] text-slate-400">
                      {g.campo_fondo?.nombre} • {new Date(g.fecha).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-xs text-rose-600 block">
                      −{formatCOP(g.monto)}
                    </span>
                    <button
                      onClick={async () => {
                        const voucherNum = `CE-${new Date(g.fecha || Date.now()).getFullYear()}-${(g.id || '0000').slice(0, 6).toUpperCase()}`;
                        const fileName = `Comprobante_${voucherNum}.pdf`;
                        const pdfBlob = generateVoucherPDFBlob({
                          voucherNumber: voucherNum,
                          monto: g.monto,
                          montoLetras: `${formatCOP(g.monto)} PESOS M/CTE`,
                          descripcion: g.descripcion,
                          fecha: g.fecha,
                          periodoNombre: currentPeriodObj?.nombre,
                          creadoPorNombre: g.creado_por?.nombre_completo || 'Tesorero',
                        });
                        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

                        const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

                        if (isMobileDevice && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                          try {
                            await navigator.share({
                              title: `Comprobante de Egreso ${voucherNum}`,
                              text: `🏛️ *COMPROBANTE DE EGRESO*\nConcepto: ${g.descripcion}\nMonto: ${formatCOP(g.monto)} COP\nFecha: ${new Date(g.fecha).toLocaleDateString('es-CO')}\nAutorizado por: ${g.creado_por?.nombre_completo || 'Tesorero'} — Tesorería Zona 52`,
                              files: [pdfFile],
                            });
                            return;
                          } catch (err: any) {
                            if (err.name !== 'AbortError') console.error(err);
                          }
                        }

                        // Fallback: download PDF + open WhatsApp
                        const url = URL.createObjectURL(pdfBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        const text = `*COMPROBANTE DE EGRESO — TESORERÍA ZONA 52*\n` +
                          `----------------------------------------\n` +
                          `• *No. Comprobante:* ${voucherNum}\n` +
                          `• *Concepto:* ${g.descripcion}\n` +
                          `• *Monto:* ${formatCOP(g.monto)} COP\n` +
                          `• *Fecha:* ${new Date(g.fecha).toLocaleDateString('es-CO')}\n` +
                          `• *Autorizado por:* ${g.creado_por?.nombre_completo || 'Tesorero'} — Tesorería Zona 52\n` +
                          `----------------------------------------\n` +
                          `_Comprobante oficial generado por TesorApp_`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5 mt-0.5 cursor-pointer ml-auto bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100"
                    >
                      <Share2 className="w-2.5 h-2.5" />
                      <span>WhatsApp & PDF</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Screen 3: HISTORY READ-ONLY */}
      {activeScreen === 'history' && (
        <div className="p-3.5 flex-1 flex flex-col">
          <h3 className="text-base font-extrabold text-slate-900 mb-0.5">Hojas Históricas</h3>
          <p className="text-xs text-slate-500 mb-3.5">Consulte planillas de meses anteriores.</p>

          <div className="space-y-2 overflow-y-auto flex-1">
            {periodos.map((pe) => {
              const isCurrent = pe.id === selectedPeriodo;
              return (
                <button
                  key={pe.id}
                  onClick={() => {
                    setSelectedPeriodo(pe.id);
                    setActiveScreen('capture');
                    triggerToast(`Cargado período ${pe.nombre}`);
                  }}
                  className={`w-full p-3 rounded-2xl border text-left flex justify-between items-center transition cursor-pointer ${
                    isCurrent 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className={`w-4 h-4 ${isCurrent ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <div>
                      <h4 className="font-extrabold text-xs">{pe.nombre}</h4>
                      <p className={`text-[10px] ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`}>
                        {pe.estado === 'abierto' ? 'Período Abierto' : 'Período Cerrado (Lectura)'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Screen 4: METRIC SUMMARY */}
      {activeScreen === 'summary' && (
        <div className="p-3.5 flex-1 flex flex-col space-y-3.5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Resumen y Métricas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Consolidado del informe del período.</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Ingresos</span>
              <span className="text-base font-mono font-extrabold text-emerald-600 block mt-1">
                {formatCOP(financialTotals.ingresos)}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Egresos</span>
              <span className="text-base font-mono font-extrabold text-rose-600 block mt-1">
                {formatCOP(financialTotals.egresos)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Detalle de Columnas
            </h4>
            {columns.map((col: any) => {
              const val = currentChurchRow?.valores?.find((v: any) => v.campo_id === col.id);
              if (!val) return null;
              const isCalc = val.modo_calculo === 'calculado';
              const value = isCalc ? val.valor_calculado : val.valor_manual;

              return (
                <div key={col.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{col.nombre}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{col.seccion}</span>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-slate-900">
                    {formatCOP(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Screen 5: PROFILE */}
      {activeScreen === 'profile' && (
        <div className="p-3.5 flex-1 flex flex-col justify-between">
          <div className="space-y-3.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Perfil y Ajustes</h3>
            
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center mx-auto text-base font-extrabold mb-2 shadow-xs">
                {user?.nombre_completo?.substring(0, 2).toUpperCase() || 'US'}
              </div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{user?.nombre_completo || user?.nombre}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user?.correo}</p>
              <div className="mt-2.5 inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-0.5 rounded-full text-xs font-extrabold capitalize">
                Rol: {user?.rol}
              </div>
            </div>

            {/* Theme Toggle Card */}
            {onToggleTheme && (
              <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-400">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Apariencia / Tema</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {theme === 'dark' ? 'Modo Oscuro Activo' : 'Modo Claro (Fondo Blanco)'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onToggleTheme}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-extrabold rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {theme === 'dark' ? 'Cambiar a Claro' : 'Cambiar a Oscuro'}
                </button>
              </div>
            )}

            <button
              onClick={onSwitchToDesktop}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xs transition cursor-pointer"
            >
              <Monitor className="w-4 h-4" />
              Cambiar a Vista de Escritorio
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer mt-4 shadow-2xs"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            Cerrar Sesión
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-xl border shadow-xl text-xs font-bold bg-slate-900 text-white border-slate-800 transition animate-fade-in">
          {toast.msg}
        </div>
      )}

      {/* Bottom Navigation Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 h-16 flex items-center justify-around z-40 shadow-lg px-2">
        <button
          onClick={() => setActiveScreen('capture')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition cursor-pointer ${
            activeScreen === 'capture' ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="text-[10px] mt-1">Planilla</span>
        </button>

        {isTesorero && (
          <button
            onClick={() => setActiveScreen('gastos')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition cursor-pointer ${
              activeScreen === 'gastos' ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span className="text-[10px] mt-1">Gastos</span>
          </button>
        )}

        <button
          onClick={() => setActiveScreen('history')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition cursor-pointer ${
            activeScreen === 'history' ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[10px] mt-1">Historial</span>
        </button>

        <button
          onClick={() => setActiveScreen('summary')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition cursor-pointer ${
            activeScreen === 'summary' ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="text-[10px] mt-1">Métricas</span>
        </button>

        <button
          onClick={() => setActiveScreen('profile')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition cursor-pointer ${
            activeScreen === 'profile' ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] mt-1">Perfil</span>
        </button>
      </nav>

      {/* Modal: Confirm Send Monthly Report */}
      {showSendConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              <Send className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-sm text-slate-900">¿Enviar Informe a Tesorería?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Al enviar el informe, la Tesorería de la Zona 52 recibirá tus valores registrados para revisión y aprobación oficial.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSendConfirmModal(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendReport}
                className="flex-1 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Sí, Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Treasurer Review Action */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Revisión de Informe</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                Observaciones / Motivo de Revisión:
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Indique los ajustes requeridos a la congregación..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 h-24"
              />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => handleChangeWorkflowStatus('en_revision', reviewNotes)}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer"
              >
                ⚠️ Solicitar Corrección (Poner en Revisión)
              </button>
              <button
                onClick={() => handleChangeWorkflowStatus('borrador', reviewNotes)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ↩️ Reabrir como Borrador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notes / Observaciones */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Observaciones del Informe</h3>
              <button onClick={() => setShowNotesModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Escribe comentarios o notas del mes..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 h-28"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleChangeWorkflowStatus(estadoInforme, notesInput);
                  setShowNotesModal(false);
                }}
                className="px-4 py-1.5 text-xs font-extrabold text-white bg-indigo-600 rounded-lg shadow-xs"
              >
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Receipts / Soportes Bancarios */}
      {showReceiptsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-400" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider">Soportes de Consignación</h3>
              </div>
              <button onClick={() => setShowReceiptsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Add form */}
              <form onSubmit={handleAddReceipt} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-700 block">
                  + Adjuntar Nuevo Comprobante
                </span>
                <div>
                  <input
                    type="text"
                    placeholder="Valor Consignado ($)"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Nota (Ej: Consignación Bancolombia #123)"
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex-1 py-1.5 px-3 bg-white border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-100">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{receiptFileName ? 'Foto cargada' : 'Tomar Foto / Archivo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setReceiptFileName(file.name);
                          setReceiptFilePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-extrabold shadow-xs"
                  >
                    Guardar
                  </button>
                </div>
              </form>

              {/* Receipts List */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                  Comprobantes Adjuntos ({churchReceipts.length})
                </span>
                {churchReceipts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No hay comprobantes adjuntos este mes.</p>
                ) : (
                  churchReceipts.map((r) => (
                    <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 block">{formatCOP(r.amount)}</span>
                        <span className="text-[10px] text-slate-500 block">{r.notes || r.fileName} • {r.uploadedAt}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteReceipt(r.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Gasto for Treasurer */}
      {showNewGastoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Registrar Gasto de Tesorería</h3>
              <button onClick={() => setShowNewGastoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGasto} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                  Fondo a Deducir:
                </label>
                <select
                  value={newGastoData.campo_fondo_id}
                  onChange={(e) => setNewGastoData(d => ({ ...d, campo_fondo_id: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  required
                >
                  <option value="">— Seleccionar Fondo —</option>
                  {resumenFondos.map((f: any) => (
                    <option key={f.campo_fondo_id} value={f.campo_fondo_id}>
                      {f.es_transito ? '🚀 [Tránsito] ' : '🏛️ [Local] '}
                      {f.campo_fondo_nombre} (Saldo: {formatCOP(f.saldo_disponible)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                  Concepto / Detalle:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Aporte Misionero, Arreglos..."
                  value={newGastoData.descripcion}
                  onChange={(e) => setNewGastoData(d => ({ ...d, descripcion: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                  Monto a Egresar ($):
                </label>
                <input
                  type="number"
                  placeholder="0"
                  min="1"
                  value={newGastoData.monto}
                  onChange={(e) => setNewGastoData(d => ({ ...d, monto: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-extrabold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                  Fecha:
                </label>
                <input
                  type="date"
                  value={newGastoData.fecha}
                  onChange={(e) => setNewGastoData(d => ({ ...d, fecha: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewGastoModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Registrar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Church Search Modal for Treasurer */}
      <ChurchSearchModal
        isOpen={showChurchSearch}
        onClose={() => setShowChurchSearch(false)}
        iglesias={iglesias}
        selectedIglesiaId={selectedIglesia}
        onSelect={(id) => setSelectedIglesia(id)}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}
