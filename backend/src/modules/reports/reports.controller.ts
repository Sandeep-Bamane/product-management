import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post('products')
  requestReport(@Body() dto: CreateReportDto) {
    return this.reportsService.requestReport(dto);
  }

  @Get(':jobId')
  getStatus(@Param('jobId') jobId: string) {
    return this.reportsService.getStatus(jobId);
  }

  @Get(':jobId/download')
  async download(@Param('jobId') jobId: string, @Res() res: Response) {
    const filePath = await this.reportsService.getFilePath(jobId);
    res.download(filePath);
  }
}
