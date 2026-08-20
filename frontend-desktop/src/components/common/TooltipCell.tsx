import React, { useState, useRef, useCallback } from 'react';

interface TooltipCellProps {
  children: React.ReactNode;
  formula?: string | null;
  fieldName?: string;
  lastEditor?: string;
  lastEditedAt?: string;
  className?: string;
}

/**
 * Lightweight tooltip that appears on hover (Light Theme).
 * Positions itself to avoid viewport edges.
 * Shows formula and last editor info.
 */
export function TooltipCell({
  children,
  formula,
  fieldName,
  lastEditor,
  lastEditedAt,
  className = '',
}: TooltipCellProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const showTooltip = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const TOOLTIP_W = 220;
      const TOOLTIP_H = 70;
      let left = rect.left;
      let top = rect.bottom + 4;
      if (left + TOOLTIP_W > window.innerWidth - 8) left = rect.right - TOOLTIP_W;
      if (top + TOOLTIP_H > window.innerHeight - 8) top = rect.top - TOOLTIP_H - 4;
      setPos({ top, left });
      setVisible(true);
    }, 400);
  }, []);

  const hideTooltip = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  const hasContent = formula || lastEditor;
  if (!hasContent) return <>{children}</>;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {visible && (
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: 220 }}
          className="bg-slate-900 text-slate-100 border border-slate-700 rounded-lg shadow-2xl p-2.5 pointer-events-none"
        >
          {fieldName && (
            <p className="text-[10px] font-bold text-slate-200 mb-1 truncate">{fieldName}</p>
          )}
          {formula && (
            <p className="text-[10px] font-mono text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded mb-1 truncate border border-slate-800">
              = {formula}
            </p>
          )}
          {lastEditor && (
            <p className="text-[9px] text-slate-400">
              ✎ {lastEditor}
              {lastEditedAt && (
                <span className="ml-1">
                  · {new Date(lastEditedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
