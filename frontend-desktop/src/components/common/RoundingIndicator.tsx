import { useState, useRef } from 'react';
import { HelpCircle } from 'lucide-react';

interface RoundingIndicatorProps {
  tipo_redondeo?: 'ninguno' | 'arriba' | 'abajo' | 'estandar' | string;
  multiplo_redondeo?: number;
  className?: string;
}

export function RoundingIndicator({
  tipo_redondeo = 'ninguno',
  multiplo_redondeo = 1,
  className = '',
}: RoundingIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  if (!tipo_redondeo || tipo_redondeo === 'ninguno') return null;

  const labels: Record<string, { label: string; icon: string; desc: string }> = {
    arriba: {
      label: 'Techo ↑',
      icon: '↑',
      desc: 'Redondea hacia arriba al siguiente múltiplo',
    },
    abajo: {
      label: 'Piso ↓',
      icon: '↓',
      desc: 'Redondea hacia abajo truncando al múltiplo',
    },
    estandar: {
      label: 'Estándar ⇅',
      icon: '⇅',
      desc: 'Redondeo aritmético tradicional (≥0.5 sube, <0.5 baja)',
    },
  };

  const info = labels[tipo_redondeo] || {
    label: tipo_redondeo,
    icon: '~',
    desc: 'Redondeo dinámico activo',
  };

  const formattedMultiplo =
    multiplo_redondeo >= 1000
      ? `$${multiplo_redondeo.toLocaleString('es-CO')}`
      : `$${multiplo_redondeo}`;

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex items-center gap-0.5 px-1 py-0.2 bg-slate-100 border border-slate-300 text-slate-700 rounded text-[9px] font-mono font-bold cursor-help ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span>{info.icon}</span>
      <span className="text-[8px] opacity-75">{formattedMultiplo}</span>

      {showTooltip && (
        <div className="fixed z-50 bg-white border border-slate-300 rounded shadow-xl p-2 text-left pointer-events-none w-56 text-[10px] transform -translate-x-1/2 mt-4 text-slate-800">
          <p className="font-bold text-slate-900 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-indigo-600" />
            <span>Regla de Redondeo: {info.label}</span>
          </p>
          <p className="text-slate-600 mt-0.5">{info.desc}</p>
          <p className="text-slate-900 font-mono text-[9px] mt-1 bg-slate-50 p-1 rounded border border-slate-200">
            Paso: {formattedMultiplo} COP
          </p>
        </div>
      )}
    </span>
  );
}
