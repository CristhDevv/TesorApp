import { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Building2
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { formatCOP } from '../../utils/formatters';

interface BoardroomPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gridData: any;
  currentPeriod: any;
  user?: any;
}

export function BoardroomPresentationModal({
  isOpen,
  onClose,
  gridData,
  currentPeriod,
}: BoardroomPresentationModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const rows = gridData?.filas || [];
  const columns = gridData?.columnas || [];

  // Calculate presentation numbers
  let totalConsolidado = 0;
  const churchTotals: { name: string; total: number }[] = [];

  rows.forEach((r: any) => {
    let rTot = 0;
    columns.forEach((c: any) => {
      const v = r.valores?.find((x: any) => x.campo_id === c.id);
      const amt = v?.modo_calculo === 'calculado' ? (v?.valor_calculado || 0) : (v?.valor_manual || 0);
      if ((c.nombre || '').toLowerCase().includes('total')) rTot = Math.max(rTot, amt);
    });
    totalConsolidado += rTot;
    churchTotals.push({ name: r.iglesia_nombre, total: rTot });
  });

  churchTotals.sort((a, b) => b.total - a.total);
  const top4 = churchTotals.slice(0, 4);

  const slides = [
    // Slide 1: Executive Overview
    {
      title: 'Balance General & Consolidado Financiero',
      subtitle: `Periodo Contable: ${currentPeriod?.nombre || 'Actual'}`,
      render: () => (
        <div className="flex-1 flex flex-col justify-center space-y-8 max-w-4xl mx-auto w-full">
          <div className="text-center space-y-2">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold bg-indigo-950/60 border border-indigo-800/60 px-3 py-1 rounded-full">
              Consolidado General de Tesorería
            </span>
            <div className="text-5xl md:text-7xl font-extrabold font-mono tracking-tight text-white mt-4">
              {formatCOP(totalConsolidado)}
            </div>
            <p className="text-sm text-slate-400">
              Recaudo oficial consolidado en <span className="text-white font-bold">{rows.length} congregaciones auditadas</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800">
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl text-center shadow-lg">
              <span className="text-xs uppercase font-bold text-slate-400">Obra Misionera (25%)</span>
              <span className="text-2xl font-bold font-mono text-emerald-400 mt-2 block">
                {formatCOP(totalConsolidado * 0.25)}
              </span>
            </div>
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl text-center shadow-lg">
              <span className="text-xs uppercase font-bold text-slate-400">Pro-Templo / Bienes (15%)</span>
              <span className="text-2xl font-bold font-mono text-amber-400 mt-2 block">
                {formatCOP(totalConsolidado * 0.15)}
              </span>
            </div>
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl text-center shadow-lg">
              <span className="text-xs uppercase font-bold text-slate-400">Fondo Operativo (60%)</span>
              <span className="text-2xl font-bold font-mono text-indigo-400 mt-2 block">
                {formatCOP(totalConsolidado * 0.6)}
              </span>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 2: Distribution Chart
    {
      title: 'Distribución Estratégica de Fondos',
      subtitle: 'Destinación estatutaria de recursos recaudados',
      render: () => (
        <div className="flex-1 flex items-center justify-center max-w-2xl mx-auto w-full">
          <div className="w-full h-80">
            <Doughnut
              data={{
                labels: ['Fondo Operativo Local', 'Obra Misionera & Nacional', 'Fondo Pro-Templo & Compras'],
                datasets: [
                  {
                    data: [totalConsolidado * 0.6, totalConsolidado * 0.25, totalConsolidado * 0.15],
                    backgroundColor: ['#6366f1', '#10b981', '#f59e0b'],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#cbd5e1', font: { size: 13, weight: 'bold' } },
                  },
                },
              }}
            />
          </div>
        </div>
      ),
    },

    // Slide 3: Ranking Top Congregations
    {
      title: 'Ranking de Aportes por Congregación',
      subtitle: 'Sedes con mayor contribución en el periodo actual',
      render: () => (
        <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {top4.map((c, i) => (
              <div
                key={c.name}
                className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-base">
                    #{i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{c.name}</h4>
                    <span className="text-xs text-slate-400">
                      {totalConsolidado > 0 ? Math.round((c.total / totalConsolidado) * 100) : 0}% de participación
                    </span>
                  </div>
                </div>
                <span className="font-mono font-extrabold text-base text-indigo-300">{formatCOP(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlide((s) => (s + 1) % slides.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((s) => (s - 1 + slides.length) % slides.length);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, slides.length, onClose]);

  if (!isOpen) return null;

  const active = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden font-sans select-none animate-fade-in">
      {/* Top Presentation Bar */}
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">TesorApp Boardroom</h2>
            <p className="text-xs text-slate-400">{active.title}</p>
          </div>
        </div>

        {/* Slide Counter & Close */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-mono text-slate-400">
            <span>Diapositiva</span>
            <span className="text-white font-bold">{currentSlide + 1}</span>
            <span>/ {slides.length}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Salir de modo presentación (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Slide Content */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto relative">
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{active.title}</h1>
          <p className="text-xs text-slate-400 mt-1">{active.subtitle}</p>
        </div>

        {active.render()}
      </main>

      {/* Presentation Navigation Footer */}
      <footer className="px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md">
        <span className="text-[11px] text-slate-500">
          Tip: Usa las teclas ⬅️ / ➡️ o la barra espaciadora para navegar.
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSlide((s) => (s - 1 + slides.length) % slides.length)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-800 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          <button
            onClick={() => setCurrentSlide((s) => (s + 1) % slides.length)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-lg shadow-indigo-500/20"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
