import { useState, useEffect, useMemo, useRef } from 'react';
import {
  GripVertical,
  Save,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Edit2,
  Check,
  Building2,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  Info,
  Plus,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import type { Campo } from '../../types/contabilidad';

interface ChurchViewOrganizerProps {
  campos: Campo[];
  tablas: any[];
  onSaveBatch: (
    items: {
      id: string;
      orden: number;
      nombre?: string;
      seccion_iglesia?: string;
      visible_para_iglesia?: boolean;
    }[],
    tablaId?: string,
    campoIdsForTable?: string[]
  ) => Promise<void>;
  onRefreshCampos: () => Promise<void>;
  onRefreshTablas?: () => Promise<void>;
}

interface EditableCampo extends Campo {
  _localNombre: string;
  _localSeccionIglesia: string;
  _localVisibleIglesia: boolean;
  _isAssignedToCurrentTable: boolean;
}

export function ChurchViewOrganizer({
  campos,
  tablas,
  onSaveBatch,
  onRefreshCampos,
  onRefreshTablas,
}: ChurchViewOrganizerProps) {
  // Selected table view filter: 'all' or specific tabla.id
  const [selectedTableId, setSelectedTableId] = useState<string>('all');
  const [items, setItems] = useState<EditableCampo[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drag & Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);

  const currentSelectedTable = useMemo(() => {
    if (selectedTableId === 'all') return null;
    return tablas.find((t) => t.id === selectedTableId) || null;
  }, [tablas, selectedTableId]);

  // Load and order items based on selected table
  useEffect(() => {
    if (selectedTableId === 'all') {
      // Global template view: all active fields ordered by general orden
      const sorted = [...campos]
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((c, idx) => ({
          ...c,
          orden: idx,
          _localNombre: c.nombre,
          _localSeccionIglesia: c.seccion_iglesia || c.seccion || 'Ingresos',
          _localVisibleIglesia: c.visible_para_iglesia !== false,
          _isAssignedToCurrentTable: true,
        }));
      setItems(sorted);
    } else {
      // Specific table view: fields in tabla.campos in their specific order first, then other fields as unassigned
      const tableObj = tablas.find((t) => t.id === selectedTableId);
      const tableFieldMap = new Map<string, number>();
      if (tableObj && Array.isArray(tableObj.campos)) {
        tableObj.campos.forEach((ct: any, idx: number) => {
          tableFieldMap.set(ct.campo_id || ct.campo?.id, ct.orden ?? idx);
        });
      }

      const assignedFields: EditableCampo[] = [];
      const unassignedFields: EditableCampo[] = [];

      // Sort assigned fields by their table order
      const assignedRaw = [...campos].filter((c) => tableFieldMap.has(c.id));
      assignedRaw.sort((a, b) => (tableFieldMap.get(a.id) ?? 0) - (tableFieldMap.get(b.id) ?? 0));

      assignedRaw.forEach((c, idx) => {
        assignedFields.push({
          ...c,
          orden: idx,
          _localNombre: c.nombre,
          _localSeccionIglesia: c.seccion_iglesia || c.seccion || 'Ingresos',
          _localVisibleIglesia: c.visible_para_iglesia !== false,
          _isAssignedToCurrentTable: true,
        });
      });

      // Unassigned fields
      const unassignedRaw = [...campos].filter((c) => !tableFieldMap.has(c.id));
      unassignedRaw.forEach((c) => {
        unassignedFields.push({
          ...c,
          orden: 999,
          _localNombre: c.nombre,
          _localSeccionIglesia: c.seccion_iglesia || c.seccion || 'Ingresos',
          _localVisibleIglesia: false,
          _isAssignedToCurrentTable: false,
        });
      });

      setItems([...assignedFields, ...unassignedFields]);
    }
    setHasChanges(false);
  }, [campos, tablas, selectedTableId]);

  // Auto-focus input when editing title
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // ─── Drag and Drop Logic ─────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };

  const handleDragOverItem = (
    e: React.DragEvent,
    targetId: string,
    targetSection: string
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedId || draggedId === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';

    setDragOverId(targetId);
    setDropPosition(pos);
    setDragOverSection(targetSection);
  };

  const handleDragOverSection = (e: React.DragEvent, section: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSection(section);
  };

  const handleDropOnItem = (
    e: React.DragEvent,
    targetId: string,
    targetSection: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedId || draggedId === targetId) {
      clearDragState();
      return;
    }

    const currentList = [...items];
    const draggedIdx = currentList.findIndex((item) => item.id === draggedId);
    if (draggedIdx === -1) {
      clearDragState();
      return;
    }

    const [draggedItem] = currentList.splice(draggedIdx, 1);
    draggedItem._localVisibleIglesia = true;
    draggedItem._isAssignedToCurrentTable = true;
    if (targetSection !== 'Calculados') {
      draggedItem._localSeccionIglesia = targetSection;
    }

    const targetIdx = currentList.findIndex((item) => item.id === targetId);
    const insertIdx = dropPosition === 'after' ? targetIdx + 1 : targetIdx;

    currentList.splice(insertIdx, 0, draggedItem);

    // Re-index assigned fields
    let currentIdx = 0;
    const reindexed = currentList.map((item) => {
      if (item._isAssignedToCurrentTable) {
        return { ...item, orden: currentIdx++ };
      }
      return item;
    });

    setItems(reindexed);
    setHasChanges(true);
    setSaveSuccess(false);
    clearDragState();
  };

  const handleDropOnSection = (e: React.DragEvent, targetSection: string) => {
    e.preventDefault();
    if (!draggedId) {
      clearDragState();
      return;
    }

    const currentList = [...items];
    const draggedIdx = currentList.findIndex((item) => item.id === draggedId);
    if (draggedIdx === -1) {
      clearDragState();
      return;
    }

    const [draggedItem] = currentList.splice(draggedIdx, 1);
    draggedItem._localVisibleIglesia = true;
    draggedItem._isAssignedToCurrentTable = true;
    if (targetSection !== 'Calculados') {
      draggedItem._localSeccionIglesia = targetSection;
    }

    let lastSectionIdx = -1;
    for (let i = 0; i < currentList.length; i++) {
      if (
        currentList[i]._isAssignedToCurrentTable &&
        currentList[i]._localVisibleIglesia &&
        (targetSection === 'Calculados'
          ? currentList[i].modo_calculo === 'calculado'
          : currentList[i]._localSeccionIglesia === targetSection &&
            currentList[i].modo_calculo === 'manual')
      ) {
        lastSectionIdx = i;
      }
    }

    if (lastSectionIdx !== -1) {
      currentList.splice(lastSectionIdx + 1, 0, draggedItem);
    } else {
      // Put at start of assigned items
      currentList.unshift(draggedItem);
    }

    let currentIdx = 0;
    const reindexed = currentList.map((item) => {
      if (item._isAssignedToCurrentTable) {
        return { ...item, orden: currentIdx++ };
      }
      return item;
    });

    setItems(reindexed);
    setHasChanges(true);
    setSaveSuccess(false);
    clearDragState();
  };

  const clearDragState = () => {
    setDraggedId(null);
    setDragOverId(null);
    setDropPosition(null);
    setDragOverSection(null);
  };

  // ─── Actions ─────────────────────────────────────────────────────────
  const handleMoveStep = (id: string, dir: 'up' | 'down') => {
    const assignedList = items.filter((it) => it._isAssignedToCurrentTable);
    const idx = assignedList.findIndex((it) => it.id === id);
    if (idx === -1) return;
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === assignedList.length - 1) return;

    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    const targetItem = assignedList[targetIdx];

    const currentList = [...items];
    const realIdxA = currentList.findIndex((it) => it.id === id);
    const realIdxB = currentList.findIndex((it) => it.id === targetItem.id);

    const temp = currentList[realIdxA];
    currentList[realIdxA] = currentList[realIdxB];
    currentList[realIdxB] = temp;

    let ord = 0;
    const reindexed = currentList.map((it) => {
      if (it._isAssignedToCurrentTable) {
        return { ...it, orden: ord++ };
      }
      return it;
    });

    setItems(reindexed);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleUpdateNombre = (id: string, newNombre: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, _localNombre: newNombre } : it))
    );
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleUpdateSeccion = (id: string, newSeccion: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, _localSeccionIglesia: newSeccion } : it))
    );
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleToggleAssignToTable = (id: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const nextAssigned = !it._isAssignedToCurrentTable;
          return {
            ...it,
            _isAssignedToCurrentTable: nextAssigned,
            _localVisibleIglesia: nextAssigned,
          };
        }
        return it;
      })
    );
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleReset = () => {
    setSelectedTableId((curr) => {
      // Force trigger reset
      return curr;
    });
    setEditingId(null);
    setHasChanges(false);
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const assignedItems = items.filter((it) => it._isAssignedToCurrentTable);
      const payload = items.map((item, idx) => ({
        id: item.id,
        orden: idx,
        nombre: item._localNombre.trim(),
        seccion_iglesia: item._localSeccionIglesia,
        visible_para_iglesia: item._localVisibleIglesia,
      }));

      const activeTableIds = assignedItems.map((it) => it.id);

      await onSaveBatch(
        payload,
        selectedTableId !== 'all' ? selectedTableId : undefined,
        selectedTableId !== 'all' ? activeTableIds : undefined
      );

      await onRefreshCampos();
      if (onRefreshTablas) await onRefreshTablas();

      setHasChanges(false);
      setSaveSuccess(true);
      setEditingId(null);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error guardando orden de campos:', err);
      setErrorMessage(
        err.response?.data?.message || 'Error al guardar los cambios. Intenta nuevamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Filter items for the Pastoral Form ──────────────────────────────
  const assignedVisibleItems = items.filter(
    (c) => c._isAssignedToCurrentTable && c._localVisibleIglesia
  );
  const unassignedOrHiddenItems = items.filter(
    (c) => !c._isAssignedToCurrentTable || !c._localVisibleIglesia
  );

  // 1. Ingresos manuales
  const ingresosCols = assignedVisibleItems.filter(
    (c) => (c._localSeccionIglesia || c.seccion) === 'Ingresos' && c.modo_calculo === 'manual'
  );

  // 2. Egresos manuales
  const egresosCols = assignedVisibleItems.filter(
    (c) => (c._localSeccionIglesia || c.seccion) === 'Egresos' && c.modo_calculo === 'manual'
  );

  // 3. Aportes e Informativos manuales
  const informativosCols = assignedVisibleItems.filter(
    (c) =>
      c.modo_calculo === 'manual' &&
      (c._localSeccionIglesia || c.seccion) !== 'Ingresos' &&
      (c._localSeccionIglesia || c.seccion) !== 'Egresos'
  );

  // 4. Cálculos automáticos
  const calculosCols = assignedVisibleItems.filter((c) => c.modo_calculo === 'calculado');

  // Render a Draggable Manual Input Row
  const renderDraggableInputRow = (col: EditableCampo, sectionKey: string) => {
    const isDragging = draggedId === col.id;
    const isOver = dragOverId === col.id;
    const isEditing = editingId === col.id;

    return (
      <div
        key={col.id}
        draggable
        onDragStart={(e) => handleDragStart(e, col.id)}
        onDragOver={(e) => handleDragOverItem(e, col.id, sectionKey)}
        onDrop={(e) => handleDropOnItem(e, col.id, sectionKey)}
        onDragEnd={clearDragState}
        className={`group relative bg-white dark:bg-slate-900 border rounded-xl p-2.5 space-y-1 transition-all duration-150 shadow-2xs select-none ${
          isDragging
            ? 'opacity-40 scale-[0.98] border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50'
            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs'
        } ${
          isOver && dropPosition === 'before'
            ? 'border-t-4 border-t-indigo-600 dark:border-t-indigo-400'
            : ''
        } ${
          isOver && dropPosition === 'after'
            ? 'border-b-4 border-b-indigo-600 dark:border-b-indigo-400'
            : ''
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing rounded hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              title="Arrastra para reordenar"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            {isEditing ? (
              <div className="flex items-center gap-1 flex-1 max-w-xs">
                <input
                  ref={editInputRef}
                  type="text"
                  value={col._localNombre}
                  onChange={(e) => handleUpdateNombre(col.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => setEditingId(null)}
                  className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-indigo-500 rounded text-xs font-bold text-slate-900 dark:text-white w-full focus:outline-none ring-1 ring-indigo-500"
                />
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setEditingId(null);
                  }}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setEditingId(col.id)}
                className="flex items-center gap-1.5 cursor-text group/title truncate"
                title="Haz clic para editar el nombre"
              >
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover/title:text-indigo-600 transition">
                  {col._localNombre}
                </span>
                <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/title:opacity-100 shrink-0 transition" />
              </div>
            )}

            {col.es_fondo && (
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${
                  col.es_transito
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200'
                }`}
              >
                {col.es_transito ? '🚀 Tránsito' : '🏛️ Fondo'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <select
              value={col._localSeccionIglesia}
              onChange={(e) => handleUpdateSeccion(col.id, e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-600 cursor-pointer"
              title="Mover a otra sección"
            >
              <option value="Ingresos">1. Ingresos</option>
              <option value="Egresos">2. Egresos</option>
              <option value="Informativo">3. Informativos</option>
            </select>

            <button
              onClick={() => handleToggleAssignToTable(col.id)}
              title={
                selectedTableId !== 'all'
                  ? 'Remover este campo de esta tabla'
                  : 'Ocultar de la vista de iglesia'
              }
              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {selectedTableId !== 'all' ? (
                <Trash2 className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>

            <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition">
              <button
                onClick={() => handleMoveStep(col.id, 'up')}
                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 cursor-pointer"
                title="Subir"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleMoveStep(col.id, 'down')}
                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 cursor-pointer"
                title="Bajar"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          <span className="absolute left-3 top-2 font-mono text-xs text-slate-400 pointer-events-none">
            $
          </span>
          <input
            type="text"
            disabled
            placeholder="0"
            className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-mono font-bold text-sm text-slate-900 dark:text-white cursor-not-allowed"
          />
        </div>
      </div>
    );
  };

  // Render a Draggable Calculated Output Row (Card 4)
  const renderDraggableCalculatedRow = (col: EditableCampo) => {
    const isDragging = draggedId === col.id;
    const isOver = dragOverId === col.id;
    const isEditing = editingId === col.id;

    return (
      <div
        key={col.id}
        draggable
        onDragStart={(e) => handleDragStart(e, col.id)}
        onDragOver={(e) => handleDragOverItem(e, col.id, 'Calculados')}
        onDrop={(e) => handleDropOnItem(e, col.id, 'Calculados')}
        onDragEnd={clearDragState}
        className={`group relative flex items-center justify-between p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 transition-all duration-150 select-none ${
          isDragging
            ? 'opacity-40 scale-[0.98] border-indigo-500 ring-2 ring-indigo-500/20'
            : 'hover:border-indigo-400 dark:hover:border-indigo-600'
        } ${
          isOver && dropPosition === 'before'
            ? 'border-t-4 border-t-indigo-600 dark:border-t-indigo-400'
            : ''
        } ${
          isOver && dropPosition === 'after'
            ? 'border-b-4 border-b-indigo-600 dark:border-b-indigo-400'
            : ''
        }`}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
          <div
            className="p-1 text-slate-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing rounded hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0"
            title="Arrastra para reordenar"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1 max-w-xs">
              <input
                ref={editInputRef}
                type="text"
                value={col._localNombre}
                onChange={(e) => handleUpdateNombre(col.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null);
                }}
                onBlur={() => setEditingId(null)}
                className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-indigo-500 rounded text-xs font-bold text-slate-900 dark:text-white w-full focus:outline-none ring-1 ring-indigo-500"
              />
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setEditingId(null);
                }}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setEditingId(col.id)}
              className="flex items-center gap-1.5 cursor-text group/title truncate"
              title="Haz clic para editar el nombre"
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate group-hover/title:text-indigo-600 transition">
                {col._localNombre}
              </span>
              <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/title:opacity-100 shrink-0 transition" />
            </div>
          )}

          <span
            className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[9px] font-mono font-bold truncate max-w-[130px]"
            title={`Fórmula: ${col.formula}`}
          >
            fx: {col.formula}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono tabular-nums text-sm font-extrabold text-blue-700 dark:text-blue-300">
            $0
          </span>

          <button
            onClick={() => handleToggleAssignToTable(col.id)}
            title={
              selectedTableId !== 'all'
                ? 'Remover este cálculo de esta tabla'
                : 'Ocultar de la vista de iglesia'
            }
            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            {selectedTableId !== 'all' ? (
              <Trash2 className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>

          <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition">
            <button
              onClick={() => handleMoveStep(col.id, 'up')}
              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 cursor-pointer"
              title="Subir"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleMoveStep(col.id, 'down')}
              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 cursor-pointer"
              title="Bajar"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* Top Header & Table Selection Toolbar */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Smartphone className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2">
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                <span>Personalizador de Formulario de Iglesia</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Organiza y asigna campos según la tabla de cada congregación.
              </p>
            </div>

            {/* Table Selector Dropdown */}
            <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200 dark:border-slate-800">
              <TableIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 cursor-pointer shadow-2xs"
              >
                <option value="all">🌐 Todas las Tablas (Plantilla Base)</option>
                {tablas.map((t) => (
                  <option key={t.id} value={t.id}>
                    📋 {t.nombre} ({t.campos?.length ?? 0} campos • {t.iglesias?.length ?? 0} iglesias)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold animate-fade-in shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {selectedTableId !== 'all'
                ? `¡Guardado para ${currentSelectedTable?.nombre || 'la tabla'}!`
                : '¡Guardado para todas las iglesias!'}
            </span>
          )}

          {errorMessage && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg text-xs font-bold animate-fade-in shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              {errorMessage}
            </span>
          )}

          {hasChanges && (
            <span className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-bold animate-pulse">
              Cambios pendientes
            </span>
          )}

          <button
            onClick={handleReset}
            disabled={saving}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-40 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : selectedTableId !== 'all' ? `Guardar Tabla (${currentSelectedTable?.nombre})` : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* Main Drag-and-Drop Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
        {/* Helper Banner */}
        <div className="w-full max-w-[480px] mb-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2 shadow-2xs">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            {selectedTableId !== 'all' ? (
              <span>
                Editando la vista de <strong>{currentSelectedTable?.nombre}</strong>. Solo los campos incluidos en esta tabla aparecerán a sus <strong>{currentSelectedTable?.iglesias?.length ?? 0} iglesias</strong>. Arrastra campos de la bandeja inferior para agregarlos.
              </span>
            ) : (
              <span>
                Editando la <strong>Plantilla Base General</strong>. Selecciona una tabla en el menú superior para personalizar los campos específicos de esa zona/grupo de iglesias.
              </span>
            )}
          </p>
        </div>

        {/* 480px Centered Mobile-First Form Replica */}
        <div className="w-full max-w-[480px] space-y-4 pb-16">
          {/* HEADER SIMPLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-base">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <h1 className="truncate">
                    {selectedTableId !== 'all'
                      ? `Sede de ${currentSelectedTable?.nombre} (Ejemplo)`
                      : 'Iglesia Central (Sede Ejemplo)'}
                  </h1>
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedTableId !== 'all'
                    ? `Tabla asignada: ${currentSelectedTable?.nombre} (${currentSelectedTable?.iglesias?.length ?? 0} iglesias asociadas)`
                    : 'Plantilla Base Global'}
                </p>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold shadow-xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {assignedVisibleItems.length} campos
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Período Contable Activo
              </span>
            </div>
          </div>

          {/* ─── TARJETA 1: INGRESOS ─── */}
          <div
            onDragOver={(e) => handleDragOverSection(e, 'Ingresos')}
            onDrop={(e) => handleDropOnSection(e, 'Ingresos')}
            className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs space-y-3 transition-colors ${
              dragOverSection === 'Ingresos'
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                1. Ingresos
              </h2>
              <span className="font-mono text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                $0
              </span>
            </div>

            <div className="space-y-3 min-h-[30px]">
              {ingresosCols.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-2">
                  No hay campos de ingresos asignados a esta tabla
                </p>
              ) : (
                ingresosCols.map((col) => renderDraggableInputRow(col, 'Ingresos'))
              )}
            </div>
          </div>

          {/* ─── TARJETA 2: EGRESOS / RETENCIONES ─── */}
          <div
            onDragOver={(e) => handleDragOverSection(e, 'Egresos')}
            onDrop={(e) => handleDropOnSection(e, 'Egresos')}
            className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs space-y-3 transition-colors ${
              dragOverSection === 'Egresos'
                ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/10'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                2. Egresos y Retenciones
              </h2>
              <span className="font-mono text-rose-700 dark:text-rose-400 text-xs font-bold">
                $0
              </span>
            </div>

            <div className="space-y-3 min-h-[30px]">
              {egresosCols.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-2">
                  No hay campos de egresos asignados a esta tabla
                </p>
              ) : (
                egresosCols.map((col) => renderDraggableInputRow(col, 'Egresos'))
              )}
            </div>
          </div>

          {/* ─── TARJETA 3: APORTES & DATOS INFORMATIVOS (MANUALES) ─── */}
          {informativosCols.length > 0 && (
            <div
              onDragOver={(e) => handleDragOverSection(e, 'Informativo')}
              onDrop={(e) => handleDropOnSection(e, 'Informativo')}
              className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs space-y-3 transition-colors ${
                dragOverSection === 'Informativo'
                  ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  3. Aportes & Datos Informativos
                </h2>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Ingreso manual
                </span>
              </div>

              <div className="space-y-3 min-h-[30px]">
                {informativosCols.map((col) => renderDraggableInputRow(col, 'Informativo'))}
              </div>
            </div>
          )}

          {/* ─── TARJETA 4: CÁLCULOS Y SALDO (AUTOMÁTICO) ─── */}
          {calculosCols.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  4. Cálculos y Saldo
                </h2>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Automático
                </span>
              </div>

              <div className="space-y-2">
                {calculosCols.map((col) => renderDraggableCalculatedRow(col))}
              </div>
            </div>
          )}

          {/* ─── BANDEJA DE CAMPOS NO ASIGNADOS A ESTA TABLA ─── */}
          {unassignedOrHiddenItems.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {selectedTableId !== 'all'
                      ? `Campos Disponibles no incluidos en ${currentSelectedTable?.nombre || 'esta tabla'} (${unassignedOrHiddenItems.length})`
                      : `Campos Ocultos para la Iglesia (${unassignedOrHiddenItems.length})`}
                  </span>
                </h4>
                <span className="text-[10px] text-slate-400">
                  {selectedTableId !== 'all' ? 'No se muestran a las iglesias de esta tabla' : 'Ocultos para iglesias'}
                </span>
              </div>

              <div className="space-y-1.5">
                {unassignedOrHiddenItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-2xs hover:border-indigo-400 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="cursor-grab active:cursor-grabbing text-slate-400 p-0.5">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {item._localNombre}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">({item.slug})</span>
                      {item.modo_calculo === 'calculado' ? (
                        <span className="text-[9px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                          calculado
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded">
                          {item._localSeccionIglesia}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleAssignToTable(item.id)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      title={
                        selectedTableId !== 'all'
                          ? 'Asignar este campo a esta tabla'
                          : 'Mostrar este campo en la iglesia'
                      }
                    >
                      <Plus className="w-3 h-3" />
                      <span>{selectedTableId !== 'all' ? 'Agregar a esta Tabla' : 'Mostrar en Iglesia'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
