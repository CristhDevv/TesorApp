import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from "@nestjs/common";
import { GastosService } from "./gastos.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("gastos")
export class GastosController {
  constructor(private readonly gastosService: GastosService) {}

  @Get()
  @Roles("tesorero", "secretario", "presbitero")
  findAll(
    @Query("periodo_id") periodoId?: string,
    @Query("campo_fondo_id") campoFondoId?: string,
  ) {
    return this.gastosService.findAll(periodoId, campoFondoId);
  }

  @Get("resumen")
  @Roles("tesorero", "secretario", "presbitero")
  getResumen(@Query("periodo_id") periodoId: string) {
    return this.gastosService.getResumen(periodoId);
  }

  @Get(":id")
  @Roles("tesorero", "secretario", "presbitero")
  findOne(@Param("id") id: string) {
    return this.gastosService.findOne(id);
  }

  @Post("fondos")
  @Roles("tesorero")
  createFondo(
    @Body()
    body: {
      nombre: string;
      monto?: number;
      periodo_id?: string;
      fecha?: string;
      es_transito?: boolean;
      ente_superior_nombre?: string;
      es_acumulable?: boolean;
    },
    @Request() req: any,
  ) {
    return this.gastosService.createFondoManual(body, req.user.userId, req.user.rol);
  }

  @Put("fondos/:id")
  @Roles("tesorero")
  updateFondo(
    @Param("id") id: string,
    @Body()
    body: {
      nombre?: string;
      monto?: number;
      periodo_id?: string;
      fecha?: string;
      es_transito?: boolean;
      ente_superior_nombre?: string;
      es_acumulable?: boolean;
    },
    @Request() req: any,
  ) {
    return this.gastosService.updateFondoManual(id, body, req.user.userId, req.user.rol);
  }

  @Put("fondos/:id/monto")
  @Roles("tesorero")
  setMontoFondo(
    @Param("id") id: string,
    @Body() body: { monto: number; periodo_id?: string; fecha?: string; observacion?: string },
    @Request() req: any,
  ) {
    return this.gastosService.setMontoFondo(id, body, req.user.userId, req.user.rol);
  }

  @Get("fondos/:id/movimientos")
  @Roles("tesorero", "secretario", "presbitero")
  getMovimientosFondo(@Param("id") id: string) {
    return this.gastosService.getMovimientosFondo(id);
  }

  @Post("fondos/:id/ingresos")
  @Roles("tesorero")
  addIngresoFondo(
    @Param("id") id: string,
    @Body() body: { monto: number; fecha?: string; descripcion?: string; observacion?: string; periodo_id?: string },
    @Request() req: any,
  ) {
    return this.gastosService.addIngresoFondo(id, body, req.user.userId, req.user.rol);
  }

  @Put("fondos/ingresos/:ingresoId")
  @Roles("tesorero")
  updateIngresoFondo(
    @Param("ingresoId") ingresoId: string,
    @Body() body: { monto?: number; fecha?: string; descripcion?: string; observacion?: string },
    @Request() req: any,
  ) {
    return this.gastosService.updateIngresoFondo(ingresoId, body, req.user.userId, req.user.rol);
  }

  @Delete("fondos/ingresos/:ingresoId")
  @Roles("tesorero")
  deleteIngresoFondo(@Param("ingresoId") ingresoId: string, @Request() req: any) {
    return this.gastosService.deleteIngresoFondo(ingresoId, req.user.userId, req.user.rol);
  }

  @Delete("fondos/:id")
  @Roles("tesorero")
  removeFondo(@Param("id") id: string, @Request() req: any) {
    return this.gastosService.removeFondo(id, req.user.userId, req.user.rol);
  }

  @Post()
  @Roles("tesorero")
  create(@Body() body: { descripcion: string; monto: number; fecha: string; periodo_id: string; campo_fondo_id: string }, @Request() req: any) {
    return this.gastosService.create(body, req.user.userId, req.user.rol);
  }

  @Put(":id")
  @Roles("tesorero")
  update(
    @Param("id") id: string,
    @Body() body: { descripcion?: string; monto?: number; fecha?: string; campo_fondo_id?: string },
    @Request() req: any,
  ) {
    return this.gastosService.update(id, body, req.user.userId, req.user.rol);
  }

  @Delete(":id")
  @Roles("tesorero")
  remove(@Param("id") id: string, @Request() req: any) {
    return this.gastosService.remove(id, req.user.userId, req.user.rol);
  }
}
