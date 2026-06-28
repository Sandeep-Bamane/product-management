import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BulkUploadController } from './bulk-upload.controller';
import { BulkUploadService } from './bulk-upload.service';
import { BulkUploadProcessor } from './bulk-upload.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'bulk-upload' })],
  controllers: [BulkUploadController],
  providers: [BulkUploadService, BulkUploadProcessor],
})
export class BulkUploadModule {}
