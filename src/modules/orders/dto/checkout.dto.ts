import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CheckoutDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Shipping address UUID (uses user default address if omitted)',
  })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    default: PaymentMethod.MOCK,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod = PaymentMethod.MOCK;

  @ApiPropertyOptional({ example: 'Please call 15 minutes before delivery' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
