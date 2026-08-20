import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tesorero')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  async findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  async create(
    @Body()
    body: {
      nombre_completo: string;
      correo: string;
      contrasena: string;
      rol: Rol;
      iglesia_id?: string;
    },
    @Request() req,
  ) {
    return this.usuariosService.create(body, req.user.userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      nombre_completo?: string;
      correo?: string;
      contrasena?: string;
      rol?: Rol;
      iglesia_id?: string;
      activo?: boolean;
    },
    @Request() req,
  ) {
    return this.usuariosService.update(id, body, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.usuariosService.remove(id, req.user.userId);
  }
}
