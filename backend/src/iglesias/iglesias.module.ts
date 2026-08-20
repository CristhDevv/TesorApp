import { Module } from '@nestjs/common';
import { IglesiasService } from './iglesias.service';
import { IglesiasController } from './iglesias.controller';

@Module({
  providers: [IglesiasService],
  controllers: [IglesiasController],
  exports: [IglesiasService],
})
export class IglesiasModule {}
