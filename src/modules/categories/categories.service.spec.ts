import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from './categories.service.js';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      category: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  it('prevents setting a category as its own parent', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });

    await expect(service.update('cat-1', { parentId: 'cat-1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('builds a parent-child tree when tree=true', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        id: 'parent-1',
        name: 'Electronics',
        slug: 'electronics',
        description: null,
        parentId: null,
        parent: null,
        _count: { products: 0, children: 1 },
      },
      {
        id: 'child-1',
        name: 'Laptops',
        slug: 'laptops',
        description: null,
        parentId: 'parent-1',
        parent: { id: 'parent-1', name: 'Electronics', slug: 'electronics' },
        _count: { products: 3, children: 0 },
      },
    ]);

    const tree = await service.findAll(true);
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      id: 'parent-1',
      children: [{ id: 'child-1', productCount: 3 }],
    });
  });

  it('returns category and all nested descendants', async () => {
    prisma.category.findMany.mockResolvedValue([
      { id: 'root', parentId: null },
      { id: 'child-a', parentId: 'root' },
      { id: 'grandchild-a1', parentId: 'child-a' },
      { id: 'other', parentId: null },
    ]);

    const ids = await service.getDescendantCategoryIds('root');
    expect(ids).toEqual(['root', 'child-a', 'grandchild-a1']);
  });
});
