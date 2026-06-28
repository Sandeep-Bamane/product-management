import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReportDto {
  @IsIn(['csv', 'xlsx'])
  format: 'csv' | 'xlsx';

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
