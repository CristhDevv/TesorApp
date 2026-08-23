import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CamposService } from './campos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TipoCampo, ModoCalculo } from '@prisma/client';

@Controller('campos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CamposController {
  constructor(private camposService: CamposService) {}

  @Get()
  async findAll() {
    return this.camposService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.camposService.findOne(id);
  }

  @Post()
  @Roles('tesorero')
  async create(
    @Body()
    body: {
      nombre: string;
      tipo: TipoCampo;
      modo_calculo: ModoCalculo;
      formula?: string;
      tipo_redondeo?: any;
      multiplo_redondeo?: number;
      es_acumulable?: boolean;
      es_fondo?: boolean;
      seccion: string;
      seccion_iglesia?: string;
      seccion_tesorero?: string;
      orden: number;
      aplica_a_todas_las_iglesias?: boolean;
      visible_para_iglesia?: boolean;
      visible_para_tesorero?: boolean;
      es_temporal?: boolean;
      periodo_id?: string | null;
      iglesias_especificas?: string[];
    },
    @Request() req,
  ) {
    return this.camposService.create(body, req.user.userId);
  }

  @Put(':id')
  @Roles('tesorero')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      nombre?: string;
      tipo?: TipoCampo;
      modo_calculo?: ModoCalculo;
      formula?: string;
      tipo_redondeo?: any;
      multiplo_redondeo?: number;
      es_acumulable?: boolean;
      es_fondo?: boolean;
      seccion?: string;
      seccion_iglesia?: string;
      seccion_tesorero?: string;
      orden?: number;
      aplica_a_todas_las_iglesias?: boolean;
      visible_para_iglesia?: boolean;
      visible_para_tesorero?: boolean;
      es_temporal?: boolean;
      periodo_id?: string | null;
      iglesias_especificas?: string[];
    },
    @Request() req,
  ) {
    return this.camposService.update(id, body, req.user.userId);
  }

  @Delete(':id')
  @Roles('tesorero')
  async remove(@Param('id') id: string, @Request() req) {
    return this.camposService.remove(id, req.user.userId);
  }
}
