import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { InformesService } from "./informes.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EstadoInforme } from "@prisma/client";

@Controller("informes")
@UseGuards(JwtAuthGuard)
export class InformesController {
  constructor(private informesService: InformesService) {}

  @Get()
  async getInforme(
    @Query("iglesia_id") iglesiaId: string,
    @Query("periodo_id") periodoId: string,
    @Request() req: any,
  ) {
    const targetIglesia = req.user.rol === "iglesia" ? req.user.iglesiaId : iglesiaId;
    if (!targetIglesia) throw new BadRequestException("Se requiere iglesia_id.");
    return this.informesService.getInforme(targetIglesia, periodoId);
  }

  @Get("periodo")
  async getInformesByPeriodo(
    @Query("periodo_id") periodoId: string,
  ) {
    return this.informesService.getInformesByPeriodo(periodoId);
  }

  @Post("enviar")
  async enviarInforme(
    @Body() body: { iglesia_id: string; periodo_id: string },
    @Request() req: any,
  ) {
    const iglesiaId = req.user.rol === "iglesia" ? req.user.iglesiaId : body.iglesia_id;
    if (!iglesiaId || !body.periodo_id) {
      throw new BadRequestException("Se requieren iglesia_id y periodo_id.");
    }
    return this.informesService.enviarInforme(
      iglesiaId,
      body.periodo_id,
      req.user.userId,
      req.user.rol,
      req.user.iglesiaId,
    );
  }

  @Put("estado")
  async cambiarEstado(
    @Body() body: { iglesia_id: string; periodo_id: string; estado: EstadoInforme; observaciones?: string },
    @Request() req: any,
  ) {
    if (!body.iglesia_id || !body.periodo_id || !body.estado) {
      throw new BadRequestException("Se requieren iglesia_id, periodo_id y estado.");
    }
    return this.informesService.cambiarEstado(
      body.iglesia_id,
      body.periodo_id,
      { estado: body.estado, observaciones: body.observaciones },
      req.user.userId,
      req.user.rol,
    );
  }

  @Post("consolidar-todos")
  async consolidarTodos(
    @Body() body: { periodo_id: string },
    @Request() req: any,
  ) {
    if (!body.periodo_id) throw new BadRequestException("Se requiere periodo_id.");
    return this.informesService.consolidarTodos(body.periodo_id, req.user.userId, req.user.rol);
  }
}
