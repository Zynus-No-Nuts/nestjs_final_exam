import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { slugify } from '../../common/utils/slugify.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  productCount: number;
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.ensureCategoryExists(dto.parentId, 'Parent category not found');
    }

    const generatedSlug = slugify(dto.slug?.trim() || dto.name);
    if (!generatedSlug) {
      throw new BadRequestException('Unable to generate a valid slug from category name');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug: generatedSlug,
        description: dto.description?.trim(),
        parentId: dto.parentId ?? null,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findAll(tree = false) {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    if (!tree) {
      return categories;
    }

    return this.buildTree(
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        parentId: cat.parentId,
        productCount: cat._count.products,
        children: [],
      })),
    );
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          select: { id: true, name: true, slug: true, description: true },
          orderBy: { name: 'asc' },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureCategoryExists(id, 'Category not found');

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      if (dto.parentId !== null) {
        await this.ensureCategoryExists(dto.parentId, 'Parent category not found');
        await this.ensureNoCycle(id, dto.parentId);
      }
    }

    const nextSlug = dto.slug !== undefined ? slugify(dto.slug) : undefined;
    if (dto.slug !== undefined && !nextSlug) {
      throw new BadRequestException('Invalid category slug');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.products > 0) {
      throw new BadRequestException(
        'Cannot delete category while products are still assigned to it',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { deleted: true, id };
  }

  async getDescendantCategoryIds(categoryId: string): Promise<string[]> {
    const allCategories = await this.prisma.category.findMany({
      select: { id: true, parentId: true },
    });

    const childrenByParent = new Map<string, string[]>();
    for (const cat of allCategories) {
      if (cat.parentId) {
        const list = childrenByParent.get(cat.parentId) ?? [];
        list.push(cat.id);
        childrenByParent.set(cat.parentId, list);
      }
    }

    const result: string[] = [];
    const queue: string[] = [categoryId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      result.push(current);

      const children = childrenByParent.get(current) ?? [];
      for (const childId of children) {
        queue.push(childId);
      }
    }

    return result;
  }

  private async ensureCategoryExists(id: string, message: string): Promise<void> {
    const exists = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(message);
    }
  }

  private async ensureNoCycle(categoryId: string, newParentId: string): Promise<void> {
    let cursorId: string | null = newParentId;
    const visited = new Set<string>([categoryId]);

    while (cursorId) {
      if (visited.has(cursorId)) {
        throw new BadRequestException('Cyclic category hierarchy is not allowed');
      }
      visited.add(cursorId);

      const parent: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: cursorId },
        select: { parentId: true },
      });
      cursorId = parent?.parentId ?? null;
    }
  }

  private buildTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
    const nodeMap = new Map<string, CategoryTreeNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    const roots: CategoryTreeNode[] = [];
    for (const node of nodes) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
