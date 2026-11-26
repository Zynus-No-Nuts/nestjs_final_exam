import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PaymentsService } from './payments.service.js';
import { CodPaymentStrategy } from './strategies/cod-payment.strategy.js';
import { MockPaymentStrategy } from './strategies/mock-payment.strategy.js';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    order: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new PaymentsService(prisma as unknown as PrismaService, [
      new MockPaymentStrategy(),
      new CodPaymentStrategy(),
    ]);
  });

  it('lists configured strategies and rejects unconfigured providers', () => {
    expect(service.getSupportedMethods()).toEqual([PaymentMethod.MOCK, PaymentMethod.COD]);
    expect(() => service.resolveStrategy(PaymentMethod.VNPAY)).toThrow(BadRequestException);
  });

  it('marks a PENDING order as PAID when MockPaymentStrategy succeeds', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-20261126-123456',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethod.MOCK,
      totalAmount: new Prisma.Decimal('500000.00'),
    });

    prisma.order.update.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.SUCCESS,
      items: [],
    });

    const result = await service.payForOrder('user-1', 'order-1', {
      paymentMethod: PaymentMethod.MOCK,
    });

    expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
    expect(result.order.status).toBe(OrderStatus.PAID);
  });

  it('keeps order PENDING when MockPaymentStrategy simulates failure', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-20261126-123456',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethod.MOCK,
      totalAmount: new Prisma.Decimal('500000.00'),
    });

    prisma.order.update.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.FAILED,
      items: [],
    });

    const result = await service.payForOrder('user-1', 'order-1', {
      paymentMethod: PaymentMethod.MOCK,
      simulateFailure: true,
    });

    expect(result.payment.status).toBe(PaymentStatus.FAILED);
    expect(result.order.status).toBe(OrderStatus.PENDING);
  });
});
