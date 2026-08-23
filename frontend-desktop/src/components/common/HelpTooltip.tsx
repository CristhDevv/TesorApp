import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  title?: string;
  tip?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
}

export function HelpTooltip({
  text,
  title,
  tip,
  position = 'top',
  className = '',
  iconClassName = '',
}: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible]);

  // Positioning classes
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
      }}
    >
      <button
        type="button"
        className={`p-0.5 rounded-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer focus:outline-none ${iconClassName}`}
        aria-label="Ayuda"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {/* Popover Bubble */}
      {isVisible && (
        <div
          ref={popoverRef}
          className={`absolute z-50 w-64 p-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl text-xs select-text animate-fade-in ${getPositionClasses()}`}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="font-extrabold text-slate-900 dark:text-white text-xs mb-1 flex items-center gap-1">
              <span>{title}</span>
            </div>
          )}
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {text}
          </p>
          {tip && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-indigo-600 dark:text-indigo-300 font-medium flex items-start gap-1">
              <span>💡</span>
              <span>{tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
