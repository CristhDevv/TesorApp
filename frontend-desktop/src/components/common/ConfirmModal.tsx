import { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button by default for safety
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: <Info className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
  }[variant];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-full border ${variantStyles.iconBg} shrink-0`}>
            {variantStyles.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${variantStyles.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
