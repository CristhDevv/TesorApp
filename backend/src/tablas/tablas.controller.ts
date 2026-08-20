import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { TablasService } from './tablas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('tablas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TablasController {
  constructor(private tablasService: TablasService) {}

  @Get()
  async findAll() {
    return this.tablasService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tablasService.findOne(id);
  }

  @Post()
  @Roles('tesorero')
  async create(
    @Body() body: { nombre: string; iglesia_ids: string[]; campo_ids: string[] },
    @Request() req,
  ) {
    return this.tablasService.create(body, req.user.userId);
  }

  @Put(':id')
  @Roles('tesorero')
  async update(
    @Param('id') id: string,
    @Body() body: { nombre?: string; iglesia_ids?: string[]; campo_ids?: string[] },
    @Request() req,
  ) {
    return this.tablasService.update(id, body, req.user.userId);
  }

  @Delete(':id')
  @Roles('tesorero')
  async remove(@Param('id') id: string, @Request() req) {
    return this.tablasService.remove(id, req.user.userId);
  }
}
