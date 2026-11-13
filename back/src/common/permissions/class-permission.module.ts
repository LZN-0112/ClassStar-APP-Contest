import { Global, Module } from '@nestjs/common';
import { ClassPermissionService } from './class-permission.service';

@Global()
@Module({
  providers: [ClassPermissionService],
  exports: [ClassPermissionService],
})
export class ClassPermissionModule {}