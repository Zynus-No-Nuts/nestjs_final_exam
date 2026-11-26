import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class ProcessPaymentDto {
  @ApiPropertyOptional({
    enum: PaymentMethod,
    default: PaymentMethod.MOCK,
    description: 'Payment strategy to use (MOCK, COD; extensible to VNPAY, MOMO, STRIPE)',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    example: false,
    description: 'For MOCK strategy only: set true to simulate a failed payment',
  })
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
