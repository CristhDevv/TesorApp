import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from "@nestjs/common";
import { GastosService } from "./gastos.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("gastos")
export class GastosController {
  constructor(private readonly gastosService: GastosService) {}

  @Get()
  findAll(
    @Query("periodo_id") periodoId?: string,
    @Query("campo_fondo_id") campoFondoId?: string,
  ) {
    return this.gastosService.findAll(periodoId, campoFondoId);
  }

  @Get("resumen")
  getResumen(@Query("periodo_id") periodoId: string) {
    return this.gastosService.getResumen(periodoId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.gastosService.findOne(id);
  }

  @Post("fondos")
  createFondo(
    @Body()
    body: {
      nombre: string;
      monto?: number;
      periodo_id?: string;
      es_transito?: boolean;
      ente_superior_nombre?: string;
      es_acumulable?: boolean;
    },
    @Request() req: any,
  ) {
    return this.gastosService.createFondoManual(body, req.user.userId, req.user.rol);
  }

  @Put("fondos/:id")
  updateFondo(
    @Param("id") id: string,
    @Body()
    body: {
      nombre?: string;
      monto?: number;
      periodo_id?: string;
      es_transito?: boolean;
      ente_superior_nombre?: string;
      es_acumulable?: boolean;
    },
    @Request() req: any,
  ) {
    return this.gastosService.updateFondoManual(id, body, req.user.userId, req.user.rol);
  }

  @Put("fondos/:id/monto")
  setMontoFondo(
    @Param("id") id: string,
    @Body() body: { monto: number; periodo_id: string; observacion?: string },
    @Request() req: any,
  ) {
    return this.gastosService.setMontoFondo(id, body, req.user.userId, req.user.rol);
  }

  @Delete("fondos/:id")
  removeFondo(@Param("id") id: string, @Request() req: any) {
    return this.gastosService.removeFondo(id, req.user.userId, req.user.rol);
  }

  @Post()
  create(@Body() body: { descripcion: string; monto: number; fecha: string; periodo_id: string; campo_fondo_id: string }, @Request() req: any) {
    return this.gastosService.create(body, req.user.userId, req.user.rol);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() body: { descripcion?: string; monto?: number; fecha?: string; campo_fondo_id?: string },
    @Request() req: any,
  ) {
    return this.gastosService.update(id, body, req.user.userId, req.user.rol);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Request() req: any) {
    return this.gastosService.remove(id, req.user.userId, req.user.rol);
  }
}
