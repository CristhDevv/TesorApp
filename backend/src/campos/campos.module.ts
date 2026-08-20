import { Module, forwardRef } from '@nestjs/common';
import { CamposService } from './campos.service';
import { CamposController } from './campos.controller';
import { ValoresModule } from '../valores/valores.module';

@Module({
  imports: [forwardRef(() => ValoresModule)],
  providers: [CamposService],
  controllers: [CamposController],
  exports: [CamposService],
})
export class CamposModule {}
