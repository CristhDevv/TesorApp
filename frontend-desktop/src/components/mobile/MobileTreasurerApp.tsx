import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Building2,
  TrendingUp,
  Calendar,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Users,
  History,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Monitor,
  Table as TableIcon,
  ChevronRight,
  Menu,
  RotateCcw,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { formatCOP } from '../../utils/formatters';
import { AICopilotDrawer } from '../ai/AICopilotDrawer';

interface MobileTreasurerAppProps {
  token: string | null;
  user: any;
  onLogout: () => void;
  onSwitchToDesktop: () => void;
  API_BASE: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

type MainTab =
  | 'digitacion'
  | 'iglesias'
  | 'gastos'
  | 'columnas'
  | 'tablas'
  | 'periodos'
  | 'usuarios'
  | 'auditoria'
  | 'reportes';

export function MobileTreasurerApp({
  token,
  user,
  onLogout,
  onSwitchToDesktop,
  API_BASE,
  theme,
  onToggleTheme,
}: MobileTreasurerAppProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<MainTab>('digitacion');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Global State
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>('');
  const [tablas, setTablas] = useState<any[]>([]);
  const [selectedTablaId, setSelectedTablaId] = useState<string>('all');
  const [iglesias, setIglesias] = useState<any[]>([]);
  const [campos, setCampos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [auditorias, setAuditorias] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [resumenFondos, setResumenFondos] = useState<any[]>([]);

  // Digitación Data
  const [selectedChurchId, setSelectedChurchId] = useState<string>('');
  const [gridData, setGridData] = useState<any>(null);
  const [localValues, setLocalValues] = useState<Record<string, number>>({});
  const [savingValues, setSavingValues] = useState(false);

  // Search & Filter States
  const [churchSearch, setChurchSearch] = useState('');
  const [churchFilterStatus, setChurchFilterStatus] = useState<'all' | 'activa' | 'inactiva'>('all');
  const [camposSearch, setCamposSearch] = useState('');
  const [camposFilterType, setCamposFilterType] = useState<'all' | 'manual' | 'calculado' | 'fondo'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('all');

  // Modals
  const [showChurchModal, setShowChurchModal] = useState(false);
  const [editingChurch, setEditingChurch] = useState<any | null>(null);
  const [churchFormData, setChurchFormData] = useState({
    nombre: '',
    codigo: '',
    nombre_pastor: '',
    telefono: '',
    correo: '',
    direccion: '',
    tabla_id: '',
    estado: 'activa',
  });

  const [showGastoModal, setShowGastoModal] = useState(false);
  const [gastoFormData, setGastoFormData] = useState({
    descripcion: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    campo_fondo_id: '',
  });

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodFormData, setPeriodFormData] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol: 'iglesia',
    iglesia_id: '',
  });

  const [showTablaModal, setShowTablaModal] = useState(false);
  const [editingTabla, setEditingTabla] = useState<any | null>(null);
  const [tablaFormData, setTablaFormData] = useState({
    nombre: '',
    iglesia_ids: [] as string[],
    campo_ids: [] as string[],
  });

  const [showCampoModal, setShowCampoModal] = useState(false);
  const [editingCampo, setEditingCampo] = useState<any | null>(null);
  const [campoFormData, setCampoFormData] = useState({
    nombre: '',
    slug: '',
    tipo: 'moneda',
    modo_calculo: 'manual',
    formula: '',
    tipo_redondeo: 'ninguno',
    multiplo_redondeo: 1,
    es_acumulable: false,
    es_fondo: false,
    es_transito: false,
    seccion: 'Ingresos',
    seccion_iglesia: 'Ingresos',
    seccion_tesorero: 'Ingresos',
    visible_para_iglesia: true,
    visible_para_tesorero: true,
    aplica_a_todas_las_iglesias: true,
  });

  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Initial Data Fetch ───────────────────────────────────────────────
  const fetchAllMetadata = useCallback(async () => {
    if (!token) return;
    try {
      const [perRes, tabRes, igRes, campRes, usrRes, audRes] = await Promise.all([
        axios.get(`${API_BASE}/periodos`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/tablas`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/iglesias`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/campos`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/usuarios`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/historial`).catch(() => ({ data: [] })),
      ]);

      setPeriodos(perRes.data || []);
      setTablas(tabRes.data || []);
      setIglesias(igRes.data || []);
      setCampos(campRes.data || []);
      setUsuarios(usrRes.data || []);
      setAuditorias(audRes.data || []);

      if (perRes.data?.length > 0 && !selectedPeriodoId) {
        setSelectedPeriodoId(perRes.data[0].id);
      }
    } catch (err) {
      console.error('Error cargando metadata mobile:', err);
    }
  }, [token, API_BASE, selectedPeriodoId]);

  useEffect(() => {
    fetchAllMetadata();
  }, [fetchAllMetadata]);

  // ─── Fetch Grid Values ────────────────────────────────────────────────
  const fetchGridValues = useCallback(async () => {
    if (!selectedPeriodoId) return;
    try {
      const targetTabla = selectedTablaId || 'all';
      const res = await axios.get(
        `${API_BASE}/valores?tabla_id=${targetTabla}&periodo_id=${selectedPeriodoId}&mostrar_todos=true`
      );
      setGridData(res.data);

      const churches = res.data?.filas || [];
      if (churches.length > 0 && (!selectedChurchId || !churches.some((c: any) => c.iglesia_id === selectedChurchId))) {
        setSelectedChurchId(churches[0].iglesia_id);
      }
    } catch (err) {
      console.error('Error cargando valores:', err);
    }
  }, [selectedPeriodoId, selectedTablaId, API_BASE, selectedChurchId]);

  useEffect(() => {
    fetchGridValues();
  }, [selectedPeriodoId, selectedTablaId, fetchGridValues]);

  // ─── Fetch Gastos ─────────────────────────────────────────────────────
  const fetchGastos = useCallback(async () => {
    if (!selectedPeriodoId) return;
    try {
      const [gRes, rRes] = await Promise.all([
        axios.get(`${API_BASE}/gastos?periodo_id=${selectedPeriodoId}`),
        axios.get(`${API_BASE}/gastos/resumen?periodo_id=${selectedPeriodoId}`),
      ]);
      setGastos(gRes.data || []);
      setResumenFondos(rRes.data || []);
    } catch (err) {
      console.error('Error cargando gastos:', err);
    }
  }, [selectedPeriodoId, API_BASE]);

  useEffect(() => {
    if (activeTab === 'gastos') {
      fetchGastos();
    }
  }, [activeTab, fetchGastos]);

  // ─── Selected Church & Row in Digitación ──────────────────────────────
  const currentChurchRow = useMemo(() => {
    if (!gridData?.filas) return null;
    return gridData.filas.find((f: any) => f.iglesia_id === selectedChurchId) || gridData.filas[0] || null;
  }, [gridData, selectedChurchId]);

  const currentPeriodObj = useMemo(() => {
    return periodos.find((p) => p.id === selectedPeriodoId) || null;
  }, [periodos, selectedPeriodoId]);

  // Sync local values when church row changes
  useEffect(() => {
    if (currentChurchRow?.valores) {
      const map: Record<string, number> = {};
      currentChurchRow.valores.forEach((v: any) => {
        map[v.campo_id] = Number(v.valor_manual ?? v.valor_calculado ?? 0);
      });
      setLocalValues(map);
    }
  }, [currentChurchRow]);

  // ─── Value Save Handler ──────────────────────────────────────────────
  const handleSaveChurchValues = async () => {
    if (!currentChurchRow || !selectedPeriodoId) return;
    setSavingValues(true);
    try {
      const payload = Object.entries(localValues).map(([campo_id, valor_manual]) => ({
        campo_id,
        valor_manual: Number(valor_manual || 0),
      }));

      await axios.put(
        `${API_BASE}/valores/${currentChurchRow.iglesia_id}/lote/${selectedPeriodoId}`,
        { valores: payload }
      );
      triggerToast('Valores guardados y recalculados');
      await fetchGridValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error guardando valores', 'error');
    } finally {
      setSavingValues(false);
    }
  };

  // ─── Workflow Actions ────────────────────────────────────────────────
  const handleUpdateReportStatus = async (status: 'aprobado' | 'revisado' | 'borrador', notes?: string) => {
    if (!currentChurchRow || !selectedPeriodoId) return;
    try {
      await axios.put(
        `${API_BASE}/informes/${currentChurchRow.iglesia_id}/estado/${selectedPeriodoId}`,
        { estado: status, observaciones: notes }
      );
      triggerToast(`Informe ${status === 'borrador' ? 'reabierto' : status} con éxito`);
      await fetchGridValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error actualizando estado', 'error');
    }
  };

  // ─── Church CRUD ─────────────────────────────────────────────────────
  const openCreateChurchModal = () => {
    setEditingChurch(null);
    setChurchFormData({
      nombre: '',
      codigo: '',
      nombre_pastor: '',
      telefono: '',
      correo: '',
      direccion: '',
      tabla_id: tablas[0]?.id || '',
      estado: 'activa',
    });
    setShowChurchModal(true);
  };

  const openEditChurchModal = (church: any) => {
    setEditingChurch(church);
    setChurchFormData({
      nombre: church.nombre || '',
      codigo: church.codigo || '',
      nombre_pastor: church.nombre_pastor || '',
      telefono: church.telefono || '',
      correo: church.correo || '',
      direccion: church.direccion || '',
      tabla_id: church.tabla_id || '',
      estado: church.estado || 'activa',
    });
    setShowChurchModal(true);
  };

  const handleSaveChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingChurch) {
        await axios.put(`${API_BASE}/iglesias/${editingChurch.id}`, churchFormData);
        triggerToast('Iglesia actualizada');
      } else {
        await axios.post(`${API_BASE}/iglesias`, churchFormData);
        triggerToast('Iglesia creada');
      }
      setShowChurchModal(false);
      await fetchAllMetadata();
      await fetchGridValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error guardando iglesia', 'error');
    }
  };

  const handleDeleteChurch = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar la iglesia "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await axios.delete(`${API_BASE}/iglesias/${id}`);
      triggerToast('Iglesia eliminada');
      await fetchAllMetadata();
      await fetchGridValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error eliminando iglesia', 'error');
    }
  };

  // ─── Gasto CRUD ──────────────────────────────────────────────────────
  const handleSaveGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodoId) return;
    try {
      await axios.post(`${API_BASE}/gastos`, {
        descripcion: gastoFormData.descripcion,
        monto: Number(gastoFormData.monto),
        fecha: gastoFormData.fecha,
        periodo_id: selectedPeriodoId,
        campo_fondo_id: gastoFormData.campo_fondo_id || undefined,
      });
      triggerToast('Gasto registrado con éxito');
      setShowGastoModal(false);
      setGastoFormData({
        descripcion: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        campo_fondo_id: '',
      });
      await fetchGastos();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error registrando gasto', 'error');
    }
  };

  const handleDeleteGasto = async (id: string) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    try {
      await axios.delete(`${API_BASE}/gastos/${id}`);
      triggerToast('Gasto eliminado');
      await fetchGastos();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error eliminando gasto', 'error');
    }
  };

  // ─── Periodos CRUD ───────────────────────────────────────────────────
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/periodos`, periodFormData);
      triggerToast('Período contable creado');
      setShowPeriodModal(false);
      setPeriodFormData({ nombre: '', fecha_inicio: '', fecha_fin: '' });
      await fetchAllMetadata();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error creando período', 'error');
    }
  };

  const handleTogglePeriodState = async (periodo: any) => {
    const isClosing = periodo.estado === 'abierto';
    if (
      isClosing &&
      !window.confirm(
        `¿Cerrar el período "${periodo.nombre}"? Esto bloqueará las modificaciones contables.`
      )
    )
      return;

    try {
      if (isClosing) {
        await axios.put(`${API_BASE}/periodos/${periodo.id}/cerrar`);
        triggerToast('Período cerrado');
      } else {
        await axios.put(`${API_BASE}/periodos/${periodo.id}/reabrir`);
        triggerToast('Período reabierto');
      }
      await fetchAllMetadata();
      await fetchGridValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error cambiando estado del período', 'error');
    }
  };

  // ─── Users CRUD ──────────────────────────────────────────────────────
  const openCreateUserModal = () => {
    setEditingUser(null);
    setUserFormData({
      nombre_completo: '',
      email: '',
      password: '',
      rol: 'iglesia',
      iglesia_id: iglesias[0]?.id || '',
    });
    setShowUserModal(true);
  };

  const openEditUserModal = (usr: any) => {
    setEditingUser(usr);
    setUserFormData({
      nombre_completo: usr.nombre_completo || '',
      email: usr.email || '',
      password: '',
      rol: usr.rol || 'iglesia',
      iglesia_id: usr.iglesia_id || '',
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload: any = {
          nombre_completo: userFormData.nombre_completo,
          email: userFormData.email,
          rol: userFormData.rol,
          iglesia_id: userFormData.rol === 'iglesia' ? userFormData.iglesia_id : null,
        };
        if (userFormData.password) payload.password = userFormData.password;
        await axios.put(`${API_BASE}/usuarios/${editingUser.id}`, payload);
        triggerToast('Usuario actualizado');
      } else {
        await axios.post(`${API_BASE}/usuarios`, userFormData);
        triggerToast('Usuario creado con éxito');
      }
      setShowUserModal(false);
      await fetchAllMetadata();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error guardando usuario', 'error');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar al usuario "${name}"?`)) return;
    try {
      await axios.delete(`${API_BASE}/usuarios/${id}`);
      triggerToast('Usuario eliminado');
      await fetchAllMetadata();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error eliminando usuario', 'error');
    }
  };

  // ─── Tablas CRUD ─────────────────────────────────────────────────────
  const openCreateTablaModal = () => {
    setEditingTabla(null);
    setTablaFormData({
      nombre: '',
      iglesia_ids: [],
      campo_ids: [],
    });
    setShowTablaModal(true);
  };

  const openEditTablaModal = (tbl: any) => {
    setEditingTabla(tbl);
    setTablaFormData({
      nombre: tbl.nombre || '',
      iglesia_ids: tbl.iglesias?.map((i: any) => i.id) || [],
      campo_ids: tbl.campos?.map((c: any) => c.campo_id || c.campo?.id) || [],
    });
    setShowTablaModal(true);
  };

  const handleSaveTabla = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTabla) {
        await axios.put(`${API_BASE}/tablas/${editingTabla.id}`, tablaFormData);
        triggerToast('Tabla actualizada');
      } else {
        await axios.post(`${API_BASE}/tablas`, tablaFormData);
        triggerToast('Tabla creada con éxito');
      }
      setShowTablaModal(false);
      await fetchAllMetadata();
      await fetchGridValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error guardando tabla', 'error');
    }
  };

  const handleDeleteTabla = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar la tabla "${name}"? Las iglesias quedarán sin tabla asignada.`)) return;
    try {
      await axios.delete(`${API_BASE}/tablas/${id}`);
      triggerToast('Tabla eliminada');
      await fetchAllMetadata();
      await fetchGridValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error eliminando tabla', 'error');
    }
  };

  // ─── Campos CRUD ─────────────────────────────────────────────────────
  const openCreateCampoModal = () => {
    setEditingCampo(null);
    setCampoFormData({
      nombre: '',
      slug: '',
      tipo: 'moneda',
      modo_calculo: 'manual',
      formula: '',
      tipo_redondeo: 'ninguno',
      multiplo_redondeo: 1,
      es_acumulable: false,
      es_fondo: false,
      es_transito: false,
      seccion: 'Ingresos',
      seccion_iglesia: 'Ingresos',
      seccion_tesorero: 'Ingresos',
      visible_para_iglesia: true,
      visible_para_tesorero: true,
      aplica_a_todas_las_iglesias: true,
    });
    setShowCampoModal(true);
  };

  const openEditCampoModal = (campo: any) => {
    setEditingCampo(campo);
    setCampoFormData({
      nombre: campo.nombre || '',
      slug: campo.slug || '',
      tipo: campo.tipo || 'moneda',
      modo_calculo: campo.modo_calculo || 'manual',
      formula: campo.formula || '',
      tipo_redondeo: campo.tipo_redondeo || 'ninguno',
      multiplo_redondeo: campo.multiplo_redondeo ? Number(campo.multiplo_redondeo) : 1,
      es_acumulable: !!campo.es_acumulable,
      es_fondo: !!campo.es_fondo,
      es_transito: !!campo.es_transito,
      seccion: campo.seccion || 'Ingresos',
      seccion_iglesia: campo.seccion_iglesia || campo.seccion || 'Ingresos',
      seccion_tesorero: campo.seccion_tesorero || campo.seccion || 'Ingresos',
      visible_para_iglesia: campo.visible_para_iglesia !== false,
      visible_para_tesorero: campo.visible_para_tesorero !== false,
      aplica_a_todas_las_iglesias: campo.aplica_a_todas_las_iglesias !== false,
    });
    setShowCampoModal(true);
  };

  const handleSaveCampo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCampo) {
        await axios.put(`${API_BASE}/campos/${editingCampo.id}`, campoFormData);
        triggerToast('Columna actualizada');
      } else {
        await axios.post(`${API_BASE}/campos`, campoFormData);
        triggerToast('Columna creada con éxito');
      }
      setShowCampoModal(false);
      await fetchAllMetadata();
      await fetchGridValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error guardando columna', 'error');
    }
  };

  const handleDeleteCampo = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar la columna "${name}"? Esta acción eliminará los valores registrados.`)) return;
    try {
      await axios.delete(`${API_BASE}/campos/${id}`);
      triggerToast('Columna eliminada');
      await fetchAllMetadata();
      await fetchGridValues();
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error eliminando columna', 'error');
    }
  };

  // ─── Export Excel Handler ────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (!selectedPeriodoId) return;
    try {
      const targetTabla = selectedTablaId || 'all';
      const response = await axios.get(
        `${API_BASE}/reportes/exportar?periodo_id=${selectedPeriodoId}&tabla_id=${targetTabla}`,
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const periodName = currentPeriodObj?.nombre || 'Periodo';
      link.setAttribute('download', `Reporte_Financiero_${periodName.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      triggerToast('Descarga de Excel iniciada');
    } catch {
      triggerToast('No se pudo descargar el reporte Excel', 'error');
    }
  };

  // ─── Filtered Lists ──────────────────────────────────────────────────
  const filteredIglesias = useMemo(() => {
    return iglesias.filter((i) => {
      const matchSearch =
        i.nombre.toLowerCase().includes(churchSearch.toLowerCase()) ||
        (i.codigo && i.codigo.toLowerCase().includes(churchSearch.toLowerCase())) ||
        (i.nombre_pastor && i.nombre_pastor.toLowerCase().includes(churchSearch.toLowerCase()));
      const matchStatus = churchFilterStatus === 'all' || i.estado === churchFilterStatus;
      return matchSearch && matchStatus;
    });
  }, [iglesias, churchSearch, churchFilterStatus]);

  const filteredCampos = useMemo(() => {
    return campos.filter((c) => {
      const matchSearch =
        c.nombre.toLowerCase().includes(camposSearch.toLowerCase()) ||
        c.slug.toLowerCase().includes(camposSearch.toLowerCase());
      let matchType = true;
      if (camposFilterType === 'manual') matchType = c.modo_calculo === 'manual';
      if (camposFilterType === 'calculado') matchType = c.modo_calculo === 'calculado';
      if (camposFilterType === 'fondo') matchType = !!c.es_fondo;
      return matchSearch && matchType;
    });
  }, [campos, camposSearch, camposFilterType]);

  const filteredUsers = useMemo(() => {
    return usuarios.filter((u) => {
      return (
        u.nombre_completo?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
      );
    });
  }, [usuarios, userSearch]);

  const filteredAudits = useMemo(() => {
    return auditorias.filter((a) => {
      if (auditEntityFilter === 'all') return true;
      return a.entidad === auditEntityFilter;
    });
  }, [auditorias, auditEntityFilter]);

  // Digitación fields grouped
  const activeFieldsForCurrentChurch = useMemo(() => {
    if (!gridData?.columnas) return [];
    return gridData.columnas;
  }, [gridData]);

  const ingresosCols = activeFieldsForCurrentChurch.filter(
    (c: any) => (c.seccion_tesorero || c.seccion_iglesia || c.seccion) === 'Ingresos' && c.modo_calculo === 'manual'
  );

  const egresosCols = activeFieldsForCurrentChurch.filter(
    (c: any) => (c.seccion_tesorero || c.seccion_iglesia || c.seccion) === 'Egresos' && c.modo_calculo === 'manual'
  );

  const informativosCols = activeFieldsForCurrentChurch.filter(
    (c: any) =>
      c.modo_calculo === 'manual' &&
      (c.seccion_tesorero || c.seccion_iglesia || c.seccion) !== 'Ingresos' &&
      (c.seccion_tesorero || c.seccion_iglesia || c.seccion) !== 'Egresos'
  );

  const calculosCols = activeFieldsForCurrentChurch.filter((c: any) => c.modo_calculo === 'calculado');

  return (
    <div className="fixed inset-0 w-full h-full max-w-full overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans">
      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-center pointer-events-none animate-fade-in">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-emerald-600 text-white border-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* ─── HEADER MÓVIL PROFESIONAL ─── */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            aria-label="Abrir Menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight truncate flex items-center gap-1.5">
              <span>TesorApp</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold uppercase">
                Tesorero
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {currentPeriodObj?.nombre || 'Período Activo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowCopilot(true)}
            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg cursor-pointer relative"
            title="Asistente IA"
          >
            <Sparkles className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
          </button>

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onLogout}
            className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── DRAWER LATERAL DE MÓDULOS ─── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-slide-right divide-y divide-slate-100 dark:divide-slate-800">
            {/* Drawer Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  T
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">Panel del Tesorero</h3>
                  <p className="text-[10px] text-slate-400">{user?.nombre_completo || 'Administrador'}</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs font-semibold">
              {[
                { id: 'digitacion', label: '1. Matriz y Digitación', icon: DollarSign },
                { id: 'iglesias', label: '2. Gestión de Iglesias', icon: Building2 },
                { id: 'tablas', label: '3. Gestión de Tablas', icon: TableIcon },
                { id: 'gastos', label: '4. Gastos y Fondos', icon: TrendingUp },
                { id: 'columnas', label: '5. Columnas y Plantillas', icon: Sliders },
                { id: 'periodos', label: '6. Períodos Contables', icon: Calendar },
                { id: 'usuarios', label: '7. Usuarios y Accesos', icon: Users },
                { id: 'auditoria', label: '8. Auditoría de Cambios', icon: History },
                { id: 'reportes', label: '9. Reportes y Excel', icon: FileSpreadsheet },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as MainTab);
                      setDrawerOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                );
              })}
            </div>

            {/* Switch to Desktop Button */}
            <div className="p-3 space-y-2">
              <button
                onClick={onSwitchToDesktop}
                className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Modo Computador / Desktop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTENIDO PRINCIPAL SEGÚN PESTAÑA ─── */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain w-full max-w-full pb-24 touch-pan-y">
        {/* ========================================================================= */}
        {/* MÓDULO 1: DIGITACIÓN Y REVISIÓN DE INFORMES PASTORALES                    */}
        {/* ========================================================================= */}
        {activeTab === 'digitacion' && (
          <div className="w-full flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            {/* BARRA SUPERIOR DE SELECTORES COMPACTOS */}
            <div className="bg-white dark:bg-slate-900 p-3 space-y-2">
              {/* Selectores de Período y Tabla */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                    Período Contable
                  </label>
                  <select
                    value={selectedPeriodoId}
                    onChange={(e) => setSelectedPeriodoId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                  >
                    {periodos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.estado})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                    Tabla / Zona
                  </label>
                  <select
                    value={selectedTablaId}
                    onChange={(e) => setSelectedTablaId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value="all">🌐 Todas las Tablas</option>
                    {tablas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} ({t.iglesias?.length || 0})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selector de Iglesia */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                  Seleccionar Congregación
                </label>
                <select
                  value={selectedChurchId}
                  onChange={(e) => setSelectedChurchId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 focus:outline-none focus:border-indigo-600"
                >
                  {gridData?.filas?.map((f: any) => (
                    <option key={f.iglesia_id} value={f.iglesia_id}>
                      {f.iglesia_nombre} {f.codigo ? `(${f.codigo})` : ''} - [{f.estado_informe || 'borrador'}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Estado del Informe & Acciones de Flujo */}
              {currentChurchRow && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-500">Estado:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        currentChurchRow.estado_informe === 'aprobado'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : currentChurchRow.estado_informe === 'revisado'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : currentChurchRow.estado_informe === 'enviado'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {currentChurchRow.estado_informe || 'Borrador'}
                    </span>
                  </div>

                  {/* Botones de Aprobación */}
                  <div className="flex items-center gap-1">
                    {currentChurchRow.estado_informe !== 'aprobado' && (
                      <button
                        onClick={() => handleUpdateReportStatus('aprobado')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Aprobar
                      </button>
                    )}
                    {currentChurchRow.estado_informe === 'aprobado' && (
                      <button
                        onClick={() => handleUpdateReportStatus('borrador')}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Reabrir
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 1: INGRESOS */}
            <div className="bg-white dark:bg-slate-900">
              <div className="px-3.5 py-2 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  1. Ingresos Manuales
                </span>
                <span className="font-mono text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                  {formatCOP(
                    ingresosCols.reduce(
                      (acc: number, c: any) => acc + (Number(localValues[c.id]) || 0),
                      0
                    )
                  )}
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {ingresosCols.length === 0 ? (
                  <p className="p-3 text-xs text-slate-400 italic">No hay campos de ingresos.</p>
                ) : (
                  ingresosCols.map((col: any) => (
                    <div key={col.id} className="px-3.5 py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                          {col.nombre}
                        </span>
                        {col.es_fondo && (
                          <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold">🏛️ Fondo</span>
                        )}
                      </div>
                      <div className="w-36 relative">
                        <span className="absolute left-2.5 top-1.5 text-xs font-mono text-slate-400">$</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={localValues[col.id] === 0 ? '' : localValues[col.id] ?? ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setLocalValues((prev) => ({ ...prev, [col.id]: val }));
                          }}
                          className="w-full pl-6 pr-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-mono font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SECCIÓN 2: EGRESOS */}
            <div className="bg-white dark:bg-slate-900">
              <div className="px-3.5 py-2 bg-rose-50/70 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/50 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  2. Egresos y Retenciones
                </span>
                <span className="font-mono text-xs font-extrabold text-rose-800 dark:text-rose-300">
                  {formatCOP(
                    egresosCols.reduce(
                      (acc: number, c: any) => acc + (Number(localValues[c.id]) || 0),
                      0
                    )
                  )}
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {egresosCols.length === 0 ? (
                  <p className="p-3 text-xs text-slate-400 italic">No hay campos de egresos.</p>
                ) : (
                  egresosCols.map((col: any) => (
                    <div key={col.id} className="px-3.5 py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                          {col.nombre}
                        </span>
                      </div>
                      <div className="w-36 relative">
                        <span className="absolute left-2.5 top-1.5 text-xs font-mono text-slate-400">$</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={localValues[col.id] === 0 ? '' : localValues[col.id] ?? ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setLocalValues((prev) => ({ ...prev, [col.id]: val }));
                          }}
                          className="w-full pl-6 pr-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-mono font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SECCIÓN 3: INFORMATIVOS */}
            {informativosCols.length > 0 && (
              <div className="bg-white dark:bg-slate-900">
                <div className="px-3.5 py-2 bg-amber-50/70 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/50 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    3. Aportes e Informativos
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Ingreso manual</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {informativosCols.map((col: any) => (
                    <div key={col.id} className="px-3.5 py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                          {col.nombre}
                        </span>
                      </div>
                      <div className="w-36 relative">
                        <span className="absolute left-2.5 top-1.5 text-xs font-mono text-slate-400">$</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={localValues[col.id] === 0 ? '' : localValues[col.id] ?? ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setLocalValues((prev) => ({ ...prev, [col.id]: val }));
                          }}
                          className="w-full pl-6 pr-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-mono font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN 4: CÁLCULOS AUTOMÁTICOS */}
            {calculosCols.length > 0 && (
              <div className="bg-white dark:bg-slate-900">
                <div className="px-3.5 py-2 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                    4. Cálculos y Saldo
                  </span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold">Automático</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {calculosCols.map((col: any) => {
                    const cell = currentChurchRow?.valores?.find((v: any) => v.campo_id === col.id);
                    const val = cell?.valor_calculado ?? cell?.valor_manual ?? 0;
                    return (
                      <div key={col.id} className="px-3.5 py-2.5 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {col.nombre}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">fx: {col.formula}</span>
                        </div>
                        <span className="font-mono text-sm font-black text-blue-700 dark:text-blue-300 shrink-0">
                          {formatCOP(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BOTÓN INFERIOR DE GUARDAR VALORES */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleSaveChurchValues}
                disabled={savingValues}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{savingValues ? 'Guardando y recalculando...' : 'Guardar y Recalcular Valores'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MÓDULO 2: GESTIÓN DE IGLESIAS                                             */}
        {/* ========================================================================= */}
        {activeTab === 'iglesias' && (
          <div className="w-full flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            {/* Header & Search */}
            <div className="bg-white dark:bg-slate-900 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Directorio de Iglesias ({filteredIglesias.length})
                  </h2>
                </div>
                <button
                  onClick={openCreateChurchModal}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva Iglesia
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, código o pastor..."
                  value={churchSearch}
                  onChange={(e) => setChurchSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Status filter pills */}
              <div className="flex items-center gap-1 pt-1">
                {(['all', 'activa', 'inactiva'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setChurchFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition cursor-pointer ${
                      churchFilterStatus === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {st === 'all' ? 'Todas' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIglesias.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">No se encontraron iglesias.</p>
              ) : (
                filteredIglesias.map((church) => {
                  const tblName = tablas.find((t) => t.id === church.tabla_id)?.nombre || 'Sin Tabla';
                  return (
                    <div key={church.id} className="p-3.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {church.nombre}
                          </span>
                          {church.codigo && (
                            <span className="text-[10px] font-mono font-bold px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {church.codigo}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          Pastor: {church.nombre_pastor || 'No asignado'} • Tabla: {tblName}
                        </p>
                        {church.telefono && (
                          <p className="text-[10px] font-mono text-slate-400">Tel: {church.telefono}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditChurchModal(church)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteChurch(church.id, church.nombre)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MÓDULO 3: GASTOS Y FONDOS CONTABLES                                       */}
        {/* ========================================================================= */}
        {activeTab === 'gastos' && (
          <div className="w-full flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Gastos y Fondos ({currentPeriodObj?.nombre || 'Período Activo'})
                  </h2>
                </div>
                <button
                  onClick={() => setShowGastoModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar Gasto
                </button>
              </div>
            </div>

            {/* Resumen de Fondos */}
            {resumenFondos.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-3.5 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Resumen de Fondos Disponibles
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {resumenFondos.map((rf) => (
                    <div
                      key={rf.campo_id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                    >
                      <span className="text-[10px] font-semibold text-slate-500 block truncate">
                        {rf.campo_nombre}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                        {formatCOP(rf.saldo_disponible)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de Gastos */}
            <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/40">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                  Historial de Egresos ({gastos.length})
                </span>
              </div>

              {gastos.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">No hay gastos registrados en este período.</p>
              ) : (
                gastos.map((g) => (
                  <div key={g.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                        {g.descripcion}
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Fecha: {new Date(g.fecha).toLocaleDateString('es-CO')}
                        {g.campo_fondo ? ` • Fondo: ${g.campo_fondo.nombre}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-extrabold text-rose-600 dark:text-rose-400">
                        -{formatCOP(g.monto)}
                      </span>
                      <button
                        onClick={() => handleDeleteGasto(g.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MÓDULO 4: GESTIÓN DE COLUMNAS Y PLANTILLAS                                */}
        {/* ========================================================================= */}
        {activeTab === 'columnas' && (
          <div className="w-full flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            {/* Header & Search */}
            <div className="bg-white dark:bg-slate-900 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Catálogo de Columnas ({filteredCampos.length})
                </h2>
                <button
                  onClick={openCreateCampoModal}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva Columna
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar columna..."
                  value={camposSearch}
                  onChange={(e) => setCamposSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Type filter pills */}
              <div className="flex items-center gap-1 pt-1">
                {(['all', 'manual', 'calculado', 'fondo'] as const).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setCamposFilterType(tp)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition cursor-pointer ${
                      camposFilterType === tp
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tp === 'all' ? 'Todas' : tp}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCampos.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">No se encontraron columnas.</p>
              ) : (
                filteredCampos.map((col) => (
                  <div key={col.id} className="p-3.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {col.nombre}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {col.slug}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {col.modo_calculo === 'calculado' ? `fx: ${col.formula}` : 'Manual'} • Sección: {col.seccion}
                        {col.es_fondo ? ' • 🏛️ Fondo' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditCampoModal(col)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampo(col.id, col.nombre)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MÓDULO 5: GESTIÓN DE TABLAS                                               */}
        {/* ========================================================================= */}
        {activeTab === 'tablas' && (
          <div className="w-full flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            <div className="bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Tablas Contables ({tablas.length})
              </h2>
              <button
                onClick={openCreateTablaModal}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva Tabla
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {tablas.map((t) => (
                <div key={t.id} className="p-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      {t.nombre}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.iglesias?.length || 0} iglesias asociadas • {t.campos?.length || 0} columnas
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditTablaModal(t)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTabla(t.id, t.nombre)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MÓDULO 6: PERÍODOS CONTABLES                                              */}
        {/* ========================================================================= */}
        {activeTab === 'periodos' && (
          <div className="w-full flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            <div className="bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Períodos Contables ({periodos.length})
              </h2>
              <button
                onClick={() => setShowPeriodModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo Período
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {periodos.map((p) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{p.nombre}</span>
                      <span
                        className={`px-2 py-0.2 rounded text-[10px] font-extrabold uppercase ${
                          p.estado === 'abierto'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {p.estado}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {new Date(p.fecha_inicio).toLocaleDateString('es-CO')} - {new Date(p.fecha_fin).toLocaleDateString('es-CO')}
                    </p>
                  </div>

                  <button
                    onClick={() => handleTogglePeriodState(p)}
                    className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      p.estado === 'abierto'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {p.estado === 'abierto' ? (
                      <>
                        <Lock className="w-3.5 h-3.5" /> Cerrar
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" /> Reabrir
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MÓDULO 7: GESTIÓN DE USUARIOS                                             */}
        {/* ========================================================================= */}
        {activeTab === 'usuarios' && (
          <div className="w-full flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            <div className="bg-white dark:bg-slate-900 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Usuarios del Sistema ({filteredUsers.length})
                </h2>
                <button
                  onClick={openCreateUserModal}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo Usuario
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((usr) => (
                <div key={usr.id} className="p-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {usr.nombre_completo}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                          usr.rol === 'tesorero'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {usr.rol}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {usr.email}
                      {usr.iglesia ? ` • Iglesia: ${usr.iglesia.nombre}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditUserModal(usr)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(usr.id, usr.nombre_completo)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MÓDULO 8: AUDITORÍA DE CAMBIOS                                            */}
        {/* ========================================================================= */}
        {activeTab === 'auditoria' && (
          <div className="w-full flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            <div className="bg-white dark:bg-slate-900 p-3.5 space-y-2">
              <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Auditoría y Registro de Cambios ({filteredAudits.length})
              </h2>

              <select
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="all">🔍 Todas las Entidades</option>
                <option value="valor">Valores y Celdas</option>
                <option value="campo_plantilla">Columnas y Campos</option>
                <option value="iglesia">Iglesias</option>
                <option value="periodo">Períodos</option>
                <option value="gasto">Gastos</option>
                <option value="tabla">Tablas</option>
              </select>
            </div>

            <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAudits.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">No hay registros de auditoría.</p>
              ) : (
                filteredAudits.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedAuditLog(log)}
                    className="p-3.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                          {log.accion}: {log.entidad}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Por: {log.usuario?.nombre_completo || 'Sistema'} • {new Date(log.realizado_en).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MÓDULO 9: REPORTES Y EXPORTACIONES                                        */}
        {/* ========================================================================= */}
        {activeTab === 'reportes' && (
          <div className="w-full flex flex-col p-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportación Consolidada Excel</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Genera la hoja de cálculo completa con todas las iglesias, columnas y fórmulas del período activo.
              </p>

              <button
                onClick={handleExportExcel}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Reporte Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ─── BARRA DE NAVEGACIÓN INFERIOR FIJA ─── */}
      <nav className="h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-1 shadow-lg">
        {[
          { id: 'digitacion', label: 'Digitación', icon: DollarSign },
          { id: 'iglesias', label: 'Iglesias', icon: Building2 },
          { id: 'gastos', label: 'Gastos', icon: TrendingUp },
          { id: 'columnas', label: 'Columnas', icon: Sliders },
          { id: 'reportes', label: 'Reportes', icon: FileSpreadsheet },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as MainTab)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer min-h-[44px] ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ─── MODAL CREAR / EDITAR IGLESIA ─── */}
      {showChurchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">
                {editingChurch ? 'Editar Iglesia' : 'Nueva Iglesia'}
              </h3>
              <button onClick={() => setShowChurchModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveChurch} className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Nombre Sede *</label>
                <input
                  type="text"
                  required
                  value={churchFormData.nombre}
                  onChange={(e) => setChurchFormData({ ...churchFormData, nombre: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Código</label>
                  <input
                    type="text"
                    value={churchFormData.codigo}
                    onChange={(e) => setChurchFormData({ ...churchFormData, codigo: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Tabla / Zona</label>
                  <select
                    value={churchFormData.tabla_id}
                    onChange={(e) => setChurchFormData({ ...churchFormData, tabla_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="">Sin Tabla</option>
                    {tablas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Pastor Encargado</label>
                <input
                  type="text"
                  value={churchFormData.nombre_pastor}
                  onChange={(e) => setChurchFormData({ ...churchFormData, nombre_pastor: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Teléfono</label>
                  <input
                    type="text"
                    value={churchFormData.telefono}
                    onChange={(e) => setChurchFormData({ ...churchFormData, telefono: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Estado</label>
                  <select
                    value={churchFormData.estado}
                    onChange={(e) => setChurchFormData({ ...churchFormData, estado: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="activa">Activa</option>
                    <option value="inactiva">Inactiva</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowChurchModal(false)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL REGISTRAR GASTO ─── */}
      {showGastoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">
                Registrar Nuevo Gasto
              </h3>
              <button onClick={() => setShowGastoModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveGasto} className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Descripción *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago de seguro mensual..."
                  value={gastoFormData.descripcion}
                  onChange={(e) => setGastoFormData({ ...gastoFormData, descripcion: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Monto (COP) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={gastoFormData.monto}
                    onChange={(e) => setGastoFormData({ ...gastoFormData, monto: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Fecha</label>
                  <input
                    type="date"
                    required
                    value={gastoFormData.fecha}
                    onChange={(e) => setGastoFormData({ ...gastoFormData, fecha: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">
                  Fondo Afectado (Opcional)
                </label>
                <select
                  value={gastoFormData.campo_fondo_id}
                  onChange={(e) => setGastoFormData({ ...gastoFormData, campo_fondo_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                >
                  <option value="">Gasto General / Ninguno</option>
                  {campos
                    .filter((c) => c.es_fondo)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGastoModal(false)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CREAR PERÍODO ─── */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">
                Nuevo Período Contable
              </h3>
              <button onClick={() => setShowPeriodModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Nombre del Período *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Septiembre 2026"
                  value={periodFormData.nombre}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, nombre: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Fecha Inicio *</label>
                  <input
                    type="date"
                    required
                    value={periodFormData.fecha_inicio}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, fecha_inicio: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Fecha Fin *</label>
                  <input
                    type="date"
                    required
                    value={periodFormData.fecha_fin}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, fecha_fin: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-[11px]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(false)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Crear Período
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CREAR / EDITAR USUARIO ─── */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={() => setShowUserModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={userFormData.nombre_completo}
                  onChange={(e) => setUserFormData({ ...userFormData, nombre_completo: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">
                  {editingUser ? 'Contraseña (dejar en blanco para conservar)' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Rol</label>
                  <select
                    value={userFormData.rol}
                    onChange={(e) => setUserFormData({ ...userFormData, rol: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="iglesia">Pastor / Iglesia</option>
                    <option value="tesorero">Tesorero General</option>
                  </select>
                </div>

                {userFormData.rol === 'iglesia' && (
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Iglesia Asignada</label>
                    <select
                      value={userFormData.iglesia_id}
                      onChange={(e) => setUserFormData({ ...userFormData, iglesia_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                    >
                      {iglesias.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CREAR / EDITAR TABLA ─── */}
      {showTablaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">
                {editingTabla ? 'Editar Tabla' : 'Nueva Tabla'}
              </h3>
              <button onClick={() => setShowTablaModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveTabla} className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Nombre de la Tabla *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: ZONA 52"
                  value={tablaFormData.nombre}
                  onChange={(e) => setTablaFormData({ ...tablaFormData, nombre: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTablaModal(false)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Guardar Tabla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CREAR / EDITAR CAMPO ─── */}
      {showCampoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">
                {editingCampo ? 'Editar Columna' : 'Nueva Columna'}
              </h3>
              <button onClick={() => setShowCampoModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveCampo} className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Nombre de la Columna *</label>
                <input
                  type="text"
                  required
                  value={campoFormData.nombre}
                  onChange={(e) => {
                    const val = e.target.value;
                    const slugGen = val
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9_]/g, '_')
                      .replace(/^_+|_+$/g, '');
                    setCampoFormData({
                      ...campoFormData,
                      nombre: val,
                      slug: editingCampo ? campoFormData.slug : slugGen,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Identificador (Slug)</label>
                  <input
                    type="text"
                    disabled={!!editingCampo}
                    value={campoFormData.slug}
                    onChange={(e) => setCampoFormData({ ...campoFormData, slug: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono text-[10px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Modo de Cálculo</label>
                  <select
                    value={campoFormData.modo_calculo}
                    onChange={(e) => setCampoFormData({ ...campoFormData, modo_calculo: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold"
                  >
                    <option value="manual">Manual (Digitado)</option>
                    <option value="calculado">Calculado (Fórmula)</option>
                  </select>
                </div>
              </div>

              {campoFormData.modo_calculo === 'calculado' && (
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Fórmula *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: diezmos * 0.10"
                    value={campoFormData.formula}
                    onChange={(e) => setCampoFormData({ ...campoFormData, formula: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono text-indigo-600 font-bold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Sección Formulario</label>
                  <select
                    value={campoFormData.seccion}
                    onChange={(e) =>
                      setCampoFormData({
                        ...campoFormData,
                        seccion: e.target.value,
                        seccion_iglesia: e.target.value,
                        seccion_tesorero: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="Ingresos">1. Ingresos</option>
                    <option value="Egresos">2. Egresos</option>
                    <option value="Informativo">3. Informativo</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={campoFormData.es_fondo}
                      onChange={(e) => setCampoFormData({ ...campoFormData, es_fondo: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Es Fondo Contable</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCampoModal(false)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Guardar Columna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL DETALLE DE AUDITORÍA ─── */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">
                Detalle de Auditoría
              </h3>
              <button onClick={() => setSelectedAuditLog(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong>Acción:</strong> {selectedAuditLog.accion}</p>
              <p><strong>Entidad:</strong> {selectedAuditLog.entidad}</p>
              <p><strong>Usuario:</strong> {selectedAuditLog.usuario?.nombre_completo || 'Sistema'}</p>
              <p><strong>Fecha:</strong> {new Date(selectedAuditLog.realizado_en).toLocaleString('es-CO')}</p>

              {selectedAuditLog.valor_anterior && (
                <div>
                  <p className="font-bold text-rose-600">Valor Anterior:</p>
                  <pre className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-[10px] overflow-x-auto">
                    {JSON.stringify(selectedAuditLog.valor_anterior, null, 2)}
                  </pre>
                </div>
              )}

              {selectedAuditLog.valor_nuevo && (
                <div>
                  <p className="font-bold text-emerald-600">Valor Nuevo:</p>
                  <pre className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-[10px] overflow-x-auto">
                    {JSON.stringify(selectedAuditLog.valor_nuevo, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI COPILOT DRAWER ─── */}
      <AICopilotDrawer
        isOpen={showCopilot}
        onClose={() => setShowCopilot(false)}
        gridData={gridData}
        currentPeriod={currentPeriodObj}
        iglesias={iglesias}
      />
    </div>
  );
}
