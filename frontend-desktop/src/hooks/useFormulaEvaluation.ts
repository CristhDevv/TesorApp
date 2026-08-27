import { useMemo, useCallback } from 'react';
import type { Campo, FilaGrid } from '../types/contabilidad';

interface EvalResult {
  /** Computed value for a specific (field, church) combination */
  value: number;
  /** Whether the formula could be evaluated */
  valid: boolean;
}

export function applyRounding(value: number, tipoRedondeo?: string | null, multiplo?: number | null): number {
  if (!tipoRedondeo || tipoRedondeo === 'ninguno' || isNaN(value)) {
    return value;
  }
  const m = multiplo && Number(multiplo) > 0 ? Number(multiplo) : 1;
  switch (tipoRedondeo) {
    case 'arriba':
      return Math.ceil(value / m) * m;
    case 'abajo':
      return Math.floor(value / m) * m;
    case 'estandar':
      return Math.round(value / m) * m;
    default:
      return value;
  }
}

/**
 * Evaluates a formula expression locally (in-browser) against
 * a variables map. Supports: +, -, *, /, parentheses, commas, numeric literals,
 * max, min, round, ceil, floor, redondear, redondear_arriba, redondear_abajo.
 */
function evalFormula(formula: string, vars: Record<string, number>): EvalResult {
  try {
    if (!formula?.trim()) return { value: 0, valid: false };

    let expr = formula.trim();

    // Replace percentages notation like * 10% or / 10%
    expr = expr.replace(/(\*|\/)\s*([0-9]+(?:\.[0-9]+)?)%/g, (_match, op, p1) => {
      return `${op} ${parseFloat(p1) / 100}`;
    });

    // Replace slug identifiers with their numeric values
    // Sort slugs by length descending to avoid partial replacements
    const slugs = Object.keys(vars).sort((a, b) => b.length - a.length);
    for (const slug of slugs) {
      // Word-boundary replacement: only replace whole-word occurrences (skip if it matches function names)
      if (['max', 'min', 'round', 'ceil', 'floor', 'abs', 'trunc', 'redondear', 'redondear_arriba', 'redondear_abajo'].includes(slug)) {
        continue;
      }
      expr = expr.replace(new RegExp(`\\b${slug}\\b`, 'g'), String(vars[slug] ?? 0));
    }

    // Map math function names to Math.* or helper functions
    expr = expr.replace(/\bmax\b/g, 'Math.max');
    expr = expr.replace(/\bmin\b/g, 'Math.min');
    expr = expr.replace(/\babs\b/g, 'Math.abs');
    expr = expr.replace(/\bceil\b/g, 'Math.ceil');
    expr = expr.replace(/\bfloor\b/g, 'Math.floor');
    expr = expr.replace(/\bround\b/g, 'Math.round');
    expr = expr.replace(/\btrunc\b/g, 'Math.trunc');

    // Custom rounding functions
    expr = expr.replace(/\bredondear_arriba\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, '(__roundUp($1, $2))');
    expr = expr.replace(/\bredondear_abajo\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, '(__roundDown($1, $2))');
    expr = expr.replace(/\bredondear\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, '(__roundStd($1, $2))');

    // Validate: only numbers, operators, spaces, parens, commas, and safe Math calls allowed
    const testSanitized = expr
      .replace(/Math\.(max|min|abs|ceil|floor|round|trunc)/g, '')
      .replace(/__roundUp|__roundDown|__roundStd/g, '');

    if (!/^[\d\s+\-*/(),.]+$/.test(testSanitized)) return { value: 0, valid: false };

    // Evaluate in safe scope with custom rounding helpers
    const fn = new Function(
      '__roundUp',
      '__roundDown',
      '__roundStd',
      `"use strict"; return (${expr})`
    );

    const result = fn(
      (x: number, m: number = 1) => Math.ceil(x / (Number(m) > 0 ? Number(m) : 1)) * (Number(m) > 0 ? Number(m) : 1),
      (x: number, m: number = 1) => Math.floor(x / (Number(m) > 0 ? Number(m) : 1)) * (Number(m) > 0 ? Number(m) : 1),
      (x: number, m: number = 1) => Math.round(x / (Number(m) > 0 ? Number(m) : 1)) * (Number(m) > 0 ? Number(m) : 1)
    ) as number;

    if (typeof result !== 'number' || !isFinite(result)) return { value: 0, valid: false };

    return { value: result, valid: true };
  } catch {
    return { value: 0, valid: false };
  }
}

/**
 * Topologically sort fields so dependencies are evaluated before dependents.
 * Returns field IDs in evaluation order.
 */
