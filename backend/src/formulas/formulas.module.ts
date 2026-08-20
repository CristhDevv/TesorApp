import { Global, Module } from '@nestjs/common';
import { FormulasService } from './formulas.service';

@Global()
@Module({
  providers: [FormulasService],
  exports: [FormulasService],
})
export class FormulasModule {}
