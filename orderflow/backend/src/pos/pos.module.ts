import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { PosCoreService } from './pos-core.service';
import { GastroPosService } from './gastro-pos.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [PosController],
  providers: [PosCoreService, GastroPosService],
  exports: [PosCoreService, GastroPosService],
})
export class PosModule {}
