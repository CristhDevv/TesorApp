import { Lock, Unlock } from 'lucide-react';

interface PeriodBadgeProps {
  status: 'abierto' | 'cerrado' | string;
  className?: string;
}

/**
 * Period status badge (Light Theme):
 * - Abierto: Verde con ícono de candado abierto
 * - Cerrado: Gris con ícono de candado cerrado
 */
export function PeriodBadge({ status, className = '' }: PeriodBadgeProps) {
  const isOpen = status?.toLowerCase() === 'abierto';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider uppercase ${
        isOpen
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
          : 'bg-slate-100 text-slate-600 border-slate-300'
      } ${className}`}
      title={isOpen ? 'Período Abierto: Ediciones permitidas' : 'Período Cerrado: Solo lectura'}
    >
      {isOpen ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-slate-500" />}
      <span>{isOpen ? 'Abierto' : 'Cerrado'}</span>
    </span>
  );
}
