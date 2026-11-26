import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ProcessPaymentDto } from './dto/process-payment.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Get('methods')
  @ResponseMessage('Supported payment methods retrieved successfully')
  @ApiOperation({ summary: 'List currently configured payment strategies' })
  getSupportedMethods() {
    return this.paymentsService.getSupportedMethods();
  }

  @Post('orders/:orderId/pay')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Payment processed')
  @ApiOperation({ summary: 'Process payment for a PENDING order using selected strategy' })
  payForOrder(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.paymentsService.payForOrder(userId, orderId, dto);
  }
}
