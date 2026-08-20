import { Injectable, BadRequestException } from '@nestjs/common';
import { Parser } from 'expr-eval';

@Injectable()
export class FormulasService {
  private parser = new Parser();

  constructor() {
    // Register standard and custom rounding functions in expr-eval
    this.parser.functions.ceil = (x: number) => Math.ceil(x);
    this.parser.functions.floor = (x: number) => Math.floor(x);
    this.parser.functions.round = (x: number) => Math.round(x);
    this.parser.functions.trunc = (x: number) => Math.trunc(x);

    // Dynamic rounding with precision/multiple support:
    // redondear(x, [multiplo=1]): Round to nearest multiple (e.g. 1000)
    this.parser.functions.redondear = (x: number, multiplo: number = 1) => {
      const m = Number(multiplo) > 0 ? Number(multiplo) : 1;
      return Math.round(x / m) * m;
    };

    // redondear_arriba(x, [multiplo=1]): Round UP (ceil) to multiple (e.g. 1000)
    this.parser.functions.redondear_arriba = (x: number, multiplo: number = 1) => {
      const m = Number(multiplo) > 0 ? Number(multiplo) : 1;
      return Math.ceil(x / m) * m;
    };

    // redondear_abajo(x, [multiplo=1]): Round DOWN (floor) to multiple (e.g. 1000)
    this.parser.functions.redondear_abajo = (x: number, multiplo: number = 1) => {
      const m = Number(multiplo) > 0 ? Number(multiplo) : 1;
      return Math.floor(x / m) * m;
    };
  }

