import { Controller, Get, Put, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('permisos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermisosController {
  constructor(private permisosService: PermisosService) {}

  @Get(':iglesia_id')
  async findByIglesia(@Param('iglesia_id') iglesiaId: string, @Request() req) {
    // Security check
    if (req.user.rol === 'iglesia' && req.user.iglesiaId !== iglesiaId) {
      throw new ForbiddenException('No tiene permisos para acceder a esta iglesia.');
    }
    return this.permisosService.findByIglesia(iglesiaId);
  }

  @Put(':iglesia_id')
  @Roles('tesorero')
  async updatePermisos(
    @Param('iglesia_id') iglesiaId: string,
    @Body() body: { campo_id: string; editable_por_iglesia: boolean }[],
    @Request() req,
  ) {
    return this.permisosService.updatePermisos(iglesiaId, body, req.user.userId);
  }
}
