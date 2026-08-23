import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  title?: string;
  tip?: string;
  className?: string;
}

export function HelpTooltip({
  text,
  title,
  tip,
  className = '',
}: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 260;
    const tooltipHeight = 120;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.top - tooltipHeight - 8;

    // Boundary protection (Screen edges)
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    if (top < 10) {
      // Show below if no space on top
      top = rect.bottom + 8;
    }

    setCoords({ top, left });
  };

  const handleOpen = () => {
    calculatePosition();
    setIsVisible(true);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isVisible]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`inline-flex items-center justify-center p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer focus:outline-none shrink-0 ${className}`}
        aria-label="Ayuda"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onClick={(e) => {
          e.stopPropagation();
          if (isVisible) handleClose();
          else handleOpen();
        }}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {/* Floating Popover Portal: Always renders directly on body with position fixed */}
      {isVisible &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '260px',
              zIndex: 999999,
            }}
            className="p-3 bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 rounded-xl border border-slate-700 shadow-2xl text-xs select-text animate-fade-in pointer-events-auto"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={handleClose}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="font-extrabold text-white text-xs mb-1">
                {title}
              </div>
            )}
            <p className="text-[11px] text-slate-200 leading-relaxed font-normal">
              {text}
            </p>
            {tip && (
              <div className="mt-2 pt-1.5 border-t border-slate-700 text-[10px] text-amber-300 font-medium flex items-start gap-1">
                <span>💡</span>
                <span>{tip}</span>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
