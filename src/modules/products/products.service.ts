import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '../../common/utils/slugify.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { QueryProductsDto } from './dto/query-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateStockDto } from './dto/update-stock.dto.js';

const PRODUCT_INCLUDE = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
    },
  },
} as const;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(dto: CreateProductDto) {
    await this.ensureCategoryExists(dto.categoryId);

    const generatedSlug = slugify(dto.slug?.trim() || dto.name);
    if (!generatedSlug) {
      throw new BadRequestException('Unable to generate a valid slug from product name');
    }

    return this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        slug: generatedSlug,
        sku: dto.sku.trim().toUpperCase(),
        description: dto.description?.trim(),
        price: new Prisma.Decimal(dto.price),
        stock: dto.stock,
        images: dto.images ?? [],
        isActive: dto.isActive ?? true,
        categoryId: dto.categoryId,
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async findAll(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }

    const where: Prisma.ProductWhereInput = {};

    if (!query.includeInactive) {
      where.isActive = true;
    }

    if (query.search?.trim()) {
      const keyword = query.search.trim();
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { sku: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      const categoryIds = await this.categoriesService.getDescendantCategoryIds(query.categoryId);
      where.categoryId = { in: categoryIds };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined ? { gte: new Prisma.Decimal(query.minPrice) } : {}),
        ...(query.maxPrice !== undefined ? { lte: new Prisma.Decimal(query.maxPrice) } : {}),
      };
    }

    if (query.inStock === true) {
      where.stock = { gt: 0 };
    } else if (query.inStock === false) {
      where.stock = { equals: 0 };
    }

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy: Prisma.ProductOrderByWithRelationInput = { [sortBy]: sortOrder };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
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

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const nextSlug = dto.slug !== undefined ? slugify(dto.slug) : undefined;
    if (dto.slug !== undefined && !nextSlug) {
      throw new BadRequestException('Invalid product slug');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku.trim().toUpperCase() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.images !== undefined ? { images: dto.images } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async updateStock(id: string, dto: UpdateStockDto) {
    if (
      (dto.stock === undefined && dto.delta === undefined) ||
      (dto.stock !== undefined && dto.delta !== undefined)
    ) {
      throw new BadRequestException('Provide either stock or delta (not both)');
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, stock: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const nextStock = dto.stock !== undefined ? dto.stock : product.stock + (dto.delta ?? 0);
    if (nextStock < 0) {
      throw new BadRequestException('Resulting stock cannot be negative');
    }

    return this.prisma.product.update({
      where: { id },
      data: { stock: nextStock },
      include: PRODUCT_INCLUDE,
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product._count.orderItems > 0) {
      throw new BadRequestException(
        'Cannot delete product referenced by existing orders. Set isActive=false instead.',
      );
    }

    await this.prisma.product.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }
}
