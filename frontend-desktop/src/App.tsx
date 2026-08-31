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
  Users,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Smartphone,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  HelpCircle,
  Church,
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
import { ChurchViewOrganizer } from './components/tesorero/ChurchViewOrganizer';
import { ChurchReportForm } from './components/iglesia/ChurchReportForm';
import { QuickSearchModal } from './components/tesorero/QuickSearchModal';
import { AuditDrawer } from './components/tesorero/AuditDrawer';
import { FormulaModal } from './components/tesorero/FormulaModal';
import { WorkflowModal } from './components/tesorero/WorkflowModal';
import { PasteColumnModal } from './components/tesorero/PasteColumnModal';
import { ExportExcelModal } from './components/tesorero/ExportExcelModal';
import { BadgeStatus } from './components/common/BadgeStatus';
import { HelpModal } from './components/common/HelpModal';
import { useGridKeyboardNav } from './hooks/useGridKeyboardNav';
import type { SortState, EditingCell, GridData, ColumnaGrid, FilaGrid, EstadoInforme } from './types/contabilidad';

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
import { ReceiptViewerModal, ReceiptItem } from './components/attachments/ReceiptViewerModal';
import { NotificationCenter } from './components/notifications/NotificationCenter';

// Gastos Feature
import { GastosPanel } from './components/tesorero/GastosPanel';
import { GastoModal } from './components/tesorero/GastoModal';
import { GastoVoucherModal, GastoVoucherData } from './components/tesorero/GastoVoucherModal';

// Reports Feature
import { ReportsPanel } from './components/reports/ReportsPanel';


const API_BASE = window.location.origin;
axios.defaults.timeout = 60000;

