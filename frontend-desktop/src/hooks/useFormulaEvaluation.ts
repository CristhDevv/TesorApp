import { useMemo, useCallback } from 'react';
import type { Campo, FilaGrid } from '../types/contabilidad';

interface EvalResult {
  /** Computed value for a specific (field, church) combination */
  value: number;
  /** Whether the formula could be evaluated */
  valid: boolean;
}

/**
 * Evaluates a simple formula expression locally (in-browser) against
 * a variables map. Supports: +, -, *, /, parentheses, numeric literals.
 * Does NOT call the backend — used for immediate UI feedback only.
 */
function evalFormula(formula: string, vars: Record<string, number>): EvalResult {
  try {
    if (!formula?.trim()) return { value: 0, valid: false };

    // Replace slug identifiers with their numeric values
    let expr = formula.trim();

    // Sort slugs by length descending to avoid partial replacements
    const slugs = Object.keys(vars).sort((a, b) => b.length - a.length);
    for (const slug of slugs) {
      // Word-boundary replacement: only replace whole-word occurrences
      expr = expr.replace(new RegExp(`\\b${slug}\\b`, 'g'), String(vars[slug] ?? 0));
    }

    // Validate: only numbers, operators, spaces and parens allowed
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return { value: 0, valid: false };

    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)() as number;
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

  for (const f of fields) {
    const d = new Set<string>();
    if (f.modo_calculo === 'calculado' && f.formula) {
      const tokens = f.formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      for (const tok of tokens) {
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
      for (const val of row.valores) {
        const num = Number(
          val.modo_calculo === 'calculado' ? val.valor_calculado : val.valor_manual
        ) || 0;
        vars[val.slug] = num;
        vars[val.campo_id] = num;
      }

      // Apply local overrides for manual fields
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
        const field = allFields.find(f => f.id === fId);
        if (!field || field.modo_calculo !== 'calculado' || !field.formula) continue;
        const { value } = evalFormula(field.formula, vars);
        vars[field.slug] = value;
        vars[fId] = value;
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
