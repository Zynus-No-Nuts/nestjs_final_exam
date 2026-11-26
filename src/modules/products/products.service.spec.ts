import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { ProductsService } from './products.service.js';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let categoriesService: { getDescendantCategoryIds: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      product: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    categoriesService = {
      getDescendantCategoryIds: vi.fn(),
    };

    service = new ProductsService(
      prisma as unknown as PrismaService,
      categoriesService as unknown as CategoriesService,
    );
  });

  it('throws BadRequestException when minPrice > maxPrice', async () => {
    await expect(service.findAll({ minPrice: 500, maxPrice: 100 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('filters by descendant categories and returns pagination metadata', async () => {
    categoriesService.getDescendantCategoryIds.mockResolvedValue(['parent-1', 'child-1']);
    prisma.product.findMany.mockResolvedValue([{ id: 'prod-1', name: 'iPhone 16' }]);
    prisma.product.count.mockResolvedValue(15);

    const result = await service.findAll({
      page: 2,
      limit: 5,
      categoryId: 'parent-1',
      search: 'iphone',
      sortBy: 'price',
      sortOrder: 'asc',
    });

    expect(categoriesService.getDescendantCategoryIds).toHaveBeenCalledWith('parent-1');
    expect(result.meta).toEqual({
      page: 2,
      limit: 5,
      total: 15,
      totalPages: 3,
    });
    expect(result.data).toHaveLength(1);
  });

  it('prevents stock from dropping below zero', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', stock: 3 });

    await expect(service.updateStock('prod-1', { delta: -5 })).rejects.toThrow(BadRequestException);
  });
});
