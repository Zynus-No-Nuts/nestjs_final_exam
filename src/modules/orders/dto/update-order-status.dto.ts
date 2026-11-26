import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.SHIPPING,
    description:
      'Valid transitions: PENDING -> PAID|CANCELLED, PAID -> SHIPPING|CANCELLED, SHIPPING -> DELIVERED',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
