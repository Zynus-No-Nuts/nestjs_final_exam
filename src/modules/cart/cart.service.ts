import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.getOrCreateCartWithItems(userId);
    return this.formatCartResponse(cart);
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, name: true, stock: true, isActive: true },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or is no longer available');
    }

    const cart = await this.ensureCart(userId);
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    const desiredQuantity = (existingItem?.quantity ?? 0) + dto.quantity;
    if (desiredQuantity > product.stock) {
      throw new BadRequestException(
        `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${desiredQuantity}`,
      );
    }

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
      update: { quantity: desiredQuantity },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
      },
    });

    return this.getCart(userId);
  }

  async updateItemQuantity(userId: string, productId: string, dto: UpdateCartItemDto) {
    const cart = await this.ensureCart(userId);
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      include: {
        product: {
          select: { id: true, name: true, stock: true, isActive: true },
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Product is not in your cart');
    }

    if (!existingItem.product.isActive) {
      throw new BadRequestException(
        `Product "${existingItem.product.name}" is no longer available`,
      );
    }

    if (dto.quantity > existingItem.product.stock) {
      throw new BadRequestException(
        `Insufficient stock for "${existingItem.product.name}". Available: ${existingItem.product.stock}, requested: ${dto.quantity}`,
      );
    }

    await this.prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.ensureCart(userId);
    const deleted = await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Product is not in your cart');
    }

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.ensureCart(userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(userId);
  }

  private async ensureCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  private async getOrCreateCartWithItems(userId: string) {
    await this.ensureCart(userId);

    return this.prisma.cart.findUniqueOrThrow({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
                price: true,
                stock: true,
                images: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  private formatCartResponse(cart: {
    id: string;
    userId: string;
    updatedAt: Date;
    items: Array<{
      id: string;
      productId: string;
      quantity: number;
      product: {
        id: string;
        name: string;
        slug: string;
        sku: string;
        price: Prisma.Decimal;
        stock: number;
        images: string[];
        isActive: boolean;
      };
    }>;
  }) {
    let totalItems = 0;
    let totalAmount = new Prisma.Decimal(0);

    const items = cart.items.map((item) => {
      const subtotal = item.product.price.mul(item.quantity);
      totalItems += item.quantity;
      totalAmount = totalAmount.add(subtotal);

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.product.price.toFixed(2),
        subtotal: subtotal.toFixed(2),
        product: {
          ...item.product,
          price: item.product.price.toFixed(2),
        },
      };
    });

    return {
      id: cart.id,
      items,
      totalItems,
      totalAmount: totalAmount.toFixed(2),
      updatedAt: cart.updatedAt,
    };
  }
}