function topoSort(fields: Campo[]): string[] {
  const slugToId = new Map(fields.map(f => [f.slug, f.id]));
  const deps = new Map<string, Set<string>>();

  const knownFunctions = new Set([
    'max', 'min', 'round', 'ceil', 'floor', 'abs', 'trunc',
    'redondear', 'redondear_arriba', 'redondear_abajo', 'Math'
  ]);

  for (const f of fields) {
    const d = new Set<string>();
    if (f.modo_calculo === 'calculado' && f.formula) {
      const tokens = f.formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      for (const tok of tokens) {
        if (knownFunctions.has(tok)) continue;
        const refId = slugToId.get(tok);
        if (refId && refId !== f.id) d.add(refId);
      }
    }
    deps.set(f.id, d);
  }

  const result: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) return; // cycle — skip
    visiting.add(id);
    for (const dep of (deps.get(id) || [])) visit(dep);
    visiting.delete(id);
    visited.add(id);
    result.push(id);
  };

  for (const f of fields) visit(f.id);
  return result;
}

export interface LocalGridValues {
  /** Get the display value for a (churchId, fieldId) pair */
  getValue: (churchId: string, fieldId: string) => number;
  /** Re-evaluate all cells for a church after a manual change */
  getVariablesForChurch: (churchId: string, overrides?: Record<string, number>) => Record<string, number>;
}

interface UseFormulaEvaluationProps {
  allFields: Campo[];
  rows: FilaGrid[];
  /** Local overrides: key = `${churchId}__${fieldId}`, value = number */
  localOverrides?: Record<string, number>;
}

/**
 * Provides local (in-browser) formula evaluation for instant UI feedback.
 * The canonical values always come from the backend; this hook only
 * provides optimistic display values before the server responds.
 */
export function useFormulaEvaluation({
  allFields,
  rows,
  localOverrides = {},
}: UseFormulaEvaluationProps): LocalGridValues {
  const evalOrder = useMemo(() => topoSort(allFields), [allFields]);

  const getVariablesForChurch = useCallback(
    (churchId: string, overrides: Record<string, number> = {}) => {
      const row = rows.find(r => r.iglesia_id === churchId);
      if (!row) return {};

      const vars: Record<string, number> = {};

      // Seed with server values
      for (const val of (Array.isArray(row.valores) ? row.valores : [])) {
        const isCalc = val.modo_calculo === 'calculado';
        const isOverridden = isCalc && val.valor_manual !== null && val.valor_manual !== undefined;
        const num = Number(
          isCalc
            ? (isOverridden ? val.valor_manual : val.valor_calculado)
            : (val.valor_manual ?? 0)
        ) || 0;
        vars[val.slug] = num;
        vars[val.campo_id] = num;
      }

      // Apply local overrides
      for (const [key, num] of Object.entries(localOverrides)) {
        const [cId, fId] = key.split('__');
        if (cId !== churchId) continue;
        const field = allFields.find(f => f.id === fId);
        if (!field) continue;
        vars[field.slug] = num;
        vars[fId] = num;
      }

      // Apply explicit overrides
      for (const [slug, num] of Object.entries(overrides)) {
        vars[slug] = num;
      }

      // Re-evaluate calculated fields in topo order
      for (const fId of evalOrder) {
        // If field has a local override or manual override, respect it
        const overrideKey = `${churchId}__${fId}`;
        if (localOverrides[overrideKey] !== undefined) {
          vars[fId] = localOverrides[overrideKey];
          const field = allFields.find(f => f.id === fId);
          if (field) vars[field.slug] = localOverrides[overrideKey];
          continue;
        }

        const field = allFields.find(f => f.id === fId);
        if (!field || field.modo_calculo !== 'calculado' || !field.formula) continue;

        const serverVal = (Array.isArray(row.valores) ? row.valores : []).find(v => v.campo_id === fId);
        if (serverVal && serverVal.valor_manual !== null && serverVal.valor_manual !== undefined && overrides[field.slug] === undefined) {
          vars[field.slug] = Number(serverVal.valor_manual);
          vars[fId] = Number(serverVal.valor_manual);
          continue;
        }

        const { value, valid } = evalFormula(field.formula, vars);
        const rounded = valid
          ? applyRounding(value, field.tipo_redondeo, field.multiplo_redondeo)
          : 0;

        vars[field.slug] = rounded;
        vars[fId] = rounded;
      }

      return vars;
    },
    [rows, allFields, evalOrder, localOverrides]
  );

  const getValue = useCallback(
    (churchId: string, fieldId: string): number => {
      const vars = getVariablesForChurch(churchId);
      return vars[fieldId] ?? 0;
    },
    [getVariablesForChurch]
  );

  return { getValue, getVariablesForChurch };
}

