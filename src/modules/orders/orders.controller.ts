import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { type AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ResponseMessage('Order placed successfully')
  @ApiOperation({
    summary:
      'Create an order from current cart using an atomic Prisma transaction (deducts stock & clears cart)',
  })
  checkout(@CurrentUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(userId, dto);
  }

  @Get('my')
  @ResponseMessage('Your orders retrieved successfully')
  @ApiOperation({ summary: 'List orders belonging to the current authenticated customer' })
  findMyOrders(@CurrentUser('id') userId: string, @Query() query: QueryOrdersDto) {
    return this.ordersService.findMyOrders(userId, query);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ResponseMessage('All orders retrieved successfully')
  @ApiOperation({ summary: '[ADMIN] List all orders with pagination and status filter' })
  findAllOrders(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAllOrders(query);
  }

  @Get(':id')
  @ResponseMessage('Order details retrieved successfully')
  @ApiOperation({ summary: 'Get order details (owner or ADMIN)' })
  findOne(@Param('id', ParseUUIDPipe) orderId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findOne(orderId, user.id, user.role);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Order cancelled and stock restored successfully')
  @ApiOperation({
    summary:
      'Cancel an order and atomically restore product stock (owner for PENDING, ADMIN for PENDING/PAID)',
  })
  cancelOrder(@Param('id', ParseUUIDPipe) orderId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.cancelOrder(orderId, user.id, user.role);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ResponseMessage('Order status updated successfully')
  @ApiOperation({ summary: '[ADMIN] Transition order lifecycle status' })
  updateStatus(@Param('id', ParseUUIDPipe) orderId: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(orderId, dto);
  }
}
