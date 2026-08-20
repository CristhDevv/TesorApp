import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PeriodosService } from './periodos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('periodos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PeriodosController {
  constructor(private periodosService: PeriodosService) {}

  @Get()
  async findAll() {
    return this.periodosService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.periodosService.findOne(id);
  }

  @Post()
  @Roles('tesorero')
  async create(
    @Body() body: { nombre: string; fecha_inicio: string; fecha_fin: string },
    @Request() req,
  ) {
    return this.periodosService.create(body, req.user.userId);
  }

  @Patch(':id/cerrar')
  @Roles('tesorero')
  async cerrarPeriodo(@Param('id') id: string, @Request() req) {
    return this.periodosService.cerrarPeriodo(id, req.user.userId);
  }

  @Patch(':id/reabrir')
  @Roles('tesorero')
  async reabrirPeriodo(@Param('id') id: string, @Request() req) {
    return this.periodosService.reabrirPeriodo(id, req.user.userId);
  }
}
