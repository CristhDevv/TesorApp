import { useState, useMemo } from 'react';
import { 
  Sliders, 
  X
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { formatCOP } from '../../utils/formatters';

interface BudgetSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  currentTotal: number;
  periodName?: string;
}

export function BudgetSimulator({
  isOpen,
  onClose,
  currentTotal,
}: BudgetSimulatorProps) {
  const [growthRate, setGrowthRate] = useState<number>(10); // % growth
  const [missionsPercent, setMissionsPercent] = useState<number>(25); // % for missions
  const [templePercent, setTemplePercent] = useState<number>(15); // % for temple/construction

  if (!isOpen) return null;

  const base = currentTotal || 50000000;

  // Projections
  const projections = useMemo(() => {
    const projectedAnnual = base * 12 * (1 + growthRate / 100);
    const projectedMissionsAnnual = projectedAnnual * (missionsPercent / 100);
    const projectedTempleAnnual = projectedAnnual * (templePercent / 100);
    const operationalReserve = projectedAnnual * (1 - (missionsPercent + templePercent) / 100);

    const q1 = (base * 3) * (1 + growthRate / 100);
    const q2 = q1 * (1 + (growthRate * 0.5) / 100);
    const q3 = q2 * (1 + (growthRate * 0.3) / 100);
    const q4 = q3 * (1 + (growthRate * 0.2) / 100);

    return {
      monthlyProjected: base * (1 + growthRate / 100),
      projectedAnnual,
      projectedMissionsAnnual,
      projectedTempleAnnual,
      operationalReserve,
      quarters: [q1, q2, q3, q4],
    };
  }, [base, growthRate, missionsPercent, templePercent]);

  const chartData = {
    labels: ['Trimestre I', 'Trimestre II', 'Trimestre III', 'Trimestre IV'],
    datasets: [
      {
        label: `Proyección con ${growthRate >= 0 ? '+' : ''}${growthRate}% Crecimiento`,
        data: projections.quarters,
        backgroundColor: '#4f46e5',
        borderRadius: 8,
      },
      {
        label: 'Base Actual Constante',
        data: [base * 3, base * 3, base * 3, base * 3],
        backgroundColor: '#cbd5e1',
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in font-sans">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Simulador Financiero & Planificación de Presupuesto</h3>
              <p className="text-xs text-slate-300">
                Proyecciones dinámicas a 12 meses basadas en el recaudo actual ({formatCOP(base)})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Slider 1 */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Tasa de Crecimiento</span>
                <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-mono">
                  {growthRate >= 0 ? `+${growthRate}` : growthRate}%
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="50"
                step="1"
                value={growthRate}
                onChange={(e) => setGrowthRate(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Variación proyectada en ingresos y aportes.</p>
            </div>

            {/* Slider 2 */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Fondo de Misiones</span>
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
                  {missionsPercent}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="1"
                value={missionsPercent}
                onChange={(e) => setMissionsPercent(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Porcentaje asignado a obra nacional y misiones.</p>
            </div>

            {/* Slider 3 */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Fondo Pro-Templo</span>
                <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-mono">
                  {templePercent}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={templePercent}
                onChange={(e) => setTemplePercent(parseInt(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Reserva destinada a infraestructura y compras.</p>
            </div>
          </div>

          {/* Results Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Proyección Anual Total</span>
              <span className="text-base font-extrabold font-mono text-slate-900 mt-1 block">
                {formatCOP(projections.projectedAnnual)}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Misiones Anual ({missionsPercent}%)</span>
              <span className="text-base font-extrabold font-mono text-emerald-600 mt-1 block">
                {formatCOP(projections.projectedMissionsAnnual)}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Pro-Templo Anual ({templePercent}%)</span>
              <span className="text-base font-extrabold font-mono text-amber-600 mt-1 block">
                {formatCOP(projections.projectedTempleAnnual)}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Reserva Operativa Anual</span>
              <span className="text-base font-extrabold font-mono text-indigo-600 mt-1 block">
                {formatCOP(projections.operationalReserve)}
              </span>
            </div>
          </div>

          {/* Chart Comparison */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Comparativo Trimestral de Ingresos Proyectados vs Base
              </h4>
              <span className="text-[10px] text-slate-400 font-semibold">12 Meses Vista</span>
            </div>
            <div className="h-64">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      grid: { color: '#f8fafc' },
                      ticks: { callback: (v) => formatCOP(Number(v)) },
                    },
                    x: { grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
