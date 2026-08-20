import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Building2,
  History,
  LogOut,
  Plus,
  UserPlus,
  Trash2,
  ArrowRight,
  Search,
  X,
  Layers,
  Key,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  TrendingUp,
  Smartphone,
  Sparkles,
  MessageSquare,
  Sliders,
  Maximize2,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Modular Presentation Components
import { TableFilterToolbar } from './components/tesorero/TableFilterToolbar';
import { FormulaBar } from './components/tesorero/FormulaBar';
import { SpreadsheetGrid } from './components/tesorero/SpreadsheetGrid';
import { ColumnConfigDrawer } from './components/tesorero/ColumnConfigDrawer';
import { ChurchReportForm } from './components/iglesia/ChurchReportForm';
import { QuickSearchModal } from './components/tesorero/QuickSearchModal';
import { AuditDrawer } from './components/tesorero/AuditDrawer';
import { FormulaModal } from './components/tesorero/FormulaModal';
import { BadgeStatus } from './components/common/BadgeStatus';
import { useGridKeyboardNav } from './hooks/useGridKeyboardNav';
import type { SortState, EditingCell, GridData, ColumnaGrid } from './types/contabilidad';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

import { formatCOP } from './utils/formatters';
import { ConfirmModal } from './components/common/ConfirmModal';
import { PeriodCreateModal } from './components/common/PeriodCreateModal';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { MobileView } from './components/mobile/MobileView';

// WOW Features Components
import { ExecutiveDashboard } from './components/analytics/ExecutiveDashboard';
import { AICopilotDrawer } from './components/ai/AICopilotDrawer';
import { ExecutivePDFModal } from './components/reports/ExecutivePDFModal';
import { ReceiptViewerModal, ReceiptItem } from './components/attachments/ReceiptViewerModal';
import { BudgetSimulator } from './components/forecasting/BudgetSimulator';
import { BoardroomPresentationModal } from './components/presentation/BoardroomPresentationModal';
import { NotificationCenter } from './components/notifications/NotificationCenter';

const API_BASE = window.location.origin;
axios.defaults.timeout = 15000;

