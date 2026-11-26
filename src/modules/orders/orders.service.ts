import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, Role } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const ORDER_INCLUDE = {
  items: {
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const address = dto.addressId
      ? await this.prisma.address.findFirst({
          where: { id: dto.addressId, userId },
        })
      : await this.prisma.address.findFirst({
          where: { userId },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });

    if (!address) {
      throw new BadRequestException(
        'Shipping address not found. Please create a shipping address before checkout.',
      );
    }

    const shippingAddressSnapshot: Prisma.InputJsonObject = {
      recipientName: address.recipientName,
      phone: address.phone,
      street: address.street,
      ward: address.ward,
      district: address.district,
      city: address.city,
      country: address.country,
      postalCode: address.postalCode,
    };

    const paymentMethod = dto.paymentMethod ?? PaymentMethod.MOCK;

    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  stock: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }

      // Sort by productId to keep lock ordering deterministic and prevent deadlocks
      const sortedItems = [...cart.items].sort((a, b) => a.productId.localeCompare(b.productId));

      let totalAmount = new Prisma.Decimal(0);
      const orderItemsData: Array<{
        productId: string;
        productName: string;
        productSku: string;
        unitPrice: Prisma.Decimal;
        quantity: number;
        subtotal: Prisma.Decimal;
      }> = [];

      for (const item of sortedItems) {
        if (!item.product.isActive) {
          throw new BadRequestException(`Product "${item.product.name}" is no longer available`);
        }

        // Atomic conditional stock deduction to prevent overselling under concurrency
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            isActive: true,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (stockUpdate.count === 0) {
          throw new ConflictException(
            `Insufficient stock for product "${item.product.name}" (requested: ${item.quantity})`,
          );
        }

        const subtotal = item.product.price.mul(item.quantity);
        totalAmount = totalAmount.add(subtotal);

        orderItemsData.push({
          productId: item.productId,
          productName: item.product.name,
          productSku: item.product.sku,
          unitPrice: item.product.price,
          quantity: item.quantity,
          subtotal,
        });
      }

      const order = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId,
          addressId: address.id,
          shippingAddress: shippingAddressSnapshot,
          status: OrderStatus.PENDING,
          paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount,
          note: dto.note?.trim(),
          items: {
            create: orderItemsData,
          },
        },
        include: ORDER_INCLUDE,
      });

      // Clear cart atomically inside the same transaction
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    });
  }

  async findMyOrders(userId: string, query: QueryOrdersDto) {
    return this.paginateOrders({ userId }, query);
  }

  async findAllOrders(query: QueryOrdersDto) {
    return this.paginateOrders({}, query);
  }

  async findOne(orderId: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        ...ORDER_INCLUDE,
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (role !== Role.ADMIN && order.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return order;
  }

  async cancelOrder(orderId: string, userId: string, role: Role) {
    const allowedFromStatuses: OrderStatus[] =
      role === Role.ADMIN ? [OrderStatus.PENDING, OrderStatus.PAID] : [OrderStatus.PENDING];

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (role !== Role.ADMIN && order.userId !== userId) {
        throw new ForbiddenException('You can only cancel your own orders');
      }

      if (!allowedFromStatuses.includes(order.status)) {
        throw new BadRequestException(
          `Order in status "${order.status}" cannot be cancelled by ${role}`,
        );
      }

      // Guard against concurrent double-cancellation / double-restock
      const transitioned = await tx.order.updateMany({
        where: {
          id: order.id,
          status: { in: allowedFromStatuses },
        },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          ...(order.paymentStatus === PaymentStatus.SUCCESS
            ? { paymentStatus: PaymentStatus.REFUNDED }
            : {}),
        },
      });

      if (transitioned.count === 0) {
        throw new ConflictException('Order status changed concurrently and could not be cancelled');
      }

      // Restore inventory stock for every cancelled item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      }

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      });
    });
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    if (dto.status === OrderStatus.CANCELLED) {
      return this.cancelOrder(orderId, '', Role.ADMIN);
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentStatus: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const allowedNext = VALID_STATUS_TRANSITIONS[order.status];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from "${order.status}" to "${dto.status}"`,
      );
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: dto.status,
        ...(dto.status === OrderStatus.PAID
          ? {
              paymentStatus: PaymentStatus.SUCCESS,
              paidAt: new Date(),
            }
          : {}),
      },
      include: ORDER_INCLUDE,
    });
  }

  private async paginateOrders(baseWhere: Prisma.OrderWhereInput, query: QueryOrdersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...baseWhere,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${datePart}-${randomPart}`;
  }
}
