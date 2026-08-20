/**
 * Utility formatters for TesorApp
 */

export function formatCOP(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  return '$' + Math.round(val).toLocaleString('es-CO');
}

export function formatValueByType(
  val: number | null | undefined,
  tipo: string | undefined,
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return tipo === 'moneda' ? '$0' : '0';
  }
  
  switch (tipo) {
    case 'moneda':
      return formatCOP(val);
    case 'porcentaje':
      return `${val.toLocaleString('es-CO')}%`;
    case 'entero':
      return Math.round(val).toLocaleString('es-CO');
    case 'decimal':
    case 'numero':
      return val.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    default:
      return formatCOP(val);
  }
}
