import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProcessPaymentDto } from './dto/process-payment.dto.js';
import { PaymentStrategy } from './interfaces/payment-strategy.interface.js';

export const PAYMENT_STRATEGIES = 'PAYMENT_STRATEGIES';

@Injectable()
export class PaymentsService {
  private readonly strategies = new Map<PaymentMethod, PaymentStrategy>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_STRATEGIES) paymentStrategies: PaymentStrategy[],
  ) {
    for (const strategy of paymentStrategies) {
      this.strategies.set(strategy.method, strategy);
    }
  }

  getSupportedMethods(): PaymentMethod[] {
    return Array.from(this.strategies.keys());
  }

  resolveStrategy(method: PaymentMethod): PaymentStrategy {
    const strategy = this.strategies.get(method);
    if (!strategy) {
      throw new BadRequestException(
        `Payment method "${method}" is not yet configured. Supported methods: ${this.getSupportedMethods().join(', ')}`,
      );
    }
    return strategy;
  }

  async payForOrder(userId: string, orderId: string, dto: ProcessPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only pay for your own orders');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order cannot be paid in status "${order.status}". Only PENDING orders can be paid.`,
      );
    }

    const method = dto.paymentMethod ?? order.paymentMethod;
    const strategy = this.resolveStrategy(method);

    const paymentResult = await strategy.processPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId,
      amount: Number(order.totalAmount),
      currency: 'VND',
      simulateFailure: dto.simulateFailure,
    });

    const nextOrderStatus =
      paymentResult.status === PaymentStatus.SUCCESS ? OrderStatus.PAID : order.status;

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: method,
        paymentStatus: paymentResult.status,
        paymentTransactionId: paymentResult.transactionId,
        status: nextOrderStatus,
        ...(paymentResult.paidAt ? { paidAt: paymentResult.paidAt } : {}),
      },
      include: {
        items: true,
      },
    });

    return {
      payment: paymentResult,
      order: updatedOrder,
    };
  }
}
