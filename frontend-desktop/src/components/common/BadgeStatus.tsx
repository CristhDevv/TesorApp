type BadgeVariant = 'abierto' | 'cerrado' | 'temporal' | 'ingresos' | 'egresos' | 'informativo' | 'totales' | 'resumen' | 'tesorero' | 'iglesia' | 'activa' | 'inactiva';

const variantMap: Record<string, string> = {
  abierto:     'bg-emerald-50 text-emerald-700 border-emerald-300',
  cerrado:     'bg-slate-100 text-slate-600 border-slate-300',
  activa:      'bg-emerald-50 text-emerald-700 border-emerald-300',
  inactiva:    'bg-rose-50 text-rose-700 border-rose-300',
  temporal:    'bg-amber-50 text-amber-700 border-amber-300',
  ingresos:    'bg-emerald-50 text-emerald-800 border-emerald-200',
  egresos:     'bg-rose-50 text-rose-800 border-rose-200',
  informativo: 'bg-slate-100 text-slate-700 border-slate-200',
  totales:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  resumen:     'bg-violet-50 text-violet-700 border-violet-200',
  tesorero:    'bg-slate-800 text-white border-slate-700',
  iglesia:     'bg-slate-100 text-slate-800 border-slate-300',
};

interface BadgeStatusProps {
  variant: BadgeVariant | string;
  label?: string;
  className?: string;
}

export function BadgeStatus({ variant, label, className = '' }: BadgeStatusProps) {
  const styles = variantMap[variant?.toLowerCase()] ?? 'bg-slate-100 text-slate-700 border-slate-300';
  const text = label ?? variant;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${styles} ${className}`}
    >
      {text}
    </span>
  );
}
