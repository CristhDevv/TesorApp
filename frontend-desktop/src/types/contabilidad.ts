// Tipos TypeScript estrictos para TesorApp
// Mapean directamente a las entidades del backend NestJS/Prisma

export type TipoCampo = 'moneda' | 'porcentaje' | 'entero' | 'decimal';
export type ModoCalculo = 'manual' | 'calculado';
export type TipoRedondeo = 'ninguno' | 'arriba' | 'abajo' | 'estandar';
export type RolUsuario = 'tesorero' | 'iglesia';
export type EstadoPeriodo = 'abierto' | 'cerrado';
export type EstadoIglesia = 'activa' | 'inactiva';
export type EstadoInforme = 'borrador' | 'enviado' | 'en_revision' | 'aprobado' | 'consolidado';
export type SeccionCampo = 'Ingresos' | 'Egresos' | 'Informativo' | 'Totales' | 'Resumen';

export interface InformeMeta {
  id?: string;
  enviado_en?: string | null;
  enviado_por?: string | null;
  revisado_en?: string | null;
  revisado_por?: string | null;
  aprobado_en?: string | null;
  aprobado_por?: string | null;
  observaciones?: string | null;
}

export interface Campo {
  id: string;
  nombre: string;
  slug: string;
  tipo: TipoCampo;
  modo_calculo: ModoCalculo;
  formula: string | null;
  tipo_redondeo: TipoRedondeo;
  multiplo_redondeo: number;
  es_acumulable: boolean;
  seccion: SeccionCampo;
  seccion_iglesia: SeccionCampo;
  seccion_tesorero: SeccionCampo;
  orden: number;
  aplica_a_todas_las_iglesias: boolean;
  visible_para_iglesia: boolean;
  visible_para_tesorero: boolean;
  es_temporal: boolean;
  periodo_id: string | null;
  activo: boolean;
  periodo?: { id: string; nombre: string } | null;
}

export interface CampoModal extends Omit<Campo, 'id' | 'activo' | 'periodo'> {
  id: string;
  iglesias_especificas: string[];
}

export interface Iglesia {
  id: string;
  nombre: string;
  identificador_interno: string | null;
  estado: EstadoIglesia;
  nombre_pastor: string | null;
  direccion: string | null;
  codigo: string | null;
  telefono: string | null;
  correo: string | null;
  tabla_id: string | null;
}

export interface Periodo {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoPeriodo;
}

export interface ValorCelda {
  campo_id: string;
  nombre_campo: string;
  slug: string;
  tipo: TipoCampo;
  modo_calculo: ModoCalculo;
  seccion: string;
  formula: string | null;
  valor_manual: number | null;
  valor_calculado: number | null;
  valor_acumulado: number | null;
  editable: boolean;
  es_acumulable: boolean;
  actualizado_por?: string;
  actualizado_en?: string;
}

export interface FilaGrid {
  iglesia_id: string;
  iglesia_nombre: string;
  codigo: string | null;
  nombre_pastor?: string | null;
  estado_informe?: EstadoInforme;
  informe_meta?: InformeMeta | null;
  valores: ValorCelda[];
}

export interface ColumnaGrid {
  id: string;
  nombre: string;
  slug: string;
  tipo: TipoCampo;
  modo_calculo: ModoCalculo;
  seccion: string;
  seccion_iglesia?: string;
  seccion_tesorero?: string;
  formula: string | null;
  es_acumulable: boolean;
  tipo_redondeo: TipoRedondeo;
  multiplo_redondeo: number;
}

export interface GridData {
  tabla_id: string;
  tabla_nombre: string;
  periodo_id: string;
  periodo_nombre: string;
  columnas: ColumnaGrid[];
  filas: FilaGrid[];
}

export interface Usuario {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: RolUsuario;
  iglesia_id: string | null;
  activo: boolean;
  iglesia?: Iglesia | null;
}

export interface Tabla {
  id: string;
  nombre: string;
  iglesias: Iglesia[];
  campos: { campo_id: string; orden: number }[];
}

export interface HistorialEntry {
  id: string;
  entidad: string;
  entidad_id: string;
  accion: string;
  valor_anterior: unknown;
  valor_nuevo: unknown;
  realizado_en: string;
  usuario?: { nombre_completo: string } | null;
}

export interface AuthUser {
  userId: string;
  correo: string;
  rol: RolUsuario;
  nombre: string;
  iglesiaId: string | null;
  iglesia?: Iglesia | null;
  nombre_completo: string;
}

// Sort state
export interface SortState {
  colKey: string;
  direction: 'asc' | 'desc';
}

// Cell editing state
export interface EditingCell {
  churchId: string;
  fieldId: string;
}

// Toast notification
export interface ToastState {
  msg: string;
  type: 'success' | 'error';
}
