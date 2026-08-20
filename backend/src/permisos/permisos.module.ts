import { Module } from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { PermisosController } from './permisos.controller';

@Module({
  providers: [PermisosService],
  controllers: [PermisosController],
  exports: [PermisosService],
})
export class PermisosModule {}
