import { ConflictException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  let service: OrdersService;
  let txMock: {
    cart: { findUnique: ReturnType<typeof vi.fn> };
    product: {
      updateMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    order: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
    cartItem: { deleteMany: ReturnType<typeof vi.fn> };
  };
  let prisma: {
    address: { findFirst: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    txMock = {
      cart: { findUnique: vi.fn() },
      product: { updateMany: vi.fn(), update: vi.fn() },
      order: {
        create: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
      cartItem: { deleteMany: vi.fn() },
    };

    prisma = {
      address: { findFirst: vi.fn() },
      $transaction: vi.fn((cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
    };

    service = new OrdersService(prisma as unknown as PrismaService);
  });

  it('deducts stock, creates order, and clears cart inside a transaction', async () => {
    prisma.address.findFirst.mockResolvedValue({
      id: 'addr-1',
      recipientName: 'Nguyen Van A',
      phone: '0901234567',
      street: '123 Le Loi',
      ward: 'Ben Nghe',
      district: 'District 1',
      city: 'Ho Chi Minh City',
      country: 'Vietnam',
      postalCode: '700000',
    });

    txMock.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          productId: 'prod-1',
          quantity: 2,
          product: {
            id: 'prod-1',
            name: 'Sony XM5',
            sku: 'SKU-SONY-XM5',
            price: new Prisma.Decimal('7990000.00'),
            stock: 10,
            isActive: true,
          },
        },
      ],
    });

    txMock.product.updateMany.mockResolvedValue({ count: 1 });
    txMock.order.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-20261126-ABCDEF',
      status: OrderStatus.PENDING,
      totalAmount: new Prisma.Decimal('15980000.00'),
      items: [],
    });
    txMock.cartItem.deleteMany.mockResolvedValue({ count: 1 });

    const order = await service.checkout('user-1', { paymentMethod: PaymentMethod.MOCK });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod-1', isActive: true, stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(txMock.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
    expect(order.id).toBe('order-1');
  });

  it('throws ConflictException on overselling and does not create order or clear cart', async () => {
    prisma.address.findFirst.mockResolvedValue({
      id: 'addr-1',
      recipientName: 'Nguyen Van A',
      phone: '0901234567',
      street: '123 Le Loi',
      ward: null,
      district: 'District 1',
      city: 'Ho Chi Minh City',
      country: 'Vietnam',
      postalCode: null,
    });

    txMock.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          productId: 'prod-1',
          quantity: 5,
          product: {
            id: 'prod-1',
            name: 'Limited Sneaker',
            sku: 'SKU-LIM',
            price: new Prisma.Decimal('1000000.00'),
            stock: 2,
            isActive: true,
          },
        },
      ],
    });

    txMock.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.checkout('user-1', {})).rejects.toThrow(ConflictException);
    expect(txMock.order.create).not.toHaveBeenCalled();
    expect(txMock.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('restores stock when cancelling a PENDING order', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 1 },
      ],
    });
    txMock.order.updateMany.mockResolvedValue({ count: 1 });
    txMock.order.findUniqueOrThrow.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.CANCELLED,
      items: [],
    });

    const cancelled = await service.cancelOrder('order-1', 'user-1', Role.CUSTOMER);

    expect(cancelled.status).toBe(OrderStatus.CANCELLED);
    expect(txMock.product.update).toHaveBeenCalledTimes(2);
    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { stock: { increment: 2 } },
    });
  });
});