  /**
   * Applies field-level rounding configuration to any numeric value.
   */
  applyRounding(value: number, tipoRedondeo?: string | null, multiplo?: number | null): number {
    if (!tipoRedondeo || tipoRedondeo === 'ninguno' || Number.isNaN(value)) {
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
   * Sanitizes and normalizes a formula string so that any human notations (like "10%", "3%", field names, etc.)
   * are automatically converted into valid identifiers.
   */
  sanitizeFormula(
    formula: string,
    allFields?: { id?: string; nombre?: string; slug: string }[],
  ): string {
    if (!formula) return '';
    let sanitized = formula.trim();

    // 1. If allFields list is available, map any field names or old slugs
    if (allFields && allFields.length > 0) {
      for (const field of allFields) {
        if (!field.slug) continue;
        if (field.nombre) {
          const escapedName = field.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const nameRegex = new RegExp(`(?<=\\b|\\s|\\(|\\+|-|\\*|\\/)${escapedName}(?=\\b|\\s|\\)|\\+|-|\\*|\\/|$)`, 'gi');
          sanitized = sanitized.replace(nameRegex, field.slug);
        }
      }
    }

    // 2. Automatically transform percentage notations (e.g. "10%" -> "c_10_porciento", "3%" -> "c_3_porciento")
    sanitized = sanitized.replace(/\b([0-9]+(?:\.[0-9]+)?)%(?!\s*\*)/g, (_match, p1) => {
      const cleanNum = p1.replace('.', '_');
      return `c_${cleanNum}_porciento`;
    });

    return sanitized;
  }

  /**
   * Extracts references (variables) from a formula text.
   */
  extractVariables(formula: string, allFields?: { id?: string; nombre?: string; slug: string }[]): string[] {
    if (!formula) return [];
    try {
      const clean = this.sanitizeFormula(formula, allFields);
      return this.parser.parse(clean).variables();
    } catch (error) {
      throw new BadRequestException(`Fórmula inválida: ${error.message}`);
    }
  }

  /**
   * Evaluates a formula given a dictionary of field values (keyed by slug and/or id).
   */
  evaluate(formula: string, variablesMap: Record<string, number>, allFields?: { id?: string; nombre?: string; slug: string }[]): number {
    if (!formula) return 0;
    try {
      const clean = this.sanitizeFormula(formula, allFields);
      const expr = this.parser.parse(clean);
      const neededVars = expr.variables();
      const context: Record<string, number> = {};
      
      // Populate context with provided variables or default to 0
      for (const v of neededVars) {
        context[v] = variablesMap[v] !== undefined ? Number(variablesMap[v]) : 0;
      }

      const result = expr.evaluate(context);
      return Number.isNaN(result) || !Number.isFinite(result) ? 0 : result;
    } catch (error) {
      console.error(`Error evaluating formula: ${formula}`, error);
      return 0;
    }
  }

  /**
   * Verifies if adding/updating a field with a formula creates a circular dependency.
   */
  checkCircularDependencies(
    targetFieldId: string,
    targetSlug: string,
    newFormula: string,
    allFields: { id: string; slug: string; formula: string | null; modo_calculo: string }[],
  ): void {
    // Construct graph of dependencies
    // Edge U -> V means U depends on V (U's formula contains V)
    const adjList = new Map<string, Set<string>>();
    const idToSlug = new Map<string, string>();
    const slugToId = new Map<string, string>();

    // Map fields
    for (const f of allFields) {
      idToSlug.set(f.id, f.slug);
      slugToId.set(f.slug, f.id);
    }
    // Handle the field being modified or created
    idToSlug.set(targetFieldId, targetSlug);
    slugToId.set(targetSlug, targetFieldId);

    // Build the graph
    for (const f of allFields) {
      const dependsOn = new Set<string>();
      const formulaText = f.id === targetFieldId ? newFormula : f.formula;
      const isCalculated = f.id === targetFieldId ? true : f.modo_calculo === 'calculado';

      if (isCalculated && formulaText) {
        const vars = this.extractVariables(formulaText, allFields);
        for (const v of vars) {
          // Resolve variable which can be ID or slug to the field ID
          const refId = slugToId.get(v) || (idToSlug.has(v) ? v : null);
          if (refId) {
            dependsOn.add(refId);
          }
        }
      }
      adjList.set(f.id, dependsOn);
    }

    // If targetFieldId is new and not in allFields
    if (!adjList.has(targetFieldId) && newFormula) {
      const dependsOn = new Set<string>();
      const vars = this.extractVariables(newFormula, allFields);
      for (const v of vars) {
        const refId = slugToId.get(v) || (idToSlug.has(v) ? v : null);
        if (refId) {
          dependsOn.add(refId);
        }
      }
      adjList.set(targetFieldId, dependsOn);
    }

    // DFS Cycle Detection (Three-color: 0=unvisited, 1=visiting, 2=visited)
    const visited = new Map<string, number>();

    const hasCycle = (u: string): boolean => {
      visited.set(u, 1); // visiting
      const neighbors = adjList.get(u) || new Set();

      for (const v of neighbors) {
        const state = visited.get(v) || 0;
        if (state === 1) {
          return true; // cycle detected
        }
        if (state === 0) {
          if (hasCycle(v)) return true;
        }
      }

      visited.set(u, 2); // visited
      return false;
    };

    // Run DFS starting from targetFieldId (or all nodes to find any cycle)
    for (const u of adjList.keys()) {
      if ((visited.get(u) || 0) === 0) {
        if (hasCycle(u)) {
          const colName = idToSlug.get(targetFieldId) || targetSlug;
          throw new BadRequestException(
            `Referencia circular detectada: la columna "${colName}" depende directa o indirectamente de sí misma en la fórmula.`,
          );
        }
      }
    }
  }

  /**
   * Sorts the fields topologically so they can be evaluated in sequence.
   */
  topologicalSort(
    allFields: { id: string; slug: string; formula: string | null; modo_calculo: string }[],
  ): string[] {
    const adjList = new Map<string, Set<string>>();
    const idToSlug = new Map<string, string>();
    const slugToId = new Map<string, string>();

    for (const f of allFields) {
      idToSlug.set(f.id, f.slug);
      slugToId.set(f.slug, f.id);
    }

    for (const f of allFields) {
      const dependsOn = new Set<string>();
      if (f.modo_calculo === 'calculado' && f.formula) {
        const vars = this.extractVariables(f.formula, allFields);
        for (const v of vars) {
          const refId = slugToId.get(v) || (idToSlug.has(v) ? v : null);
          if (refId) {
            dependsOn.add(refId);
          }
        }
      }
      adjList.set(f.id, dependsOn);
    }

    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (u: string) => {
      if (visited.has(u)) return;
      visited.add(u);

      const neighbors = adjList.get(u) || new Set();
      for (const v of neighbors) {
        visit(v);
      }
      result.push(u); // Depends-on nodes will be pushed first
    };

    for (const u of adjList.keys()) {
      visit(u);
    }

    return result; // Order of evaluation
  }
}
