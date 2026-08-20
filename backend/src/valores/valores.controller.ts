import { Controller, Get, Put, Body, Query, Param, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ValoresService } from './valores.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('valores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ValoresController {
  constructor(private valoresService: ValoresService) {}

  @Get()
  async findValues(
    @Query('iglesia_id') iglesiaId: string,
    @Query('tabla_id') tablaId: string,
    @Query('periodo_id') periodoId: string,
    @Query('mostrar_todos') mostrarTodos: string,
    @Request() req,
  ) {
    if (!periodoId) {
      throw new BadRequestException('Se requiere periodo_id.');
    }
    if (tablaId) {
      return this.valoresService.findTableValues(
        tablaId,
        periodoId,
        req.user.rol,
        req.user.iglesiaId,
        mostrarTodos === 'true',
      );
    }
    if (!iglesiaId) {
      throw new BadRequestException('Se requiere iglesia_id o tabla_id.');
    }
    // Access control
    if (req.user.rol === 'iglesia' && req.user.iglesiaId !== iglesiaId) {
      throw new ForbiddenException('No tiene permisos para acceder a esta iglesia.');
    }
    return this.valoresService.findValues(iglesiaId, periodoId, req.user.rol, req.user.iglesiaId);
  }

  @Put(':iglesia_id/lote/:periodo_id')
  async updateBatchValues(
    @Param('iglesia_id') iglesiaId: string,
    @Param('periodo_id') periodoId: string,
    @Body() body: { valores: { campo_id: string; valor_manual: number }[] },
    @Request() req,
  ) {
    if (req.user.rol === 'iglesia' && req.user.iglesiaId !== iglesiaId) {
      throw new ForbiddenException('No tiene permisos para modificar esta iglesia.');
    }
    return this.valoresService.updateBatchValues(
      iglesiaId,
      periodoId,
      body.valores || [],
      req.user.userId,
      req.user.rol,
      req.user.iglesiaId,
    );
  }

  @Put(':iglesia_id/:campo_id/:periodo_id')
  async updateValue(
    @Param('iglesia_id') iglesiaId: string,
    @Param('campo_id') campoId: string,
    @Param('periodo_id') periodoId: string,
    @Body() body: { valor_manual: number },
    @Request() req,
  ) {
    // Access control
    if (req.user.rol === 'iglesia' && req.user.iglesiaId !== iglesiaId) {
      throw new ForbiddenException('No tiene permisos para modificar esta iglesia.');
    }
    if (body.valor_manual === undefined) {
      throw new BadRequestException('Se requiere valor_manual.');
    }
    return this.valoresService.updateValue(
      iglesiaId,
      campoId,
      periodoId,
      body.valor_manual,
      req.user.userId,
      req.user.rol,
      req.user.iglesiaId,
    );
  }
}
