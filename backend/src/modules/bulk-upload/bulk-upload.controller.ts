import { BadRequestException, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BulkUploadService } from './bulk-upload.service';

@Controller('bulk-upload')
export class BulkUploadController {
  constructor(private bulkUploadService: BulkUploadService) {}

  @Post('products')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/bulk',
        filename: (_req, file, cb) =>
          cb(null, `${uuidv4()}-${file.originalname}`),
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
          return cb(new BadRequestException('Only CSV or XLSX files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File, @CurrentUser('id') userId: string) {
    if (!file) throw new BadRequestException('File is required');
    return this.bulkUploadService.startJob(file.path, userId);
  }

  @Get(':jobId')
  getStatus(@Param('jobId') jobId: string) {
    return this.bulkUploadService.getStatus(jobId);
  }
}
