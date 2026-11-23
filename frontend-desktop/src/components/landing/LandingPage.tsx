import React, { useState } from 'react';
import {
  Building2,
  FileSpreadsheet,
  Wallet,
  ShieldCheck,
  TrendingUp,
  History,
  CheckCircle2,
  ArrowRight,
  Lock,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  X,
  Users,
  Church,
  Eye,
  FileCheck2,
  Layers,
  Calculator,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface LandingPageProps {
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPass: string;
  setLoginPass: (pass: string) => void;
  onLogin: (e: React.FormEvent) => void;
  loading: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  toast: { msg: string; type: 'success' | 'error' } | null;
}

type RoleKey = 'tesorero' | 'secretario' | 'iglesia' | 'presbitero';

const ROLES_DATA: Record<
  RoleKey,
  {
    label: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    highlights: string[];
  }
> = {
  tesorero: {
    label: 'Tesorero',
    title: 'Control integral de la tesorería zonal o distrital',
    subtitle:
      'Administra períodos, configura fórmulas automáticas, consolida múltiples tablas y controla el saldo real en caja de cada fondo.',
    icon: <Calculator className="w-5 h-5" />,
    highlights: [
      'Planilla editable tipo Excel con pegado masivo y deshacer (Ctrl+Z)',
      'Motor de fórmulas personalizadas, redondeos y acumulados',
      'Gestión de ingresos, egresos y saldo continuo entre períodos',
      'Administración de iglesias, tablas, columnas y usuarios',
    ],
  },
  secretario: {
    label: 'Secretario',
    title: 'Apoyo operativo ágil con permisos seguros',
    subtitle:
      'Colabora en la digitación de planillas y consulta de reportes sin exponer configuraciones críticas ni movimientos directos de fondos.',
    icon: <FileCheck2 className="w-5 h-5" />,
    highlights: [
      'Digitación y actualización de valores en planillas abiertas',
      'Consulta de consolidados generales y reportes por iglesia',
      'Seguimiento de estados de envío y revisión de informes',
      'Protección estricta: sin creación/edición de fondos, iglesias o usuarios',
    ],
  },
  iglesia: {
    label: 'Iglesia / Pastor',
    title: 'Reporte mensual en minutos desde celular o escritorio',
    subtitle:
      'Interfaz guiada y limpia para que cada congregación registre sus aportes, vea el cálculo automático y envíe su informe con soportes.',
    icon: <Church className="w-5 h-5" />,
    highlights: [
      'Vista móvil adaptada con autoguardado por celda y por lote',
      'Cálculo automático de porcentajes y fondos en tiempo real',
      'Bóveda de recibos y comprobantes adjuntos al informe',
      'Bloqueo automático tras el envío para garantizar integridad',
    ],
  },
  presbitero: {
    label: 'Presbítero',
    title: 'Supervisión ejecutiva y transparencia en modo lectura',
    subtitle:
      'Tablero panorámico para supervisar el cumplimiento de las congregaciones, revisar consolidados y consultar auditorías sin riesgo de alteración.',
    icon: <Eye className="w-5 h-5" />,
    highlights: [
      'Tablero ejecutivo con métricas y gráficas comparativas',
      'Acceso de solo lectura a planillas, consolidados y fondos',
      'Descarga de reportes oficiales en Excel multi-hoja',
      'Consulta del historial de cambios para total tranquilidad',
    ],
  },
};

const FAQ_ITEMS = [
  {
    q: '¿Cómo evita TesorApp errores al consolidar tablas con distintas columnas?',
    a: 'Cada tabla de consolidación define su propio esquema de columnas. Al consultar el Consolidado General, el sistema respeta estrictamente las columnas asignadas a la tabla de cada iglesia, evitando sumas duplicadas entre conceptos como Fondo Nacional o porcentajes separados.',
  },
  {
    q: '¿Qué pasa con el saldo real en caja de los fondos al cambiar de período?',
    a: 'El saldo real en caja de los fondos es continuo entre períodos: arrastra automáticamente el saldo acumulado anterior, suma los aportes e ingresos del período actual y resta los egresos registrados.',
  },
  {
    q: '¿Las iglesias pueden enviar sus reportes desde el teléfono móvil?',
    a: 'Sí. Al iniciar sesión desde un dispositivo móvil o con el rol de iglesia, TesorApp activa automáticamente una vista optimizada para celular con tarjetas claras, autoguardado y envío formal del informe.',
  },
  {
    q: '¿Se puede auditar quién modificó un valor o cerró un período?',
    a: 'Sí. Toda creación, edición, cierre o reapertura queda registrada en el módulo de Auditoría (Historial de Cambios) con usuario responsable, fecha, entidad, valor anterior y valor nuevo.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  loginEmail,
  setLoginEmail,
  loginPass,
  setLoginPass,
  onLogin,
  loading,
  theme,
  onToggleTheme,
  toast,
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRole, setActiveRole] = useState<RoleKey>('tesorero');
  const [previewTab, setPreviewTab] = useState<'planilla' | 'fondos'>('planilla');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const openLogin = () => {
    setMobileMenuOpen(false);
    setShowLoginModal(true);
  };

  const roleInfo = ROLES_DATA[activeRole];

  return (
    <div className="h-screen w-screen overflow-y-auto scroll-smooth bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* ── FLOATING TOAST (Para errores de login o cierre de sesión) ── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-emerald-600 text-white border-emerald-500'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── NAVBAR FIJA ── */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 dark:bg-slate-950/85 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="#inicio" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  TESORAPP
                </span>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none">
                Plataforma Contable de Tesorería
              </p>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#caracteristicas" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Características
            </a>
            <a href="#roles" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Roles
            </a>
            <a href="#flujo" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Cómo Funciona
            </a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Preguntas
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={openLogin}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-3">
            <div className="flex flex-col gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <a
                href="#caracteristicas"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-indigo-600"
              >
                Características
              </a>
              <a
                href="#roles"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-indigo-600"
              >
                Perfiles de Usuario
              </a>
              <a
                href="#flujo"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-indigo-600"
              >
                Cómo Funciona
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-indigo-600"
              >
                Preguntas Frecuentes
              </a>
            </div>
            <button
              type="button"
              onClick={openLogin}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* ── HERO SECTION ── */}
      <section id="inicio" className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-1/2 -translate-x-1/2 w-[72rem] h-[28rem] bg-gradient-to-tr from-indigo-500/20 via-emerald-400/15 to-blue-500/20 opacity-70 dark:opacity-35 rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Hero Copy */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Contabilidad Multi-Congregacional de Alta Precisión</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                Consolidación zonal y control de fondos{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600 dark:from-indigo-400 dark:to-emerald-400">
                  sin errores ni planillas sueltas
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Centraliza los reportes mensuales de todas tus iglesias, automatiza fórmulas contables,
                supervisa fondos en caja y en tránsito, y genera balances oficiales en segundos.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  type="button"
                  onClick={openLogin}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>Acceder a la Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#flujo"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <span>Ver Cómo Funciona</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Cálculos 100% cuadrados
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Vista Desktop y Móvil
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Auditoría en cada cambio
                </span>
              </div>
            </div>

            {/* Interactive Dashboard Preview Mockup */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                {/* Mockup Window Bar */}
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('planilla')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        previewTab === 'planilla'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Planilla Consolidada
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('fondos')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        previewTab === 'fondos'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Fondos en Caja
                    </button>
                  </div>
                </div>

                {/* Mockup Content */}
                <div className="p-5 space-y-4">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block">
                        Ingresos Período
                      </span>
                      <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-900 dark:text-emerald-200">
                        $16.665.000
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70">
                      <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-400 block">
                        Saldo Real Caja
                      </span>
                      <span className="text-sm sm:text-base font-extrabold font-mono text-indigo-900 dark:text-indigo-200">
                        $8.420.500
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block">
                        Congregaciones
                      </span>
                      <span className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-white">
                        32 / 32
                      </span>
                    </div>
                  </div>

                  {previewTab === 'planilla' ? (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-[11px]">
                      <div className="grid grid-cols-4 bg-slate-100 dark:bg-slate-800/90 px-3 py-2 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px]">
                        <span>Congregación</span>
                        <span className="text-right">Fondo Nal.</span>
                        <span className="text-right">3% Zona</span>
                        <span className="text-right">Total</span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        <div className="grid grid-cols-4 px-3 py-2 items-center">
                          <span className="font-sans font-semibold text-slate-800 dark:text-slate-200 truncate">
                            Sede Central
                          </span>
                          <span className="text-right text-blue-600 dark:text-blue-400">$2.450.000</span>
                          <span className="text-right text-slate-600 dark:text-slate-300">$310.000</span>
                          <span className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                            $2.760.000
                          </span>
                        </div>
                        <div className="grid grid-cols-4 px-3 py-2 items-center bg-slate-50/50 dark:bg-slate-900/50">
                          <span className="font-sans font-semibold text-slate-800 dark:text-slate-200 truncate">
                            Zona Norte
                          </span>
                          <span className="text-right text-blue-600 dark:text-blue-400">$1.820.000</span>
                          <span className="text-right text-slate-600 dark:text-slate-300">$240.000</span>
                          <span className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                            $2.060.000
                          </span>
                        </div>
                        <div className="grid grid-cols-4 px-3 py-2 items-center">
                          <span className="font-sans font-semibold text-slate-800 dark:text-slate-200 truncate">
                            Campo Blanco Sur
                          </span>
                          <span className="text-right text-slate-400">$0</span>
                          <span className="text-right text-slate-600 dark:text-slate-300">$95.000</span>
                          <span className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                            $415.000
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs">
                      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">Fondo Local de Misiones</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Propio (Caja Continua)
                          </p>
                        </div>
                        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          $4.180.000
                        </span>
                      </div>
                      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">Fondo Nacional</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            En Tránsito · Giro a Sede Nacional
                          </p>
                        </div>
                        <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                          $11.235.200
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span>Consolidado General · Cuadre exacto al 100%</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      En línea
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CARACTERÍSTICAS PRINCIPALES (BENTO GRID) ── */}
      <section
        id="caracteristicas"
        className="py-20 bg-white dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Capacidades del Sistema
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Todo lo que tu tesorería necesita en una sola plataforma
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Diseñado específicamente para el manejo contable de congregaciones, zonas y distritos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Planilla Inteligente tipo Excel
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Navegación rápida por teclado, pegado masivo de columnas desde Excel, deshacer cambios y fórmulas dinámicas con redondeos configurables.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Consolidación Multi-Tabla Exacta
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Agrupa congregaciones en tablas distintas (ej. Zona y Campos Blancos) y consolida todo en una vista unificada sin duplicar columnas ni valores.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Control de Fondos y Caja Real
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Distingue entre fondos propios y fondos en tránsito, arrastra el saldo real en caja período tras período y genera comprobantes de ingresos y gastos.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Flujo de Informes y Soportes
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Ciclo controlado por estados (Borrador, Enviado, En Revisión, Aprobado, Consolidado) con bóveda digital para adjuntar recibos.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reportes Ejecutivos y Excel
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Gráficas comparativas de evolución histórica por congregación y exportación directa a libros de Excel multi-hoja listos para junta o archivo.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Auditoría e Historial Inmutable
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Cada ajuste de valor, creación de gasto o cierre de período queda registrado con autor, fecha, hora y detalle del cambio realizado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SELECTOR INTERACTIVO POR ROL ── */}
      <section id="roles" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Permisos Granulares
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Una experiencia adaptada a cada perfil
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Cada usuario ve exactamente las herramientas e información que necesita según su responsabilidad.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {(Object.keys(ROLES_DATA) as RoleKey[]).map((key) => {
              const item = ROLES_DATA[key];
              const isSelected = activeRole === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveRole(key)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Role Detail Card */}
          <div className="max-w-4xl mx-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-10">
            <div className="grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-100 dark:border-indigo-800">
                  {roleInfo.icon}
                  <span>Rol: {roleInfo.label}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {roleInfo.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {roleInfo.subtitle}
                </p>
              </div>
              <div className="md:col-span-6 space-y-3">
                {roleInfo.highlights.map((hl, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{hl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA (4 PASOS) ── */}
      <section id="flujo" className="py-20 bg-slate-900 text-white dark:bg-slate-900/60 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              Flujo de Trabajo Contable
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              Del reporte de la iglesia al cierre consolidado en 4 pasos
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Apertura de Período',
                desc: 'Tesorería habilita el mes contable y define las columnas activas o temporales.',
              },
              {
                step: '02',
                title: 'Registro de Reportes',
                desc: 'Cada iglesia ingresa sus datos desde el móvil o tesorería carga informes en papel o Excel.',
              },
              {
                step: '03',
                title: 'Cálculo y Revisión',
                desc: 'Las fórmulas calculan automáticamente fondos, porcentajes y acumulados en tiempo real.',
              },
              {
                step: '04',
                title: 'Consolidación y Cierre',
                desc: 'Se cuadra la caja real de fondos, se exporta el Excel oficial y se cierra el período.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-6 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-3"
              >
                <span className="inline-block font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  PASO {item.step}
                </span>
                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEGURIDAD Y PREGUNTAS FRECUENTES ── */}
      <section id="faq" className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Security Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-900 dark:to-slate-900 border border-indigo-500/40 p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/15 shrink-0">
                <ShieldCheck className="w-7 h-7 text-emerald-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold">Seguridad, Respaldo y Trazabilidad</h3>
                <p className="text-xs sm:text-sm text-indigo-100 max-w-xl">
                  Autenticación segura mediante tokens JWT, control de acceso estricto por rol en servidor y base de datos PostgreSQL en la nube con respaldo continuo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openLogin}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs shadow-sm transition cursor-pointer"
            >
              Ingresar al Sistema
            </button>
          </div>

          {/* FAQ Accordion */}
          <div>
            <div className="text-center mb-10 space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Preguntas Frecuentes
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Respuestas rápidas sobre la operación diaria en TesorApp.
              </p>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-extrabold text-slate-800 dark:text-slate-200">TESORAPP PRO</span>
            <span>· Gestión Contable de Tesorería</span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <a href="#caracteristicas" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Características
            </a>
            <a href="#roles" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Roles
            </a>
            <button
              type="button"
              onClick={openLogin}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </footer>

      {/* ── MODAL DE INICIO DE SESIÓN ── */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Acceso a TESORAPP
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ingresa con tus credenciales institucionales
                </p>
              </div>
            </div>

            <form onSubmit={onLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 font-mono text-xs font-semibold"
                  placeholder="usuario@tesorapp.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-xs"
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Accediendo...' : 'Iniciar Sesión'}</span>
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>

            <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <Users className="w-3.5 h-3.5" />
              <span>Soporte para Tesorero, Secretario, Iglesia y Presbítero</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
