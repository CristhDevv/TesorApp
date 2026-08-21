import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, 
  History, 
  FileSpreadsheet, 
  LogOut, 
  TrendingUp, 
  Calculator, 
  ChevronRight,
  User,
  Calendar,
  Search
} from 'lucide-react';
import { OfflineBanner } from './components/OfflineBanner';
import { ChurchSearchModal } from './components/ChurchSearchModal';

const API_BASE = window.location.origin;

const formatCOP = (val: number | string) => {
  const num = Number(val || 0);
  return '$' + Math.round(num).toLocaleString('es-CO');
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [activeScreen, setActiveScreen] = useState<'capture' | 'history' | 'summary' | 'profile'>('capture');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showChurchSearch, setShowChurchSearch] = useState(false);

  // Auth form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Dropdown list
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');
  
  const [tablas, setTablas] = useState<any[]>([]);
  const [selectedTabla, setSelectedTabla] = useState<string>('');
  
  const [iglesias, setIglesias] = useState<any[]>([]);
  const [selectedIglesia, setSelectedIglesia] = useState<string>('');

  // Grid values (fields and inputs)
  const [gridData, setGridData] = useState<any>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

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
    } catch (err) {
      handleLogout();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        correo: loginEmail,
        contrasena: loginPass
      });
      localStorage.setItem('token', res.data.access_token);
      setToken(res.data.access_token);
      setUser(res.data.user);
      triggerToast('Sesión iniciada con éxito');
    } catch (err: any) {
      triggerToast(err.response?.data?.message || 'Error en autenticación', 'error');
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

      const isTesorero = user.rol === 'tesorero';
      if (tabRes.data.length > 0) {
        let defaultTabId = '';
        if (isTesorero) {
          defaultTabId = tabRes.data[0].id;
        } else {
          // Find table that contains this church
          const matchedTab = tabRes.data.find((t: any) => 
            t.iglesias.some((i: any) => i.id === (user.iglesiaId || user.iglesia_id))
          );
          if (matchedTab) defaultTabId = matchedTab.id;
        }
        setSelectedTabla(defaultTabId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDropdowns();
    }
  }, [user]);

  // Set churches list based on selected table
  useEffect(() => {
    if (selectedTabla) {
      const matched = tablas.find(t => t.id === selectedTabla);
      if (matched) {
        setIglesias(matched.iglesias);
        const isTesorero = user?.rol === 'tesorero';
        if (matched.iglesias.length > 0) {
          if (isTesorero) {
            setSelectedIglesia(matched.iglesias[0].id);
          } else {
            setSelectedIglesia(user.iglesiaId || user.iglesia_id);
          }
        }
      }
    }
  }, [selectedTabla, tablas, user]);

  // Load actual values for selected church, table, and period
  const fetchValues = async () => {
    if (!selectedTabla || !selectedPeriodo || !selectedIglesia) return;
    try {
      const res = await axios.get(`${API_BASE}/valores?tabla_id=${selectedTabla}&periodo_id=${selectedPeriodo}`);
      setGridData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchValues();
  }, [selectedTabla, selectedPeriodo, selectedIglesia]);

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

  const currentPeriodObj = periodos.find(p => p.id === selectedPeriodo);
  const isPeriodOpen = currentPeriodObj?.estado === 'abierto';

  // Get current row values for the selected church
  const currentChurchRow = gridData?.filas?.find((r: any) => r.iglesia_id === selectedIglesia);
  const columns = gridData?.columnas || [];

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-50 p-6 relative overflow-hidden">
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto z-10">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-slate-100 text-slate-800 rounded-xl mb-4 border border-slate-200">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TesorApp</h1>
            <p className="text-slate-500 text-xs mt-1">Acceso Móvil de Tesorería</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500 text-sm"
                placeholder="tu@iglesia.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500 text-sm"
                placeholder="••••••••"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm transition shadow-sm active:scale-98 disabled:opacity-50 mt-2"
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        {/* Global Toast for Login */}
        {toast && (
          <div className="fixed bottom-6 left-6 right-6 z-50 flex justify-center">
            <div className="bg-slate-900 text-white px-4 py-2 rounded-full text-xs shadow-lg font-medium animate-fade-in">
              {toast.msg}
            </div>
          </div>
        )}
      </div>
    );
  }

  const isTesorero = user?.rol === 'tesorero';

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans overflow-y-auto pb-28 touch-pan-y overscroll-y-contain">
      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Dynamic Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-30 px-4 py-2.5 flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-slate-900 text-white rounded-md">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">TesorApp</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500 max-w-[120px] truncate">
              {user?.nombre_completo}
            </span>
            <button 
              onClick={handleLogout} 
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters and selectors */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
          <div>
            <select
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
            >
              {periodos.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.estado === 'cerrado' ? '🔒' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            {isTesorero ? (
              <select
                value={selectedTabla}
                onChange={(e) => setSelectedTabla(e.target.value)}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
              >
                {tablas.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-600 truncate">
                {iglesias[0]?.nombre || 'Mi Iglesia'}
              </div>
            )}
          </div>
        </div>

        {/* Church selector with Quick Search for Treasurer */}
        {isTesorero && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowChurchSearch(true)}
              className="w-full px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 flex items-center justify-between hover:bg-slate-200 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">
                  {iglesias.find((i: any) => i.id === selectedIglesia)?.nombre || 'Seleccionar Congregación'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 shrink-0 font-normal text-[10px]">
                <Search className="w-3 h-3" />
                <span>Buscar</span>
              </div>
            </button>
          </div>
        )}
      </header>

      {/* Screen 1: CAPTURE SCREEN */}
      {activeScreen === 'capture' && (
        <div className="p-4 flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {currentChurchRow?.iglesia_nombre || 'Planilla de Registro'}
            </h2>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {columns.length} Campos
            </span>
          </div>

          {!isPeriodOpen && (
            <div className="p-3 bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs flex items-center gap-2 font-medium">
              <span>Periodo Cerrado. La captura está bloqueada en modo lectura.</span>
            </div>
          )}

          {/* Render Cards / Fields */}
          <div className="space-y-3">
            {!currentChurchRow || columns.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No hay campos definidos para registrar en esta zona.
              </div>
            ) : (
              columns.map((col: any) => {
                const val = currentChurchRow.valores?.find((v: any) => v.campo_id === col.id);
                if (!val) return null;
                const isCalculated = val.modo_calculo === 'calculado';
                const value = isCalculated ? val.valor_calculado : val.valor_manual;
                const isCurrency = !col.tipo || col.tipo === 'moneda';

                return (
                  <div 
                    key={col.id} 
                    className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col gap-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{col.nombre}</h4>
                        <span className="text-[10px] text-slate-400 capitalize mt-0.5 block font-mono">
                          {col.seccion} • {isCalculated ? 'Fórmula' : 'Manual'}
                        </span>
                      </div>

                      {col.es_acumulable && (
                        <div className="text-right">
                          <span className="block text-[9px] text-slate-400 uppercase font-semibold">Acumulado</span>
                          <span className="text-xs text-slate-900 font-bold">{formatCOP(val.valor_acumulado)}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      {val.editable ? (
                        <div className="relative">
                          {isCurrency && (
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-medium text-xs">$</span>
                          )}
                          <input
                            key={`${selectedIglesia}_${selectedPeriodo}_${col.id}_${value}`}
                            type="text"
                            inputMode="numeric"
                            className={`w-full ${isCurrency ? 'pl-6' : 'pl-3'} pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-slate-500 text-sm font-mono`}
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
                        <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">Total</span>
                          <span className="text-sm font-bold font-mono text-slate-900">
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

      {/* Screen 2: HISTORY READ-ONLY */}
      {activeScreen === 'history' && (
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-base font-bold text-slate-900 mb-0.5">Hojas Históricas</h3>
          <p className="text-xs text-slate-400 mb-4">Consulte y cargue planillas de meses anteriores.</p>

          <div className="space-y-2.5 overflow-y-auto flex-1">
            {periodos.map((pe) => {
              const isCurrent = pe.id === selectedPeriodo;
              return (
                <button
                  key={pe.id}
                  onClick={() => {
                    setSelectedPeriodo(pe.id);
                    setActiveScreen('capture');
                    triggerToast(`Cargado periodo ${pe.nombre}`);
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left flex justify-between items-center transition ${
                    isCurrent 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                    <div>
                      <h4 className="font-bold text-xs">{pe.nombre}</h4>
                      <p className={`text-[10px] ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`}>
                        {pe.estado === 'abierto' ? 'Período Abierto' : 'Período Cerrado'}
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

      {/* Screen 3: METRIC SUMMARY */}
      {activeScreen === 'summary' && (
        <div className="p-4 flex-1 flex flex-col space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Resumen y Métricas</h3>
            <p className="text-xs text-slate-400 mt-0.5">Indicadores principales consolidados.</p>
          </div>

          {currentChurchRow && columns.length > 0 ? (
            <div className="space-y-3">
              {columns.map((col: any, index: number) => {
                const val = currentChurchRow.valores[index];
                if (!val) return null;
                const isCalc = val.modo_calculo === 'calculado';
                const value = isCalc ? val.valor_calculado : val.valor_manual;

                return (
                  <div key={col.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs relative overflow-hidden">
                    <div className="absolute right-4 bottom-3 text-slate-100">
                      <Calculator className="w-10 h-10" />
                    </div>
                    <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block">{col.nombre}</span>
                    <span className="text-xl font-bold font-mono block mt-1 text-slate-900">
                      {formatCOP(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">No hay datos de resumen.</div>
          )}
        </div>
      )}

      {/* Screen 4: PROFILE */}
      {activeScreen === 'profile' && (
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Configuración</h3>
            
            <div className="p-5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
              <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-xl font-bold text-slate-700 mb-2.5">
                {user?.nombre_completo?.substring(0, 2).toUpperCase()}
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{user?.nombre_completo || user?.nombre}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{user?.correo}</p>
              <p className="text-xs font-semibold text-slate-700 mt-2.5 capitalize bg-slate-100 border border-slate-200 px-3 py-0.5 rounded-full inline-block">
                Rol: {user?.rol}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-medium text-xs transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded border shadow-xl text-xs font-medium bg-slate-900 text-white border-slate-800 transition">
          {toast.msg}
        </div>
      )}

      {/* Navigation tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-14 flex items-center justify-around z-40 shadow-sm">
        <button
          onClick={() => setActiveScreen('capture')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition ${
            activeScreen === 'capture' ? 'text-slate-950 font-bold' : 'text-slate-400'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-1">Planilla</span>
        </button>

        <button
          onClick={() => setActiveScreen('history')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition ${
            activeScreen === 'history' ? 'text-slate-950 font-bold' : 'text-slate-400'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-1">Historial</span>
        </button>

        <button
          onClick={() => setActiveScreen('summary')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition ${
            activeScreen === 'summary' ? 'text-slate-950 font-bold' : 'text-slate-400'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-1">Métricas</span>
        </button>

        <button
          onClick={() => setActiveScreen('profile')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition ${
            activeScreen === 'profile' ? 'text-slate-950 font-bold' : 'text-slate-400'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-1">Perfil</span>
        </button>
      </nav>

      {/* Church Search Modal for Treasurer */}
      <ChurchSearchModal
        isOpen={showChurchSearch}
        onClose={() => setShowChurchSearch(false)}
        iglesias={iglesias}
        selectedIglesiaId={selectedIglesia}
        onSelect={(id) => setSelectedIglesia(id)}
      />
    </div>
  );
}
