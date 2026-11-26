import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiPropertyOptional({
    example: 50,
    minimum: 0,
    description: 'Set absolute stock quantity (mutually exclusive with delta)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Adjust stock by delta (positive to restock, negative to deduct)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  delta?: number;
}