export default function App() {
  const { isMobile, setOverride } = useDeviceDetection();

  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sheet' | 'iglesias' | 'campos' | 'permisos' | 'usuarios' | 'historial'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Sidebar Collapse State
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('tesorapp_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('tesorapp_sidebar_open', String(next));
      return next;
    });
  };

  // WOW Features State
  const [showExecutivePDF, setShowExecutivePDF] = useState(false);
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [receiptVaultState, setReceiptVaultState] = useState<{ open: boolean; churchId: string; churchName: string }>({
    open: false,
    churchId: '',
    churchName: '',
  });

  const [receiptsList, setReceiptsList] = useState<ReceiptItem[]>(() => {
    try {
      const stored = localStorage.getItem('tesorapp_receipts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleAddReceipt = (item: ReceiptItem) => {
    setReceiptsList((prev) => {
      const updated = [item, ...prev];
      localStorage.setItem('tesorapp_receipts', JSON.stringify(updated));
      return updated;
    });
    triggerToast('Comprobante adjuntado con éxito');
  };

  const handleDeleteReceipt = (id: string) => {
    setReceiptsList((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      localStorage.setItem('tesorapp_receipts', JSON.stringify(updated));
      return updated;
    });
    triggerToast('Comprobante eliminado');
  };

  const handleToggleVerifyReceipt = (id: string) => {
    setReceiptsList((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, verified: !r.verified } : r));
      localStorage.setItem('tesorapp_receipts', JSON.stringify(updated));
      return updated;
    });
  };

  // Auth form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Global Metadata
  const [iglesias, setIglesias] = useState<any[]>([]);
  const [campos, setCampos] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [tablas, setTablas] = useState<any[]>([]);
  const [auditorias, setAuditorias] = useState<any[]>([]);

  // Selected states (with localStorage persistence for active table)
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>('');
  const [selectedTablaId, setSelectedTablaId] = useState<string>(
    localStorage.getItem('tesorapp_active_tabla_id') || ''
  );

  // Grid state
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [activeCell, setActiveCell] = useState<EditingCell | null>(null);
  const [gridSearch, setGridSearch] = useState<string>('');
  const [showAllColumns, setShowAllColumns] = useState<boolean>(false);
  const [onlyOverriddenFilter, setOnlyOverriddenFilter] = useState<boolean>(false);
  const [showAnalyticsDrawer, setShowAnalyticsDrawer] = useState<boolean>(false);
  const [showColumnDrawer, setShowColumnDrawer] = useState<boolean>(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);
  const [showQuickSearch, setShowQuickSearch] = useState<boolean>(false);
  const [formulaModalColumn, setFormulaModalColumn] = useState<ColumnaGrid | null>(null);

  // Admin search filters
  const [churchSearch, setChurchSearch] = useState<string>('');
  const [fieldSearch, setFieldSearch] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Modals
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableModalData, setTableModalData] = useState<{ id?: string; nombre: string; iglesia_ids: string[]; campo_ids: string[] }>({
    nombre: '',
    iglesia_ids: [],
    campo_ids: [],
  });

  const [showChurchModal, setShowChurchModal] = useState(false);
  const [churchModalData, setChurchModalData] = useState({
    id: '',
    nombre: '',
    identificador_interno: '',
    estado: 'activa',
    nombre_pastor: '',
    direccion: '',
    codigo: '',
    telefono: '',
    correo: '',
  });

  const [fieldModalData, setFieldModalData] = useState({
    id: '',
    nombre: '',
    tipo: 'moneda',
    modo_calculo: 'manual',
    formula: '',
    tipo_redondeo: 'ninguno' as 'ninguno' | 'arriba' | 'abajo' | 'estandar',
    multiplo_redondeo: 1,
    es_acumulable: false,
    seccion: 'Ingresos',
    seccion_iglesia: 'Ingresos',
    seccion_tesorero: 'Ingresos',
    orden: 0,
    aplica_a_todas_las_iglesias: true,
    visible_para_iglesia: true,
    visible_para_tesorero: true,
    es_temporal: false,
    periodo_id: '' as string | null,
    iglesias_especificas: [] as string[],
  });

  // Formula assistant state
  const [formulaAssistantTab, setFormulaAssistantTab] = useState<'porcentaje' | 'suma' | 'resta' | 'teclado'>('porcentaje');
  const [percentRate, setPercentRate] = useState<number>(3);
  const [percentSelectedCols, setPercentSelectedCols] = useState<string[]>([]);
  const [sumSelectedCols, setSumSelectedCols] = useState<string[]>([]);
  const [diffBaseCol, setDiffBaseCol] = useState<string>('');
  const [diffMinusCol, setDiffMinusCol] = useState<string>('');

  const [showPaperModal, setShowPaperModal] = useState<boolean>(false);
  const [paperChurch, setPaperChurch] = useState<any>(null);
  const [paperValues, setPaperValues] = useState<Record<string, number>>({});
  const [paperChurchFields, setPaperChurchFields] = useState<any[]>([]);
  const [savingPaper, setSavingPaper] = useState<boolean>(false);
  const [savingField, setSavingField] = useState<boolean>(false);
  const [savingChurch, setSavingChurch] = useState<boolean>(false);
  const [savingTable, setSavingTable] = useState<boolean>(false);
  const [savingUser, setSavingUser] = useState<boolean>(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalData, setUserModalData] = useState({
    id: '',
    nombre_completo: '',
    correo: '',
    contrasena: '',
    rol: 'iglesia',
    iglesia_id: '',
    activo: true,
  });

  const [selectedPermissionChurch, setSelectedPermissionChurch] = useState<string>('');
  const [churchPermissions, setChurchPermissions] = useState<any[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [showPeriodCreateModal, setShowPeriodCreateModal] = useState(false);

  // Sort states
  const [gridSort, setGridSort] = useState<SortState | null>(null);
  const [churchSort, setChurchSort] = useState<SortState>({ colKey: 'nombre', direction: 'asc' });
  const [fieldSort, setFieldSort] = useState<SortState>({ colKey: 'orden', direction: 'asc' });
  const [userSort, setUserSort] = useState<SortState>({ colKey: 'nombre_completo', direction: 'asc' });
  const [auditSort, setAuditSort] = useState<SortState>({ colKey: 'realizado_en', direction: 'desc' });

  // ─── Core Computed Roles and Selected Objects (declared early to prevent TDZ) ───
  const isTesorero = user?.rol === 'tesorero';
  const selectedTableObj = tablas.find((t) => t.id === selectedTablaId);
  const selectedPeriodObj = periodos.find((p) => p.id === selectedPeriodoId);
  const isPeriodOpen = selectedPeriodObj?.estado === 'abierto';

  // ─── Toast Notifications ─────────────────────────────────────────────
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Global Keyboard Shortcuts (Ctrl+K: Search, Ctrl+B: Toggle Sidebar) ────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickSearch(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Formula Helpers ──────────────────────────────────────────────────
  const buildPercentFormula = (rate: number, cols: string[]) => {
    if (cols.length === 0) return '';
    const rateDecimal = rate / 100;
    return cols.length === 1 ? `${cols[0]} * ${rateDecimal}` : `(${cols.join(' + ')}) * ${rateDecimal}`;
  };
  const buildSumFormula = (cols: string[]) => (cols.length === 0 ? '' : cols.join(' + '));
  const buildDiffFormula = (base: string, minus: string) => (!base || !minus ? '' : `${base} - ${minus}`);

  const getFormulaExplanation = (formula: string, modoCalculo: string) => {
    if (modoCalculo !== 'calculado' || !formula?.trim()) return null;
    const clean = formula.trim();
    const pctMatch = clean.match(/^(?:\(([^)]+)\)|([a-zA-Z0-9_]+))\s*\*\s*([0-9.]+)/);
    if (pctMatch) {
      const vars = (pctMatch[1] || pctMatch[2]).split('+').map((s) => s.trim());
      const pct = (parseFloat(pctMatch[3]) * 100).toFixed(1).replace(/\.0$/, '');
      const varNames = vars.map((v) => campos.find((c) => c.slug === v || c.id === v)?.nombre || v).join(' + ');
      return `Calcula automáticamente el ${pct}% sobre la base de (${varNames}).`;
    }
    if (!clean.includes('*') && !clean.includes('/') && !clean.includes('-') && clean.includes('+')) {
      const vars = clean.split('+').map((s) => s.trim());
      const varNames = vars.map((v) => campos.find((c) => c.slug === v || c.id === v)?.nombre || v).join(' + ');
      return `Suma automáticamente los valores de (${varNames}).`;
    }
    if (clean.includes('-') && !clean.includes('*') && !clean.includes('/') && !clean.includes('+')) {
      const [base, minus] = clean.split('-').map((s) => s.trim());
      const baseName = campos.find((c) => c.slug === base || c.id === base)?.nombre || base;
      const minusName = campos.find((c) => c.slug === minus || c.id === minus)?.nombre || minus;
      return `Resta el valor de (${minusName}) al total de (${baseName}).`;
    }
    return `Aplica la fórmula: ${formula}`;
  };

  // ─── Table selection persistence ──────────────────────────────────────
  const handleTableChange = (tableId: string) => {
    setSelectedTablaId(tableId);
    localStorage.setItem('tesorapp_active_tabla_id', tableId);
  };

  // ─── Auth ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchMe();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/me`);
      setUser(res.data);
      if (res.data.rol !== 'tesorero') setActiveTab('sheet');
      loadGlobalData(res.data.rol);
    } catch {
      handleLogout();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { correo: loginEmail, contrasena: loginPass });
      localStorage.setItem('token', res.data.access_token);
      setToken(res.data.access_token);
      setUser(res.data.user);
      if (res.data.user.rol !== 'tesorero') setActiveTab('sheet');
      triggerToast('Sesión iniciada');
      loadGlobalData(res.data.user.rol);
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error de autenticación', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    triggerToast('Sesión cerrada');
  };

  // ─── Data Loading ─────────────────────────────────────────────────────
  const loadGlobalData = async (userRole?: string) => {
    const role = userRole || user?.rol;
    try {
      const isTesoreroRole = role === 'tesorero';
      const [igRes, campRes, perRes, usrRes, tabRes, audRes] = await Promise.all([
        axios.get(`${API_BASE}/iglesias`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/campos`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/periodos`).catch(() => ({ data: [] })),
        isTesoreroRole ? axios.get(`${API_BASE}/usuarios`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        axios.get(`${API_BASE}/tablas`).catch(() => ({ data: [] })),
        isTesoreroRole ? axios.get(`${API_BASE}/historial`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setIglesias(igRes.data || []);
      setCampos(campRes.data || []);
      setPeriodos(perRes.data || []);
      setUsuarios(usrRes.data || []);
      setTablas(tabRes.data || []);
      setAuditorias(audRes.data || []);
      if (perRes.data?.length > 0 && !selectedPeriodoId) setSelectedPeriodoId(perRes.data[0].id);
      if (tabRes.data?.length > 0 && !selectedTablaId) {
        const savedTableId = localStorage.getItem('tesorapp_active_tabla_id');
        const validSaved = tabRes.data.find((t: any) => t.id === savedTableId);
        setSelectedTablaId(validSaved ? validSaved.id : tabRes.data[0].id);
      }
    } catch (err) {
      console.error('Error cargando metadatos', err);
    }
  };

  const fetchGridValues = async () => {
    if (!selectedTablaId || !selectedPeriodoId) return;
    try {
      const res = await axios.get(
        `${API_BASE}/valores?tabla_id=${selectedTablaId}&periodo_id=${selectedPeriodoId}${
          showAllColumns ? '&mostrar_todos=true' : ''
        }`
      );
      setGridData(res.data);
    } catch (err) {
      console.error(err);
      triggerToast('No se pudieron cargar los valores', 'error');
    }
  };

  useEffect(() => {
    if (user && selectedTablaId && selectedPeriodoId) fetchGridValues();
  }, [selectedTablaId, selectedPeriodoId, showAllColumns, user]);

  // ─── Paper Modal ──────────────────────────────────────────────────────
  const openPaperModal = async (church: any) => {
    setPaperChurch(church);
    setShowPaperModal(true);
    try {
      const res = await axios.get(`${API_BASE}/valores?iglesia_id=${church.iglesia_id}&periodo_id=${selectedPeriodoId}`);
      setPaperChurchFields(res.data);
      const valMap: Record<string, number> = {};
      for (const f of res.data) {
        if (f.modo_calculo === 'manual') valMap[f.campo_id] = Number(f.valor_manual || 0);
      }
      setPaperValues(valMap);
    } catch (err) {
      console.error('Error cargando campos para papel', err);
    }
  };

  const savePaperBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperChurch || !selectedPeriodoId) return;
    setSavingPaper(true);
    try {
      const payload = Object.entries(paperValues).map(([campo_id, valor_manual]) => ({
        campo_id,
        valor_manual: Number(valor_manual || 0),
      }));
      await axios.put(`${API_BASE}/valores/${paperChurch.iglesia_id}/lote/${selectedPeriodoId}`, { valores: payload });
      triggerToast('Informe en papel guardado y recalculado con éxito');
      setShowPaperModal(false);
      fetchGridValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error guardando informe', 'error');
    } finally {
      setSavingPaper(false);
    }
  };

  // ─── Cell Editing & Overrides ──────────────────────────────────────────
  const saveCell = async (churchId: string, fieldId: string, valueStr: string) => {
    const val = valueStr === '' || isNaN(parseFloat(valueStr)) ? 0 : parseFloat(valueStr);
    try {
      await axios.put(`${API_BASE}/valores/${churchId}/${fieldId}/${selectedPeriodoId}`, { valor_manual: val });
      fetchGridValues();
      triggerToast('Guardado y recalculado');
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error al guardar', 'error');
    } finally {
      setEditingCell(null);
    }
  };

  const handleBatchSave = async (churchId: string, values: Record<string, number>) => {
    const payload = Object.entries(values).map(([campo_id, valor_manual]) => ({ campo_id, valor_manual }));
    try {
      await axios.put(`${API_BASE}/valores/${churchId}/lote/${selectedPeriodoId}`, { valores: payload });
      fetchGridValues();
      triggerToast('Guardado y recalculado');
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error al guardar', 'error');
    }
  };

  const handleSaveFormulaDirect = async (fieldId: string, formulaStr: string) => {
    try {
      await axios.put(`${API_BASE}/campos/${fieldId}`, { formula: formulaStr });
      triggerToast('Fórmula actualizada y recalculada');
      loadGlobalData();
      fetchGridValues();
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || 'Error guardando fórmula';
      triggerToast(msg, 'error');
      throw err;
    }
  };

  // ─── Table CRUD ────────────────────────────────────────────────────────
  const saveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingTable) return;
    setSavingTable(true);
    try {
      if (tableModalData.id) {
        await axios.put(`${API_BASE}/tablas/${tableModalData.id}`, tableModalData);
        triggerToast('Tabla actualizada');
      } else {
        const res = await axios.post(`${API_BASE}/tablas`, tableModalData);
        handleTableChange(res.data.id);
        triggerToast('Tabla creada');
      }
      setShowTableModal(false);
      try {
        await loadGlobalData();
        fetchGridValues();
      } catch {}
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || 'Error guardando tabla';
      triggerToast(msg, 'error');
    } finally {
      setSavingTable(false);
    }
  };

  const deleteTable = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Tabla',
      message: '¿Está seguro de eliminar esta tabla de consolidación? Las iglesias no se eliminarán.',
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await axios.delete(`${API_BASE}/tablas/${id}`);
          triggerToast('Tabla eliminada');
          loadGlobalData();
          if (selectedTablaId === id) setSelectedTablaId('');
        } catch (err: any) {
          triggerToast(err.response?.data?.message || 'Error al eliminar', 'error');
        }
      },
    });
  };

  // ─── Church CRUD ───────────────────────────────────────────────────────
  const saveChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingChurch) return;
    setSavingChurch(true);
    try {
      if (churchModalData.id) {
        await axios.put(`${API_BASE}/iglesias/${churchModalData.id}`, churchModalData);
        triggerToast('Iglesia actualizada');
      } else {
        await axios.post(`${API_BASE}/iglesias`, churchModalData);
        triggerToast('Iglesia registrada');
      }
      setShowChurchModal(false);
      try {
        await loadGlobalData();
      } catch {}
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || 'Error guardando iglesia';
      triggerToast(msg, 'error');
    } finally {
      setSavingChurch(false);
    }
  };

  const toggleChurchStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'activa' ? 'inactiva' : 'activa';
    try {
      await axios.patch(`${API_BASE}/iglesias/${id}/estado`, { estado: nextStatus });
      triggerToast(`Iglesia marcada como ${nextStatus}`);
      loadGlobalData();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error actualizando estado', 'error');
    }
  };

  const deleteChurch = (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Congregación',
      message: `¿Está seguro de eliminar permanentemente la congregación "${name}"? Esta acción es definitiva.`,
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await axios.delete(`${API_BASE}/iglesias/${id}`);
          triggerToast('Iglesia eliminada exitosamente');
          loadGlobalData();
        } catch (err: any) {
          triggerToast(err.response?.data?.message || 'No se pudo eliminar la iglesia', 'error');
        }
      },
    });
  };

  // ─── Field CRUD ────────────────────────────────────────────────────────
  const openFieldModalForNew = () => {
    const defaultManuals = campos.filter((c) => c.modo_calculo === 'manual').slice(0, 2).map((c) => c.slug);
    const initialRate = 3;
    const initialFormula = buildPercentFormula(initialRate, defaultManuals);
    setFieldModalData({
      id: '',
      nombre: '',
      tipo: 'moneda',
      modo_calculo: 'manual',
      formula: initialFormula,
      tipo_redondeo: 'ninguno',
      multiplo_redondeo: 1,
      es_acumulable: false,
      seccion: 'Ingresos',
      seccion_iglesia: 'Ingresos',
      seccion_tesorero: 'Ingresos',
      orden: campos.length,
      aplica_a_todas_las_iglesias: true,
      visible_para_iglesia: true,
      visible_para_tesorero: true,
      es_temporal: false,
      periodo_id: selectedPeriodoId || (periodos[0]?.id || null),
      iglesias_especificas: [],
    });
    setFormulaAssistantTab('porcentaje');
    setPercentRate(initialRate);
    setPercentSelectedCols(defaultManuals);
    setSumSelectedCols(defaultManuals);
    if (campos.length > 0) {
      setDiffBaseCol(campos[0].slug);
      setDiffMinusCol(campos[1]?.slug || campos[0].slug);
    }
    setShowColumnDrawer(true);
  };

  const openFieldModalForEdit = (field: any) => {
    setFieldModalData({
      id: field.id,
      nombre: field.nombre,
      tipo: field.tipo,
      modo_calculo: field.modo_calculo,
      formula: field.formula || '',
      tipo_redondeo: field.tipo_redondeo || 'ninguno',
      multiplo_redondeo: field.multiplo_redondeo ? Number(field.multiplo_redondeo) : 1,
      es_acumulable: field.es_acumulable,
      seccion: field.seccion,
      seccion_iglesia: field.seccion_iglesia || field.seccion,
      seccion_tesorero: field.seccion_tesorero || field.seccion,
      orden: field.orden,
      aplica_a_todas_las_iglesias: field.aplica_a_todas_las_iglesias,
      visible_para_iglesia: field.visible_para_iglesia ?? true,
      visible_para_tesorero: field.visible_para_tesorero ?? true,
      es_temporal: field.es_temporal ?? false,
      periodo_id: field.periodo_id || selectedPeriodoId || (periodos[0]?.id || null),
      iglesias_especificas: [],
    });
    const otherManuals = campos
      .filter((c) => c.id !== field.id && c.slug !== field.slug && c.modo_calculo === 'manual')
      .map((c) => c.slug);
    const form = (field.formula || '').trim();
    const pctMatch = form.match(/^(?:\(([^)]+)\)|([a-zA-Z0-9_]+))\s*\*\s*([0-9.]+)/);
    if (pctMatch) {
      setFormulaAssistantTab('porcentaje');
      setPercentRate(parseFloat(pctMatch[3]) * 100);
      setPercentSelectedCols((pctMatch[1] || pctMatch[2]).split('+').map((s: string) => s.trim()).filter((s: string) => s !== field.slug));
    } else if (form.includes('+') && !form.includes('*') && !form.includes('-')) {
      setFormulaAssistantTab('suma');
      setSumSelectedCols(form.split('+').map((s: string) => s.trim()).filter((s: string) => s !== field.slug));
    } else if (form.includes('-') && !form.includes('*') && !form.includes('+')) {
      setFormulaAssistantTab('resta');
      const [b, m] = form.split('-').map((s: string) => s.trim());
      setDiffBaseCol(b !== field.slug ? b : campos.find((c) => c.slug !== field.slug)?.slug || '');
      setDiffMinusCol(m !== field.slug ? m : campos.find((c) => c.slug !== field.slug)?.slug || '');
    } else {
      setFormulaAssistantTab(field.modo_calculo === 'calculado' ? 'teclado' : 'porcentaje');
      setPercentRate(3);
      setPercentSelectedCols(otherManuals.slice(0, 2));
      setSumSelectedCols(otherManuals.slice(0, 2));
    }
    setShowColumnDrawer(true);
  };

  const saveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingField) return;
    setSavingField(true);
    try {
      if (fieldModalData.id) {
        await axios.put(`${API_BASE}/campos/${fieldModalData.id}`, fieldModalData);
        triggerToast('Columna actualizada');
      } else {
        await axios.post(`${API_BASE}/campos`, fieldModalData);
        triggerToast('Columna creada con éxito');
      }
      setShowColumnDrawer(false);
      try {
        await loadGlobalData();
        if (selectedTablaId && selectedPeriodoId) fetchGridValues();
      } catch {}
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || 'Error guardando columna';
      triggerToast(msg, 'error');
    } finally {
      setSavingField(false);
    }
  };

  const deleteField = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Columna',
      message: '¿Está seguro de eliminar esta definición de campo? Los valores asociados serán removidos.',
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await axios.delete(`${API_BASE}/campos/${id}`);
          triggerToast('Campo eliminado');
          loadGlobalData();
        } catch (err: any) {
          triggerToast(err.response?.data?.message || 'Error al eliminar campo', 'error');
        }
      },
    });
  };

  // ─── User CRUD ─────────────────────────────────────────────────────────
  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingUser) return;
    setSavingUser(true);
    try {
      if (userModalData.id) {
        await axios.put(`${API_BASE}/usuarios/${userModalData.id}`, userModalData);
        triggerToast('Usuario actualizado');
      } else {
        await axios.post(`${API_BASE}/usuarios`, userModalData);
        triggerToast('Usuario registrado');
      }
      setShowUserModal(false);
      try {
        await loadGlobalData();
      } catch {}
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || 'Error guardando usuario';
      triggerToast(msg, 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const deleteUser = (id: string, name?: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: `¿Está seguro de eliminar permanentemente al usuario ${name ? `"${name}"` : ''}?`,
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await axios.delete(`${API_BASE}/usuarios/${id}`);
          triggerToast('Usuario eliminado definitivamente');
          loadGlobalData();
        } catch (err: any) {
          triggerToast(err.response?.data?.message || 'Error al eliminar usuario', 'error');
        }
      },
    });
  };

  // ─── Permissions ───────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedPermissionChurch) {
      axios
        .get(`${API_BASE}/permisos/${selectedPermissionChurch}`)
        .then((res) => setChurchPermissions(res.data))
        .catch((err) => console.error(err));
    } else {
      setChurchPermissions([]);
    }
  }, [selectedPermissionChurch]);

  const togglePermission = async (campoId: string, currentVal: boolean) => {
    const updated = churchPermissions.map((p) =>
      p.campo_id === campoId ? { ...p, editable_por_iglesia: !currentVal } : p
    );
    setChurchPermissions(updated);
    try {
      await axios.put(`${API_BASE}/permisos/${selectedPermissionChurch}`, {
        permisos: updated.map((p) => ({ campo_id: p.campo_id, editable_por_iglesia: p.editable_por_iglesia })),
      });
      triggerToast('Permiso actualizado');
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error guardando permiso', 'error');
    }
  };

  // ─── Period Actions ────────────────────────────────────────────────────
  const handleCreatePeriod = () => {
    setShowPeriodCreateModal(true);
  };

  const submitCreatePeriod = async (data: { nombre: string; fecha_inicio: string; fecha_fin: string }) => {
    try {
      const res = await axios.post(`${API_BASE}/periodos`, data);
      triggerToast('Periodo abierto con éxito');
      setSelectedPeriodoId(res.data.id);
      loadGlobalData();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error creando periodo', 'error');
      throw err;
    }
  };

  const handleClosePeriod = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Cerrar Periodo Contable',
      message: '¿Cerrar periodo? Se calcularán y fijarán los acumulados. No se permitirán más ediciones manuales por parte de las iglesias.',
      confirmText: 'Cerrar Periodo',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await axios.patch(`${API_BASE}/periodos/${id}/cerrar`);
          triggerToast('Periodo cerrado');
          loadGlobalData();
        } catch (err: any) {
          triggerToast(err.response?.data?.message || 'Error al cerrar periodo', 'error');
        }
      },
    });
  };

  const handleReopenPeriod = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Reabrir Periodo Contable',
      message: '¿Reabrir periodo para habilitar nuevamente la edición manual de valores?',
      confirmText: 'Reabrir',
      variant: 'info',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await axios.patch(`${API_BASE}/periodos/${id}/reabrir`);
          triggerToast('Periodo reabierto');
          loadGlobalData();
        } catch (err: any) {
          triggerToast(err.response?.data?.message || 'Error al reabrir periodo', 'error');
        }
      },
    });
  };

  const exportExcel = () => {
    if (!selectedTablaId || !selectedPeriodoId) return;
    window.open(`${API_BASE}/reportes/exportar?tabla_id=${selectedTablaId}&periodo_id=${selectedPeriodoId}`);
  };

  // ─── Sort Functions ────────────────────────────────────────────────────
  const toggleGridSort = (colKey: string) => {
    setGridSort((prev) => {
      if (prev?.colKey === colKey) return prev.direction === 'asc' ? { colKey, direction: 'desc' } : null;
      return { colKey, direction: 'asc' };
    });
  };
  const toggleChurchSort = (colKey: string) =>
    setChurchSort((prev) => ({
      colKey,
      direction: prev.colKey === colKey && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  const toggleFieldSort = (colKey: string) =>
    setFieldSort((prev) => ({
      colKey,
      direction: prev.colKey === colKey && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  const toggleUserSort = (colKey: string) =>
    setUserSort((prev) => ({
      colKey,
      direction: prev.colKey === colKey && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  const toggleAuditSort = (colKey: string) =>
    setAuditSort((prev) => ({
      colKey,
      direction: prev.colKey === colKey && prev.direction === 'asc' ? 'desc' : 'asc',
    }));

  // ─── Derived / Memoized Grid Data ──────────────────────────────────────
  const sortedAndFilteredGridRows = useMemo(() => {
    if (!gridData?.filas) return [];
    let list = [...gridData.filas];

    // Search query filter
    if (gridSearch.trim()) {
      const term = gridSearch.toLowerCase();
      list = list.filter(
        (f: any) =>
          f.iglesia_nombre.toLowerCase().includes(term) ||
          (f.codigo && f.codigo.toLowerCase().includes(term))
      );
    }

    // Overridden only filter
    if (onlyOverriddenFilter) {
      list = list.filter((row: any) =>
        row.valores?.some(
          (v: any) =>
            v.modo_calculo === 'calculado' &&
            v.valor_manual != null &&
            v.valor_manual !== 0
        )
      );
    }

    // Sort order
    if (gridSort) {
      list.sort((a: any, b: any) => {
        if (gridSort.colKey === 'iglesia_nombre') {
          return gridSort.direction === 'asc'
            ? a.iglesia_nombre.localeCompare(b.iglesia_nombre, 'es', { sensitivity: 'base' })
            : b.iglesia_nombre.localeCompare(a.iglesia_nombre, 'es', { sensitivity: 'base' });
        }
        const recA = a.valores?.find((v: any) => v.campo_id === gridSort.colKey);
        const recB = b.valores?.find((v: any) => v.campo_id === gridSort.colKey);
        const valA = Number(recA ? (recA.modo_calculo === 'calculado' ? recA.valor_calculado : recA.valor_manual) : 0) || 0;
        const valB = Number(recB ? (recB.modo_calculo === 'calculado' ? recB.valor_calculado : recB.valor_manual) : 0) || 0;
        return gridSort.direction === 'asc' ? valA - valB : valB - valA;
      });
    }
    return list;
  }, [gridData, gridSearch, onlyOverriddenFilter, gridSort]);

  const sortedIglesias = useMemo(() => {
    const list = iglesias.filter(
      (i) =>
        i.nombre.toLowerCase().includes(churchSearch.toLowerCase()) ||
        (i.nombre_pastor && i.nombre_pastor.toLowerCase().includes(churchSearch.toLowerCase())) ||
        (i.codigo && i.codigo.toLowerCase().includes(churchSearch.toLowerCase()))
    );
    return list.sort((a: any, b: any) => {
      const valA = (a[churchSort.colKey] || '').toString();
      const valB = (b[churchSort.colKey] || '').toString();
      return churchSort.direction === 'asc'
        ? valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' })
        : valB.localeCompare(valA, 'es', { numeric: true, sensitivity: 'base' });
    });
  }, [iglesias, churchSearch, churchSort]);

  const sortedCampos = useMemo(() => {
    const list = campos.filter(
      (f) =>
        f.nombre.toLowerCase().includes(fieldSearch.toLowerCase()) ||
        f.slug.toLowerCase().includes(fieldSearch.toLowerCase()) ||
        f.seccion.toLowerCase().includes(fieldSearch.toLowerCase())
    );
    return list.sort((a: any, b: any) => {
      const valA = a[fieldSort.colKey];
      const valB = b[fieldSort.colKey];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return fieldSort.direction === 'asc' ? valA - valB : valB - valA;
      }
      const strA = (valA || '').toString();
      const strB = (valB || '').toString();
      return fieldSort.direction === 'asc'
        ? strA.localeCompare(strB, 'es', { numeric: true, sensitivity: 'base' })
        : strB.localeCompare(strA, 'es', { numeric: true, sensitivity: 'base' });
    });
  }, [campos, fieldSearch, fieldSort]);

  const sortedUsuarios = useMemo(() => {
    const list = usuarios.filter(
      (u) =>
        u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.correo.toLowerCase().includes(userSearch.toLowerCase())
    );
    return list.sort((a: any, b: any) => {
      const valA = (userSort.colKey === 'iglesia' ? a.iglesia?.nombre || '' : a[userSort.colKey] || '').toString();
      const valB = (userSort.colKey === 'iglesia' ? b.iglesia?.nombre || '' : b[userSort.colKey] || '').toString();
      return userSort.direction === 'asc'
        ? valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' })
        : valB.localeCompare(valA, 'es', { numeric: true, sensitivity: 'base' });
    });
  }, [usuarios, userSearch, userSort]);

  const sortedAuditorias = useMemo(() => {
    const list = auditorias.filter(
      (log) =>
        (log.usuario?.nombre_completo && log.usuario.nombre_completo.toLowerCase().includes(auditSearch.toLowerCase())) ||
        log.entidad.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.accion.toLowerCase().includes(auditSearch.toLowerCase())
    );
    return list.sort((a: any, b: any) => {
      if (auditSort.colKey === 'realizado_en') {
        const ta = new Date(a.realizado_en).getTime();
        const tb = new Date(b.realizado_en).getTime();
        return auditSort.direction === 'asc' ? ta - tb : tb - ta;
      }
      const valA = (auditSort.colKey === 'usuario' ? a.usuario?.nombre_completo || '' : a[auditSort.colKey] || '').toString();
      const valB = (auditSort.colKey === 'usuario' ? b.usuario?.nombre_completo || '' : b[auditSort.colKey] || '').toString();
      return auditSort.direction === 'asc'
        ? valA.localeCompare(valB, 'es', { sensitivity: 'base' })
        : valB.localeCompare(valA, 'es', { numeric: true, sensitivity: 'base' });
    });
  }, [auditorias, auditSearch, auditSort]);

  const columnTotals = useMemo(() => {
    if (!gridData?.columnas || sortedAndFilteredGridRows.length === 0) return {};
    const totals: Record<string, number> = {};
    gridData.columnas.forEach((col: any) => {
      let sum = 0;
      sortedAndFilteredGridRows.forEach((row: any) => {
        const cell = row.valores?.find((v: any) => v.campo_id === col.id);
        if (cell) sum += Number(cell.modo_calculo === 'calculado' ? cell.valor_calculado : cell.valor_manual) || 0;
      });
      totals[col.id] = sum;
    });
    return totals;
  }, [gridData, sortedAndFilteredGridRows]);

  const chartData = useMemo(() => {
    if (!gridData?.filas || gridData.filas.length === 0) return null;
    const totalIngresosIdx = gridData.columnas.findIndex((c: any) => c.slug === 'total_ingresos');
    const saldoNetoIdx = gridData.columnas.findIndex((c: any) => c.slug === 'saldo_neto');
    if (totalIngresosIdx === -1 && saldoNetoIdx === -1) return null;
    return {
      labels: gridData.filas.map((f: any) => f.iglesia_nombre),
      datasets: [
        {
          label: 'Total Ingresos',
          data: gridData.filas.map((f: any) => Number(f.valores[totalIngresosIdx]?.valor_calculado || 0)),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Saldo Neto',
          data: gridData.filas.map((f: any) => Number(f.valores[saldoNetoIdx]?.valor_calculado || 0)),
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [gridData]);

  // Editable order for keyboard nav (safely references early declared isPeriodOpen & isTesorero)
  const editableOrder = useMemo(() => {
    if (!gridData?.filas || !gridData?.columnas) return [];
    const order: string[] = [];
    for (const fila of sortedAndFilteredGridRows) {
      for (const val of fila.valores) {
        const isCalc = val.modo_calculo === 'calculado';
        const canEdit = isPeriodOpen && (isTesorero || (!isCalc && val.editable !== false));
        if (canEdit) order.push(`${fila.iglesia_id}__${val.campo_id}`);
      }
    }
    return order;
  }, [gridData, sortedAndFilteredGridRows, isPeriodOpen, isTesorero]);

  // Excel-like Keyboard navigation
  useGridKeyboardNav({
    editableOrder,
    editingCell,
    setEditingCell,
    setEditValue,
    onSave: saveCell,
    editValue,
    isPeriodOpen: isPeriodOpen ?? false,
  });

  // ─── LOGIN VIEW (Light Theme) ──────────────────────────────────────────
  if (!token) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100 text-slate-900 p-4">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">TESORAPP</h1>
              <p className="text-[11px] text-slate-500">Plataforma Contable de Tesorería</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono text-xs font-semibold"
                placeholder="usuario@tesorapp.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Contraseña</label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white text-xs"
                placeholder="••••••••"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition text-xs shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Accediendo...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── ADAPTIVE MOBILE VIEW FOR MOBILE DEVICES OR OVERRIDE ─────────────
  if (token && isMobile) {
    return (
      <MobileView
        token={token}
        user={user}
        onLogout={handleLogout}
        onSwitchToDesktop={() => setOverride('desktop')}
        API_BASE={API_BASE}
      />
    );
  }

  // ─── MAIN APP SHELL (Left Sidebar + Minimalist Modern Workspace) ──────────────
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-950 text-slate-100 select-none font-sans">
      {/* ── LEFT SIDEBAR (Collapsible) ── */}
      <aside
        className={`bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none z-30 shadow-2xl transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-none opacity-0 pointer-events-none'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/30 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white">TESORAPP</span>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.2 rounded border border-indigo-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Gestión Financiera
              </p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            title="Ocultar barra lateral (Ctrl+B)"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0 ml-1"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Section: PRINCIPAL */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Principal
            </span>

            {isTesorero && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span>Tablero Ejecutivo</span>
                </div>
                {activeTab === 'dashboard' && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
              </button>
            )}

            <button
              onClick={() => setActiveTab('sheet')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                activeTab === 'sheet'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'sheet' ? 'text-white' : 'text-slate-400'}`} />
                <span>{isTesorero ? 'Planilla Contable' : 'Mi Reporte'}</span>
              </div>
              {activeTab === 'sheet' && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
            </button>
          </div>

          {/* Section: GESTIÓN & ADMINISTRACIÓN */}
          {isTesorero && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Gestión
              </span>

              <button
                onClick={() => setActiveTab('iglesias')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'iglesias'
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className={`w-4 h-4 ${activeTab === 'iglesias' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Congregaciones</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                  {iglesias.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('campos')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'campos'
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className={`w-4 h-4 ${activeTab === 'campos' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Columnas & Fórmulas</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                  {campos.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('permisos')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'permisos'
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Key className={`w-4 h-4 ${activeTab === 'permisos' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Permisos de Acceso</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('usuarios')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'usuarios'
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={`w-4 h-4 ${activeTab === 'usuarios' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Usuarios y Roles</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                  {usuarios.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('historial')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'historial'
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <History className={`w-4 h-4 ${activeTab === 'historial' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Registro Auditoría</span>
                </div>
              </button>
            </div>
          )}

          {/* Section: HERRAMIENTAS EJECUTIVAS (WOW) */}
          {isTesorero && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Herramientas Ejecutivas
              </span>

              <button
                onClick={() => setShowAICopilot(true)}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-900/80 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition transform" />
                  <span>Asistente IA Copilot</span>
                </div>
                <span className="text-[9px] bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold px-1.5 py-0.2 rounded-full shadow-2xs">
                  IA
                </span>
              </button>

              <button
                onClick={() => setShowExecutivePDF(true)}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-900/80 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition transform" />
                  <span>Informe PDF de Junta</span>
                </div>
              </button>

              <button
                onClick={() => setShowSimulator(true)}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-900/80 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition transform" />
                  <span>Simulador Financiero</span>
                </div>
              </button>

              <button
                onClick={() => setShowPresentation(true)}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-900/80 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Maximize2 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition transform" />
                  <span>Modo Sala de Juntas</span>
                </div>
              </button>

              <button
                onClick={() => setShowNotificationCenter(true)}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-900/80 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-teal-400 group-hover:scale-110 transition transform" />
                  <span>Mensajes a Pastores</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Bottom User Card */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                {user?.nombre_completo?.[0]?.toUpperCase() || 'T'}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{user?.nombre_completo}</h4>
                <span className="text-[10px] text-indigo-300 font-semibold block capitalize truncate">
                  {user?.rol || 'Usuario'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setOverride('mobile')}
                title="Cambiar a vista móvil"
                className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT MAIN WORKSPACE (Light / Clean Minimalist Background) ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        {/* Dynamic Top Header Bar */}
        <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              title={sidebarOpen ? "Ocultar menú lateral (Ctrl+B)" : "Mostrar menú lateral (Ctrl+B)"}
              className={`p-1.5 rounded-lg transition cursor-pointer border ${
                sidebarOpen 
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200' 
                  : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 shadow-xs'
              }`}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              {activeTab === 'dashboard' && 'Tablero Ejecutivo & Métricas'}
              {activeTab === 'sheet' && 'Planilla Contable General'}
              {activeTab === 'iglesias' && 'Directorio de Congregaciones'}
              {activeTab === 'campos' && 'Estructura de Columnas & Fórmulas'}
              {activeTab === 'permisos' && 'Matriz de Permisos & Seguridad'}
              {activeTab === 'usuarios' && 'Gestión de Usuarios & Accesos'}
              {activeTab === 'historial' && 'Auditoría & Trazabilidad de Cambios'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {selectedPeriodObj && (
              <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Periodo: <strong className="text-slate-900">{selectedPeriodObj.nombre}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAICopilot(true)}
                className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition transform active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Copilot IA</span>
              </button>
            </div>
          </div>
        </header>

        {/* View Tabs Rendering */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* TAB 0: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <ExecutiveDashboard
              gridData={gridData}
              periodos={periodos}
              selectedPeriodoId={selectedPeriodoId}
              onSelectPeriodo={setSelectedPeriodoId}
              tablas={tablas}
              selectedTablaId={selectedTablaId}
              onSelectTabla={setSelectedTablaId}
              iglesias={iglesias}
              onOpenCopilot={() => setShowAICopilot(true)}
              onOpenPDF={() => setShowExecutivePDF(true)}
              onOpenSimulator={() => setShowSimulator(true)}
              onOpenPresentation={() => setShowPresentation(true)}
              onOpenChurchDetail={(_iglesiaId) => {
                setActiveTab('sheet');
              }}
            />
          )}

          {/* TAB 1: SHEET */}
          {activeTab === 'sheet' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-white">
          {/* Toolbar (Tesorero only) */}
          {isTesorero ? (
            <TableFilterToolbar
              isTesorero={isTesorero}
              tablas={tablas}
              periodos={periodos}
              selectedTablaId={selectedTablaId}
              selectedPeriodoId={selectedPeriodoId}
              onTablaChange={handleTableChange}
              onPeriodoChange={setSelectedPeriodoId}
              onOpenTableConfig={() => {
                if (selectedTableObj) {
                  setTableModalData({
                    id: selectedTableObj.id,
                    nombre: selectedTableObj.nombre,
                    iglesia_ids: selectedTableObj.iglesias.map((i: any) => i.id),
                    campo_ids: selectedTableObj.campos.map((c: any) => c.campo_id),
                  });
                  setShowTableModal(true);
                }
              }}
              onNewTable={() => {
                setTableModalData({ nombre: '', iglesia_ids: [], campo_ids: [] });
                setShowTableModal(true);
              }}
              onClosePeriod={handleClosePeriod}
              onReopenPeriod={handleReopenPeriod}
              onCreatePeriod={handleCreatePeriod}
              onExportExcel={exportExcel}
              onToggleDrawer={() => openFieldModalForNew()}
              onOpenAuditDrawer={() => setShowAuditDrawer(true)}
              onOpenQuickSearch={() => setShowQuickSearch(true)}
              gridSearch={gridSearch}
              onGridSearchChange={setGridSearch}
              showAllColumns={showAllColumns}
              onToggleAllColumns={setShowAllColumns}
              onlyOverriddenFilter={onlyOverriddenFilter}
              onToggleOnlyOverridden={setOnlyOverriddenFilter}
              showAnalytics={showAnalyticsDrawer}
              onToggleAnalytics={() => setShowAnalyticsDrawer(!showAnalyticsDrawer)}
              hasChart={!!chartData}
              filteredCount={sortedAndFilteredGridRows.length}
              totalCount={gridData?.filas?.length || 0}
            />
          ) : null}

          {/* Role views separation: Tesorero Spreadsheet vs Iglesia ChurchReportForm */}
          {isTesorero ? (
            <>
              {/* Formula Bar */}
              <FormulaBar
                activeCell={activeCell}
                columns={gridData?.columnas || []}
                rows={sortedAndFilteredGridRows}
                campos={campos}
              />

              {/* Spreadsheet Grid */}
              <SpreadsheetGrid
                rows={sortedAndFilteredGridRows}
                columns={gridData?.columnas || []}
                columnTotals={columnTotals}
                editingCell={editingCell}
                editValue={editValue}
                setEditValue={setEditValue}
                onBeginEdit={(churchId, fieldId, currentValue) => {
                  setEditingCell({ churchId, fieldId });
                  setEditValue(currentValue === '0' ? '' : currentValue);
                }}
                onSaveCell={saveCell}
                onCancelEdit={() => setEditingCell(null)}
                onOpenPaperModal={openPaperModal}
                onOpenFormulaModal={(col) => setFormulaModalColumn(col)}
                onOpenReceipts={(churchId, churchName) =>
                  setReceiptVaultState({ open: true, churchId, churchName })
                }
                isTesorero={isTesorero}
                isPeriodOpen={isPeriodOpen ?? false}
                gridSort={gridSort}
                onSortChange={toggleGridSort}
                activeCell={activeCell}
                setActiveCell={setActiveCell}
              />

              {/* Analytics Drawer */}
              {showAnalyticsDrawer && (
                <div className="absolute right-0 top-[72px] bottom-0 w-[420px] bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col p-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <span>Análisis Comparativo ({gridData?.tabla_nombre})</span>
                    </div>
                    <button
                      onClick={() => setShowAnalyticsDrawer(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col justify-center">
                    {chartData ? (
                      <div className="h-[280px] w-full">
                        <Bar
                          data={chartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top',
                                labels: { boxWidth: 10, font: { size: 10 }, color: '#475569' },
                              },
                              title: { display: false },
                            },
                            scales: {
                              y: {
                                ticks: { font: { size: 9 }, color: '#64748b', callback: (val) => formatCOP(val as number) },
                                grid: { color: '#f1f5f9' },
                              },
                              x: {
                                ticks: { font: { size: 9 }, color: '#64748b', maxRotation: 45, minRotation: 45 },
                                grid: { display: false },
                              },
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 text-xs">
                        No se encontraron las columnas 'total_ingresos' y 'saldo_neto'.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* IGLESIA VIEW: MOBILE-FIRST 3-CARD FORM WITH AUTO-SAVE */
            gridData?.filas?.[0] ? (
              <ChurchReportForm
                row={gridData.filas[0]}
                columns={gridData.columnas}
                periodo={selectedPeriodObj}
                isPeriodOpen={isPeriodOpen ?? false}
                onSaveCell={saveCell}
                onBatchSave={handleBatchSave}
                onSendMonthlyReport={() => {
                  triggerToast('¡Reporte mensual enviado a tesorería con éxito!');
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs bg-slate-50">
                No hay datos disponibles para este período.
              </div>
            )
          )}

          {/* Quick Search Modal (Ctrl+K) */}
          <QuickSearchModal
            isOpen={showQuickSearch}
            onClose={() => setShowQuickSearch(false)}
            rows={gridData?.filas || []}
            onSelectChurch={(churchId) => {
              const firstFieldId = gridData?.columnas?.[0]?.id;
              if (firstFieldId) {
                setActiveCell({ churchId, fieldId: firstFieldId });
              }
            }}
          />

          {/* Audit Sliding Drawer */}
          {isTesorero && (
            <AuditDrawer
              isOpen={showAuditDrawer}
              onClose={() => setShowAuditDrawer(false)}
              auditorias={auditorias}
              iglesias={iglesias}
            />
          )}

          {/* Formula Dedicated Modal */}
          {isTesorero && (
            <FormulaModal
              isOpen={!!formulaModalColumn}
              onClose={() => setFormulaModalColumn(null)}
              column={formulaModalColumn}
              allCampos={campos}
              onSaveFormula={handleSaveFormulaDirect}
            />
          )}

          {/* Column Config Drawer */}
          {isTesorero && (
            <ColumnConfigDrawer
              isOpen={showColumnDrawer}
              onClose={() => setShowColumnDrawer(false)}
              fieldModalData={fieldModalData}
              setFieldModalData={setFieldModalData}
              campos={campos}
              periodos={periodos}
              selectedPeriodoId={selectedPeriodoId}
              savingField={savingField}
              onSave={saveField}
              onDelete={
                fieldModalData.id
                  ? () => {
                      deleteField(fieldModalData.id);
                      setShowColumnDrawer(false);
                    }
                  : undefined
              }
              formulaAssistantTab={formulaAssistantTab}
              setFormulaAssistantTab={setFormulaAssistantTab}
              percentRate={percentRate}
              setPercentRate={setPercentRate}
              percentSelectedCols={percentSelectedCols}
              setPercentSelectedCols={setPercentSelectedCols}
              sumSelectedCols={sumSelectedCols}
              setSumSelectedCols={setSumSelectedCols}
              diffBaseCol={diffBaseCol}
              setDiffBaseCol={setDiffBaseCol}
              diffMinusCol={diffMinusCol}
              setDiffMinusCol={setDiffMinusCol}
              buildPercentFormula={buildPercentFormula}
              buildSumFormula={buildSumFormula}
              buildDiffFormula={buildDiffFormula}
              getFormulaExplanation={getFormulaExplanation}
            />
          )}
        </div>
      )}

      {/* ── TAB 2: IGLESIAS ── */}
      {activeTab === 'iglesias' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
          <div className="h-[42px] px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-xs">Directorio de Iglesias ({iglesias.length})</h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar iglesia o pastor..."
                  value={churchSearch}
                  onChange={(e) => setChurchSearch(e.target.value)}
                  className="w-56 pl-7 pr-2 py-1 bg-white border border-slate-300 rounded text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setChurchModalData({
                  id: '',
                  nombre: '',
                  identificador_interno: '',
                  estado: 'activa',
                  nombre_pastor: '',
                  direccion: '',
                  codigo: '',
                  telefono: '',
                  correo: '',
                });
                setShowChurchModal(true);
              }}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3 h-3" /> Registrar Iglesia
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-300 z-10 select-none">
                <tr className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  {[
                    ['nombre', 'Nombre'],
                    ['codigo', 'Código'],
                    ['nombre_pastor', 'Pastor'],
                    ['telefono', 'Teléfono'],
                    ['correo', 'Correo'],
                    ['direccion', 'Dirección'],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => toggleChurchSort(key)}
                      className="px-3 py-2 border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{label}</span>
                        {churchSort.colKey === key ? (
                          churchSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-indigo-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-indigo-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-2.5 py-2 border-r border-slate-200">Tabla</th>
                  <th className="px-2.5 py-2 border-r border-slate-200 text-center">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedIglesias.map((ig) => {
                  const matchedTable = tablas.find((t) => t.iglesias.some((i: any) => i.id === ig.id));
                  return (
                    <tr key={ig.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">{ig.nombre}</td>
                      <td className="px-2.5 py-2 text-slate-500 font-mono text-[11px] border-r border-slate-200">
                        {ig.codigo || '-'}
                      </td>
                      <td className="px-2.5 py-2 text-slate-700 border-r border-slate-200">{ig.nombre_pastor || '-'}</td>
                      <td className="px-2.5 py-2 text-slate-600 font-mono text-[11px] border-r border-slate-200">
                        {ig.telefono || '-'}
                      </td>
                      <td className="px-2.5 py-2 text-slate-600 border-r border-slate-200">{ig.correo || '-'}</td>
                      <td className="px-2.5 py-2 text-slate-500 text-[11px] truncate max-w-[150px] border-r border-slate-200">
                        {ig.direccion || '-'}
                      </td>
                      <td className="px-2.5 py-2 border-r border-slate-200">
                        {matchedTable ? (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold border border-slate-200">
                            {matchedTable.nombre}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 text-center border-r border-slate-200">
                        <BadgeStatus variant={ig.estado} label={ig.estado} />
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <button
                          onClick={() => {
                            setUserModalData({
                              id: '',
                              nombre_completo: ig.nombre_pastor || `Encargado ${ig.nombre}`,
                              correo: ig.correo || '',
                              contrasena: '',
                              rol: 'iglesia',
                              iglesia_id: ig.id,
                              activo: true,
                            });
                            setShowUserModal(true);
                          }}
                          className="px-2 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 rounded font-semibold inline-flex items-center gap-1 border border-slate-300"
                        >
                          <UserPlus className="w-3 h-3" /> + Usuario
                        </button>
                        <button
                          onClick={() => {
                            setChurchModalData({
                              id: ig.id,
                              nombre: ig.nombre,
                              identificador_interno: ig.identificador_interno || '',
                              estado: ig.estado,
                              nombre_pastor: ig.nombre_pastor || '',
                              direccion: ig.direccion || '',
                              codigo: ig.codigo || '',
                              telefono: ig.telefono || '',
                              correo: ig.correo || '',
                            });
                            setShowChurchModal(true);
                          }}
                          className="px-2 py-1 text-[11px] border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-semibold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleChurchStatus(ig.id, ig.estado)}
                          className="px-2 py-1 text-[11px] border border-slate-300 rounded hover:bg-slate-100 text-slate-600 font-semibold"
                        >
                          {ig.estado === 'activa' ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => deleteChurch(ig.id, ig.nombre)}
                          className="px-2 py-1 text-[11px] border border-rose-200 rounded hover:bg-rose-50 text-rose-600 font-semibold"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: CAMPOS ── */}
      {activeTab === 'campos' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
          <div className="h-[42px] px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-xs">Definición de Columnas ({campos.length})</h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar columna o slug..."
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  className="w-56 pl-7 pr-2 py-1 bg-white border border-slate-300 rounded text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
            <button
              onClick={openFieldModalForNew}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3 h-3" /> Crear Columna
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-300 z-10 select-none">
                <tr className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  {[
                    ['nombre', 'Nombre'],
                    ['slug', 'Slug'],
                    ['es_temporal', 'Vigencia'],
                    ['seccion', 'Sección'],
                    ['tipo', 'Tipo'],
                    ['modo_calculo', 'Cálculo / Fórmula'],
                    ['es_acumulable', 'Acumulable'],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => toggleFieldSort(key)}
                      className="px-2.5 py-2 border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{label}</span>
                        {fieldSort.colKey === key ? (
                          fieldSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-indigo-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-indigo-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-2.5 py-2 border-r border-slate-200">Visibilidad</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedCampos.map((field) => {
                  const isTesoreroOnly = field.visible_para_tesorero && !field.visible_para_iglesia;
                  const isIglesiaOnly = !field.visible_para_tesorero && field.visible_para_iglesia;
                  return (
                    <tr key={field.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">{field.nombre}</td>
                      <td className="px-2.5 py-2 font-mono text-[11px] text-slate-500 border-r border-slate-200">{field.slug}</td>
                      <td className="px-2.5 py-2 border-r border-slate-200">
                        {field.es_temporal ? (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold">
                            ⏱ {field.periodo?.nombre || 'Temporal'}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-medium">
                            Permanente
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 border-r border-slate-200">
                        {field.seccion_iglesia && field.seccion_tesorero && field.seccion_iglesia !== field.seccion_tesorero ? (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold">
                            {field.seccion_iglesia} → {field.seccion_tesorero}
                          </span>
                        ) : (
                          <BadgeStatus variant={field.seccion?.toLowerCase()} label={field.seccion} />
                        )}
                      </td>
                      <td className="px-2.5 py-2 capitalize text-slate-600 border-r border-slate-200">{field.tipo}</td>
                      <td className="px-2.5 py-2 border-r border-slate-200">
                        {field.modo_calculo === 'calculado' ? (
                          <span className="font-mono text-[11px] text-blue-700 font-bold truncate max-w-[200px] inline-block" title={field.formula}>
                            {field.formula}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold border border-slate-200">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 text-center border-r border-slate-200">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            field.es_acumulable
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {field.es_acumulable ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 border-r border-slate-200">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200">
                          {isTesoreroOnly ? 'Solo Tesorero' : isIglesiaOnly ? 'Solo Iglesia' : 'Ambos'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <button
                          onClick={() => openFieldModalForEdit(field)}
                          className="px-2 py-1 text-[11px] border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-semibold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteField(field.id)}
                          className="px-2 py-1 text-[11px] border border-rose-200 rounded hover:bg-rose-50 text-rose-600 font-semibold"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Column drawer */}
          <ColumnConfigDrawer
            isOpen={showColumnDrawer}
            onClose={() => setShowColumnDrawer(false)}
            fieldModalData={fieldModalData}
            setFieldModalData={setFieldModalData}
            campos={campos}
            periodos={periodos}
            selectedPeriodoId={selectedPeriodoId}
            savingField={savingField}
            onSave={saveField}
            onDelete={
              fieldModalData.id
                ? () => {
                    deleteField(fieldModalData.id);
                    setShowColumnDrawer(false);
                  }
                : undefined
            }
            formulaAssistantTab={formulaAssistantTab}
            setFormulaAssistantTab={setFormulaAssistantTab}
            percentRate={percentRate}
            setPercentRate={setPercentRate}
            percentSelectedCols={percentSelectedCols}
            setPercentSelectedCols={setPercentSelectedCols}
            sumSelectedCols={sumSelectedCols}
            setSumSelectedCols={setSumSelectedCols}
            diffBaseCol={diffBaseCol}
            setDiffBaseCol={setDiffBaseCol}
            diffMinusCol={diffMinusCol}
            setDiffMinusCol={setDiffMinusCol}
            buildPercentFormula={buildPercentFormula}
            buildSumFormula={buildSumFormula}
            buildDiffFormula={buildDiffFormula}
            getFormulaExplanation={getFormulaExplanation}
          />
        </div>
      )}

      {/* ── TAB 4: PERMISOS ── */}
      {activeTab === 'permisos' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
          <div className="h-[42px] px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 text-xs">Seleccione Iglesia:</span>
              <select
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                value={selectedPermissionChurch}
                onChange={(e) => setSelectedPermissionChurch(e.target.value)}
              >
                <option value="">-- Seleccione una Iglesia --</option>
                {iglesias.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-slate-500">
              Autorice qué campos manuales pueden editar los representantes.
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {!selectedPermissionChurch ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Seleccione una iglesia en el selector superior para gestionar sus permisos.
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-300 z-10">
                  <tr className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="px-3 py-2 border-r border-slate-200">Columna</th>
                    <th className="px-2.5 py-2 border-r border-slate-200">Modo</th>
                    <th className="px-3 py-2 text-center">Permiso Escritura (Rol Iglesia)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {churchPermissions.map((p) => {
                    const campoNombre = p.nombre || p.campo?.nombre || p.slug || 'Columna';
                    const modoCalculo = p.modo_calculo || p.campo?.modo_calculo || 'manual';
                    const isManual = modoCalculo === 'manual';
                    return (
                      <tr key={p.campo_id} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">
                          {campoNombre}
                          <span className="block text-[10px] font-mono text-slate-500 font-normal">
                            {p.slug || p.campo?.slug}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-200">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {modoCalculo}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isManual ? (
                            <button
                              onClick={() => togglePermission(p.campo_id, p.editable_por_iglesia)}
                              className={`px-3 py-1 rounded text-xs font-bold transition ${
                                p.editable_por_iglesia
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
                              }`}
                            >
                              {p.editable_por_iglesia ? '✓ Autorizado' : 'Bloqueado'}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Calculado — no editable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: USUARIOS ── */}
      {activeTab === 'usuarios' && isTesorero && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
          <div className="h-[42px] px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-xs">Cuentas Autorizadas ({usuarios.length})</h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar usuario o correo..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-56 pl-7 pr-2 py-1 bg-white border border-slate-300 rounded text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setUserModalData({
                  id: '',
                  nombre_completo: '',
                  correo: '',
                  contrasena: '',
                  rol: 'iglesia',
                  iglesia_id: '',
                  activo: true,
                });
                setShowUserModal(true);
              }}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-xs"
            >
              <UserPlus className="w-3 h-3" /> Registrar Usuario
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-300 z-10 select-none">
                <tr className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  {[
                    ['nombre_completo', 'Nombre'],
                    ['correo', 'Correo'],
                    ['rol', 'Rol'],
                    ['iglesia', 'Iglesia'],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => toggleUserSort(key)}
                      className="px-3 py-2 border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{label}</span>
                        {userSort.colKey === key ? (
                          userSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-indigo-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-indigo-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedUsuarios.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">{usr.nombre_completo}</td>
                    <td className="px-2.5 py-2 text-slate-600 font-mono text-[11px] border-r border-slate-200">{usr.correo}</td>
                    <td className="px-2.5 py-2 border-r border-slate-200">
                      <BadgeStatus variant={usr.rol} label={usr.rol} />
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200">
                      {usr.iglesia ? (
                        <span className="font-bold text-slate-800">{usr.iglesia.nombre}</span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Acceso Global</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <button
                        onClick={() => {
                          setUserModalData({
                            id: usr.id,
                            nombre_completo: usr.nombre_completo,
                            correo: usr.correo,
                            contrasena: '',
                            rol: usr.rol,
                            iglesia_id: usr.iglesia_id || '',
                            activo: usr.activo,
                          });
                          setShowUserModal(true);
                        }}
                        className="px-2 py-1 text-[11px] border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-semibold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteUser(usr.id, usr.nombre_completo)}
                        className="px-2 py-1 text-[11px] border border-rose-200 rounded hover:bg-rose-50 text-rose-600 font-semibold"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: HISTORIAL ── */}
      {activeTab === 'historial' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
          <div className="h-[42px] px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-xs">Bitácora de Auditoría ({auditorias.length} eventos)</h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrar por usuario o entidad..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-56 pl-7 pr-2 py-1 bg-white border border-slate-300 rounded text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
            <span className="text-[11px] text-slate-500">Registro inalterable con transacciones de base de datos</span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-300 z-10 select-none">
                <tr className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  {[
                    ['realizado_en', 'Fecha y Hora'],
                    ['usuario', 'Usuario'],
                    ['accion', 'Acción'],
                    ['entidad', 'Entidad'],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => toggleAuditSort(key)}
                      className="px-3 py-2 border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{label}</span>
                        {auditSort.colKey === key ? (
                          auditSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-indigo-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-indigo-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedAuditorias.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500 border-r border-slate-200">
                      {new Date(log.realizado_en).toLocaleString('es-CO')}
                    </td>
                    <td className="px-2.5 py-2 font-bold text-slate-900 border-r border-slate-200">
                      {log.usuario?.nombre_completo || 'Sistema'}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[11px] capitalize text-slate-600 border-r border-slate-200">
                      {log.entidad}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {log.accion === 'actualizacion' && log.valor_anterior && log.valor_nuevo ? (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {formatCOP(log.valor_anterior.valor_manual || log.valor_anterior.valor_calculado)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                            {formatCOP(log.valor_nuevo.valor_manual || log.valor_nuevo.valor_calculado)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Operación exitosa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      </main>

      {/* ── TOAST NOTIFICATIONS ── */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-3.5 py-2 rounded-lg border shadow-xl text-xs font-bold flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-slate-900 text-white border-slate-700' : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
          {toast.msg}
        </div>
      )}

      {/* ── MODAL: TABLAS (ZONAS) ── */}
      {showTableModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-3 z-50">
          <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900">{tableModalData.id ? 'Modificar Tabla' : 'Nueva Tabla'}</h3>
              <button onClick={() => setShowTableModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveTable} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600 text-xs font-semibold"
                  placeholder="ej. Circuito Central 2026"
                  value={tableModalData.nombre}
                  onChange={(e) => setTableModalData({ ...tableModalData, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">Iglesias Asociadas</label>
                <div className="max-h-36 overflow-y-auto border border-slate-300 rounded-lg p-2 space-y-1 bg-slate-50">
                  {iglesias.map((ig) => (
                    <label key={ig.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-100 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={tableModalData.iglesia_ids.includes(ig.id)}
                        onChange={(e) => {
                          const list = e.target.checked
                            ? [...tableModalData.iglesia_ids, ig.id]
                            : tableModalData.iglesia_ids.filter((id) => id !== ig.id);
                          setTableModalData({ ...tableModalData, iglesia_ids: list });
                        }}
                        className="accent-indigo-600"
                      />
                      <span className="text-slate-800 font-semibold">{ig.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">Columnas y Orden</label>
                <div className="max-h-36 overflow-y-auto border border-slate-300 rounded-lg p-2 space-y-1 bg-slate-50">
                  {campos.map((f) => {
                    const isChecked = tableModalData.campo_ids.includes(f.id);
                    const position = tableModalData.campo_ids.indexOf(f.id);
                    return (
                      <label key={f.id} className="flex items-center justify-between cursor-pointer py-0.5 hover:bg-slate-100 px-1 rounded">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const list = e.target.checked
                                ? [...tableModalData.campo_ids, f.id]
                                : tableModalData.campo_ids.filter((id) => id !== f.id);
                              setTableModalData({ ...tableModalData, campo_ids: list });
                            }}
                            className="accent-indigo-600"
                          />
                          <span className="text-slate-800 font-semibold">
                            {f.nombre} ({f.seccion})
                          </span>
                        </div>
                        {isChecked && (
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold border border-indigo-200">
                            Col #{position + 1}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                {tableModalData.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (tableModalData.id) {
                        deleteTable(tableModalData.id);
                        setShowTableModal(false);
                      }
                    }}
                    className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded font-semibold text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Tabla
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTableModal(false)}
                    className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingTable}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs text-xs"
                  >
                    {savingTable ? 'Guardando...' : 'Guardar Tabla'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: IGLESIA ── */}
      {showChurchModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-3 z-50">
          <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900">{churchModalData.id ? 'Editar Iglesia' : 'Registrar Nueva Iglesia'}</h3>
              <button onClick={() => setShowChurchModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveChurch} className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Nombre de la Iglesia', key: 'nombre', span: 2, type: 'text', required: true, placeholder: 'ej. Iglesia Central' },
                { label: 'Código Oficial', key: 'codigo', span: 1, type: 'text', placeholder: 'ej. COD-001' },
                { label: 'Pastor Encargado', key: 'nombre_pastor', span: 1, type: 'text', placeholder: 'ej. Pastor Juan Pérez' },
                { label: 'Teléfono', key: 'telefono', span: 1, type: 'text', placeholder: 'ej. 3001234567' },
                { label: 'Correo Electrónico', key: 'correo', span: 1, type: 'email', placeholder: 'iglesia@circuito.com' },
                { label: 'Dirección', key: 'direccion', span: 2, type: 'text', placeholder: 'Calle 12 # 34-56' },
              ].map((f) => (
                <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                  <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600 text-xs font-semibold"
                    placeholder={f.placeholder}
                    value={(churchModalData as any)[f.key] || ''}
                    onChange={(e) => setChurchModalData({ ...churchModalData, [f.key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowChurchModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingChurch}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs text-xs"
                >
                  {savingChurch ? 'Guardando...' : 'Guardar Iglesia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: USUARIO ── */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-3 z-50">
          <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900">{userModalData.id ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-indigo-950 text-[11px] flex items-start gap-1.5 font-medium">
              <span className="text-indigo-600 font-bold">✓</span>
              <span>
                <strong>Acceso directo:</strong> Esta cuenta no requiere verificación de correo. El representante podrá iniciar sesión inmediatamente.
              </span>
            </div>
            <form onSubmit={saveUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">Rol</label>
                  <select
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600 text-xs font-semibold"
                    value={userModalData.rol}
                    onChange={(e) => setUserModalData({ ...userModalData, rol: e.target.value as any })}
                  >
                    <option value="iglesia">Representante Iglesia</option>
                    <option value="tesorero">Tesorero General</option>
                  </select>
                </div>
                {userModalData.rol === 'iglesia' && (
                  <div>
                    <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">Iglesia Asignada</label>
                    <select
                      required={userModalData.rol === 'iglesia'}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600 text-xs font-semibold"
                      value={userModalData.iglesia_id}
                      onChange={(e) => {
                        const igId = e.target.value;
                        const ig = iglesias.find((i) => i.id === igId);
                        setUserModalData({
                          ...userModalData,
                          iglesia_id: igId,
                          nombre_completo:
                            userModalData.nombre_completo ||
                            (ig?.nombre_pastor ? ig.nombre_pastor : ig ? `Encargado ${ig.nombre}` : ''),
                          correo: userModalData.correo || ig?.correo || '',
                        });
                      }}
                    >
                      <option value="">-- Seleccionar Iglesia --</option>
                      {iglesias.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nombre} {i.codigo ? `(${i.codigo})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600 text-xs font-semibold"
                  placeholder="ej. Pastor Juan Pérez"
                  value={userModalData.nombre_completo}
                  onChange={(e) => setUserModalData({ ...userModalData, nombre_completo: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 text-[10px] uppercase mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600 text-xs font-mono font-semibold"
                  placeholder="iglesia@tesorapp.com"
                  value={userModalData.correo}
                  onChange={(e) => setUserModalData({ ...userModalData, correo: e.target.value })}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-600 text-[10px] uppercase">
                    Contraseña {userModalData.id && '(dejar en blanco para no cambiar)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPass = 'Tesorero' + Math.floor(1000 + Math.random() * 9000) + '!';
                      setUserModalData({ ...userModalData, contrasena: randomPass });
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-bold"
                  >
                    Generar Clave Aleatoria
                  </button>
                </div>
                <input
                  type="password"
                  required={!userModalData.id}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600 text-xs font-mono font-semibold"
                  placeholder="••••••••"
                  value={userModalData.contrasena}
                  onChange={(e) => setUserModalData({ ...userModalData, contrasena: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs text-xs"
                >
                  {savingUser ? 'Guardando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: INFORME EN PAPEL ── */}
      {showPaperModal && paperChurch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-3 z-50">
          <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Digitar Informe en Papel</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    {paperChurch.iglesia_nombre} ({selectedPeriodObj?.nombre})
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPaperModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={savePaperBatch} className="space-y-3 text-xs">
              <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Ingresa los montos reportados en físico por la iglesia. Los porcentajes y totales se calcularán automáticamente.
              </p>
              <div className="space-y-2">
                {paperChurchFields
                  .filter((f) => f.modo_calculo === 'manual')
                  .map((f) => (
                    <div
                      key={f.campo_id}
                      className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div>
                        <label className="font-bold text-slate-800 text-xs block">{f.nombre}</label>
                        <span className="text-[10px] text-slate-500 font-mono capitalize">{f.seccion}</span>
                      </div>
                      <div className="relative w-44">
                        <span className="absolute left-2.5 top-1.5 font-bold text-slate-400 text-xs">$</span>
                        <input
                          type="number"
                          step="any"
                          className="w-full pl-6 pr-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-right text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                          placeholder="0"
                          value={paperValues[f.campo_id] || ''}
                          onChange={(e) =>
                            setPaperValues((prev) => ({ ...prev, [f.campo_id]: parseFloat(e.target.value) || 0 }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault();
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaperModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPaper}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs text-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {savingPaper ? 'Guardando y Recalculando...' : 'Guardar Informe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Confirmation and Period Modals */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      <PeriodCreateModal
        isOpen={showPeriodCreateModal}
        onClose={() => setShowPeriodCreateModal(false)}
        onSubmit={submitCreatePeriod}
      />

      {/* ── MODAL WOW 1: ASISTENTE IA COPILOT ── */}
      <AICopilotDrawer
        isOpen={showAICopilot}
        onClose={() => setShowAICopilot(false)}
        gridData={gridData}
        currentPeriod={periodos.find((p) => p.id === selectedPeriodoId)}
        iglesias={iglesias}
      />

      {/* ── MODAL WOW 2: INFORME EJECUTIVO PDF DE JUNTA ── */}
      <ExecutivePDFModal
        isOpen={showExecutivePDF}
        onClose={() => setShowExecutivePDF(false)}
        gridData={gridData}
        currentPeriod={periodos.find((p) => p.id === selectedPeriodoId)}
        user={user}
      />

      {/* ── MODAL WOW 3: BÓVEDA DE COMPROBANTES BANCARIOS ── */}
      <ReceiptViewerModal
        isOpen={receiptVaultState.open}
        onClose={() => setReceiptVaultState({ open: false, churchId: '', churchName: '' })}
        churchName={receiptVaultState.churchName}
        churchId={receiptVaultState.churchId}
        periodName={periodos.find((p) => p.id === selectedPeriodoId)?.nombre || 'Periodo Actual'}
        periodId={selectedPeriodoId}
        receipts={receiptsList}
        onAddReceipt={handleAddReceipt}
        onDeleteReceipt={handleDeleteReceipt}
        onToggleVerify={handleToggleVerifyReceipt}
      />

      {/* ── MODAL WOW 4: SIMULADOR DE PRESUPUESTO & FORECASTING ── */}
      <BudgetSimulator
        isOpen={showSimulator}
        onClose={() => setShowSimulator(false)}
        currentTotal={50000000}
        periodName={periodos.find((p) => p.id === selectedPeriodoId)?.nombre || 'Actual'}
      />

      {/* ── MODAL WOW 5: MODO PRESENTACIÓN SALA DE JUNTAS ── */}
      <BoardroomPresentationModal
        isOpen={showPresentation}
        onClose={() => setShowPresentation(false)}
        gridData={gridData}
        currentPeriod={periodos.find((p) => p.id === selectedPeriodoId)}
        user={user}
      />

      {/* ── MODAL WOW 6: CENTRO DE NOTIFICACIONES & WHATSAPP ── */}
      <NotificationCenter
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        iglesias={iglesias}
        currentPeriod={periodos.find((p) => p.id === selectedPeriodoId)}
        user={user}
      />
    </div>
  );
}
