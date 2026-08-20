import { Controller, Get, Query, UseGuards, Request, Res, ForbiddenException } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private reportesService: ReportesService) {}

  @Get('comparacion')
  async getComparacion(
    @Query('iglesia_id') iglesiaId: string,
    @Query('campo_id') campoId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Request() req,
  ) {
    if (req.user.rol === 'iglesia' && req.user.iglesiaId !== iglesiaId) {
      throw new ForbiddenException('No tiene permisos para consultar esta iglesia.');
    }
    return this.reportesService.getComparacion(
      iglesiaId,
      campoId,
      desde,
      hasta,
      req.user.rol,
      req.user.iglesiaId,
    );
  }

  @Get('consolidado')
  @Roles('tesorero')
  async getConsolidado(
    @Query('campo_id') campoId: string,
    @Query('periodo_id') periodoId: string,
  ) {
    return this.reportesService.getConsolidado(campoId, periodoId);
  }

  @Get('exportar')
  async exportarExcel(
    @Query('periodo_id') periodoId: string,
    @Query('tabla_id') tablaId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const workbook = await this.reportesService.exportarExcel(
      periodoId,
      req.user.rol,
      req.user.iglesiaId,
      tablaId,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Reporte_Financiero_${periodoId}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
