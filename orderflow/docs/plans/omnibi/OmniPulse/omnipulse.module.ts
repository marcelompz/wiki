// backend/src/modules/omnipulse/omnipulse.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OmnipulseController } from './omnipulse.controller';
import { OmnipulseService } from './omnipulse.service';
import { OmnipulsePilar3Controller } from './omnipulse-pilar3.controller';
import { OmnipulsePilar3Service } from './omnipulse-pilar3.service';

@Module({
  imports: [PrismaModule],
  controllers: [OmnipulseController, OmnipulsePilar3Controller],
  providers: [OmnipulseService, OmnipulsePilar3Service],
  exports: [OmnipulseService, OmnipulsePilar3Service],
})
export class OmnipulseModule {}
