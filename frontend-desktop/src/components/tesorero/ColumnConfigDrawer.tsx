import React from 'react';
import { X, CheckCircle2, Columns, Wallet } from 'lucide-react';
import type { Periodo } from '../../types/contabilidad';

interface FieldModalData {
  id: string;
  nombre: string;
  tipo: string;
  modo_calculo: string;
  formula: string;
  tipo_redondeo: 'ninguno' | 'arriba' | 'abajo' | 'estandar';
  multiplo_redondeo: number;
  es_acumulable: boolean;
  es_fondo: boolean;
  seccion: string;
  seccion_iglesia: string;
  seccion_tesorero: string;
  orden: number;
  aplica_a_todas_las_iglesias: boolean;
  visible_para_iglesia: boolean;
  visible_para_tesorero: boolean;
  es_temporal: boolean;
  periodo_id: string | null;
  iglesias_especificas: string[];
}

interface ColumnConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fieldModalData: FieldModalData;
  setFieldModalData: React.Dispatch<React.SetStateAction<FieldModalData>>;
  campos: { id: string; nombre: string; slug: string; modo_calculo: string }[];
  periodos: Periodo[];
  selectedPeriodoId: string;
  savingField: boolean;
  onSave: (e: React.FormEvent) => void;
  onDelete?: () => void;

  // Formula assistant state
  formulaAssistantTab: 'porcentaje' | 'suma' | 'resta' | 'teclado';
  setFormulaAssistantTab: (tab: 'porcentaje' | 'suma' | 'resta' | 'teclado') => void;
  percentRate: number;
  setPercentRate: (v: number) => void;
  percentSelectedCols: string[];
  setPercentSelectedCols: (v: string[]) => void;
  sumSelectedCols: string[];
  setSumSelectedCols: (v: string[]) => void;
  diffBaseCol: string;
  setDiffBaseCol: (v: string) => void;
  diffMinusCol: string;
  setDiffMinusCol: (v: string) => void;
  buildPercentFormula: (rate: number, cols: string[]) => string;
  buildSumFormula: (cols: string[]) => string;
  buildDiffFormula: (base: string, minus: string) => string;
  getFormulaExplanation: (formula: string, mode: string) => string | null;
}

const INPUT_CLS =
  'w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600 text-xs font-semibold';
const SELECT_CLS = `${INPUT_CLS} cursor-pointer`;
const LABEL_CLS =
  'block font-bold text-slate-600 text-[10px] uppercase mb-1 tracking-wider';

function SectionBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition text-xs ${
        active
          ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold shadow-xs'
          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

export function ColumnConfigDrawer({
  isOpen,
  onClose,
  fieldModalData,
  setFieldModalData,
  campos,
  periodos,
  selectedPeriodoId,
  savingField,
  onSave,
  onDelete,
  formulaAssistantTab,
  setFormulaAssistantTab,
  percentRate,
  setPercentRate,
  percentSelectedCols,
  setPercentSelectedCols,
  sumSelectedCols,
  setSumSelectedCols,
  diffBaseCol,
  setDiffBaseCol,
  diffMinusCol,
  setDiffMinusCol,
  buildPercentFormula,
  buildSumFormula,
  buildDiffFormula,
  getFormulaExplanation,
}: ColumnConfigDrawerProps) {
  const update = (patch: Partial<FieldModalData>) =>
    setFieldModalData((prev) => ({ ...prev, ...patch }));

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[440px] max-w-full bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-[46px] px-4 flex items-center justify-between border-b border-slate-200 shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            <Columns className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {fieldModalData.id ? 'Editar Columna' : 'Nueva Columna'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={onSave} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* ── Nombre ── */}
          <div>
            <label className={LABEL_CLS}>Nombre de la Columna</label>
            <input
              type="text"
              required
              className={INPUT_CLS}
              placeholder="ej. Diezmos del Mes"
              value={fieldModalData.nombre}
              onChange={(e) => update({ nombre: e.target.value })}
            />
          </div>

          {/* ── Modo Cálculo ── */}
          <div>
            <label className={LABEL_CLS}>Modo de Cálculo</label>
            <div className="grid grid-cols-2 gap-2">
              <SectionBtn
                active={fieldModalData.modo_calculo === 'manual'}
                onClick={() => update({ modo_calculo: 'manual' })}
              >
                <span className="font-bold">Manual</span>
                <span className="text-[10px] opacity-70">Digitación directa</span>
              </SectionBtn>
              <SectionBtn
                active={fieldModalData.modo_calculo === 'calculado'}
                onClick={() => {
                  const otherManuals = campos
                    .filter((c) => c.id !== fieldModalData.id && c.modo_calculo === 'manual')
                    .slice(0, 2)
                    .map((c) => c.slug);
                  update({
                    modo_calculo: 'calculado',
                    formula:
                      fieldModalData.formula ||
                      buildPercentFormula(percentRate, otherManuals),
                  });
                }}
              >
                <span className="font-bold">Calculado</span>
                <span className="text-[10px] opacity-70">Fórmula automática</span>
              </SectionBtn>
            </div>
          </div>

          {/* ── Naturaleza / Sección ── */}
          <div>
            <label className={LABEL_CLS}>Naturaleza Contable</label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <SectionBtn
                active={
                  fieldModalData.seccion_iglesia === 'Ingresos' &&
                  fieldModalData.seccion_tesorero === 'Ingresos'
                }
                onClick={() =>
                  update({
                    seccion: 'Ingresos',
                    seccion_iglesia: 'Ingresos',
                    seccion_tesorero: 'Ingresos',
                  })
                }
              >
                <span className="font-bold text-emerald-700">Ingreso</span>
                <span className="text-[10px] opacity-70">Diezmos, Ofrendas…</span>
              </SectionBtn>
              <SectionBtn
                active={
                  fieldModalData.seccion_iglesia === 'Egresos' &&
                  fieldModalData.seccion_tesorero === 'Ingresos'
                }
                onClick={() =>
                  update({
                    seccion: 'Egresos',
                    seccion_iglesia: 'Egresos',
                    seccion_tesorero: 'Ingresos',
                  })
                }
              >
                <span className="font-bold text-amber-700">Aporte / Transferencia</span>
                <span className="text-[10px] opacity-70">Egreso Iglesia → Ingreso Tesorero</span>
              </SectionBtn>
              <SectionBtn
                active={
                  fieldModalData.seccion_iglesia === 'Egresos' &&
                  fieldModalData.seccion_tesorero === 'Egresos'
                }
                onClick={() =>
                  update({
                    seccion: 'Egresos',
                    seccion_iglesia: 'Egresos',
                    seccion_tesorero: 'Egresos',
                  })
                }
              >
                <span className="font-bold text-rose-700">Egreso / Gasto</span>
                <span className="text-[10px] opacity-70">Salida de dinero</span>
              </SectionBtn>
              <SectionBtn
                active={
                  fieldModalData.seccion_iglesia === 'Informativo' ||
                  fieldModalData.seccion_tesorero === 'Informativo'
                }
                onClick={() =>
                  update({
                    seccion: 'Informativo',
                    seccion_iglesia: 'Informativo',
                    seccion_tesorero: 'Informativo',
                  })
                }
              >
                <span className="font-bold text-slate-700">Informativo</span>
                <span className="text-[10px] opacity-70">Base de cálculo. Neutro.</span>
              </SectionBtn>
            </div>

            {/* Fine-grained section overrides */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                  Vista Iglesia:
                </span>
                <select
                  value={fieldModalData.seccion_iglesia || 'Ingresos'}
                  onChange={(e) =>
                    update({
                      seccion_iglesia: e.target.value,
                      seccion: e.target.value,
                    })
                  }
                  className={SELECT_CLS}
                >
                  {['Ingresos', 'Egresos', 'Informativo', 'Totales', 'Resumen'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                  Vista Tesorero:
                </span>
                <select
                  value={fieldModalData.seccion_tesorero || 'Ingresos'}
                  onChange={(e) => update({ seccion_tesorero: e.target.value })}
                  className={SELECT_CLS}
                >
                  {['Ingresos', 'Egresos', 'Informativo', 'Totales', 'Resumen'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Visibilidad ── */}
          <div>
            <label className={LABEL_CLS}>Visibilidad</label>
            <div className="grid grid-cols-3 gap-1.5">
              <SectionBtn
                active={
                  fieldModalData.visible_para_tesorero &&
                  fieldModalData.visible_para_iglesia
                }
                onClick={() =>
                  update({
                    visible_para_tesorero: true,
                    visible_para_iglesia: true,
                  })
                }
              >
                <span className="font-bold">Ambos</span>
                <span className="text-[10px] opacity-70">Tesorero + Iglesia</span>
              </SectionBtn>
              <SectionBtn
                active={
                  fieldModalData.visible_para_iglesia &&
                  !fieldModalData.visible_para_tesorero
                }
                onClick={() =>
                  update({
                    visible_para_tesorero: false,
                    visible_para_iglesia: true,
                  })
                }
              >
                <span className="font-bold">Solo Iglesia</span>
                <span className="text-[10px] opacity-70">Oculta en planilla</span>
              </SectionBtn>
              <SectionBtn
                active={
                  fieldModalData.visible_para_tesorero &&
                  !fieldModalData.visible_para_iglesia
                }
                onClick={() =>
                  update({
                    visible_para_tesorero: true,
                    visible_para_iglesia: false,
                  })
                }
              >
                <span className="font-bold">Solo Tesorero</span>
                <span className="text-[10px] opacity-70">Iglesias no ven</span>
              </SectionBtn>
            </div>
          </div>

          {/* ── Vigencia ── */}
          <div>
            <label className={LABEL_CLS}>Vigencia</label>
            <div className="grid grid-cols-2 gap-1.5">
              <SectionBtn
                active={!fieldModalData.es_temporal}
                onClick={() => update({ es_temporal: false, periodo_id: null })}
              >
                <span className="font-bold">📌 Permanente</span>
                <span className="text-[10px] opacity-70">Aplica mes a mes</span>
              </SectionBtn>
              <SectionBtn
                active={fieldModalData.es_temporal}
                onClick={() =>
                  update({
                    es_temporal: true,
                    periodo_id:
                      fieldModalData.periodo_id ||
                      selectedPeriodoId ||
                      (periodos[0]?.id ?? null),
                  })
                }
              >
                <span className="font-bold">⏱ Temporal</span>
                <span className="text-[10px] opacity-70">Solo un periodo</span>
              </SectionBtn>
            </div>
            {fieldModalData.es_temporal && (
              <div className="mt-2">
                <select
                  value={fieldModalData.periodo_id || selectedPeriodoId || ''}
                  onChange={(e) => update({ periodo_id: e.target.value })}
                  className={SELECT_CLS}
                >
                  {periodos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.estado === 'abierto' ? '● Abierto' : '● Cerrado'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Formula Assistant ── */}
          {fieldModalData.modo_calculo === 'calculado' && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">Asistente de Fórmulas</span>
                <div className="flex bg-white rounded p-0.5 border border-slate-300 text-[10px] font-semibold shadow-2xs">
                  {(['porcentaje', 'suma', 'resta', 'teclado'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setFormulaAssistantTab(tab);
                        if (tab === 'porcentaje')
                          update({
                            formula: buildPercentFormula(
                              percentRate,
                              percentSelectedCols
                            ),
                          });
                        if (tab === 'suma')
                          update({ formula: buildSumFormula(sumSelectedCols) });
                        if (tab === 'resta')
                          update({
                            formula: buildDiffFormula(diffBaseCol, diffMinusCol),
                          });
                      }}
                      className={`px-2 py-1 rounded transition ${
                        formulaAssistantTab === tab
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab === 'porcentaje'
                        ? '%'
                        : tab === 'suma'
                        ? 'Σ'
                        : tab === 'resta'
                        ? 'A−B'
                        : '✎'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Porcentaje tab */}
              {formulaAssistantTab === 'porcentaje' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold">Porcentaje:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100"
                      value={percentRate}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setPercentRate(v);
                        update({
                          formula: buildPercentFormula(v, percentSelectedCols),
                        });
                      }}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center text-slate-900 font-bold text-xs focus:outline-none focus:border-indigo-600"
                    />
                    <span className="text-slate-600 font-bold">%</span>
                    <div className="flex gap-1">
                      {[1, 3, 5, 10, 15].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setPercentRate(p);
                            update({
                              formula: buildPercentFormula(p, percentSelectedCols),
                            });
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                            percentRate === p
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-white p-2 rounded border border-slate-200 max-h-28 overflow-y-auto">
                    {campos
                      .filter((c) => c.id !== fieldModalData.id)
                      .map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={percentSelectedCols.includes(c.slug)}
                            onChange={() => {
                              const next = percentSelectedCols.includes(c.slug)
                                ? percentSelectedCols.filter((s) => s !== c.slug)
                                : [...percentSelectedCols, c.slug];
                              setPercentSelectedCols(next);
                              update({
                                formula: buildPercentFormula(percentRate, next),
                              });
                            }}
                            className="accent-indigo-600"
                          />
                          <span className="text-slate-800 text-[11px] font-medium truncate">
                            {c.nombre}
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {/* Suma tab */}
              {formulaAssistantTab === 'suma' && (
                <div className="grid grid-cols-2 gap-1 bg-white p-2 rounded border border-slate-200 max-h-36 overflow-y-auto">
                  {campos
                    .filter((c) => c.id !== fieldModalData.id)
                    .map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={sumSelectedCols.includes(c.slug)}
                          onChange={() => {
                            const next = sumSelectedCols.includes(c.slug)
                              ? sumSelectedCols.filter((s) => s !== c.slug)
                              : [...sumSelectedCols, c.slug];
                            setSumSelectedCols(next);
                            update({ formula: buildSumFormula(next) });
                          }}
                          className="accent-indigo-600"
                        />
                        <span className="text-slate-800 text-[11px] font-medium truncate">
                          {c.nombre}
                        </span>
                      </label>
                    ))}
                </div>
              )}

              {/* Resta tab */}
              {formulaAssistantTab === 'resta' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 font-semibold text-[10px] block mb-1">
                      Columna Base:
                    </span>
                    <select
                      value={diffBaseCol}
                      onChange={(e) => {
                        setDiffBaseCol(e.target.value);
                        update({
                          formula: buildDiffFormula(e.target.value, diffMinusCol),
                        });
                      }}
                      className={SELECT_CLS}
                    >
                      {campos
                        .filter((c) => c.id !== fieldModalData.id)
                        .map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold text-[10px] block mb-1">
                      Menos:
                    </span>
                    <select
                      value={diffMinusCol}
                      onChange={(e) => {
                        setDiffMinusCol(e.target.value);
                        update({
                          formula: buildDiffFormula(diffBaseCol, e.target.value),
                        });
                      }}
                      className={SELECT_CLS}
                    >
                      {campos
                        .filter((c) => c.id !== fieldModalData.id)
                        .map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Teclado libre tab */}
              {formulaAssistantTab === 'teclado' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {campos
                      .filter((c) => c.id !== fieldModalData.id)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            update({
                              formula: fieldModalData.formula
                                ? `${fieldModalData.formula} ${c.slug}`
                                : c.slug,
                            })
                          }
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[10px] font-medium shadow-2xs"
                        >
                          {c.nombre}
                        </button>
                      ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['+', '-', '*', '/', '(', ')', '0.03', '0.05', '0.10'].map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() =>
                          update({
                            formula: fieldModalData.formula
                              ? `${fieldModalData.formula} ${op}`
                              : op,
                          })
                        }
                        className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-900 font-mono font-bold border border-slate-300 rounded text-xs shadow-2xs"
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Formula preview */}
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">Fórmula:</span>
                  <input
                    type="text"
                    value={fieldModalData.formula}
                    onChange={(e) => update({ formula: e.target.value })}
                    className="bg-transparent text-right font-mono font-bold text-indigo-700 text-[11px] focus:outline-none flex-1 ml-2"
                    placeholder="(sin fórmula)"
                  />
                </div>
                {getFormulaExplanation(
                  fieldModalData.formula,
                  fieldModalData.modo_calculo
                ) && (
                  <p className="text-[10px] text-slate-500 italic">
                    {getFormulaExplanation(
                      fieldModalData.formula,
                      fieldModalData.modo_calculo
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Redondeo ── */}
          <div>
            <label className={LABEL_CLS}>Redondeo Dinámico</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['ninguno', 'arriba', 'abajo', 'estandar'] as const).map((r) => (
                <SectionBtn
                  key={r}
                  active={fieldModalData.tipo_redondeo === r}
                  onClick={() => update({ tipo_redondeo: r })}
                >
                  <span className="font-bold capitalize">
                    {r === 'ninguno'
                      ? 'Exacto'
                      : r === 'arriba'
                      ? '↑ Arriba (Techo)'
                      : r === 'abajo'
                      ? '↓ Abajo (Piso)'
                      : '⇅ Estándar'}
                  </span>
                  <span className="text-[10px] opacity-70">
                    {r === 'ninguno'
                      ? 'Sin redondeo'
                      : r === 'arriba'
                      ? '$12.100 → $13.000'
                      : r === 'abajo'
                      ? '$12.900 → $12.000'
                      : '≥0.5 sube, <0.5 baja'}
                  </span>
                </SectionBtn>
              ))}
            </div>

            {fieldModalData.tipo_redondeo !== 'ninguno' && (
              <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-600 font-semibold block mb-1.5">
                  Múltiplo / Precisión:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: '$1', val: 1 },
                    { label: '$100', val: 100 },
                    { label: '$1.000', val: 1000 },
                    { label: '$10.000', val: 10000 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => update({ multiplo_redondeo: p.val })}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                        fieldModalData.multiplo_redondeo === p.val
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={fieldModalData.multiplo_redondeo || 1}
                      onChange={(e) =>
                        update({
                          multiplo_redondeo: parseFloat(e.target.value) || 1,
                        })
                      }
                      className="w-16 px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Acumulable ── */}
          <label className="flex items-center gap-2.5 cursor-pointer p-2.5 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
            <input
              type="checkbox"
              checked={fieldModalData.es_acumulable}
              onChange={(e) => update({ es_acumulable: e.target.checked })}
              className="accent-indigo-600 w-4 h-4"
            />
            <div>
              <span className="font-bold text-slate-800 block text-xs">
                Campo acumulable mes a mes
              </span>
              <span className="text-[10px] text-slate-500">
                Traslada saldos automáticamente al siguiente periodo
              </span>
            </div>
          </label>

          {/* ── Control de Fondos y Gastos ── */}
          <label className={`flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border transition ${
            fieldModalData.es_fondo
              ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-500/20'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}>
            <input
              type="checkbox"
              checked={fieldModalData.es_fondo}
              onChange={(e) => update({ es_fondo: e.target.checked })}
              className="accent-indigo-600 w-4 h-4 mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Wallet className={`w-3.5 h-3.5 ${fieldModalData.es_fondo ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span className="font-bold text-slate-800 text-xs">
                  Habilitar como Fondo de Tesorería
                </span>
                {fieldModalData.es_fondo && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                    Activo
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5 leading-relaxed">
                Permite controlar el recaudo, saldo disponible y registrar salidas de dinero (gastos) contra esta columna en el módulo de Gastos.
              </span>
            </div>
          </label>
        </form>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 bg-slate-50">
          {fieldModalData.id && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded font-semibold text-xs transition"
            >
              Eliminar
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={onSave}
              disabled={savingField}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {savingField ? 'Guardando…' : 'Guardar Columna'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