export default function App() {
  const { isMobile, setOverride } = useDeviceDetection();

  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sheet' | 'iglesias' | 'campos' | 'usuarios' | 'historial' | 'gastos' | 'reportes'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Role View Switching State (for users who are both Tesorero and Pastor)
  const [viewRoleMode, setViewRoleMode] = useState<'tesorero' | 'iglesia'>(() => {
    return (localStorage.getItem('tesorapp_view_role_mode') as 'tesorero' | 'iglesia') || 'tesorero';
  });

  const handleSetViewRoleMode = (mode: 'tesorero' | 'iglesia') => {
    setViewRoleMode(mode);
    localStorage.setItem('tesorapp_view_role_mode', mode);
  };

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

  // Assistant, Help & Vault State
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAICopilot, setShowAICopilot] = useState(false);
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

  // Gastos state
  const [gastos, setGastos] = useState<any[]>([]);
  const [gastosResumen, setGastosResumen] = useState<any[]>([]);
  const [gastosLoading, setGastosLoading] = useState(false);
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [gastoModalData, setGastoModalData] = useState({
    id: '',
    descripcion: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    campo_fondo_id: '',
    periodo_id: '',
  });
  const [savingGasto, setSavingGasto] = useState(false);
  const [voucherGasto, setVoucherGasto] = useState<GastoVoucherData | null>(null);

  // Selected states (with localStorage persistence for active table, period, and cell)
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>(
    localStorage.getItem('tesorapp_active_periodo_id') || ''
  );
  const [selectedTablaId, setSelectedTablaId] = useState<string>(
    localStorage.getItem('tesorapp_active_tabla_id') || ''
  );

  // Grid state
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [activeCell, setActiveCell] = useState<EditingCell | null>(() => {
    try {
      const saved = localStorage.getItem('tesorapp_last_active_cell');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [gridSearch, setGridSearch] = useState<string>('');
  const [showAllColumns, setShowAllColumns] = useState<boolean>(false);
  const [onlyOverriddenFilter, setOnlyOverriddenFilter] = useState<boolean>(false);
  const [showAnalyticsDrawer, setShowAnalyticsDrawer] = useState<boolean>(false);
  const [showColumnDrawer, setShowColumnDrawer] = useState<boolean>(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);
  const [showQuickSearch, setShowQuickSearch] = useState<boolean>(false);
  const [formulaModalColumn, setFormulaModalColumn] = useState<ColumnaGrid | null>(null);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteModalColId, setPasteModalColId] = useState<string>('');
  const [pasteModalStartChurchId, setPasteModalStartChurchId] = useState<string>('');
  const [undoStack, setUndoStack] = useState<
    Array<{
      id: string;
      description: string;
      columnName: string;
      fieldId: string;
      previousValues: Array<{ iglesia_id: string; campo_id: string; valor_manual: number | null }>;
      timestamp: number;
    }>
  >([]);
  const [camposSubView, setCamposSubView] = useState<'catalog' | 'church_organizer'>('catalog');

  // Admin search filters & Audit pagination
  const [churchSearch, setChurchSearch] = useState<string>('');
  const [fieldSearch, setFieldSearch] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(25);
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('all');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

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
    es_fondo: false,
    es_transito: false,
    ente_superior_nombre: '',
    seccion: 'Ingresos',
    seccion_iglesia: 'Ingresos',
    seccion_tesorero: 'Ingresos',
    orden: 0,
    aplica_a_todas_las_iglesias: true,
    visible_para_iglesia: true,
    visible_para_tesorero: true,
    es_temporal: false,
    periodo_id: '' as string | null,
    periodo_ids: [] as string[],
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
  const [showExportExcelModal, setShowExportExcelModal] = useState(false);
  const [workflowRow, setWorkflowRow] = useState<FilaGrid | null>(null);

  // Sort states
  const [gridSort, setGridSort] = useState<SortState | null>(null);
  const [churchSort, setChurchSort] = useState<SortState>({ colKey: 'nombre', direction: 'asc' });
  const [fieldSort, setFieldSort] = useState<SortState>({ colKey: 'orden', direction: 'asc' });
  const [userSort, setUserSort] = useState<SortState>({ colKey: 'nombre_completo', direction: 'asc' });
  const [auditSort, setAuditSort] = useState<SortState>({ colKey: 'realizado_en', direction: 'desc' });

  // ─── Theme State (Light by default, Dark toggle) ───────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('tesorapp_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('tesorapp_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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

  // ─── Global Keyboard Shortcuts (Ctrl+K: Search, Ctrl+B: Toggle Sidebar, Ctrl+H / F1: Help, Ctrl+Z: Undo) ────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickSearch(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (((e.ctrlKey || e.metaKey) && e.key === 'h') || e.key === 'F1') {
        e.preventDefault();
        setShowHelpModal(true);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, selectedPeriodoId]);

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

  // ─── Table and Period selection persistence ────────────────────────────
  const handleTableChange = (tableId: string) => {
    setSelectedTablaId(tableId);
    localStorage.setItem('tesorapp_active_tabla_id', tableId);
  };

  const handlePeriodoChange = (periodoId: string) => {
    setSelectedPeriodoId(periodoId);
    localStorage.setItem('tesorapp_active_periodo_id', periodoId);
  };

  const handleSetActiveCell = (cell: EditingCell | null) => {
    setActiveCell(cell);
    if (cell) {
      localStorage.setItem('tesorapp_last_active_cell', JSON.stringify(cell));
    }
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
      const normalizedUser = {
        ...res.data,
        id: res.data.userId || res.data.id,
        nombre_completo: res.data.nombre || res.data.nombre_completo,
        iglesia_id: res.data.iglesiaId || res.data.iglesia_id,
        iglesiaId: res.data.iglesiaId || res.data.iglesia_id,
      };
      setUser(normalizedUser);
      if (normalizedUser.rol !== 'tesorero') setActiveTab('sheet');
      loadGlobalData(normalizedUser.rol);
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
      const normalizedUser = {
        ...res.data.user,
        id: res.data.user.id || res.data.user.userId,
        nombre_completo: res.data.user.nombre_completo || res.data.user.nombre,
        iglesia_id: res.data.user.iglesia_id || res.data.user.iglesiaId,
        iglesiaId: res.data.user.iglesia_id || res.data.user.iglesiaId,
      };
      setUser(normalizedUser);
      if (normalizedUser.rol !== 'tesorero') setActiveTab('sheet');
      triggerToast('Sesión iniciada');
      loadGlobalData(normalizedUser.rol);
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
      
      if (perRes.data?.length > 0) {
        const savedPeriodoId = localStorage.getItem('tesorapp_active_periodo_id');
        const validSavedPeriod = perRes.data.find((p: any) => p.id === savedPeriodoId);
        if (validSavedPeriod) {
          setSelectedPeriodoId(validSavedPeriod.id);
        } else if (!selectedPeriodoId) {
          const openPeriod = perRes.data.find((p: any) => p.estado === 'abierto');
          const defaultPerId = openPeriod ? openPeriod.id : perRes.data[0].id;
          setSelectedPeriodoId(defaultPerId);
          localStorage.setItem('tesorapp_active_periodo_id', defaultPerId);
        }
      }

      if (role !== 'iglesia' && tabRes.data?.length > 0) {
        const savedTableId = localStorage.getItem('tesorapp_active_tabla_id');
        const validSaved = tabRes.data.find((t: any) => t.id === savedTableId);
        if (validSaved) {
          setSelectedTablaId(validSaved.id);
        } else if (!selectedTablaId) {
          setSelectedTablaId(tabRes.data[0].id);
          localStorage.setItem('tesorapp_active_tabla_id', tabRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando metadatos', err);
    }
  };

  const fetchGridValues = async () => {
    if (!selectedPeriodoId) return;
    try {
      if (user?.rol === 'iglesia' && user?.iglesia_id) {
        const res = await axios.get(
          `${API_BASE}/valores?iglesia_id=${user.iglesia_id}&periodo_id=${selectedPeriodoId}`
        );
        const churchValues = res.data || [];
        const churchObj = iglesias.find((i) => i.id === user.iglesia_id);

        const cols: ColumnaGrid[] = churchValues.map((v: any) => ({
          id: v.campo_id,
          nombre: v.nombre,
          slug: v.slug,
          tipo: v.tipo,
          modo_calculo: v.modo_calculo,
          formula: v.formula,
          seccion: v.seccion,
          seccion_iglesia: v.seccion_iglesia,
          seccion_tesorero: v.seccion_tesorero,
          orden: v.orden,
          tipo_redondeo: v.tipo_redondeo,
          multiplo_redondeo: v.multiplo_redondeo,
          visible_para_iglesia: v.visible_para_iglesia,
          visible_para_tesorero: v.visible_para_tesorero,
          es_acumulable: v.es_acumulable ?? false,
          es_fondo: v.es_fondo ?? false,
        }));

        const churchRow: FilaGrid = {
          iglesia_id: user.iglesia_id,
          iglesia_nombre: churchObj?.nombre || user.nombre || 'Mi Congregación',
          codigo: churchObj?.codigo || '',
          valores: churchValues,
          estado_informe: (churchObj as any)?.estado_informe || 'borrador',
        };

        setGridData({
          tabla_id: churchObj?.tabla_id || 'iglesia',
          tabla_nombre: churchObj?.nombre || 'Informe Mensual',
          periodo_id: selectedPeriodoId,
          periodo_nombre: selectedPeriodObj?.nombre || 'Período Actual',
          columnas: cols,
          filas: [churchRow],
        });
        return;
      }

      const isConsolidated = selectedTablaId === 'all' || !selectedTablaId;
      if (isConsolidated) {
        try {
          const res = await axios.get(
            `${API_BASE}/valores?tabla_id=all&periodo_id=${selectedPeriodoId}&mostrar_todos=true`
          );
          setGridData(res.data);
          return;
        } catch {
          // Fallback if backend expects specific table UUID
          if (tablas.length > 0) {
            const list = tablas;
            const tableResults = await Promise.all(
              list.map((t) =>
                axios
                  .get(`${API_BASE}/valores?tabla_id=${t.id}&periodo_id=${selectedPeriodoId}`)
                  .then((r) => r.data)
                  .catch(() => null)
              )
            );
            const valid = tableResults.filter(Boolean);
            if (valid.length > 0) {
              const columnMap = new Map<string, any>();
              for (const tableData of valid) {
                for (const col of tableData.columnas || []) {
                  if (!columnMap.has(col.id)) columnMap.set(col.id, col);
                }
              }

              const churchMap = new Map<string, any>();
              for (const tableData of valid) {
                for (const row of tableData.filas || []) {
                  const incomingVals = Array.isArray(row.valores) ? row.valores : [];
                  if (!churchMap.has(row.iglesia_id)) {
                    churchMap.set(row.iglesia_id, {
                      ...row,
                      valores: [...incomingVals],
                    });
                  } else {
                    const existing = churchMap.get(row.iglesia_id);
                    const existingVals = Array.isArray(existing.valores) ? existing.valores : [];
                    const valMap = new Map<string, any>();
                    for (const v of existingVals) {
                      if (v && v.campo_id) valMap.set(v.campo_id, v);
                    }
                    for (const v of incomingVals) {
                      if (v && v.campo_id) valMap.set(v.campo_id, v);
                    }
                    existing.valores = Array.from(valMap.values());
                  }
                }
              }

              setGridData({
                tabla_id: 'all',
                tabla_nombre: 'Consolidado General (Todas las Tablas)',
                periodo_id: selectedPeriodoId,
                periodo_nombre: selectedPeriodObj?.nombre || 'Periodo Actual',
                columnas: Array.from(columnMap.values()),
                filas: Array.from(churchMap.values()),
              });
              return;
            }
          }
        }
      } else {
        const res = await axios.get(
          `${API_BASE}/valores?tabla_id=${selectedTablaId}&periodo_id=${selectedPeriodoId}${
            showAllColumns ? '&mostrar_todos=true' : ''
          }`
        );
        setGridData(res.data);
      }
    } catch (err) {
      console.error(err);
      triggerToast('No se pudieron cargar los valores', 'error');
    }
  };

  useEffect(() => {
    const isIglesia = user?.rol === 'iglesia';
    const canFetch = user && selectedPeriodoId && (isIglesia || selectedTablaId);
    if (canFetch) fetchGridValues();
  }, [selectedTablaId, selectedPeriodoId, showAllColumns, user]);


  // ─── Gastos ───────────────────────────────────────────────────────────
  const fetchGastos = async () => {
    if (!selectedPeriodoId) return;
    setGastosLoading(true);
    try {
      const [gastosRes, resumenRes] = await Promise.all([
        axios.get(`${API_BASE}/gastos?periodo_id=${selectedPeriodoId}`),
        axios.get(`${API_BASE}/gastos/resumen?periodo_id=${selectedPeriodoId}`),
      ]);
      setGastos(gastosRes.data || []);
      setGastosResumen(resumenRes.data || []);
    } catch (err) {
      console.error('Error cargando gastos', err);
    } finally {
      setGastosLoading(false);
    }
  };

  useEffect(() => {
    if (user && selectedPeriodoId) fetchGastos();
  }, [selectedPeriodoId, user]);

  const openNewGasto = () => {
    setGastoModalData({
      id: '',
      descripcion: '',
      monto: '',
      fecha: new Date().toISOString().split('T')[0],
      campo_fondo_id: '',
      periodo_id: selectedPeriodoId,
    });
    setShowGastoModal(true);
  };

  const openEditGasto = (gasto: any) => {
    setGastoModalData({
      id: gasto.id,
      descripcion: gasto.descripcion,
      monto: String(gasto.monto),
      fecha: new Date(gasto.fecha).toISOString().split('T')[0],
      campo_fondo_id: gasto.campo_fondo?.id || '',
      periodo_id: gasto.periodo?.id || selectedPeriodoId,
    });
    setShowGastoModal(true);
  };

  const saveGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingGasto) return;
    setSavingGasto(true);
    try {
      const payload = {
        descripcion: gastoModalData.descripcion,
        monto: Number(gastoModalData.monto),
        fecha: gastoModalData.fecha,
        campo_fondo_id: gastoModalData.campo_fondo_id,
        periodo_id: gastoModalData.periodo_id || selectedPeriodoId,
      };
      let savedGastoId = gastoModalData.id;
      if (gastoModalData.id) {
        await axios.put(`${API_BASE}/gastos/${gastoModalData.id}`, payload);
        triggerToast('Gasto actualizado exitosamente');
      } else {
        const res = await axios.post(`${API_BASE}/gastos`, payload);
        savedGastoId = res.data?.id || `g_${Date.now()}`;
        triggerToast('Gasto registrado exitosamente');
      }
      setShowGastoModal(false);
      fetchGastos();

      // Open voucher modal automatically so the treasurer can share/print immediately
      const fondoObj = campos.find((c: any) => c.id === gastoModalData.campo_fondo_id);
      const periodoObj = periodos.find((p: any) => p.id === (gastoModalData.periodo_id || selectedPeriodoId));
      setVoucherGasto({
        id: savedGastoId,
        descripcion: gastoModalData.descripcion,
        monto: Number(gastoModalData.monto),
        fecha: gastoModalData.fecha,
        campo_fondo_nombre: fondoObj?.nombre || 'Fondo de Tesorería',
        periodo_nombre: periodoObj?.nombre || 'Período Actual',
        creado_por_nombre: user?.nombre_completo || 'Tesorería',
      });
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || 'Error guardando gasto';
      triggerToast(msg, 'error');
    } finally {
      setSavingGasto(false);
    }
  };

  const deleteGasto = (gasto: any) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Gasto',
      message: `¿Está seguro de eliminar el gasto "${gasto.descripcion}" por ${formatCOP(Number(gasto.monto))}?`,
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await axios.delete(`${API_BASE}/gastos/${gasto.id}`);
          triggerToast('Gasto eliminado');
          fetchGastos();
        } catch (err: any) {
          triggerToast(err.response?.data?.message || 'Error al eliminar', 'error');
        }
      },
    });
  };

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
    
    // 1. Instant optimistic update so numbers and totals update in 0ms without flicker
    setGridData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        filas: prev.filas.map((f) => {
          if (f.iglesia_id !== churchId) return f;
          const updatedValores = (f.valores || []).map((v) => {
            if (v.campo_id !== fieldId) return v;
            const isCalc = v.modo_calculo === 'calculado';
            return {
              ...v,
              valor_manual: val,
              valor_calculado: isCalc ? val : v.valor_calculado,
            };
          });
          return { ...f, valores: updatedValores };
        }),
      };
    });

    try {
      await axios.put(`${API_BASE}/valores/${churchId}/${fieldId}/${selectedPeriodoId}`, { valor_manual: val });
      // Silently fetch server calculation in background
      if (user?.rol === 'iglesia' && user?.iglesia_id && selectedPeriodoId) {
        const res = await axios.get(
          `${API_BASE}/valores?iglesia_id=${user.iglesia_id}&periodo_id=${selectedPeriodoId}`
        );
        const churchValues = res.data || [];
        const cols = churchValues.map((v: any) => ({
          id: v.campo_id, nombre: v.nombre, slug: v.slug, tipo: v.tipo,
          modo_calculo: v.modo_calculo, formula: v.formula,
          seccion: v.seccion, seccion_iglesia: v.seccion_iglesia,
          seccion_tesorero: v.seccion_tesorero, orden: v.orden,
          tipo_redondeo: v.tipo_redondeo, multiplo_redondeo: v.multiplo_redondeo,
          visible_para_iglesia: v.visible_para_iglesia,
          visible_para_tesorero: v.visible_para_tesorero,
          es_acumulable: v.es_acumulable ?? false,
          es_fondo: v.es_fondo ?? false,
        }));
        setGridData((prev) => prev ? {
          ...prev,
          columnas: cols,
          filas: [{ ...prev.filas[0], valores: churchValues }],
        } : prev);
      } else if (selectedTablaId && selectedPeriodoId) {
        const res = await axios.get(
          `${API_BASE}/valores?tabla_id=${selectedTablaId}&periodo_id=${selectedPeriodoId}${
            showAllColumns ? '&mostrar_todos=true' : ''
          }`
        );
        setGridData(res.data);
      }
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error al guardar celda', 'error');
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

  const handleOpenPasteModal = (colId?: string, startChurchId?: string, _initialText?: string) => {
    setPasteModalColId(colId || gridData?.columnas?.[0]?.id || '');
    setPasteModalStartChurchId(startChurchId || gridData?.filas?.[0]?.iglesia_id || '');
    setShowPasteModal(true);
  };

  const handleMatrixBatchSave = async (
    updates: { iglesia_id: string; campo_id: string; valor_manual: number }[],
    summary: { columnName: string; count: number; totalAmount: number }
  ) => {
    if (!selectedPeriodoId || updates.length === 0) return;

    // 0. Capture previous state for Undo
    const previousValues = updates.map((u) => {
      const churchRow = gridData?.filas.find((f) => f.iglesia_id === u.iglesia_id);
      const valObj = (churchRow?.valores || []).find((v) => v.campo_id === u.campo_id);
      return {
        iglesia_id: u.iglesia_id,
        campo_id: u.campo_id,
        valor_manual: valObj ? (valObj.valor_manual ?? 0) : 0,
      };
    });

    setUndoStack((prev) => [
      {
        id: `undo_${Date.now()}`,
        description: `Pegado en "${summary.columnName}" (${summary.count} congregaciones)`,
        columnName: summary.columnName,
        fieldId: updates[0]?.campo_id || '',
        previousValues,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 9),
    ]);

    // 1. Instant optimistic update so numbers and totals update in 0ms without flicker
    const updatesMap = new Map<string, number>();
    updates.forEach((u) => {
      updatesMap.set(`${u.iglesia_id}__${u.campo_id}`, u.valor_manual);
    });

    setGridData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        filas: prev.filas.map((f) => {
          const updatedValores = (f.valores || []).map((v) => {
            const key = `${f.iglesia_id}__${v.campo_id}`;
            if (updatesMap.has(key)) {
              const val = updatesMap.get(key)!;
              const isCalc = v.modo_calculo === 'calculado';
              return {
                ...v,
                valor_manual: val,
                valor_calculado: isCalc ? val : v.valor_calculado,
              };
            }
            return v;
          });
          return { ...f, valores: updatedValores };
        }),
      };
    });

    try {
      await axios.put(`${API_BASE}/valores/lote-matriz/${selectedPeriodoId}`, { valores: updates }, { timeout: 60000 });
      fetchGridValues();
      triggerToast(`¡Se pegaron exitosamente ${summary.count} valores en "${summary.columnName}" (${formatCOP(summary.totalAmount)})!`);
    } catch (err: any) {
      console.error('Error aplicando pegado en lote', err);
      triggerToast(err.response?.data?.message || 'Error al aplicar los valores pegados', 'error');
      fetchGridValues();
      throw err;
    }
  };

  const handleUndo = async () => {
    if (undoStack.length === 0 || !selectedPeriodoId) return;
    const [lastAction, ...remainingStack] = undoStack;
    setUndoStack(remainingStack);

    const restoreUpdates = lastAction.previousValues.map((pv) => ({
      iglesia_id: pv.iglesia_id,
      campo_id: pv.campo_id,
      valor_manual: pv.valor_manual ?? 0,
    }));

    // Optimistic UI update
    const updatesMap = new Map<string, number>();
    restoreUpdates.forEach((u) => updatesMap.set(`${u.iglesia_id}__${u.campo_id}`, u.valor_manual));

    setGridData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        filas: prev.filas.map((f) => ({
          ...f,
          valores: (f.valores || []).map((v) => {
            const key = `${f.iglesia_id}__${v.campo_id}`;
            if (updatesMap.has(key)) {
              const val = updatesMap.get(key)!;
              const isCalc = v.modo_calculo === 'calculado';
              return {
                ...v,
                valor_manual: val,
                valor_calculado: isCalc ? val : v.valor_calculado,
              };
            }
            return v;
          }),
        })),
      };
    });

    try {
      await axios.put(
        `${API_BASE}/valores/lote-matriz/${selectedPeriodoId}`,
        { valores: restoreUpdates },
        { timeout: 60000 }
      );
      fetchGridValues();
      triggerToast(`Se revirtieron los cambios de: ${lastAction.description}`, 'success');
    } catch (err: any) {
      console.error('Error al deshacer cambios', err);
      triggerToast('Error al revertir los cambios', 'error');
      fetchGridValues();
    }
  };

  const handleSendMonthlyReport = async (churchId: string, periodoId: string) => {
    try {
      await axios.post(`${API_BASE}/informes/enviar`, {
        iglesia_id: churchId,
        periodo_id: periodoId,
      });
      triggerToast('¡Informe mensual enviado a tesorería con éxito!');
      fetchGridValues();
    } catch (err: any) {
      console.error('Error enviando informe:', err);
      triggerToast(err.response?.data?.message || 'Error al enviar informe.', 'error');
    }
  };

  const handleChangeWorkflowStatus = async (
    iglesiaId: string,
    periodoId: string,
    estado: EstadoInforme,
    observaciones?: string,
  ) => {
    try {
      await axios.put(`${API_BASE}/informes/estado`, {
        iglesia_id: iglesiaId,
        periodo_id: periodoId,
        estado,
        observaciones,
      });
      triggerToast(`Estado del informe actualizado a "${estado}".`);
      fetchGridValues();
    } catch (err: any) {
      console.error('Error actualizando estado del informe:', err);
      triggerToast(err.response?.data?.message || 'Error al actualizar estado del informe.', 'error');
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
      es_fondo: false,
      es_transito: false,
      ente_superior_nombre: '',
      seccion: 'Ingresos',
      seccion_iglesia: 'Ingresos',
      seccion_tesorero: 'Ingresos',
      orden: campos.length,
      aplica_a_todas_las_iglesias: true,
      visible_para_iglesia: true,
      visible_para_tesorero: true,
      es_temporal: false,
      periodo_id: selectedPeriodoId || (periodos[0]?.id || null),
      periodo_ids: selectedPeriodoId ? [selectedPeriodoId] : (periodos[0]?.id ? [periodos[0].id] : []),
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

  const openFieldModalForNewFondo = () => {
    setFieldModalData({
      id: '',
      nombre: '',
      tipo: 'moneda',
      modo_calculo: 'manual',
      formula: '',
      tipo_redondeo: 'ninguno',
      multiplo_redondeo: 1,
      es_acumulable: true,
      es_fondo: true,
      es_transito: false,
      ente_superior_nombre: '',
      seccion: 'Egresos',
      seccion_iglesia: 'Egresos',
      seccion_tesorero: 'Egresos',
      orden: campos.length,
      aplica_a_todas_las_iglesias: true,
      visible_para_iglesia: true,
      visible_para_tesorero: true,
      es_temporal: false,
      periodo_id: selectedPeriodoId || (periodos[0]?.id || null),
      periodo_ids: selectedPeriodoId ? [selectedPeriodoId] : (periodos[0]?.id ? [periodos[0].id] : []),
      iglesias_especificas: [],
    });
    setFormulaAssistantTab('porcentaje');
    setShowColumnDrawer(true);
  };

  const openFieldModalForEdit = (field: any) => {
    const currentPeriodoIds =
      field.campos_por_periodo && field.campos_por_periodo.length > 0
        ? field.campos_por_periodo.map((cp: any) => cp.periodo_id)
        : field.periodo_id
        ? [field.periodo_id]
        : selectedPeriodoId
        ? [selectedPeriodoId]
        : [];

    setFieldModalData({
      id: field.id,
      nombre: field.nombre,
      tipo: field.tipo,
      modo_calculo: field.modo_calculo,
      formula: field.formula || '',
      tipo_redondeo: field.tipo_redondeo || 'ninguno',
      multiplo_redondeo: field.multiplo_redondeo ? Number(field.multiplo_redondeo) : 1,
      es_acumulable: field.es_acumulable,
      es_fondo: field.es_fondo ?? false,
      es_transito: field.es_transito ?? false,
      ente_superior_nombre: field.ente_superior_nombre || '',
      seccion: field.seccion,
      seccion_iglesia: field.seccion_iglesia || field.seccion,
      seccion_tesorero: field.seccion_tesorero || field.seccion,
      orden: field.orden,
      aplica_a_todas_las_iglesias: field.aplica_a_todas_las_iglesias,
      visible_para_iglesia: field.visible_para_iglesia ?? true,
      visible_para_tesorero: field.visible_para_tesorero ?? true,
      es_temporal: field.es_temporal ?? false,
      periodo_id: currentPeriodoIds[0] || field.periodo_id || selectedPeriodoId || (periodos[0]?.id || null),
      periodo_ids: currentPeriodoIds,
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

  const fetchCampos = async () => {
    try {
      const campRes = await axios.get(`${API_BASE}/campos`);
      setCampos(campRes.data || []);
    } catch (err) {
      console.error('Error recargando campos:', err);
    }
  };

  const fetchTablas = async () => {
    try {
      const tabRes = await axios.get(`${API_BASE}/tablas`);
      setTablas(tabRes.data || []);
    } catch (err) {
      console.error('Error recargando tablas:', err);
    }
  };

  const handleSaveBatchCampos = async (
    items: {
      id: string;
      orden: number;
      nombre?: string;
      seccion_iglesia?: string;
      visible_para_iglesia?: boolean;
    }[],
    tablaId?: string,
    campoIdsForTable?: string[]
  ) => {
    if (tablaId && campoIdsForTable) {
      await axios.put(`${API_BASE}/tablas/${tablaId}`, {
        campo_ids: campoIdsForTable,
      });
    }

    await axios.put(`${API_BASE}/campos/reordenar-lote`, { items });

    triggerToast(
      tablaId
        ? 'Configuración y orden de la tabla actualizados con éxito'
        : 'Orden y configuración global actualizados para todas las iglesias'
    );

    await Promise.all([fetchCampos(), fetchTablas()]);

    if (selectedPeriodoId) {
      fetchGridValues();
    }
  };

  const handleReorderGridColumns = async (newColumns: ColumnaGrid[]) => {
    // Optimistically update the UI column order
    setGridData((prev) => (prev ? { ...prev, columnas: newColumns } : prev));

    try {
      const items = newColumns.map((col, index) => ({
        id: col.id,
        orden: index,
      }));

      const isSpecificTable = selectedTablaId && selectedTablaId !== 'all';
      if (isSpecificTable) {
        await axios.put(`${API_BASE}/tablas/${selectedTablaId}`, {
          campo_ids: newColumns.map((c) => c.id),
        });
      }

      await axios.put(`${API_BASE}/campos/reordenar-lote`, { items });
      triggerToast('Orden de columnas guardado con éxito');
    } catch (err: any) {
      console.error('Error guardando orden de columnas:', err);
      triggerToast(err.response?.data?.message || 'Error al guardar el nuevo orden de columnas', 'error');
      fetchGridValues();
    }
  };

  const handleReorderGridRows = async (newRows: FilaGrid[]) => {
    // Optimistically update the UI row order
    setGridData((prev) => (prev ? { ...prev, filas: newRows } : prev));

    try {
      const items = newRows.map((row, index) => ({
        id: row.iglesia_id,
        orden: index,
      }));

      await axios.put(`${API_BASE}/iglesias/reordenar-lote`, { items });
      triggerToast('Orden de congregaciones guardado con éxito');
    } catch (err: any) {
      console.error('Error guardando orden de congregaciones:', err);
      triggerToast(err.response?.data?.message || 'Error al guardar el nuevo orden de congregaciones', 'error');
      fetchGridValues();
    }
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
    setShowExportExcelModal(true);
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
        if (gridSort.colKey === 'total_general') {
          const sumA = (a.valores || []).reduce((acc: number, v: any) => acc + (Number(v.modo_calculo === 'calculado' ? v.valor_calculado : v.valor_manual) || 0), 0);
          const sumB = (b.valores || []).reduce((acc: number, v: any) => acc + (Number(v.modo_calculo === 'calculado' ? v.valor_calculado : v.valor_manual) || 0), 0);
          return gridSort.direction === 'asc' ? sumA - sumB : sumB - sumA;
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

  const totalIngresosPeriodo = useMemo(() => {
    if (!gridData?.filas || !gridData?.columnas) return 0;
    const ingresoColIds = new Set(
      gridData.columnas
        .filter((c: any) => {
          const sec = (c.seccion || c.seccion_iglesia || '').toLowerCase();
          const name = (c.nombre || '').toLowerCase();
          const slug = (c.slug || '').toLowerCase();
          return sec === 'ingresos' || name.includes('diezmo') || name.includes('ofrenda') || slug.includes('diezmo') || slug.includes('ofrenda');
        })
        .map((c: any) => c.id)
    );

    let total = 0;
    gridData.filas.forEach((row: any) => {
      const vals = Array.isArray(row.valores) ? row.valores : [];
      vals.forEach((v: any) => {
        if (ingresoColIds.has(v.campo_id)) {
          const isCalc = v.modo_calculo === 'calculado';
          const isOverridden = isCalc && v.valor_manual !== null && v.valor_manual !== undefined;
          const num = Number(isCalc ? (isOverridden ? v.valor_manual : (v.valor_calculado || 0)) : (v.valor_manual ?? 0));
          if (!isNaN(num)) total += num;
        }
      });
    });
    return total;
  }, [gridData]);

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

  const filteredAndSortedAuditorias = useMemo(() => {
    const term = auditSearch.toLowerCase().trim();
    const list = auditorias.filter((log) => {
      // Entity filter
      if (auditEntityFilter !== 'all' && log.entidad !== auditEntityFilter) {
        return false;
      }
      // Action filter
      if (auditActionFilter !== 'all' && log.accion !== auditActionFilter) {
        return false;
      }
      // Text search
      if (term) {
        const userMatch =
          log.usuario?.nombre_completo?.toLowerCase().includes(term) ||
          log.usuario?.correo?.toLowerCase().includes(term);
        const entityMatch = log.entidad?.toLowerCase().includes(term);
        const actionMatch = log.accion?.toLowerCase().includes(term);
        const detailMatch = JSON.stringify(log.valor_nuevo || log.valor_anterior || {}).toLowerCase().includes(term);
        if (!userMatch && !entityMatch && !actionMatch && !detailMatch) {
          return false;
        }
      }
      return true;
    });

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
  }, [auditorias, auditSearch, auditEntityFilter, auditActionFilter, auditSort]);

  const totalAuditPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAndSortedAuditorias.length / auditPageSize));
  }, [filteredAndSortedAuditorias.length, auditPageSize]);

  const paginatedAuditorias = useMemo(() => {
    const validPage = Math.min(Math.max(1, auditPage), totalAuditPages);
    const start = (validPage - 1) * auditPageSize;
    return filteredAndSortedAuditorias.slice(start, start + auditPageSize);
  }, [filteredAndSortedAuditorias, auditPage, auditPageSize, totalAuditPages]);

  const columnTotals = useMemo(() => {
    if (!gridData?.columnas || sortedAndFilteredGridRows.length === 0) return {};
    const totals: Record<string, number> = {};
    gridData.columnas.forEach((col: any) => {
      let sum = 0;
      sortedAndFilteredGridRows.forEach((row: any) => {
        const cell = row.valores?.find((v: any) => v.campo_id === col.id);
        if (cell) {
          const isCalc = col.modo_calculo === 'calculado' || cell.modo_calculo === 'calculado';
          const isOverridden = isCalc && cell.valor_manual !== null && cell.valor_manual !== undefined;
          const num = Number(
            isCalc
              ? (isOverridden ? cell.valor_manual : (cell.valor_calculado || 0))
              : (cell.valor_manual ?? 0)
          );
          if (!isNaN(num)) sum += num;
        }
      });
      totals[col.id] = sum;
    });
    return totals;
  }, [gridData, sortedAndFilteredGridRows]);

  const chartData = useMemo(() => {
    if (!gridData?.filas || gridData.filas.length === 0) return null;
    const totalIngresosCol = gridData.columnas.find((c: any) => c.slug === 'total_ingresos' || c.slug === 'ingreso_total');
    const saldoNetoCol = gridData.columnas.find((c: any) => c.slug === 'saldo_neto');
    if (!totalIngresosCol && !saldoNetoCol) return null;
    return {
      labels: gridData.filas.map((f: any) => f.iglesia_nombre),
      datasets: [
        {
          label: 'Total Ingresos',
          data: gridData.filas.map((f: any) => {
            const v = f.valores?.find((val: any) => val.campo_id === totalIngresosCol?.id);
            return Number(v ? (v.modo_calculo === 'calculado' ? v.valor_calculado : v.valor_manual) : 0);
          }),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Saldo Neto',
          data: gridData.filas.map((f: any) => {
            const v = f.valores?.find((val: any) => val.campo_id === saldoNetoCol?.id);
            return Number(v ? (v.modo_calculo === 'calculado' ? v.valor_calculado : v.valor_manual) : 0);
          }),
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
      const vals = Array.isArray(fila.valores) ? fila.valores : [];
      for (const val of vals) {
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

  // ─── ADAPTIVE MOBILE VIEW FOR MOBILE DEVICES, CHURCH USERS, OR SWITCHED MODE ─────────────
  if (token && (isMobile || (user?.rol === 'tesorero' && !!user?.iglesia_id && viewRoleMode === 'iglesia'))) {
    return (
      <MobileView
        token={token}
        user={user}
        onLogout={handleLogout}
        onSwitchToDesktop={() => {
          handleSetViewRoleMode('tesorero');
          setOverride('desktop');
        }}
        API_BASE={API_BASE}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // ─── MAIN APP SHELL (Minimalist White Default Workspace with Dark Mode) ──────────────
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 select-none font-sans">
      {/* ── LEFT SIDEBAR (Collapsible & Minimalist) ── */}
      <aside
        className={`bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between shrink-0 select-none z-30 shadow-xs dark:shadow-2xl transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-none opacity-0 pointer-events-none'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">TESORAPP</span>
                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-500/30">
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
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0 ml-1"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items (Single Word & Minimalist) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isTesorero && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-800 font-extrabold border border-indigo-200 dark:bg-indigo-600 dark:text-white dark:border-transparent dark:shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-amber-300' : 'text-slate-400'}`} />
                <span>Tablero</span>
              </div>
              {activeTab === 'dashboard' && <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-200" />}
            </button>
          )}

          <button
            onClick={() => setActiveTab('sheet')}
            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
              activeTab === 'sheet'
                ? 'bg-indigo-50 text-indigo-800 font-extrabold border border-indigo-200 dark:bg-indigo-600 dark:text-white dark:border-transparent dark:shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'sheet' ? 'text-indigo-600 dark:text-white' : 'text-slate-400'}`} />
              <span>{isTesorero ? 'Planilla' : 'Reporte'}</span>
            </div>
            {activeTab === 'sheet' && <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-200" />}
          </button>

          <button
            onClick={() => setActiveTab('reportes')}
            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
              activeTab === 'reportes'
                ? 'bg-indigo-50 text-indigo-800 font-extrabold border border-indigo-200 dark:bg-indigo-600 dark:text-white dark:border-transparent dark:shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className={`w-4 h-4 ${activeTab === 'reportes' ? 'text-indigo-600 dark:text-white' : 'text-slate-400'}`} />
              <span>Reportes</span>
            </div>
            {activeTab === 'reportes' && <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-200" />}
          </button>

          {isTesorero && (
            <>
              <button
                onClick={() => setActiveTab('iglesias')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'iglesias'
                    ? 'bg-indigo-50 text-indigo-800 font-extrabold border border-indigo-200 dark:bg-indigo-600 dark:text-white dark:border-transparent dark:shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className={`w-4 h-4 ${activeTab === 'iglesias' ? 'text-indigo-600 dark:text-white' : 'text-slate-400'}`} />
                  <span>Iglesias</span>
                </div>
                {activeTab === 'iglesias' && <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-200" />}
              </button>

              <button
                onClick={() => setActiveTab('campos')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'campos'
                    ? 'bg-indigo-50 text-indigo-800 font-extrabold border border-indigo-200 dark:bg-indigo-600 dark:text-white dark:border-transparent dark:shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className={`w-4 h-4 ${activeTab === 'campos' ? 'text-indigo-600 dark:text-white' : 'text-slate-400'}`} />
                  <span>Columnas</span>
                </div>
                {activeTab === 'campos' && <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-200" />}
              </button>

              <button
                onClick={() => setActiveTab('usuarios')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'usuarios'
                    ? 'bg-indigo-50 text-indigo-800 font-extrabold border border-indigo-200 dark:bg-indigo-600 dark:text-white dark:border-transparent dark:shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={`w-4 h-4 ${activeTab === 'usuarios' ? 'text-indigo-600 dark:text-white' : 'text-slate-400'}`} />
                  <span>Usuarios</span>
                </div>
                {activeTab === 'usuarios' && <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-200" />}
              </button>

              <button
                onClick={() => setActiveTab('historial')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'historial'
                    ? 'bg-indigo-50 text-indigo-800 font-extrabold border border-indigo-200 dark:bg-indigo-600 dark:text-white dark:border-transparent dark:shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <History className={`w-4 h-4 ${activeTab === 'historial' ? 'text-indigo-600 dark:text-white' : 'text-slate-400'}`} />
                  <span>Auditoría</span>
                </div>
                {activeTab === 'historial' && <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-200" />}
              </button>

              <button
                onClick={() => setActiveTab('gastos')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  activeTab === 'gastos'
                    ? 'bg-rose-50 text-rose-800 font-extrabold border border-rose-200 dark:bg-rose-600 dark:text-white dark:border-transparent dark:shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingDown className={`w-4 h-4 ${activeTab === 'gastos' ? 'text-rose-600 dark:text-white' : 'text-slate-400'}`} />
                  <span>Gastos</span>
                </div>
                {gastos.length > 0 && (
                  <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-800 dark:text-rose-300 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-700">
                    {gastos.length}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        {/* Bottom User Card & Theme Toggle */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/60">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                {user?.nombre_completo?.[0]?.toUpperCase() || 'T'}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.nombre_completo}</h4>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-semibold block capitalize truncate">
                  {user?.rol || 'Usuario'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setOverride('mobile')}
                title="Cambiar a vista móvil"
                className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT MAIN WORKSPACE (Light / Clean Minimalist Background with Dark Mode) ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Dynamic Top Header Bar */}
        <header className="min-h-12 py-1 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-20 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={toggleSidebar}
              title={sidebarOpen ? "Ocultar menú lateral (Ctrl+B)" : "Mostrar menú lateral (Ctrl+B)"}
              className={`p-1.5 rounded-lg transition cursor-pointer border shrink-0 ${
                sidebarOpen 
                  ? 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700' 
                  : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-xs'
              }`}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-[320px] md:max-w-none">
                {activeTab === 'dashboard' && 'Tablero Ejecutivo & Métricas'}
                {activeTab === 'sheet' && 'Planilla Contable General'}
                {activeTab === 'iglesias' && 'Directorio de Congregaciones'}
                {activeTab === 'campos' && 'Estructura de Columnas & Fórmulas'}
                {activeTab === 'usuarios' && 'Gestión de Usuarios & Accesos'}
                {activeTab === 'historial' && 'Auditoría & Trazabilidad de Cambios'}
                {activeTab === 'gastos' && 'Gastos & Control de Fondos'}
                {activeTab === 'reportes' && 'Centro de Reportes & Consolidados'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
            {selectedPeriodObj && activeTab !== 'sheet' && (
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-[11px] shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Periodo: <strong className="text-slate-900 dark:text-white">{selectedPeriodObj.nombre}</strong></span>
              </div>
            )}

            {user?.rol === 'tesorero' && user?.iglesia_id && (
              <button
                onClick={() => handleSetViewRoleMode('iglesia')}
                className="px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs shrink-0"
                title="Cambiar a Vista de Sede Pastoral para diligenciar su informe"
              >
                <Church className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="hidden md:inline">Mi Sede: {iglesias.find((i) => i.id === user.iglesia_id)?.nombre || 'Pastor'}</span>
                <span className="md:hidden hidden sm:inline">Mi Sede</span>
              </button>
            )}

            <button
              onClick={() => setShowHelpModal(true)}
              title="Abrir Guía y Centro de Ayuda (Ctrl+H / F1)"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="hidden md:inline text-[11px]">Guía / Ayuda</span>
            </button>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? "Cambiar a Modo Claro (Fondo Blanco)" : "Cambiar a Modo Oscuro"}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 text-xs font-semibold shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden lg:inline text-[11px]">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span className="hidden lg:inline text-[11px]">Oscuro</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowAICopilot(true)}
                className="px-2.5 sm:px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition transform active:scale-95 cursor-pointer shrink-0"
                title="Copilot Inteligencia Artificial"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="hidden xs:inline">Copilot IA</span>
                <span className="xs:hidden">IA</span>
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
              onSelectPeriodo={handlePeriodoChange}
              tablas={tablas}
              selectedTablaId={selectedTablaId}
              onSelectTabla={handleTableChange}
              iglesias={iglesias}
              gastos={gastos}
              gastosResumen={gastosResumen}
              gastosLoading={gastosLoading}
              onOpenCopilot={() => setShowAICopilot(true)}
              onOpenChurchDetail={(_iglesiaId) => {
                setActiveTab('sheet');
              }}
              onOpenHelp={() => setShowHelpModal(true)}
            />
          )}

          {/* TAB 1: SHEET */}
          {activeTab === 'sheet' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-white dark:bg-slate-950">
          {/* Toolbar (Tesorero only) */}
          {isTesorero ? (
            <TableFilterToolbar
              isTesorero={isTesorero}
              tablas={tablas}
              periodos={periodos}
              selectedTablaId={selectedTablaId}
              selectedPeriodoId={selectedPeriodoId}
              onTablaChange={handleTableChange}
              onPeriodoChange={handlePeriodoChange}
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
              onOpenQuickSearch={() => setShowQuickSearch(true)}
              onOpenPasteExcel={() => handleOpenPasteModal()}
              onUndo={handleUndo}
              canUndo={undoStack.length > 0}
              undoLabel={undoStack[0] ? `Deshacer: ${undoStack[0].description}` : 'Deshacer'}
              gridSearch={gridSearch}
              onGridSearchChange={setGridSearch}
              showAllColumns={showAllColumns}
              onToggleAllColumns={setShowAllColumns}
              onlyOverriddenFilter={onlyOverriddenFilter}
              onToggleOnlyOverridden={setOnlyOverriddenFilter}
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
                totalIngresosPeriodo={totalIngresosPeriodo}
                editingCell={editingCell}
                editValue={editValue}
                setEditValue={setEditValue}
                onBeginEdit={(churchId, fieldId, currentValue) => {
                  setEditingCell({ churchId, fieldId });
                  handleSetActiveCell({ churchId, fieldId });
                  setEditValue(currentValue === '0' ? '' : currentValue);
                }}
                onSaveCell={saveCell}
                onCancelEdit={() => setEditingCell(null)}
                onOpenPaperModal={openPaperModal}
                onOpenFormulaModal={(col) => setFormulaModalColumn(col)}
                onOpenReceipts={(churchId, churchName) =>
                  setReceiptVaultState({ open: true, churchId, churchName })
                }
                onOpenWorkflow={(row) => setWorkflowRow(row)}
                onOpenPasteModal={handleOpenPasteModal}
                isTesorero={isTesorero}
                isPeriodOpen={isPeriodOpen ?? false}
                gridSort={gridSort}
                onSortChange={toggleGridSort}
                onReorderColumns={handleReorderGridColumns}
                onReorderRows={handleReorderGridRows}
                activeCell={activeCell}
                setActiveCell={handleSetActiveCell}
              />

              {/* Analytics Drawer */}
              {showAnalyticsDrawer && (
                <div className="absolute right-0 top-[72px] bottom-0 w-[420px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-40 flex flex-col p-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                      <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Análisis Comparativo ({gridData?.tabla_nombre})</span>
                    </div>
                    <button
                      onClick={() => setShowAnalyticsDrawer(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
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
                                labels: { boxWidth: 10, font: { size: 10 }, color: '#94a3b8' },
                              },
                              title: { display: false },
                            },
                            scales: {
                              y: {
                                ticks: { font: { size: 9 }, color: '#94a3b8', callback: (val) => formatCOP(val as number) },
                                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                              },
                              x: {
                                ticks: { font: { size: 9 }, color: '#94a3b8', maxRotation: 45, minRotation: 45 },
                                grid: { display: false },
                              },
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 dark:text-slate-400 text-xs">
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
                onSendMonthlyReport={handleSendMonthlyReport}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-950">
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

          {/* Paste Column from Excel Modal */}
          {isTesorero && (
            <PasteColumnModal
              isOpen={showPasteModal}
              onClose={() => setShowPasteModal(false)}
              columns={gridData?.columnas || []}
              rows={sortedAndFilteredGridRows}
              initialColumnId={pasteModalColId}
              initialStartChurchId={pasteModalStartChurchId}
              onApplyPaste={handleMatrixBatchSave}
              isPeriodOpen={isPeriodOpen ?? false}
            />
          )}

        </div>
      )}

      {/* ── TAB 2: IGLESIAS ── */}
      {activeTab === 'iglesias' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-slate-950">
          <div className="h-[42px] px-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white text-xs">Directorio de Iglesias ({iglesias.length})</h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar iglesia o pastor..."
                  value={churchSearch}
                  onChange={(e) => setChurchSearch(e.target.value)}
                  className="w-56 pl-7 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600"
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
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Registrar Iglesia
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 z-10 select-none">
                <tr className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
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
                      className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{label}</span>
                        {churchSort.colKey === key ? (
                          churchSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-700">Tabla</th>
                  <th className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-700 text-center">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedIglesias.map((ig) => {
                  const matchedTable = tablas.find((t) => t.iglesias.some((i: any) => i.id === ig.id));
                  return (
                    <tr key={ig.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">{ig.nombre}</td>
                      <td className="px-2.5 py-2 text-slate-500 dark:text-slate-400 font-mono text-[11px] border-r border-slate-200 dark:border-slate-800">
                        {ig.codigo || '-'}
                      </td>
                      <td className="px-2.5 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{ig.nombre_pastor || '-'}</td>
                      <td className="px-2.5 py-2 text-slate-600 dark:text-slate-400 font-mono text-[11px] border-r border-slate-200 dark:border-slate-800">
                        {ig.telefono || '-'}
                      </td>
                      <td className="px-2.5 py-2 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">{ig.correo || '-'}</td>
                      <td className="px-2.5 py-2 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[150px] border-r border-slate-200 dark:border-slate-800">
                        {ig.direccion || '-'}
                      </td>
                      <td className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-800">
                        {matchedTable ? (
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                            {matchedTable.nombre}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[10px]">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 text-center border-r border-slate-200 dark:border-slate-800">
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
                          className="px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-semibold inline-flex items-center gap-1 border border-slate-300 dark:border-slate-700 cursor-pointer"
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
                          className="px-2 py-1 text-[11px] border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleChurchStatus(ig.id, ig.estado)}
                          className="px-2 py-1 text-[11px] border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                        >
                          {ig.estado === 'activa' ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => deleteChurch(ig.id, ig.nombre)}
                          className="px-2 py-1 text-[11px] border border-rose-200 dark:border-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
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
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-slate-950">
          <div className="h-[46px] px-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
                <button
                  onClick={() => setCamposSubView('catalog')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    camposSubView === 'catalog'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Catálogo de Columnas ({campos.length})</span>
                </button>
                <button
                  onClick={() => setCamposSubView('church_organizer')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    camposSubView === 'church_organizer'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Organizar Vista de Iglesia</span>
                </button>
              </div>

              {camposSubView === 'catalog' && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar columna o slug..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    className="w-52 pl-7 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              )}
            </div>

            {camposSubView === 'catalog' && (
              <button
                onClick={openFieldModalForNew}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Crear Columna
              </button>
            )}
          </div>

          {camposSubView === 'church_organizer' ? (
            <ChurchViewOrganizer
              campos={campos}
              tablas={tablas}
              onSaveBatch={handleSaveBatchCampos}
              onRefreshCampos={fetchCampos}
              onRefreshTablas={fetchTablas}
            />
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 z-10 select-none">
                <tr className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  {[
                    ['nombre', 'Nombre'],
                    ['slug', 'Slug'],
                    ['es_temporal', 'Vigencia'],
                    ['seccion', 'Sección'],
                    ['tipo', 'Tipo'],
                    ['modo_calculo', 'Cálculo / Fórmula'],
                    ['es_fondo', 'Destino Contable'],
                    ['es_acumulable', 'Acumulable'],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => toggleFieldSort(key)}
                      className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{label}</span>
                        {fieldSort.colKey === key ? (
                          fieldSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-700">Visibilidad</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedCampos.map((field) => {
                  const isTesoreroOnly = field.visible_para_tesorero && !field.visible_para_iglesia;
                  const isIglesiaOnly = !field.visible_para_tesorero && field.visible_para_iglesia;
                  return (
                    <tr key={field.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">{field.nombre}</td>
                      <td className="px-2.5 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">{field.slug}</td>
                      <td className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-800">
                        {field.es_temporal ? (
                          <span
                            className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-help"
                            title={
                              field.campos_por_periodo && field.campos_por_periodo.length > 0
                                ? field.campos_por_periodo.map((p: any) => p.periodo?.nombre).filter(Boolean).join(', ')
                                : field.periodo?.nombre || 'Temporal'
                            }
                          >
                            ⏱{' '}
                            {field.campos_por_periodo && field.campos_por_periodo.length > 1
                              ? `${field.campos_por_periodo.length} períodos`
                              : field.campos_por_periodo?.[0]?.periodo?.nombre || field.periodo?.nombre || 'Temporal'}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-medium">
                            Permanente
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-800">
                        {field.seccion_iglesia && field.seccion_tesorero && field.seccion_iglesia !== field.seccion_tesorero ? (
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded text-[10px] font-bold">
                            {field.seccion_iglesia} → {field.seccion_tesorero}
                          </span>
                        ) : (
                          <BadgeStatus variant={field.seccion?.toLowerCase()} label={field.seccion} />
                        )}
                      </td>
                      <td className="px-2.5 py-2 capitalize text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{field.tipo}</td>
                      <td className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-800">
                        {field.modo_calculo === 'calculado' ? (
                          <span className="font-mono text-[11px] text-blue-700 dark:text-blue-300 font-bold truncate max-w-[200px] inline-block" title={field.formula}>
                            {field.formula}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px] font-semibold border border-slate-200 dark:border-slate-700">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-800">
                        {field.es_fondo ? (
                          field.es_transito ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded text-[10px] font-bold" title={`Giro a: ${field.ente_superior_nombre || 'Ente Superior'}`}>
                              🚀 Tránsito {field.ente_superior_nombre ? `(${field.ente_superior_nombre})` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-[10px] font-bold">
                              🏛️ Propio (Caja)
                            </span>
                          )
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[9px] font-medium border border-slate-200 dark:border-slate-700">
                            Informativo
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 text-center border-r border-slate-200 dark:border-slate-800">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            field.es_acumulable
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {field.es_acumulable ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-800">
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                          {isTesoreroOnly ? 'Solo Tesorero' : isIglesiaOnly ? 'Solo Iglesia' : 'Ambos'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <button
                          onClick={() => openFieldModalForEdit(field)}
                          className="px-2 py-1 text-[11px] border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteField(field.id)}
                          className="px-2 py-1 text-[11px] border border-rose-200 dark:border-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
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
          )}
        </div>
      )}

      {/* ── TAB 5: USUARIOS ── */}
      {activeTab === 'usuarios' && isTesorero && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-slate-950">
          <div className="h-[42px] px-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white text-xs">Cuentas Autorizadas ({usuarios.length})</h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar usuario o correo..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-56 pl-7 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600"
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
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3 h-3" /> Registrar Usuario
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 z-10 select-none">
                <tr className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  {[
                    ['nombre_completo', 'Nombre'],
                    ['correo', 'Correo'],
                    ['rol', 'Rol'],
                    ['iglesia', 'Iglesia'],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => toggleUserSort(key)}
                      className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{label}</span>
                        {userSort.colKey === key ? (
                          userSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
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
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedUsuarios.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-3 py-2 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">{usr.nombre_completo}</td>
                    <td className="px-2.5 py-2 text-slate-600 dark:text-slate-400 font-mono text-[11px] border-r border-slate-200 dark:border-slate-800">{usr.correo}</td>
                    <td className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-800">
                      <BadgeStatus variant={usr.rol} label={usr.rol} />
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-800">
                      {usr.iglesia ? (
                        <span className="font-bold text-slate-800 dark:text-slate-200">{usr.iglesia.nombre}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[10px]">Acceso Global</span>
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
                        className="px-2 py-1 text-[11px] border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteUser(usr.id, usr.nombre_completo)}
                        className="px-2 py-1 text-[11px] border border-rose-200 dark:border-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
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
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-slate-950">
          {/* Header & Filter Bar */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 mr-1">
                <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="font-bold text-slate-900 dark:text-white text-xs">
                  Bitácora de Auditoría
                </h2>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {filteredAndSortedAuditorias.length} {filteredAndSortedAuditorias.length === auditorias.length ? 'eventos' : `de ${auditorias.length}`}
                </span>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar usuario, detalle..."
                  value={auditSearch}
                  onChange={(e) => {
                    setAuditSearch(e.target.value);
                    setAuditPage(1);
                  }}
                  className="w-48 sm:w-56 pl-7 pr-7 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                />
                {auditSearch && (
                  <button
                    onClick={() => {
                      setAuditSearch('');
                      setAuditPage(1);
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Entity Filter */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">Módulo:</span>
                <select
                  value={auditEntityFilter}
                  onChange={(e) => {
                    setAuditEntityFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-600 shadow-2xs"
                >
                  <option value="all">Todos los módulos</option>
                  <option value="valor">Valores de Planilla</option>
                  <option value="gasto">Gastos de Tesorería</option>
                  <option value="usuario">Usuarios</option>
                  <option value="campo_plantilla">Columnas / Plantilla</option>
                  <option value="informe_periodo">Informes / Workflow</option>
                  <option value="periodo">Períodos</option>
                  <option value="iglesia">Congregaciones</option>
                  <option value="tabla">Tablas</option>
                </select>
              </div>

              {/* Action Filter */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">Acción:</span>
                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-600 shadow-2xs"
                >
                  <option value="all">Todas las acciones</option>
                  <option value="creacion">Creación</option>
                  <option value="actualizacion">Actualización</option>
                  <option value="eliminacion">Eliminación</option>
                  <option value="cierre_periodo">Cierre de Período</option>
                  <option value="reapertura_periodo">Reapertura</option>
                </select>
              </div>

              {/* Reset filters button */}
              {(auditSearch || auditEntityFilter !== 'all' || auditActionFilter !== 'all') && (
                <button
                  onClick={() => {
                    setAuditSearch('');
                    setAuditEntityFilter('all');
                    setAuditActionFilter('all');
                    setAuditPage(1);
                  }}
                  className="px-2 py-1 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded border border-rose-200 dark:border-rose-800 font-semibold cursor-pointer transition flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpiar filtros
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden lg:inline">
              Registro inalterable con trazabilidad total de base de datos
            </span>
          </div>

          {/* Table Area */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 z-10 select-none">
                <tr className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  {[
                    ['realizado_en', 'Fecha y Hora'],
                    ['usuario', 'Responsable'],
                    ['accion', 'Acción'],
                    ['entidad', 'Módulo / Entidad'],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => toggleAuditSort(key)}
                      className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{label}</span>
                        {auditSort.colKey === key ? (
                          auditSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left">Detalle Completo del Movimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedAuditorias.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      No se encontraron registros de auditoría que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  paginatedAuditorias.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        {new Date(log.realizado_en).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-2.5 py-2 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{log.usuario?.nombre_completo || 'Sistema'}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{log.usuario?.correo || ''}</span>
                        </div>
                      </td>
                      <td className="px-2.5 py-2 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                          log.accion === 'creacion'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : log.accion === 'eliminacion'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : log.accion === 'cierre_periodo' || log.accion === 'reapertura_periodo'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                        }`}>
                          {log.accion.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 font-mono text-[11px] capitalize text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold">
                          {log.entidad.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {(() => {
                          const accion = log.accion;
                          const entidad = log.entidad;
                          const ant = log.valor_anterior;
                          const neu = log.valor_nuevo;
                          const data = neu || ant || {};

                          if (entidad === 'gasto') {
                            if (accion === 'creacion') {
                              return (
                                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium">
                                  <span>➕ Registrado gasto:</span>
                                  <strong className="text-slate-900 dark:text-white">"{data.concepto || 'Sin concepto'}"</strong>
                                  <span>por</span>
                                  <strong className="font-mono font-black text-emerald-900 dark:text-emerald-200">{formatCOP(data.monto || 0)}</strong>
                                  {data.comprobante_numero ? <span className="text-[11px] text-slate-500">(Comp: #{data.comprobante_numero})</span> : ''}
                                  {data.beneficiario ? <span className="text-[11px] text-slate-500">a {data.beneficiario}</span> : ''}
                                </div>
                              );
                            }
                            if (accion === 'eliminacion') {
                              return (
                                <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-medium">
                                  <span>🗑️ Eliminado gasto:</span>
                                  <strong className="text-slate-900 dark:text-white">"{data.concepto || 'Gasto'}"</strong>
                                  <span>por</span>
                                  <strong className="font-mono font-black">{formatCOP(data.monto || 0)}</strong>
                                  {data.comprobante_numero ? <span className="text-[11px] text-slate-500">(Comp: #{data.comprobante_numero})</span> : ''}
                                </div>
                              );
                            }
                            if (accion === 'actualizacion') {
                              return (
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                                  <span>✏️ Modificado gasto:</span>
                                  <strong className="text-slate-900 dark:text-white">"{ant?.concepto || neu?.concepto || 'Gasto'}"</strong>
                                  <span className="font-mono line-through text-slate-400">{formatCOP(ant?.monto || 0)}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-black">{formatCOP(neu?.monto || 0)}</strong>
                                </div>
                              );
                            }
                          }

                          if (entidad === 'usuario') {
                            if (accion === 'creacion') {
                              return (
                                <div className="text-emerald-800 dark:text-emerald-300">
                                  👤 Creado usuario: <strong className="text-slate-900 dark:text-white">{data.nombre_completo}</strong> ({data.correo}) — Rol: <strong className="uppercase">{data.rol}</strong>
                                </div>
                              );
                            }
                            if (accion === 'eliminacion') {
                              return (
                                <div className="text-rose-800 dark:text-rose-300">
                                  🗑️ Eliminado usuario: <strong className="text-slate-900 dark:text-white">{data.nombre_completo}</strong> ({data.correo})
                                </div>
                              );
                            }
                            return (
                              <div className="text-slate-700 dark:text-slate-300">
                                ✏️ Actualizado usuario: <strong className="text-slate-900 dark:text-white">{data.nombre_completo}</strong> ({data.correo}) {data.rol ? `[Rol: ${data.rol}]` : ''}
                              </div>
                            );
                          }

                          if (entidad === 'campo_plantilla') {
                            if (accion === 'creacion') {
                              return (
                                <div className="text-emerald-800 dark:text-emerald-300">
                                  ➕ Creada columna: <strong className="text-slate-900 dark:text-white">"{data.nombre}"</strong> ({data.slug}) — Modo: <strong>{data.modo_calculo}</strong> {data.formula ? `[${data.formula}]` : ''}
                                </div>
                              );
                            }
                            if (accion === 'eliminacion') {
                              return (
                                <div className="text-rose-800 dark:text-rose-300">
                                  🗑️ Eliminada columna: <strong className="text-slate-900 dark:text-white">"{data.nombre}"</strong> ({data.slug})
                                </div>
                              );
                            }
                            const diffs: string[] = [];
                            if (ant && neu) {
                              if (ant.nombre !== neu.nombre) diffs.push(`Nombre: "${ant.nombre}" → "${neu.nombre}"`);
                              if (ant.formula !== neu.formula) diffs.push(`Fórmula: "${ant.formula || 'manual'}" → "${neu.formula || 'manual'}"`);
                              if (ant.es_fondo !== neu.es_fondo) diffs.push(`Fondo: ${neu.es_fondo ? 'Activado' : 'Desactivado'}`);
                              if (ant.es_transito !== neu.es_transito) diffs.push(`Tránsito: ${neu.es_transito ? 'Sí' : 'No'}`);
                              if (ant.seccion !== neu.seccion) diffs.push(`Sección: ${ant.seccion} → ${neu.seccion}`);
                            }
                            return (
                              <div className="text-indigo-800 dark:text-indigo-300">
                                ✏️ Columna: <strong className="text-slate-900 dark:text-white">"{data.nombre || 'Columna'}"</strong> {diffs.length > 0 ? `(${diffs.join(' | ')})` : '(Propiedades actualizadas)'}
                              </div>
                            );
                          }

                          if (entidad === 'informe_periodo') {
                            return (
                              <div className="flex items-center gap-1.5 text-indigo-800 dark:text-indigo-300">
                                <span>📑 Estado de informe:</span>
                                <span className="uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">{ant?.estado || 'borrador'}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-[10px] font-black">{neu?.estado || 'aprobado'}</span>
                                {neu?.observaciones ? <span className="text-slate-500 italic">— "{neu.observaciones}"</span> : ''}
                              </div>
                            );
                          }

                          if (entidad === 'valor') {
                            const church = log.valor?.iglesia?.nombre || 'Sede';
                            const field = log.valor?.campo?.nombre || 'Valor';
                            const valAnt = ant?.valor_manual ?? ant?.valor_calculado ?? 0;
                            const valNeu = neu?.valor_manual ?? neu?.valor_calculado ?? 0;
                            return (
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <span className="font-bold text-slate-900 dark:text-white">{church}</span>
                                <span className="text-slate-400">›</span>
                                <span className="font-bold text-indigo-700 dark:text-indigo-400">{field}:</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-500 line-through">
                                  {formatCOP(valAnt)}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.5 rounded font-mono text-[11px] font-black border border-emerald-300 dark:border-emerald-700">
                                  {formatCOP(valNeu)}
                                </span>
                              </div>
                            );
                          }

                          if (entidad === 'periodo') {
                            return (
                              <div className="text-amber-800 dark:text-amber-300 font-bold">
                                🗓️ Periodo: <strong>{data.nombre || 'Periodo'}</strong> — {accion === 'cierre_periodo' ? '🔒 Cerrado' : accion === 'reapertura_periodo' ? '🔓 Reabierto' : accion}
                              </div>
                            );
                          }

                          if (entidad === 'iglesia') {
                            return (
                              <div className="text-indigo-800 dark:text-indigo-300">
                                ⛪ Congregación: <strong className="text-slate-900 dark:text-white">{data.nombre}</strong> {data.codigo ? `(#${data.codigo})` : ''} {data.nombre_pastor ? `(Pastor: ${data.nombre_pastor})` : ''}
                              </div>
                            );
                          }

                          if (entidad === 'tabla') {
                            return (
                              <div className="text-slate-700 dark:text-slate-300">
                                📊 Tabla: <strong className="text-slate-900 dark:text-white">{data.nombre}</strong>
                              </div>
                            );
                          }

                          return (
                            <span className="text-slate-500 font-mono">
                              {JSON.stringify(data).slice(0, 80)}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── STICKY AUDIT PAGINATION FOOTER ── */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs select-none">
            {/* Left summary */}
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span>
                Mostrando{' '}
                <strong>
                  {filteredAndSortedAuditorias.length === 0
                    ? '0'
                    : `${(Math.min(auditPage, totalAuditPages) - 1) * auditPageSize + 1}–${Math.min(
                        Math.min(auditPage, totalAuditPages) * auditPageSize,
                        filteredAndSortedAuditorias.length
                      )}`}
                </strong>{' '}
                de <strong>{filteredAndSortedAuditorias.length}</strong> eventos
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Página {auditPage} de {totalAuditPages}
              </span>
            </div>

            {/* Center: Rows per page selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Eventos por página:</span>
              <select
                value={auditPageSize}
                onChange={(e) => {
                  setAuditPageSize(Number(e.target.value));
                  setAuditPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-600"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Right: Pagination buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAuditPage(1)}
                disabled={auditPage <= 1}
                title="Primera página"
                className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-slate-600 dark:text-slate-300"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={auditPage <= 1}
                title="Página anterior"
                className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Numbered page buttons */}
              {(() => {
                const maxButtons = 5;
                let startPage = Math.max(1, auditPage - Math.floor(maxButtons / 2));
                let endPage = startPage + maxButtons - 1;
                if (endPage > totalAuditPages) {
                  endPage = totalAuditPages;
                  startPage = Math.max(1, endPage - maxButtons + 1);
                }

                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(i);
                }

                return pages.map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setAuditPage(pageNum)}
                    className={`min-w-[28px] h-7 px-1.5 rounded font-mono text-xs font-bold transition cursor-pointer border ${
                      pageNum === auditPage
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ));
              })()}

              <button
                onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                disabled={auditPage >= totalAuditPages}
                title="Página siguiente"
                className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-slate-600 dark:text-slate-300"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setAuditPage(totalAuditPages)}
                disabled={auditPage >= totalAuditPages}
                title="Última página"
                className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-slate-600 dark:text-slate-300"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 7: GASTOS ── */}
      {activeTab === 'gastos' && (
        <GastosPanel
          gastos={gastos}
          resumen={gastosResumen}
          loading={gastosLoading}
          onNew={openNewGasto}
          onNewFondo={openFieldModalForNewFondo}
          onEdit={openEditGasto}
          onDelete={deleteGasto}
          onOpenVoucher={(g) => {
            setVoucherGasto({
              id: g.id,
              descripcion: g.descripcion,
              monto: Number(g.monto),
              fecha: g.fecha,
              campo_fondo_nombre: g.campo_fondo?.nombre,
              periodo_nombre: g.periodo?.nombre || selectedPeriodObj?.nombre,
              creado_por_nombre: g.creado_por?.nombre_completo || user?.nombre_completo,
            });
          }}
          selectedPeriodoNombre={selectedPeriodObj?.nombre || ''}
          isPeriodOpen={isPeriodOpen}
        />
      )}

      {/* ── TAB 8: REPORTES ── */}
      {activeTab === 'reportes' && (
        <ReportsPanel
          apiBase={API_BASE}
          gridData={gridData}
          periodos={periodos}
          selectedPeriodoId={selectedPeriodoId}
          setSelectedPeriodoId={setSelectedPeriodoId}
          tablas={tablas}
          selectedTablaId={selectedTablaId}
          setSelectedTablaId={handleTableChange}
          iglesias={iglesias}
          campos={campos}
          gastosResumen={gastosResumen}
          isTesorero={isTesorero}
          user={user}
        />
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

      {/* ── MODAL: GASTO ── */}
      <GastoModal
        isOpen={showGastoModal}
        onClose={() => setShowGastoModal(false)}
        data={gastoModalData}
        setData={setGastoModalData}
        onSave={saveGasto}
        onDelete={gastoModalData.id ? () => { setShowGastoModal(false); deleteGasto({ id: gastoModalData.id, descripcion: gastoModalData.descripcion, monto: gastoModalData.monto }); } : undefined}
        saving={savingGasto}
        campos={campos.filter((c: any) => c.tipo === 'moneda')}
        resumen={gastosResumen}
        periodos={periodos}
        selectedPeriodoId={selectedPeriodoId}
      />

      {/* ── MODAL: TABLAS (ZONAS) ── */}
      {showTableModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-3 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tableModalData.id ? 'Modificar Tabla' : 'Nueva Tabla'}</h3>
              <button onClick={() => setShowTableModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveTable} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 text-xs font-semibold"
                  placeholder="ej. Circuito Central 2026"
                  value={tableModalData.nombre}
                  onChange={(e) => setTableModalData({ ...tableModalData, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase mb-1">Iglesias Asociadas</label>
                <div className="max-h-36 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-lg p-2 space-y-1 bg-slate-50 dark:bg-slate-800/50">
                  {iglesias.map((ig) => (
                    <label key={ig.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 px-1 rounded">
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
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{ig.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase mb-1">Columnas y Orden</label>
                <div className="max-h-36 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-lg p-2 space-y-1 bg-slate-50 dark:bg-slate-800/50">
                  {campos.map((f) => {
                    const isChecked = tableModalData.campo_ids.includes(f.id);
                    const position = tableModalData.campo_ids.indexOf(f.id);
                    return (
                      <label key={f.id} className="flex items-center justify-between cursor-pointer py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 px-1 rounded">
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
                          <span className="text-slate-800 dark:text-slate-200 font-semibold">
                            {f.nombre} ({f.seccion})
                          </span>
                        </div>
                        {isChecked && (
                          <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-bold border border-indigo-200 dark:border-indigo-800">
                            Col #{position + 1}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                {tableModalData.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (tableModalData.id) {
                        deleteTable(tableModalData.id);
                        setShowTableModal(false);
                      }
                    }}
                    className="px-2.5 py-1.5 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer"
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
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingTable}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs text-xs cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{churchModalData.id ? 'Editar Iglesia' : 'Registrar Nueva Iglesia'}</h3>
              <button onClick={() => setShowChurchModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
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
                  <label className="block font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 text-xs font-semibold"
                    placeholder={f.placeholder}
                    value={(churchModalData as any)[f.key] || ''}
                    onChange={(e) => setChurchModalData({ ...churchModalData, [f.key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowChurchModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingChurch}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs text-xs cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{userModalData.id ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2 text-indigo-950 dark:text-indigo-200 text-[11px] flex items-start gap-1.5 font-medium">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">✓</span>
              <span>
                <strong>Acceso directo:</strong> Esta cuenta no requiere verificación de correo. El representante podrá iniciar sesión inmediatamente.
              </span>
            </div>
            <form onSubmit={saveUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase mb-1">Rol</label>
                  <select
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 text-xs font-semibold cursor-pointer"
                    value={userModalData.rol}
                    onChange={(e) => setUserModalData({ ...userModalData, rol: e.target.value as any })}
                  >
                    <option value="iglesia">Representante Iglesia</option>
                    <option value="tesorero">Tesorero General</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase mb-1">
                    {userModalData.rol === 'iglesia' ? 'Iglesia Asignada *' : 'Sede Pastoral (Opcional)'}
                  </label>
                  <select
                    required={userModalData.rol === 'iglesia'}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 text-xs font-semibold cursor-pointer"
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
                    <option value="">
                      {userModalData.rol === 'iglesia' ? '-- Seleccionar Iglesia --' : '-- Sin sede (solo Tesorero General) --'}
                    </option>
                    {iglesias.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nombre} {i.codigo ? `(${i.codigo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 text-xs font-semibold"
                  placeholder="ej. Pastor Juan Pérez"
                  value={userModalData.nombre_completo}
                  onChange={(e) => setUserModalData({ ...userModalData, nombre_completo: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 text-xs font-mono font-semibold"
                  placeholder="iglesia@tesorapp.com"
                  value={userModalData.correo}
                  onChange={(e) => setUserModalData({ ...userModalData, correo: e.target.value })}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase">
                    Contraseña {userModalData.id && '(dejar en blanco para no cambiar)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPass = 'Tesorero' + Math.floor(1000 + Math.random() * 9000) + '!';
                      setUserModalData({ ...userModalData, contrasena: randomPass });
                    }}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                  >
                    Generar Clave Aleatoria
                  </button>
                </div>
                <input
                  type="password"
                  required={!userModalData.id}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 text-xs font-mono font-semibold"
                  placeholder="••••••••"
                  value={userModalData.contrasena}
                  onChange={(e) => setUserModalData({ ...userModalData, contrasena: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs text-xs cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Digitar Informe en Papel</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    {paperChurch.iglesia_nombre} ({selectedPeriodObj?.nombre})
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPaperModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={savePaperBatch} className="space-y-3 text-xs">
              <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Ingresa los montos reportados en físico por la iglesia. Los porcentajes y totales se calcularán automáticamente.
              </p>
              <div className="space-y-2">
                {paperChurchFields
                  .filter((f) => f.modo_calculo === 'manual')
                  .map((f) => (
                    <div
                      key={f.campo_id}
                      className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div>
                        <label className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{f.nombre}</label>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono capitalize">{f.seccion}</span>
                      </div>
                      <div className="relative w-44">
                        <span className="absolute left-2.5 top-1.5 font-bold text-slate-400 text-xs">$</span>
                        <input
                          type="number"
                          step="any"
                          className="w-full pl-6 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-right text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
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
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaperModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPaper}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs text-xs flex items-center gap-1.5 cursor-pointer"
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

      <ExportExcelModal
        isOpen={showExportExcelModal}
        onClose={() => setShowExportExcelModal(false)}
        rows={gridData?.filas || []}
        columns={gridData?.columnas || []}
        columnTotals={columnTotals}
        periodName={periodos.find((p) => p.id === selectedPeriodoId)?.nombre || 'Periodo Actual'}
        tableName={tablas.find((t) => t.id === selectedTablaId)?.nombre || gridData?.tabla_nombre || 'Planilla Contable'}
      />

      {/* ── MODAL WOW 1: ASISTENTE IA COPILOT ── */}
      <AICopilotDrawer
        isOpen={showAICopilot}
        onClose={() => setShowAICopilot(false)}
        gridData={gridData}
        currentPeriod={periodos.find((p) => p.id === selectedPeriodoId)}
        iglesias={iglesias}
        onNavigate={(tab) => {
          setActiveTab(tab as any);
          setShowAICopilot(false);
        }}
        onOpenModal={(modal) => {
          if (modal === 'whatsapp') setShowNotificationCenter(true);
          setShowAICopilot(false);
        }}
      />

      {/* ── BÓVEDA DE COMPROBANTES BANCARIOS ── */}
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

      {/* ── MODAL WOW 6: CENTRO DE NOTIFICACIONES & WHATSAPP ── */}
      <NotificationCenter
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        iglesias={iglesias}
        currentPeriod={periodos.find((p) => p.id === selectedPeriodoId)}
        user={user}
      />

      {/* ── WORKFLOW & APPROVALS MODAL ── */}
      <WorkflowModal
        isOpen={!!workflowRow}
        onClose={() => setWorkflowRow(null)}
        row={workflowRow}
        periodo={selectedPeriodObj}
        onChangeStatus={handleChangeWorkflowStatus}
      />

      {/* ── COMPROBANTE / VOUCHER DE GASTO ── */}
      <GastoVoucherModal
        isOpen={!!voucherGasto}
        onClose={() => setVoucherGasto(null)}
        gasto={voucherGasto}
      />

      {/* ── CENTRO DE AYUDA & GUÍA DEL SISTEMA ── */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* ── COLUMN CONFIG DRAWER (GLOBAL: PLANILLA, CAMPOS, GASTOS & FONDOS) ── */}
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
  );
}
