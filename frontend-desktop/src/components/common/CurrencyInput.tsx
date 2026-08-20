import React, { useRef, useCallback } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  onCommit?: (val: number) => void; // called on blur or Enter
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  id?: string;
}

/**
 * A numeric input optimized for COP currency entry:
 * - Selects all on focus (select-on-focus)
 * - Accepts raw numbers (no "$" or "." formatting while editing)
 * - Formats display as $1.250.000 when blurred
 * - Emits pure numeric value to parent
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onCommit, disabled, placeholder = '0', className = '', autoFocus, id }, ref) => {
    const editingRef = useRef(false);
    const displayRef = useRef<HTMLInputElement>(null);

    const resolvedRef = (ref || displayRef) as React.RefObject<HTMLInputElement>;

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      editingRef.current = true;
      const num = value || 0;
      e.target.value = num === 0 ? '' : String(num);
      e.target.select();
    }, [value]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      editingRef.current = false;
      const raw = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')) || 0;
      onChange(raw);
      onCommit?.(raw);
    }, [onChange, onCommit]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow free typing; only parse on blur/commit
      const raw = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')) || 0;
      onChange(raw);
    }, [onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    }, []);

    // Format for display when not editing
    const formatted = React.useMemo(() => {
      const num = Number(value) || 0;
      return num === 0 ? '' : '$' + Math.round(num).toLocaleString('es-CO');
    }, [value]);

    React.useEffect(() => {
      if (resolvedRef && 'current' in resolvedRef && resolvedRef.current && !editingRef.current) {
        resolvedRef.current.value = formatted;
      }
    }, [formatted, resolvedRef]);

    return (
      <input
        ref={resolvedRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        defaultValue={formatted}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`font-mono tabular-nums text-right focus:outline-none ${className}`}
      />
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';
