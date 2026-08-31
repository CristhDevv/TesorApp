import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IglesiasService, CreateIglesiaDto, UpdateIglesiaDto } from './iglesias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EstadoIglesia } from '@prisma/client';

@Controller('iglesias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IglesiasController {
  constructor(private readonly iglesiasService: IglesiasService) {}

  @Get()
  async findAll(@Request() req) {
    return this.iglesiasService.findAll(req.user.rol, req.user.iglesiaId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.iglesiasService.findOne(id, req.user.rol, req.user.iglesiaId);
  }

  @Post()
  @Roles('tesorero')
  async create(
    @Body() body: CreateIglesiaDto, 
    @Request() req
  ) {
    return this.iglesiasService.create(body, req.user.userId);
  }

  @Put('reordenar-lote')
  @Roles('tesorero')
  async reorderBatch(
    @Body() body: { items: { id: string; orden: number }[] },
    @Request() req,
  ) {
    return this.iglesiasService.reorderBatch(body.items || [], req.user.userId);
  }

  @Put(':id')
  @Roles('tesorero')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateIglesiaDto,
    @Request() req,
  ) {
    return this.iglesiasService.update(id, body, req.user.userId);
  }

  @Patch(':id/estado')
  @Roles('tesorero')
  async updateEstado(
    @Param('id') id: string,
    @Body() body: { estado: EstadoIglesia },
    @Request() req,
  ) {
    return this.iglesiasService.updateEstado(id, body.estado, req.user.userId);
  }

  @Delete(':id')
  @Roles('tesorero')
  async remove(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.iglesiasService.remove(id, req.user.userId);
  }
}
